import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { BookCover } from "@/components/book-cover";
import { AccessBadge } from "@/components/access-badge";
import { CheckoutPanel } from "@/components/checkout-panel";
import { OpenDiscussionButton } from "@/components/open-discussion";
import { StatusChip } from "@/components/status-chip";
import { RatingSummary } from "@/components/rating-stars";
import { RatingWidget } from "@/components/rating-widget";
import { bestAccess } from "@/lib/access";
import { shortDate } from "@/lib/format";
import type { Book, BookRating, Discussion, Entitlement } from "@/lib/types";

export default async function BookPage({ params }: { params: { id: string } }) {
  const { supabase, user, profile } = await requireProfile();

  const { data: bookRow } = await supabase
    .from("books")
    .select("*, lecturer:profiles!books_lecturer_id_fkey(id, full_name, department, bio)")
    .eq("id", params.id)
    .maybeSingle();
  if (!bookRow) notFound();
  const book = bookRow as Book & { lecturer: { id: string; full_name: string; department: string | null; bio: string | null } };
  const isOwner = book.lecturer_id === user.id;

  const [{ data: ents }, { data: discs }, { data: ratings }] = await Promise.all([
    supabase.from("entitlements").select("*").eq("book_id", book.id).eq("student_id", user.id),
    supabase
      .from("discussions")
      .select("*, student:profiles!discussions_student_id_fkey(full_name), discussion_messages(count)")
      .eq("book_id", book.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("book_ratings")
      .select("*, student:profiles!book_ratings_student_id_fkey(full_name)")
      .eq("book_id", book.id)
      .order("updated_at", { ascending: false }),
  ]);
  const access = bestAccess((ents ?? []) as Entitlement[]);
  const canRead = isOwner || !!access?.active;
  const everEntitled = (ents ?? []).length > 0;
  const discussions = (discs ?? []) as (Discussion & { student: { full_name: string } | null; discussion_messages: { count: number }[] })[];
  const bookRatings = (ratings ?? []) as (BookRating & { student: { full_name: string } | null })[];
  const ratingCount = bookRatings.length;
  const ratingAvg = ratingCount ? bookRatings.reduce((s, r) => s + r.rating, 0) / ratingCount : null;
  const myRating = bookRatings.find((r) => r.student_id === user.id) ?? null;

  return (
    <div className="space-y-10">
      <div className="grid gap-8 md:grid-cols-[12rem_1fr]">
        <div className="mx-auto md:mx-0">
          <BookCover title={book.title} courseCode={book.course_code} coverPath={book.cover_path} kind={book.kind} size="lg" />
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {book.course_code && <span className="chip bg-ink text-paper">{book.course_code}</span>}
            <span className="chip bg-paper-deep text-ink-soft">{book.kind}</span>
            {book.page_count && <span className="chip bg-paper-deep text-ink-soft">{book.page_count} pages</span>}
            {access && <AccessBadge kind={access.kind} expiresAt={access.expiresAt} />}
            {!book.published && <span className="chip bg-clay-light text-clay">Unpublished</span>}
          </div>
          <h1 className="text-3xl font-semibold sm:text-4xl">{book.title}</h1>
          <p className="text-sm text-ink-soft">
            by <span className="font-medium text-ink">{book.lecturer.full_name}</span>
            {book.lecturer.department && <> · {book.lecturer.department}</>}
          </p>
          <RatingSummary average={ratingAvg} count={ratingCount} />
          {book.description && <p className="max-w-2xl whitespace-pre-line text-ink-soft">{book.description}</p>}

          <div className="flex flex-wrap gap-2 pt-2">
            {canRead && <Link href={`/read/${book.id}`} className="btn-primary px-5">{isOwner ? "Preview" : "Read now"}</Link>}
            {isOwner && <Link href={`/lecturer/books/${book.id}`} className="btn-ghost">Edit title</Link>}
            {profile.role === "student" && access?.active && <OpenDiscussionButton bookId={book.id} />}
          </div>

          {profile.role === "student" && access?.kind !== "purchase" && (
            <div className="max-w-xl pt-2">
              <CheckoutPanel
                bookId={book.id}
                buyPrice={book.buy_price}
                rentPrice={book.rent_price}
                rentDays={book.rent_days}
                canBuy={book.published}
                hasActiveRental={!!access?.active}
              />
            </div>
          )}
        </div>
      </div>

      <section id="ratings" className="space-y-3 scroll-mt-20">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Ratings &amp; reviews</h2>
          <RatingSummary average={ratingAvg} count={ratingCount} />
        </div>
        <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
          {profile.role === "student" && everEntitled && (
            <RatingWidget bookId={book.id} initialRating={myRating?.rating ?? null} initialReview={myRating?.review ?? null} />
          )}
          {bookRatings.filter((r) => r.review).length === 0 ? (
            <p className="card p-6 text-sm text-ink-soft self-start">No written reviews yet.</p>
          ) : (
            <ul className="card divide-y divide-paper-edge self-start">
              {bookRatings
                .filter((r) => r.review)
                .map((r) => (
                  <li key={r.id} className="space-y-1 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{r.student?.full_name ?? "Student"}</span>
                      <span className="text-xs text-amber-500">{"★".repeat(r.rating)}</span>
                    </div>
                    <p className="text-sm text-ink-soft">{r.review}</p>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Discussions</h2>
          <p className="text-xs text-ink-faint">Public threads are visible to everyone with access to this title.</p>
        </div>
        {discussions.length === 0 ? (
          <p className="card p-6 text-sm text-ink-soft">
            {canRead ? "No discussions yet." : "Buy or rent this title to read and join its discussions."}
          </p>
        ) : (
          <ul className="card divide-y divide-paper-edge">
            {discussions.map((d) => (
              <li key={d.id}>
                <Link href={`/discussions/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.title}</p>
                    <p className="text-xs text-ink-faint">
                      {d.student?.full_name} · {shortDate(d.created_at)}
                      {d.page ? ` · p. ${d.page}` : ""} · {d.discussion_messages?.[0]?.count ?? 0} message(s)
                    </p>
                  </div>
                  <StatusChip value={d.visibility} />
                  <StatusChip value={d.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
