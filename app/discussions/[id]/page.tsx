import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { StatusChip } from "@/components/status-chip";
import { Thread } from "@/components/thread";
import { DiscussionControls } from "@/components/discussion-controls";
import { BookSession } from "@/components/book-session";
import { cedis, dateTime } from "@/lib/format";
import type { Consultation, Discussion, Message } from "@/lib/types";

export default async function DiscussionPage({ params }: { params: { id: string } }) {
  const { supabase, user, profile } = await requireProfile();
  const { data } = await supabase
    .from("discussions")
    .select(
      "*, book:books(id, title, course_code), student:profiles!discussions_student_id_fkey(id, full_name, student_id), lecturer:profiles!discussions_lecturer_id_fkey(id, full_name, session_rate, immediate_session_price, group_session_price, private_session_schedule)"
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!data) notFound();
  const d = data as Discussion & {
    book: { id: string; title: string; course_code: string | null };
    student: { id: string; full_name: string; student_id: string | null };
    lecturer: {
      id: string;
      full_name: string;
      session_rate: number;
      immediate_session_price: number;
      group_session_price: number;
      private_session_schedule: { days: string[]; start: string; end: string } | null;
    };
  };

  const [{ data: msgs }, { data: cons }] = await Promise.all([
    supabase.from("discussion_messages").select("*").eq("discussion_id", d.id).order("created_at"),
    supabase.from("consultations").select("*").eq("discussion_id", d.id).order("created_at", { ascending: false }),
  ]);
  const authorIds = Array.from(new Set([d.student_id, d.lecturer_id, ...(msgs ?? []).map((m) => m.author_id as string)]));
  const { data: people } = await supabase.from("profiles").select("id, full_name, role").in("id", authorIds);

  const isLecturer = user.id === d.lecturer_id;
  const isAuthor = user.id === d.student_id;
  const names = Object.fromEntries((people ?? []).map((p) => [p.id, { name: p.full_name as string, role: p.role as string }]));
  const consultations = (cons ?? []) as Consultation[];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <div className="space-y-2">
          <Link href={`/books/${d.book.id}`} className="text-sm text-forest hover:underline">
            {d.book.course_code ? `${d.book.course_code} · ` : ""}
            {d.book.title}
            {d.page ? ` · page ${d.page}` : ""}
          </Link>
          <h1 className="text-2xl font-semibold sm:text-3xl">{d.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            <StatusChip value={d.status} />
            <StatusChip value={d.visibility} />
            <span>
              opened by {d.student.full_name}
 · {dateTime(d.created_at)}
            </span>
            {d.page && (
              <Link href={`/read/${d.book.id}`} className="text-forest underline">Open the book</Link>
            )}
          </div>
        </div>

        <Thread
          discussionId={d.id}
          initial={(msgs ?? []) as Message[]}
          names={names}
          me={user.id}
          lecturerId={d.lecturer_id}
          canPost={d.status === "approved"}
          status={d.status}
        />
      </div>

      <aside className="space-y-4">
        <DiscussionControls id={d.id} status={d.status} visibility={d.visibility} isLecturer={isLecturer} isAuthor={isAuthor} />

        {(isAuthor || isLecturer) && d.visibility === "private" && (
          <div className="card space-y-3 p-4">
            <div>
              <h3 className="font-semibold">One-on-one session</h3>
              <p className="text-xs text-ink-soft">
                {d.lecturer.full_name} charges {cedis(d.lecturer.session_rate)} per 30 minutes.
              </p>
            </div>
            {consultations.length > 0 && (
              <ul className="space-y-2">
                {consultations.map((c) => (
                  <li key={c.id} className="rounded-md border border-paper-edge bg-white p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>{dateTime(c.proposed_at)}</span>
                      <StatusChip value={c.status} />
                    </div>
                    <p className="text-xs text-ink-faint">
                      {c.kind === "private" ? "One-on-one" : c.kind === "immediate" ? "Immediate" : "Group"} · {c.duration_minutes} min · {cedis(c.fee)} ·{" "}
                      {c.paid ? "paid" : "unpaid"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {isAuthor && (
              <BookSession
                bookId={d.book.id}
                rate={d.lecturer.session_rate}
                immediateRate={d.lecturer.immediate_session_price}
                groupRate={d.lecturer.group_session_price}
                schedule={d.lecturer.private_session_schedule}
              />
            )}
            <Link href="/sessions" className="block text-xs text-forest underline">Manage all sessions</Link>
          </div>
        )}
        {isAuthor && d.visibility === "public" && (
          <p className="card p-4 text-xs text-ink-soft">Want a paid one-on-one session with your lecturer? Make this discussion private first.</p>
        )}
      </aside>
    </div>
  );
}
