"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function fail(e: { message: string } | null): ActionResult | null {
  return e ? { ok: false, error: e.message } : null;
}

// ---------- Mock checkout ----------
export async function checkout(bookId: string, kind: "purchase" | "rental"): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("mock_checkout", { p_book: bookId, p_kind: kind });
  const f = fail(error);
  if (f) return f;
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/library");
  return { ok: true };
}

// ---------- Discussions ----------
export async function openDiscussion(input: {
  bookId: string;
  title: string;
  page: number | null;
  visibility: "public" | "private";
  body: string;
}): Promise<ActionResult & { id?: string }> {
  const supabase = createClient();
  if (!input.title.trim()) return { ok: false, error: "Give your question a short title" };
  const { data, error } = await supabase.rpc("open_discussion", {
    p_book: input.bookId,
    p_title: input.title.trim(),
    p_page: input.page,
    p_visibility: input.visibility,
    p_body: input.body,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/discussions");
  return { ok: true, id: data as string };
}

export async function setDiscussionStatus(id: string, status: "approved" | "declined" | "closed") {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_discussion_status", { p_disc: id, p_status: status });
  if (error) return { ok: false, error: error.message } as ActionResult;
  revalidatePath(`/discussions/${id}`);
  revalidatePath("/discussions");
  return { ok: true } as ActionResult;
}

export async function setDiscussionVisibility(id: string, visibility: "public" | "private") {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_discussion_visibility", { p_disc: id, p_visibility: visibility });
  if (error) return { ok: false, error: error.message } as ActionResult;
  revalidatePath(`/discussions/${id}`);
  return { ok: true } as ActionResult;
}

export async function postMessage(discussionId: string, body: string, videoUrl?: string): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const text = body.trim();
  const video = videoUrl?.trim() || null;
  if (!text && !video) return { ok: false, error: "Message is empty" };
  if (video && !/^https?:\/\//i.test(video)) return { ok: false, error: "Video link must start with http:// or https://" };
  const { error } = await supabase
    .from("discussion_messages")
    .insert({ discussion_id: discussionId, author_id: user.id, body: text, video_url: video });
  if (error) return { ok: false, error: error.message.includes("row-level") ? "This discussion isn't open for replies" : error.message };
  return { ok: true };
}

// ---------- Consultations ----------
export async function requestConsultation(discussionId: string, whenIso: string, minutes: number): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("request_consultation", { p_disc: discussionId, p_when: whenIso, p_minutes: minutes });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/discussions/${discussionId}`);
  revalidatePath("/sessions");
  return { ok: true };
}

export async function respondConsultation(id: string, status: "confirmed" | "declined" | "completed", link: string, note: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("respond_consultation", { p_id: id, p_status: status, p_link: link, p_note: note });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/sessions");
  return { ok: true };
}

export async function payConsultation(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("mock_pay_consultation", { p_id: id });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/sessions");
  return { ok: true };
}

export async function cancelConsultation(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("cancel_consultation", { p_id: id });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/sessions");
  return { ok: true };
}

// ---------- Study assistant ----------
export async function payForAiUse(input: {
  bookId: string;
  kind: "summary" | "questions" | "topics" | "chat";
  scope: "page" | "book";
  pageFrom: number;
  pageTo: number;
  question?: string;
  tier?: number;
}): Promise<ActionResult & { usageId?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("mock_pay_ai", {
    p_book: input.bookId,
    p_kind: input.kind,
    p_scope: input.scope,
    p_page_from: input.pageFrom,
    p_page_to: input.pageTo,
    p_question: input.question ?? null,
    p_tier: input.tier ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, usageId: (data as { id: string }).id };
}

// ---------- Ratings ----------
export async function rateBook(bookId: string, rating: number, review: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("rate_book", { p_book: bookId, p_rating: rating, p_review: review.trim() || null });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/books/${bookId}`);
  return { ok: true };
}

// ---------- Profile ----------
export async function updateProfile(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const rate = Number(formData.get("session_rate"));
  const patch: Record<string, unknown> = {
    full_name: String(formData.get("full_name") || "").trim(),
    department: String(formData.get("department") || "").trim() || null,
    bio: String(formData.get("bio") || "").trim() || null,
  };
  if (formData.has("student_id")) patch.student_id = String(formData.get("student_id") || "").trim() || null;
  if (formData.has("session_rate") && Number.isFinite(rate) && rate >= 0) patch.session_rate = rate;
  await supabase.from("profiles").update(patch).eq("id", user.id);
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}

// ---------- Lecturer: manage titles ----------
export async function updateBook(bookId: string, home: "lecturer" | "publisher", formData: FormData) {
  const supabase = createClient();
  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : Number(v);
  };
  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;
  // Note: ai_price is intentionally never written here — the study assistant
  // price is platform-controlled, not settable from the lecturer/publisher form.
  const { error } = await supabase
    .from("books")
    .update({
      title: String(formData.get("title") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      course_code: String(formData.get("course_code") || "").trim().toUpperCase() || null,
      subject: str("subject"),
      authors: str("authors"),
      journal_name: str("journal_name"),
      published_year: num("published_year"),
      doi: str("doi"),
      buy_price: num("buy_price"),
      rent_price: num("rent_price"),
      rent_days: num("rent_days") ?? 14,
      published: formData.get("published") === "on",
    })
    .eq("id", bookId);
  if (error) redirect(`/${home}/books/${bookId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/${home}`);
  redirect(`/${home}?saved=1`);
}

export async function deleteBook(bookId: string, home: "lecturer" | "publisher" = "lecturer") {
  const supabase = createClient();
  const { count } = await supabase.from("entitlements").select("id", { count: "exact", head: true }).eq("book_id", bookId);
  if (count && count > 0) {
    redirect(`/${home}/books/${bookId}?error=${encodeURIComponent("Students have bought or rented this title, so it can't be deleted. Unpublish it instead.")}`);
  }
  const { data: book } = await supabase.from("books").select("file_path, cover_path").eq("id", bookId).single();
  const { error } = await supabase.from("books").delete().eq("id", bookId);
  if (!error && book) {
    await supabase.storage.from("books").remove([book.file_path]);
    if (book.cover_path) await supabase.storage.from("covers").remove([book.cover_path]);
  }
  revalidatePath(`/${home}`);
  redirect(`/${home}`);
}
