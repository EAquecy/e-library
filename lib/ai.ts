export type AiKind = "summary" | "questions" | "topics" | "chat";
export type AiScope = "page" | "book";

export const AI_MODES: { kind: AiKind; label: string; hint: string }[] = [
  { kind: "summary", label: "Summarize", hint: "Plain-language summary of the material" },
  { kind: "questions", label: "Practice questions", hint: "Likely exam / mid-semester style questions" },
  { kind: "topics", label: "Research topics", hint: "Ideas worth reading deeper into or writing about" },
  { kind: "chat", label: "Ask a question", hint: "Ask anything about what you've read" },
];

const MAX_BOOK_SCOPE_PAGES = 40;
// Keep the model's input bounded regardless of how dense the PDF text is.
const MAX_CHARS = 60000;

export function pageRangeFor(scope: AiScope, currentPage: number) {
  if (scope === "page") return { from: currentPage, to: currentPage };
  const from = Math.max(1, currentPage - MAX_BOOK_SCOPE_PAGES + 1);
  return { from, to: currentPage };
}

export function buildPrompt(opts: {
  kind: AiKind;
  scope: AiScope;
  bookTitle: string;
  courseCode: string | null;
  pageFrom: number;
  pageTo: number;
  text: string;
  question?: string | null;
}) {
  const { kind, scope, bookTitle, courseCode, pageFrom, pageTo, question } = opts;
  const text = opts.text.length > MAX_CHARS ? opts.text.slice(0, MAX_CHARS) + "\n…[truncated]" : opts.text;
  const where = scope === "page" ? `page ${pageFrom}` : `pages ${pageFrom}–${pageTo}`;
  const header = `You are a study assistant for a student reading "${bookTitle}"${courseCode ? ` (${courseCode})` : ""}, ${where}. Base your answer only on the excerpt below; if it doesn't contain enough to answer, say so plainly. Do not invent facts, page numbers, or citations. Use concise Markdown.`;

  const task =
    kind === "summary"
      ? "Write a clear, well-organized summary of this material in plain language, using short paragraphs or bullet points as fits. Highlight the key definitions, arguments or formulas."
      : kind === "questions"
        ? "Draft 6 to 8 exam-style practice questions a lecturer might ask on this material (mix short-answer and 1-2 longer/essay-style questions). After the questions, add a short 'Answer notes' section with a one or two line pointer to the answer for each, without giving the full answer away."
        : kind === "topics"
          ? "Suggest 4 to 6 research topics or questions this material naturally opens up, each with one sentence on why it's worth exploring and, where relevant, what field or angle it connects to."
          : `Answer the student's question using only the excerpt as context. Student's question: "${question}"`;

  return `${header}\n\n${task}\n\n--- EXCERPT (${where}) ---\n${text}\n--- END EXCERPT ---`;
}
