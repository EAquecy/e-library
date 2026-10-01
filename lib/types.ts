export type Role = "student" | "lecturer" | "publisher";

export type Publication = { title: string; url: string; date: string | null };

// Standardized availability: a set of weekdays plus one start/end time —
// never free text.
export type SessionSchedule = { days: string[]; start: string; end: string };

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  student_id: string | null;
  department: string | null;
  bio: string | null;
  session_rate: number;
  immediate_session_price: number;
  group_session_price: number;
  avatar_path: string | null;
  institution: string | null;
  publications: Publication[];
  private_session_schedule: SessionSchedule | null;
  public_session_schedule: SessionSchedule | null;
  profile_completed: boolean;
};

export type AvailabilityBlock = {
  id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  note: string | null;
  link: string | null;
  created_at: string;
};

export type Book = {
  id: string;
  lecturer_id: string;
  title: string;
  description: string;
  course_code: string | null;
  kind: "book" | "handout" | "publication";
  // Free-text subject/program tag, e.g. "Computer Science" — used for browse filtering.
  subject: string | null;
  // Citation-style fields, relevant mainly for kind === "publication".
  authors: string | null;
  journal_name: string | null;
  published_year: number | null;
  doi: string | null;
  cover_path: string | null;
  file_path: string;
  page_count: number | null;
  buy_price: number | null;
  rent_price: number | null;
  rent_days: number;
  published: boolean;
  ai_enabled: boolean;
  ai_price: number;
  molecule_price: number;
  // Prices for paid practice-question tiers beyond the free set, keyed by
  // tier level as a string ("1", "2", ...) so new tiers need no migration.
  ai_question_tier_prices: Record<string, number>;
  created_at: string;
};

export type BookRating = {
  id: string;
  book_id: string;
  student_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  updated_at: string;
};

export type AiUsage = {
  id: string;
  book_id: string;
  student_id: string;
  kind: "summary" | "questions" | "topics" | "chat" | "molecules";
  scope: "page" | "book";
  page_from: number;
  page_to: number;
  question: string | null;
  // 0 = the free practice-question set; 1, 2, ... = paid tiers; null for
  // non-"questions" kinds.
  tier_level: number | null;
  output: string | null;
  amount: number;
  payment_ref: string;
  created_at: string;
};

export type Entitlement = {
  id: string;
  book_id: string;
  student_id: string;
  kind: "purchase" | "rental";
  amount: number;
  payment_ref: string;
  expires_at: string | null;
  created_at: string;
};

export type Discussion = {
  id: string;
  book_id: string;
  student_id: string;
  lecturer_id: string;
  title: string;
  page: number | null;
  visibility: "public" | "private";
  status: "pending" | "approved" | "declined" | "closed";
  created_at: string;
};

export type Message = {
  id: string;
  discussion_id: string;
  author_id: string;
  body: string;
  video_url: string | null;
  created_at: string;
};

export type Consultation = {
  id: string;
  discussion_id: string;
  student_id: string;
  lecturer_id: string;
  proposed_at: string | null;
  duration_minutes: number;
  fee: number;
  kind: "private" | "immediate" | "group";
  status: "requested" | "confirmed" | "declined" | "completed" | "cancelled";
  paid: boolean;
  payment_ref: string | null;
  meeting_link: string | null;
  lecturer_note: string | null;
  created_at: string;
};

export type ConsultationAttendee = {
  id: string;
  consultation_id: string;
  email: string;
  student_id: string | null;
  created_at: string;
};
