import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { StatusChip } from "@/components/status-chip";
import { SessionActions } from "@/components/session-actions";
import { cedis, dateTime } from "@/lib/format";
import type { Consultation } from "@/lib/types";

type Row = Consultation & {
  discussion: { id: string; title: string; book: { title: string; course_code: string | null } | null } | null;
  student: { full_name: string; student_id: string | null } | null;
  lecturer: { full_name: string } | null;
};

export default async function SessionsPage() {
  const { supabase, user, profile } = await requireProfile();
  const isLecturer = profile.role === "lecturer";
  const { data } = await supabase
    .from("consultations")
    .select(
      "*, discussion:discussions(id, title, book:books(title, course_code)), student:profiles!consultations_student_id_fkey(full_name, student_id), lecturer:profiles!consultations_lecturer_id_fkey(full_name)"
    )
    .eq(isLecturer ? "lecturer_id" : "student_id", user.id)
    .order("proposed_at", { ascending: true });
  const rows = (data ?? []) as Row[];
  const open = rows.filter((r) => r.status === "requested" || r.status === "confirmed");
  const past = rows.filter((r) => !(r.status === "requested" || r.status === "confirmed"));

  const earned = rows.filter((r) => r.paid).reduce((s, r) => s + Number(r.fee), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">One-on-one</p>
          <h1 className="text-3xl font-semibold">Sessions</h1>
          <p className="text-sm text-ink-soft">
            {isLecturer
              ? "Confirm requests and add a meeting link. Students pay once you confirm."
              : "Book a session from any private discussion. Pay after your lecturer confirms."}
          </p>
        </div>
        {isLecturer && (
          <div className="card px-4 py-2 text-right">
            <p className="text-xs text-ink-faint">Paid sessions</p>
            <p className="font-serif text-xl font-semibold">{cedis(earned)}</p>
          </div>
        )}
      </div>

      {[
        { t: "Upcoming and pending", r: open, e: "No open sessions." },
        { t: "History", r: past, e: "Nothing here yet." },
      ].map((s) => (
        <section key={s.t} className="space-y-2">
          <h2 className="text-lg font-semibold">{s.t}</h2>
          {s.r.length === 0 ? (
            <p className="card p-5 text-sm text-ink-soft">{s.e}</p>
          ) : (
            <ul className="space-y-3">
              {s.r.map((c) => (
                <li key={c.id} className="card flex flex-wrap items-start gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{dateTime(c.proposed_at)}</p>
                      <StatusChip value={c.status} />
                      <span className={`chip ${c.paid ? "bg-forest-light text-forest" : "bg-paper-deep text-ink-soft"}`}>{c.paid ? "Paid" : "Unpaid"}</span>
                    </div>
                    <p className="text-sm text-ink-soft">
                      {c.duration_minutes} min · {cedis(c.fee)} ·{" "}
                      {isLecturer ? `${c.student?.full_name}${c.student?.student_id ? ` (${c.student.student_id})` : ""}` : `with ${c.lecturer?.full_name}`}
                    </p>
                    {c.discussion && (
                      <Link href={`/discussions/${c.discussion.id}`} className="block truncate text-sm text-forest hover:underline">
                        {c.discussion.book?.course_code ? `${c.discussion.book.course_code} · ` : ""}
                        {c.discussion.title}
                      </Link>
                    )}
                    {c.meeting_link && (c.paid || isLecturer) && (
                      <p className="text-sm">
                        Meeting link: <a href={c.meeting_link} target="_blank" rel="noreferrer" className="text-forest underline">{c.meeting_link}</a>
                      </p>
                    )}
                    {c.meeting_link && !c.paid && !isLecturer && <p className="text-xs text-ink-faint">Meeting link unlocks after payment.</p>}
                    {c.lecturer_note && <p className="text-sm text-ink-soft">Note: {c.lecturer_note}</p>}
                  </div>
                  <SessionActions c={c} isLecturer={isLecturer} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
