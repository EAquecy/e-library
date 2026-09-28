import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { Reader } from "@/components/reader";
import { bestAccess } from "@/lib/access";
import type { Book, Entitlement } from "@/lib/types";

export default async function ReadPage({ params }: { params: { id: string } }) {
  const { supabase, user, profile } = await requireProfile();
  const { data: book } = await supabase.from("books").select("*").eq("id", params.id).maybeSingle();
  if (!book) notFound();
  const b = book as Book;
  const isOwner = b.lecturer_id === user.id;

  let expiresAt: string | null = null;
  if (!isOwner) {
    const { data: ents } = await supabase.from("entitlements").select("*").eq("book_id", b.id).eq("student_id", user.id);
    const access = bestAccess((ents ?? []) as Entitlement[]);
    if (!access?.active) {
      return (
        <div className="mx-auto max-w-md py-16 text-center">
          <h1 className="mb-2 text-2xl font-semibold">{access ? "Your rental has ended" : "You don't have access yet"}</h1>
          <p className="mb-6 text-ink-soft">Your saved page and bookmarks are kept. Renew or buy to keep reading.</p>
          <Link href={`/books/${b.id}`} className="btn-primary">See options</Link>
        </div>
      );
    }
    expiresAt = access.kind === "rental" ? access.expiresAt : null;
  }

  const [{ data: progress }, { data: bookmarks }] = await Promise.all([
    supabase.from("reading_progress").select("current_page").eq("student_id", user.id).eq("book_id", b.id).maybeSingle(),
    supabase.from("bookmarks").select("id, page, note").eq("student_id", user.id).eq("book_id", b.id).order("page"),
  ]);

  const watermark = [profile.full_name, profile.student_id, user.email].filter(Boolean).join(" · ");

  return (
    <Reader
      bookId={b.id}
      title={b.title}
      userId={user.id}
      isStudent={profile.role === "student" && !isOwner}
      initialPage={progress?.current_page ?? 1}
      initialBookmarks={(bookmarks ?? []) as { id: string; page: number; note: string | null }[]}
      watermark={watermark}
      expiresAt={expiresAt}
    />
  );
}
