"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadPdfjs } from "@/lib/pdf";

export function UploadForm({ userId, variant = "lecturer" }: { userId: string; variant?: "lecturer" | "publisher" }) {
  const router = useRouter();
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<number | null>(null);
  const [sell, setSell] = useState(true);
  const [rent, setRent] = useState(true);

  async function inspect(file: File | undefined) {
    setPages(null);
    if (!file) return;
    try {
      const pdfjs = await loadPdfjs();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
      setPages(pdf.numPages);
    } catch {
      setError("That file doesn't look like a readable PDF.");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File;
    const cover = fd.get("cover") as File;
    if (!file || !file.size) return setError("Choose a PDF to upload");
    if (file.type !== "application/pdf") return setError("Only PDF files are supported");
    if (!sell && !rent) return setError("Offer the title for sale, rent, or both");

    const supabase = createClient();
    const stamp = Date.now();
    const filePath = `${userId}/${stamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    setStep("Uploading PDF…");
    const up = await supabase.storage.from("books").upload(filePath, file, { contentType: "application/pdf" });
    if (up.error) {
      setStep(null);
      return setError(up.error.message);
    }

    let coverPath: string | null = null;
    if (cover && cover.size) {
      setStep("Uploading cover…");
      const ext = cover.name.split(".").pop()?.toLowerCase() || "jpg";
      coverPath = `${userId}/${stamp}.${ext}`;
      const c = await supabase.storage.from("covers").upload(coverPath, cover, { contentType: cover.type });
      if (c.error) coverPath = null;
    }

    setStep("Publishing…");
    const num = (k: string) => {
      const v = String(fd.get(k) ?? "").trim();
      return v === "" ? null : Number(v);
    };
    const str = (k: string) => String(fd.get(k) ?? "").trim() || null;
    const { data, error } = await supabase
      .from("books")
      .insert({
        lecturer_id: userId,
        title: String(fd.get("title")).trim(),
        description: String(fd.get("description") || "").trim(),
        subject: str("subject"),
        course_code: variant === "publisher" ? null : String(fd.get("course_code") || "").trim().toUpperCase() || null,
        kind: variant === "publisher" ? "publication" : fd.get("kind") === "handout" ? "handout" : "book",
        authors: variant === "publisher" ? str("authors") : null,
        journal_name: variant === "publisher" ? str("journal_name") : null,
        published_year: variant === "publisher" ? num("published_year") : null,
        doi: variant === "publisher" ? str("doi") : null,
        file_path: filePath,
        cover_path: coverPath,
        page_count: pages,
        buy_price: sell ? num("buy_price") : null,
        rent_price: rent ? num("rent_price") : null,
        rent_days: num("rent_days") ?? 14,
        published: fd.get("published") === "on",
      })
      .select("id")
      .single();
    if (error) {
      await supabase.storage.from("books").remove([filePath]);
      setStep(null);
      return setError(error.message);
    }
    router.push(`/books/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6">
      <div>
        <label className="label" htmlFor="file">PDF file</label>
        <input id="file" name="file" type="file" accept="application/pdf" required className="input" onChange={(e) => inspect(e.target.files?.[0])} />
        {pages && <p className="mt-1 text-xs text-forest">{pages} pages detected</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" name="title" required className="input" />
        </div>
        {variant === "lecturer" && (
          <div>
            <label className="label" htmlFor="course_code">Course code</label>
            <input id="course_code" name="course_code" placeholder="CSCD 205" className="input uppercase" />
          </div>
        )}
      </div>
      <div>
        <label className="label" htmlFor="subject">Subject / program</label>
        <input id="subject" name="subject" placeholder="e.g. Computer Science" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} className="input" placeholder="What does it cover? Which semester?" />
      </div>

      {variant === "publisher" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="authors">Authors</label>
            <input id="authors" name="authors" placeholder="A. Mensah, B. Owusu" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="journal_name">Journal / publication</label>
            <input id="journal_name" name="journal_name" placeholder="Journal of..." className="input" />
          </div>
          <div>
            <label className="label" htmlFor="published_year">Published year</label>
            <input id="published_year" name="published_year" type="number" min={1900} max={2100} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="doi">DOI (optional)</label>
            <input id="doi" name="doi" placeholder="10.xxxx/xxxxx" className="input" />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="kind">Type</label>
            <select id="kind" name="kind" className="input">
              <option value="book">Book</option>
              <option value="handout">Handout</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cover">Cover image (optional)</label>
            <input id="cover" name="cover" type="file" accept="image/png,image/jpeg,image/webp" className="input" />
          </div>
        </div>
      )}
      {variant === "publisher" && (
        <div>
          <label className="label" htmlFor="cover">Cover image (optional)</label>
          <input id="cover" name="cover" type="file" accept="image/png,image/jpeg,image/webp" className="input" />
        </div>
      )}

      <fieldset className="space-y-3 rounded-md border border-paper-edge p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-ink-soft">Pricing (GH₵)</legend>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={sell} onChange={(e) => setSell(e.target.checked)} />
          <span className="w-20 text-sm font-medium">Sell</span>
          <input name="buy_price" type="number" min={0} step="0.01" placeholder="80.00" className="input max-w-36" disabled={!sell} required={sell} />
        </label>
        <label className="flex flex-wrap items-center gap-3">
          <input type="checkbox" checked={rent} onChange={(e) => setRent(e.target.checked)} />
          <span className="w-20 text-sm font-medium">Rent</span>
          <input name="rent_price" type="number" min={0} step="0.01" placeholder="25.00" className="input max-w-36" disabled={!rent} required={rent} />
          <span className="text-sm text-ink-soft">for</span>
          <input name="rent_days" type="number" min={1} max={365} defaultValue={14} className="input w-20" disabled={!rent} />
          <span className="text-sm text-ink-soft">days</span>
        </label>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked /> Publish now (learners can find it immediately)
      </label>

      <p className="text-xs text-ink-faint">Study assistant pricing for this title is set by Lectern, not by {variant === "publisher" ? "publishers" : "lecturers"}.</p>

      {error && <p className="rounded bg-clay-light px-3 py-2 text-sm text-clay">{error}</p>}
      <button className="btn-primary w-full" disabled={!!step}>{step ?? "Upload and publish"}</button>
    </form>
  );
}
