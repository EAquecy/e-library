export type AiKind = "summary" | "questions" | "topics" | "chat" | "molecules";
export type AiScope = "page" | "book";
// 0 = the free practice-question set. 1, 2, ... = paid tiers, priced per
// book via ai_question_tier_prices. Adding a new tier is just adding a
// price entry (and, ideally, a config row below) — no schema change.
export type AiTier = number;

export const FREE_QUESTION_TIER = 0;

export type QuestionTierConfig = { label: string; setsCount: number; mcqPerSet: number; writtenPerSet: number };

// Shapes the prompt for each tier. A tier priced on a book but missing here
// still works (falls back to sensible defaults below).
export const QUESTION_TIER_CONFIG: Record<number, QuestionTierConfig> = {
  0: { label: "Free set", setsCount: 1, mcqPerSet: 3, writtenPerSet: 2 },
  1: { label: "More questions", setsCount: 2, mcqPerSet: 4, writtenPerSet: 2 },
};

const DEFAULT_TIER_CONFIG: QuestionTierConfig = { label: "More questions", setsCount: 1, mcqPerSet: 4, writtenPerSet: 2 };

export const AI_MODES: { kind: AiKind; label: string; hint: string }[] = [
  { kind: "summary", label: "Summarize", hint: "Plain-language summary of the material · Free" },
  { kind: "questions", label: "Practice questions", hint: "Likely exam / mid-semester style questions" },
  { kind: "topics", label: "Research topics", hint: "Ideas worth reading deeper into or writing about" },
  { kind: "chat", label: "Ask a question", hint: "Ask anything about what you've read" },
  { kind: "molecules", label: "Come Alive 3D", hint: "Turn chemical compounds on this page into interactive 3D models · Paid" },
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
  tier?: AiTier | null;
}) {
  const { kind, scope, bookTitle, courseCode, pageFrom, pageTo, question, tier } = opts;
  const text = opts.text.length > MAX_CHARS ? opts.text.slice(0, MAX_CHARS) + "\n…[truncated]" : opts.text;
  const where = scope === "page" ? `page ${pageFrom}` : `pages ${pageFrom}–${pageTo}`;
  const header = `You are a study assistant for a learner reading "${bookTitle}"${courseCode ? ` (${courseCode})` : ""}, ${where}. Base your answer only on the excerpt below; if it doesn't contain enough to answer, say so plainly. Do not invent facts, page numbers, or citations. Use concise Markdown.`;

  const questionsTask = buildQuestionsTask(tier ?? FREE_QUESTION_TIER);

  const task =
    kind === "summary"
      ? "Write a clear, well-organized summary of this material in plain language, using short paragraphs or bullet points as fits. Highlight the key definitions, arguments or formulas."
      : kind === "questions"
        ? questionsTask
        : kind === "topics"
          ? "Suggest 4 to 6 research topics or questions this material naturally opens up, each with one sentence on why it's worth exploring and, where relevant, what field or angle it connects to."
          : `Answer the learner's question using only the excerpt as context. Learner's question: "${question}"`;

  return `${header}\n\n${task}\n\n--- EXCERPT (${where}) ---\n${text}\n--- END EXCERPT ---`;
}

function buildQuestionsTask(tier: AiTier): string {
  if (tier === FREE_QUESTION_TIER) {
    const c = QUESTION_TIER_CONFIG[0];
    return `Draft exactly ${c.mcqPerSet} objective/multiple-choice questions (label options A-D) and ${c.writtenPerSet} scenario or short-written questions that apply the material to a situation, on this material. Number the questions 1-${c.mcqPerSet + c.writtenPerSet}. Then add a '## Answers' section, numbered to match, giving the full correct answer for every question (not just a hint) — for multiple-choice, state the correct letter; for scenario/written questions, give a complete model answer with brief reasoning.`;
  }

  const c = QUESTION_TIER_CONFIG[tier] ?? DEFAULT_TIER_CONFIG;
  const firstSetNumber = 2; // Set 1 is the free set the learner already has.
  const lastSetNumber = firstSetNumber + c.setsCount - 1;
  const setRange = c.setsCount === 1 ? `Set ${firstSetNumber}` : `Sets ${firstSetNumber}–${lastSetNumber}`;
  return `Draft ${c.setsCount} further, clearly separate ${c.setsCount === 1 ? "set" : "sets"} of exam-style practice questions on this material (${setRange}), each set with ${c.mcqPerSet} objective/multiple-choice questions (label options A-D) and ${c.writtenPerSet} scenario or short-written questions that apply the material to a situation. Head each set with a Markdown heading ("## Set ${firstSetNumber}", ${c.setsCount > 1 ? `"## Set ${firstSetNumber + 1}", ` : ""}etc.) and number the questions 1-${c.mcqPerSet + c.writtenPerSet} within each set. Make every set different from the others and from a short introductory set the learner already saw (don't assume what that set contained, just avoid the most obvious repeats). Then, for each set, add its own '## Set N Answers' section giving the full correct answer for every question (not just a hint) — for multiple-choice, state the correct letter; for scenario/written questions, give a complete model answer with brief reasoning.`;
}
