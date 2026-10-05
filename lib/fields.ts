// Fields a learner can say they're interested in. `keywords` are matched
// (case-insensitively) against a title's subject, title and description to
// build recommendations.
export const FIELDS: { name: string; keywords: string[] }[] = [
  { name: "Computer Science", keywords: ["computer", "programming", "software", "algorithm", "data structure", "database", "machine learning", "artificial intelligence", "ai ", "cyber", "network", "web", "coding"] },
  { name: "Information Technology", keywords: ["information technology", "information system", "it ", "systems"] },
  { name: "Engineering", keywords: ["engineering", "circuit", "voltage", "power", "control", "mechanical", "civil", "structural", "thermodynamic"] },
  { name: "Electrical & Electronics", keywords: ["electrical", "electronic", "voltage", "circuit", "capacitor", "thyristor", "power system", "pwm"] },
  { name: "Mathematics & Statistics", keywords: ["math", "calculus", "algebra", "statistic", "probability", "geometry"] },
  { name: "Physics", keywords: ["physics", "quantum", "mechanics", "optics", "thermodynamic"] },
  { name: "Chemistry", keywords: ["chemistry", "chemical", "organic", "molecule", "molecular", "reaction"] },
  { name: "Biology & Life Sciences", keywords: ["biology", "biolog", "genetic", "ecology", "botany", "zoology", "microbio", "life science"] },
  { name: "Medicine & Health", keywords: ["medicine", "medical", "health", "nursing", "clinical", "pharmac", "anatomy", "public health"] },
  { name: "Agriculture", keywords: ["agricultur", "crop", "soil", "farming", "livestock", "agronomy"] },
  { name: "Business & Management", keywords: ["business", "management", "entrepreneur", "marketing", "strategy", "leadership"] },
  { name: "Accounting & Finance", keywords: ["accounting", "finance", "financial", "audit", "tax", "banking", "investment"] },
  { name: "Economics", keywords: ["economic", "macro", "micro", "trade", "development"] },
  { name: "Law", keywords: ["law", "legal", "constitution", "contract", "jurisprudence"] },
  { name: "Education", keywords: ["education", "teaching", "pedagogy", "curriculum", "learning"] },
  { name: "Sociology & Social Sciences", keywords: ["sociolog", "social", "anthropolog", "psycholog", "politic", "gender"] },
  { name: "Languages & Literature", keywords: ["language", "literature", "linguistic", "english", "writing", "poetry"] },
  { name: "History & Philosophy", keywords: ["history", "philosoph", "ethic", "religio", "theolog"] },
  { name: "Arts & Design", keywords: ["art", "design", "architecture", "music", "creative", "media"] },
  { name: "Environment & Geography", keywords: ["environment", "climate", "geograph", "geolog", "ecolog", "sustainab"] },
  { name: "Artificial Intelligence", keywords: ["artificial intelligence", "ai ", "machine learning", "neural", "persona", "prompt"] },
];

export const FIELD_NAMES = FIELDS.map((f) => f.name);

type Rec = { title: string; subject: string | null; description: string | null; course_code: string | null };

/** Score a title against the learner's chosen fields (higher = better match). */
export function interestScore(book: Rec, interests: string[]): number {
  if (interests.length === 0) return 0;
  const hay = ` ${book.subject ?? ""} ${book.title} ${book.description ?? ""} ${book.course_code ?? ""} `.toLowerCase();
  let score = 0;
  for (const name of interests) {
    const field = FIELDS.find((f) => f.name === name);
    if (hay.includes(name.toLowerCase())) score += 3;
    for (const k of field?.keywords ?? []) if (hay.includes(k)) score += 1;
  }
  return score;
}
