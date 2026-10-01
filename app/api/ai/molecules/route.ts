import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractPages } from "@/lib/pdf-extract";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type MoleculeResult = {
  name: string;
  cid: number | null;
  sdf: string | null;
  has3d: boolean;
};

// Asks the model only to spot compound names in the text — never to invent
// structures. The actual 3D geometry always comes from PubChem, a real
// chemical database, so what students see is accurate rather than a
// plausible-looking hallucination.
async function detectCompounds(apiKey: string, text: string): Promise<string[]> {
  const prompt = `From the excerpt below, list up to 5 distinct chemical compounds that are explicitly named (not generic terms like "acid" or "solvent" alone) — use names a chemical database would recognize (e.g. common or IUPAC names). Respond with ONLY a JSON array of strings, nothing else. If none are named, respond with [].\n\n--- EXCERPT ---\n${text.slice(0, 20000)}\n--- END EXCERPT ---`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  const raw = (json.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n").trim();
  const cleaned = raw.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  try {
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 5);
  } catch {
    return [];
  }
}

const PUBCHEM = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";

async function lookupCompound(name: string): Promise<MoleculeResult> {
  try {
    const cidRes = await fetch(`${PUBCHEM}/compound/name/${encodeURIComponent(name)}/cids/JSON`);
    if (!cidRes.ok) return { name, cid: null, sdf: null, has3d: false };
    const cidJson = (await cidRes.json()) as { IdentifierList?: { CID?: number[] } };
    const cid = cidJson.IdentifierList?.CID?.[0];
    if (!cid) return { name, cid: null, sdf: null, has3d: false };

    const sdf3d = await fetch(`${PUBCHEM}/compound/cid/${cid}/SDF?record_type=3d`);
    if (sdf3d.ok) {
      const sdf = await sdf3d.text();
      return { name, cid, sdf, has3d: true };
    }
    const sdf2d = await fetch(`${PUBCHEM}/compound/cid/${cid}/SDF?record_type=2d`);
    if (sdf2d.ok) {
      const sdf = await sdf2d.text();
      return { name, cid, sdf, has3d: false };
    }
    return { name, cid, sdf: null, has3d: false };
  } catch {
    return { name, cid: null, sdf: null, has3d: false };
  }
}

export async function POST(req: Request) {
  let body: { usageId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const usageId = body.usageId;
  if (!usageId) return NextResponse.json({ error: "Missing usageId" }, { status: 400 });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: usage } = await supabase.from("ai_usage").select("*").eq("id", usageId).eq("student_id", user.id).maybeSingle();
  if (!usage) return NextResponse.json({ error: "Usage record not found" }, { status: 404 });
  if (usage.kind !== "molecules") return NextResponse.json({ error: "Wrong endpoint for this request" }, { status: 400 });
  if (usage.output) return NextResponse.json({ output: usage.output as string });

  const { data: book } = await supabase.from("books").select("title, file_path").eq("id", usage.book_id).single();
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const { data: allowed } = await supabase.rpc("has_book_access", { p_book: usage.book_id });
  if (!allowed) return NextResponse.json({ error: "Access to this title has ended" }, { status: 403 });

  const { data: file, error: dlError } = await supabase.storage.from("books").download(book.file_path);
  if (dlError || !file) return NextResponse.json({ error: "Could not open the PDF" }, { status: 500 });

  let extracted: string;
  try {
    extracted = await extractPages(new Uint8Array(await file.arrayBuffer()), usage.page_from, usage.page_to);
  } catch {
    return NextResponse.json({ error: "Could not read text from this PDF" }, { status: 500 });
  }
  if (!extracted.trim()) {
    return NextResponse.json({ error: "This page range has no extractable text (it may be a scanned image)" }, { status: 422 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Come Alive 3D isn't configured yet (missing API key)" }, { status: 500 });

  let names: string[];
  try {
    names = await detectCompounds(apiKey, extracted);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't read this page" }, { status: 502 });
  }

  const molecules = names.length > 0 ? (await Promise.all(names.map(lookupCompound))).filter((m) => m.sdf) : [];
  const output = JSON.stringify(molecules);

  await supabase.from("ai_usage").update({ output }).eq("id", usageId);
  return NextResponse.json({ output });
}
