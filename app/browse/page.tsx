import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { BookCover } from "@/components/book-cover";
import { BrowseFilters } from "@/components/browse-filters";
import { RatingSummary } from "@/components/rating-stars";
import { cedis } from "@/lib/format";
import { interestScore } from "@/lib/fields";
import type { Book } from "@/lib/types";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    course?: string;
    subject?: string;
    dept?: string;
    lecturer?: string;
    kind?: string;
    searchBy?: string;
    yearMode?: string;
    year?: string;
    yearFrom?: string;
    yearTo?: string;
  };
}) {
  const { supabase, profile } = await requireProfile();
  const q = (searchParams.q ?? "").trim();
  const course = (searchParams.course ?? "").trim();
  const subject = (searchParams.subject ?? "").trim();
  const dept = (searchParams.dept ?? "").trim();
  const lecturer = (searchParams.lecturer ?? "").trim();
  const kind = (searchParams.kind ?? "").trim();
  const searchBy = searchParams.searchBy === "person" ? "person" : "title";
  const yearMode = searchParams.yearMode === "range" ? "range" : "exact";
  const year = (searchParams.year ?? "").trim();
  const yearFrom = (searchParams.yearFrom ?? "").trim();
  const yearTo = (searchParams.yearTo ?? "").trim();

  let query = supabase
    .from("books")
    .select("*, lecturer:profiles!books_lecturer_id_fkey!inner(id, full_name, department)")
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (q) {
    const safe = q.replace(/[%,()]/g, "");
    if (searchBy === "person") query = query.ilike("lecturer.full_name", `%${safe}%`);
    else query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
  }
  if (course) query = query.eq("course_code", course);
  if (subject) query = query.eq("subject", subject);
  if (dept) query = query.eq("lecturer.department", dept);
  if (lecturer) query = query.eq("lecturer_id", lecturer);
  if (kind) query = query.eq("kind", kind);
  if (yearMode === "range") {
    if (yearFrom) query = query.gte("published_year", Number(yearFrom));
    if (yearTo) query = query.lte("published_year", Number(yearTo));
  } else if (year) {
    query = query.eq("published_year", Number(year));
  }
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

  // Recommendations: learners only, on the unfiltered catalogue.
  const isLearner = profile.role === "student";
  const interests = profile.interests ?? [];
  const filtering = !!(q || course || subject || dept || lecturer || kind || year || yearFrom || yearTo);
  let recommended: (Book & { lecturer: { id: string; full_name: string; department: string | null } | null })[] = [];
  if (isLearner && !filtering && interests.length > 0) {
    recommended = books
      .map((b) => ({ b, score: interestScore(b, interests) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.b);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="text-3xl font-semibold">Browse titles</h1>
        </div>
        <form className="flex w-full max-w-md flex-col gap-2">
          <div className="flex gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder={searchBy === "person" ? "Search lecturer or publisher name" : "Search title or topic"}
              className="input"
            />
            <button className="btn-primary">Search</button>
          </div>
          <div className="flex gap-4 text-xs text-ink-soft">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="searchBy" value="title" defaultChecked={searchBy !== "person"} /> Title / topic
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="searchBy" value="person" defaultChecked={searchBy === "person"} /> Lecturer / publisher name
            </label>
          </div>
          {course && <input type="hidden" name="course" value={course} />}
          {subject && <input type="hidden" name="subject" value={subject} />}
          {dept && <input type="hidden" name="dept" value={dept} />}
          {lecturer && <input type="hidden" name="lecturer" value={lecturer} />}
          {kind && <input type="hidden" name="kind" value={kind} />}
          {yearMode === "range" ? (
            <>
              <input type="hidden" name="yearMode" value="range" />
              {yearFrom && <input type="hidden" name="yearFrom" value={yearFrom} />}
              {yearTo && <input type="hidden" name="yearTo" value={yearTo} />}
            </>
          ) : (
            year && <input type="hidden" name="year" value={year} />
          )}
        </form>
      </div>

      {isLearner && !filtering && interests.length === 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <p className="text-ink-soft">Tell us which fields you&apos;re interested in and we&apos;ll recommend titles for you.</p>
          <Link href="/settings" className="btn-ghost">Choose fields</Link>
        </div>
      )}

      {recommended.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-semibold">Recommended for you</h2>
            <Link href="/settings" className="text-xs text-forest underline">Edit interests</Link>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            {recommended.map((b) => (
              <Link key={b.id} href={`/books/${b.id}`} className="group space-y-2">
                <div className="transition group-hover:-translate-y-1">
                  <BookCover title={b.title} courseCode={b.course_code} coverPath={b.cover_path} kind={b.kind} />
                </div>
                <div>
                  <p className="line-clamp-2 font-serif font-semibold leading-snug">{b.title}</p>
                  <p className="text-xs text-ink-faint">{b.lecturer?.full_name}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

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
                  <p className="text-xs text-ink-faint">
                    {b.lecturer?.full_name}
                    {b.published_year ? ` · ${b.published_year}` : ""}
                  </p>
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
