// Server-side PDF text extraction, shared by the study-assistant API routes.
export async function extractPages(data: Uint8Array, from: number, to: number) {
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
