import Link from "next/link";
import { requireStudent } from "@/lib/session";
import { BookCover } from "@/components/book-cover";
import { AccessBadge } from "@/components/access-badge";
import { ShelfRate } from "@/components/shelf-rate";
import { bestAccess } from "@/lib/access";
import { shortDate } from "@/lib/format";
import type { Book, Entitlement } from "@/lib/types";

type BookWithOwner = Book & { lecturer: { id: string; full_name: string; role: string } | null };

export default async function LibraryPage({ searchParams }: { searchParams: { q?: string } }) {
  const { supabase, user, profile } = await requireStudent();
  const q = (searchParams.q ?? "").trim();

  const [{ data: ents }, { data: progress }, { data: bookmarks }, { data: myRatings }] = await Promise.all([
    supabase
      .from("entitlements")
      .select("*, book:books(*, lecturer:profiles!books_lecturer_id_fkey(id, full_name, role))")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("reading_progress").select("*").eq("student_id", user.id),
    supabase.from("bookmarks").select("book_id").eq("student_id", user.id),
    supabase.from("book_ratings").select("book_id, rating").eq("student_id", user.id),
  ]);
  const myRatingByBook = new Map((myRatings ?? []).map((r) => [r.book_id as string, r.rating as number]));

  const byBook = new Map<string, { book: BookWithOwner; ents: Entitlement[] }>();
  for (const e of (ents ?? []) as (Entitlement & { book: BookWithOwner })[]) {
    const cur = byBook.get(e.book_id) ?? { book: e.book, ents: [] };
    cur.ents.push(e);
    byBook.set(e.book_id, cur);
  }
  const prog = new Map((progress ?? []).map((p) => [p.book_id as string, p as { current_page: number; updated_at: string }]));
  const bmCount = new Map<string, number>();
  for (const b of bookmarks ?? []) bmCount.set(b.book_id, (bmCount.get(b.book_id) ?? 0) + 1);

  const allItems = Array.from(byBook.values())
    .map((x) => ({
      ...x,
      access: bestAccess(x.ents)!,
      progress: prog.get(x.book.id),
      dateBought: x.ents.reduce((min, e) => (e.created_at < min ? e.created_at : min), x.ents[0].created_at),
    }))
    .sort((a, b) => (b.progress?.updated_at ?? "").localeCompare(a.progress?.updated_at ?? ""));

  const continueItem = allItems.find((i) => i.access.active && i.progress);

  const items = q
    ? allItems.filter(
        (i) =>
          i.book.title.toLowerCase().includes(q.toLowerCase()) ||
          i.book.lecturer?.full_name.toLowerCase().includes(q.toLowerCase())
      )
    : allItems;

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">My shelf</p>
        <h1 className="text-3xl font-semibold">Hello, {profile.full_name.split(" ")[0] || "reader"}</h1>
      </div>

      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search your shelf by title or author…"
          className="input flex-1"
        />
        <button className="btn-primary">Search</button>
        {q && <Link href="/library" className="btn-ghost">Clear</Link>}
      </form>

      {continueItem && !q && (
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
          {q ? (
            <p className="text-ink-soft">No titles on your shelf match &ldquo;{q}&rdquo;.</p>
          ) : (
            <>
              <p className="mb-4 text-ink-soft">Your shelf is empty. Buy or rent a title to start reading.</p>
              <Link href="/browse" className="btn-primary">Browse titles</Link>
            </>
          )}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-paper-edge text-left text-xs font-semibold uppercase tracking-wider text-ink-faint">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">Date bought</th>
                <th className="px-4 py-3">Last read</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-edge">
              {items.map(({ book, access, progress, dateBought }) => (
                <tr key={book.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <BookCover title={book.title} courseCode={book.course_code} coverPath={book.cover_path} size="sm" />
                      <div className="min-w-0">
                        <Link href={`/books/${book.id}`} className="font-serif font-semibold hover:underline">{book.title}</Link>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <AccessBadge kind={access.kind} expiresAt={access.expiresAt} />
                          <span className="text-xs text-ink-faint">{bmCount.get(book.id) ?? 0} bookmark(s)</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {book.lecturer ? (
                      <Link href={`/people/${book.lecturer.id}`} className="text-forest hover:underline">
                        {book.lecturer.full_name}
                      </Link>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                    {book.lecturer && (
                      <span className="ml-1 text-xs text-ink-faint">· {book.lecturer.role === "publisher" ? "Publisher" : "Lecturer"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{shortDate(dateBought)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{progress ? shortDate(progress.updated_at) : "Not started"}</td>
                  <td className="px-4 py-3">
                    <ProgressBar page={progress?.current_page ?? 0} total={book.page_count} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {access.active ? (
                        <Link href={`/read/${book.id}`} className="btn-primary py-1.5 whitespace-nowrap">{progress ? `Resume p. ${progress.current_page}` : "Start reading"}</Link>
                      ) : (
                        <Link href={`/books/${book.id}`} className="btn-gold py-1.5 whitespace-nowrap">Renew rental</Link>
                      )}
                      <ShelfRate bookId={book.id} initialRating={myRatingByBook.get(book.id) ?? null} />
                      <Link href={`/books/${book.id}#ratings`} className="text-xs font-medium text-ink-faint hover:text-forest hover:underline">
                        Review
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProgressBar({ page, total }: { page: number; total: number | null }) {
  const pct = total ? Math.min(100, Math.round((page / total) * 100)) : 0;
  return (
    <div className="flex w-32 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-deep">
        <div className="h-full rounded-full bg-forest" style={{ width: `${pct}%` }} />
      </div>
      <span className="whitespace-nowrap text-xs text-ink-faint">{page ? `p. ${page}${total ? ` of ${total}` : ""}` : "—"}</span>
    </div>
  );
}
