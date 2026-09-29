import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildPrompt, type AiKind, type AiScope, type AiTier } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Extracts text for the given (1-indexed, inclusive) page range from a PDF buffer.
async function extractPages(data: Uint8Array, from: number, to: number) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false, disableFontFace: true }).promise;
  const last = Math.min(to, doc.numPages);
  const parts: string[] = [];
  for (let p = Math.max(1, from); p <= last; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const text = content.items.map((it) => ("str" in it ? it.str : "")).join(" ");
    parts.push(`[page ${p}]\n${text}`);
  }
  await doc.destroy();
  return parts.join("\n\n");
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
  if (usage.output) return NextResponse.json({ output: usage.output as string });

  const { data: book } = await supabase.from("books").select("title, course_code, file_path").eq("id", usage.book_id).single();
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
  if (!apiKey) return NextResponse.json({ error: "The study assistant isn't configured yet (missing API key)" }, { status: 500 });

  const prompt = buildPrompt({
    kind: usage.kind as AiKind,
    scope: usage.scope as AiScope,
    bookTitle: book.title,
    courseCode: book.course_code,
    pageFrom: usage.page_from,
    pageTo: usage.page_to,
    text: extracted,
    question: usage.question,
    tier: usage.tier_level as AiTier | null,
  });

  let output: string;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Anthropic API ${res.status}: ${detail.slice(0, 300)}`);
    }
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    output = (json.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n").trim();
    if (!output) throw new Error("Empty response from model");
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "The study assistant failed to respond" }, { status: 502 });
  }

  await supabase.from("ai_usage").update({ output }).eq("id", usageId);
  return NextResponse.json({ output });
}
