import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { BookCover } from "@/components/book-cover";
import { BrowseFilters } from "@/components/browse-filters";
import { RatingSummary } from "@/components/rating-stars";
import { cedis } from "@/lib/format";
import type { Book } from "@/lib/types";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { q?: string; course?: string; subject?: string; dept?: string; lecturer?: string };
}) {
  const { supabase } = await requireProfile();
  const q = (searchParams.q ?? "").trim();
  const course = (searchParams.course ?? "").trim();
  const subject = (searchParams.subject ?? "").trim();
  const dept = (searchParams.dept ?? "").trim();
  const lecturer = (searchParams.lecturer ?? "").trim();

  let query = supabase
    .from("books")
    .select("*, lecturer:profiles!books_lecturer_id_fkey!inner(id, full_name, department)")
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (q) query = query.or(`title.ilike.%${q.replace(/[%,()]/g, "")}%,description.ilike.%${q.replace(/[%,()]/g, "")}%`);
  if (course) query = query.eq("course_code", course);
  if (subject) query = query.eq("subject", subject);
  if (dept) query = query.eq("lecturer.department", dept);
  if (lecturer) query = query.eq("lecturer_id", lecturer);
  const { data } = await query;
  const books = (data ?? []) as (Book & { lecturer: { id: string; full_name: string; department: string | null } | null })[];

  const [{ data: codes }, { data: subjectRows }, { data: facultyBooks }] = await Promise.all([
    supabase.from("books").select("course_code").eq("published", true).not("course_code", "is", null),
    supabase.from("books").select("subject").eq("published", true).not("subject", "is", null),
    supabase.from("books").select("lecturer_id, lecturer:profiles!books_lecturer_id_fkey(full_name, department)").eq("published", true),
  ]);
  const courseCodes = Array.from(new Set((codes ?? []).map((c) => c.course_code as string))).sort();
  const subjects = Array.from(new Set((subjectRows ?? []).map((s) => s.subject as string))).sort();
  const facultyRows = (facultyBooks ?? []) as unknown as { lecturer_id: string; lecturer: { full_name: string; department: string | null } | null }[];
  const departments = Array.from(new Set(facultyRows.map((r) => r.lecturer?.department).filter((d): d is string => !!d))).sort();
  const lecturerMap = new Map<string, string>();
  facultyRows.forEach((r) => {
    if (r.lecturer?.full_name) lecturerMap.set(r.lecturer_id, r.lecturer.full_name);
  });
  const lecturers = Array.from(lecturerMap, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));

  const ratingsByBook: Record<string, { avg: number; count: number }> = {};
  if (books.length > 0) {
    const { data: ratings } = await supabase.from("book_ratings").select("book_id, rating").in("book_id", books.map((b) => b.id));
    (ratings ?? []).forEach((r) => {
      const cur = ratingsByBook[r.book_id as string] ?? { avg: 0, count: 0 };
      cur.avg = (cur.avg * cur.count + (r.rating as number)) / (cur.count + 1);
      cur.count += 1;
      ratingsByBook[r.book_id as string] = cur;
    });
  }

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
          {subject && <input type="hidden" name="subject" value={subject} />}
          {dept && <input type="hidden" name="dept" value={dept} />}
          {lecturer && <input type="hidden" name="lecturer" value={lecturer} />}
          <button className="btn-primary">Search</button>
        </form>
      </div>

      <BrowseFilters courseCodes={courseCodes} subjects={subjects} departments={departments} lecturers={lecturers} />

      {books.length === 0 ? (
        <div className="card p-10 text-center text-ink-soft">No titles match yet. Check back once your lecturers publish.</div>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {books.map((b) => {
            const r = ratingsByBook[b.id];
            return (
              <Link key={b.id} href={`/books/${b.id}`} className="group space-y-2">
                <div className="transition group-hover:-translate-y-1">
                  <BookCover title={b.title} courseCode={b.course_code} coverPath={b.cover_path} kind={b.kind} />
                </div>
                <div>
                  <p className="line-clamp-2 font-serif font-semibold leading-snug">{b.title}</p>
                  <p className="text-xs text-ink-faint">{b.lecturer?.full_name}</p>
                  <RatingSummary average={r?.avg ?? null} count={r?.count ?? 0} />
                  <p className="mt-1 text-xs font-medium text-forest">
                    {b.buy_price !== null && <>Buy {cedis(b.buy_price)}</>}
                    {b.buy_price !== null && b.rent_price !== null && <span className="text-ink-faint"> · </span>}
                    {b.rent_price !== null && <>Rent {cedis(b.rent_price)}</>}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
