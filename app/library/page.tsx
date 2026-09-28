import Link from "next/link";
import { requireStudent } from "@/lib/session";
import { BookCover } from "@/components/book-cover";
import { AccessBadge } from "@/components/access-badge";
import { bestAccess } from "@/lib/access";
import type { Book, Entitlement } from "@/lib/types";

export default async function LibraryPage() {
  const { supabase, user, profile } = await requireStudent();

  const [{ data: ents }, { data: progress }, { data: bookmarks }] = await Promise.all([
    supabase.from("entitlements").select("*, book:books(*)").eq("student_id", user.id).order("created_at", { ascending: false }),
    supabase.from("reading_progress").select("*").eq("student_id", user.id),
    supabase.from("bookmarks").select("book_id").eq("student_id", user.id),
  ]);

  const byBook = new Map<string, { book: Book; ents: Entitlement[] }>();
  for (const e of (ents ?? []) as (Entitlement & { book: Book })[]) {
    const cur = byBook.get(e.book_id) ?? { book: e.book, ents: [] };
    cur.ents.push(e);
    byBook.set(e.book_id, cur);
  }
  const prog = new Map((progress ?? []).map((p) => [p.book_id as string, p as { current_page: number; updated_at: string }]));
  const bmCount = new Map<string, number>();
  for (const b of bookmarks ?? []) bmCount.set(b.book_id, (bmCount.get(b.book_id) ?? 0) + 1);

  const items = Array.from(byBook.values())
    .map((x) => ({ ...x, access: bestAccess(x.ents)!, progress: prog.get(x.book.id) }))
    .sort((a, b) => (b.progress?.updated_at ?? "").localeCompare(a.progress?.updated_at ?? ""));

  const continueItem = items.find((i) => i.access.active && i.progress);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">My shelf</p>
        <h1 className="text-3xl font-semibold">Hello, {profile.full_name.split(" ")[0] || "reader"}</h1>
      </div>

      {continueItem && (
        <Link href={`/read/${continueItem.book.id}`} className="card flex items-center gap-5 p-5 transition hover:bg-white">
          <BookCover title={continueItem.book.title} courseCode={continueItem.book.course_code} coverPath={continueItem.book.cover_path} size="sm" />
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Continue reading</p>
            <p className="font-serif text-xl font-semibold">{continueItem.book.title}</p>
            <ProgressBar page={continueItem.progress!.current_page} total={continueItem.book.page_count} />
          </div>
          <span className="btn-primary">Resume</span>
        </Link>
      )}

      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="mb-4 text-ink-soft">Your shelf is empty. Buy or rent a title to start reading.</p>
          <Link href="/browse" className="btn-primary">Browse titles</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map(({ book, access, progress }) => (
            <div key={book.id} className="card flex gap-4 p-4">
              <BookCover title={book.title} courseCode={book.course_code} coverPath={book.cover_path} size="sm" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/books/${book.id}`} className="truncate font-serif text-lg font-semibold hover:underline">{book.title}</Link>
                  <AccessBadge kind={access.kind} expiresAt={access.expiresAt} />
                </div>
                <ProgressBar page={progress?.current_page ?? 0} total={book.page_count} />
                <p className="text-xs text-ink-faint">{bmCount.get(book.id) ?? 0} bookmark(s)</p>
                <div className="mt-auto flex gap-2 pt-2">
                  {access.active ? (
                    <Link href={`/read/${book.id}`} className="btn-primary py-1.5">{progress ? `Resume p. ${progress.current_page}` : "Start reading"}</Link>
                  ) : (
                    <Link href={`/books/${book.id}`} className="btn-gold py-1.5">Renew rental</Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ page, total }: { page: number; total: number | null }) {
  const pct = total ? Math.min(100, Math.round((page / total) * 100)) : 0;
  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-deep">
        <div className="h-full rounded-full bg-forest" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-ink-faint">{page ? `p. ${page}${total ? ` of ${total}` : ""}` : "Not started"}</span>
    </div>
  );
}
