import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { BookCover } from "@/components/book-cover";
import { cedis } from "@/lib/format";
import type { Book } from "@/lib/types";

export default async function BrowsePage({ searchParams }: { searchParams: { q?: string; course?: string } }) {
  const { supabase } = await requireProfile();
  const q = (searchParams.q ?? "").trim();
  const course = (searchParams.course ?? "").trim();

  let query = supabase
    .from("books")
    .select("*, lecturer:profiles!books_lecturer_id_fkey(full_name, department)")
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (q) query = query.or(`title.ilike.%${q.replace(/[%,()]/g, "")}%,description.ilike.%${q.replace(/[%,()]/g, "")}%`);
  if (course) query = query.eq("course_code", course);
  const { data } = await query;
  const books = (data ?? []) as (Book & { lecturer: { full_name: string; department: string | null } | null })[];

  const { data: codes } = await supabase.from("books").select("course_code").eq("published", true).not("course_code", "is", null);
  const courseCodes = Array.from(new Set((codes ?? []).map((c) => c.course_code as string))).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="text-3xl font-semibold">Browse titles</h1>
        </div>
        <form className="flex w-full max-w-md gap-2">
          <input name="q" defaultValue={q} placeholder="Search title or topic" className="input" />
          {course && <input type="hidden" name="course" value={course} />}
          <button className="btn-primary">Search</button>
        </form>
      </div>

      {courseCodes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link href={q ? `/browse?q=${encodeURIComponent(q)}` : "/browse"} className={`chip py-1 ${!course ? "bg-ink text-paper" : "bg-paper-deep text-ink-soft"}`}>All courses</Link>
          {courseCodes.map((c) => (
            <Link
              key={c}
              href={`/browse?course=${encodeURIComponent(c)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`chip py-1 ${course === c ? "bg-ink text-paper" : "bg-paper-deep text-ink-soft"}`}
            >
              {c}
            </Link>
          ))}
        </div>
      )}

      {books.length === 0 ? (
        <div className="card p-10 text-center text-ink-soft">No titles match yet. Check back once your lecturers publish.</div>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {books.map((b) => (
            <Link key={b.id} href={`/books/${b.id}`} className="group space-y-2">
              <div className="transition group-hover:-translate-y-1">
                <BookCover title={b.title} courseCode={b.course_code} coverPath={b.cover_path} kind={b.kind} />
              </div>
              <div>
                <p className="line-clamp-2 font-serif font-semibold leading-snug">{b.title}</p>
                <p className="text-xs text-ink-faint">{b.lecturer?.full_name}</p>
                <p className="mt-1 text-xs font-medium text-forest">
                  {b.buy_price !== null && <>Buy {cedis(b.buy_price)}</>}
                  {b.buy_price !== null && b.rent_price !== null && <span className="text-ink-faint"> · </span>}
                  {b.rent_price !== null && <>Rent {cedis(b.rent_price)}</>}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
