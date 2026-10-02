import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { StatusChip } from "@/components/status-chip";
import { markDiscussionsSeen } from "@/app/actions";
import { shortDate } from "@/lib/format";
import type { Discussion } from "@/lib/types";

type Row = Discussion & {
  book: { title: string; course_code: string | null } | null;
  student: { full_name: string; student_id: string | null } | null;
  discussion_messages: { count: number }[];
};

export default async function DiscussionsPage() {
  const { supabase, user, profile } = await requireProfile();
  const isLecturer = profile.role === "lecturer" || profile.role === "publisher";
  if (isLecturer) await markDiscussionsSeen();

  const { data } = await supabase
    .from("discussions")
    .select("*, book:books(title, course_code), student:profiles!discussions_student_id_fkey(full_name, student_id), discussion_messages(count)")
    .eq(isLecturer ? "lecturer_id" : "student_id", user.id)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  let publicRows: Row[] = [];
  if (!isLecturer) {
    const { data: pub } = await supabase
      .from("discussions")
      .select("*, book:books(title, course_code), student:profiles!discussions_student_id_fkey(full_name, student_id), discussion_messages(count)")
      .neq("student_id", user.id)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(20);
    publicRows = (pub ?? []) as Row[];
  }

  const pending = rows.filter((r) => r.status === "pending");
  const rest = rows.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">{isLecturer ? "Inbox" : "Q&A"}</p>
        <h1 className="text-3xl font-semibold">Discussions</h1>
        {!isLecturer && <p className="text-sm text-ink-soft">Start one from any title or page you&apos;re reading using the Ask button.</p>}
      </div>

      {isLecturer && (
        <Section title={`Awaiting your approval (${pending.length})`} rows={pending} empty="Nothing waiting. New requests from students appear here." showStudent />
      )}
      <Section title={isLecturer ? "Active and past" : "My discussions"} rows={isLecturer ? rest : rows} empty="No discussions yet." showStudent={isLecturer} />
      {!isLecturer && publicRows.length > 0 && <Section title="Public threads from classmates" rows={publicRows} empty="" showStudent />}
    </div>
  );
}

function Section({ title, rows, empty, showStudent }: { title: string; rows: Row[]; empty: string; showStudent?: boolean }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="card p-5 text-sm text-ink-soft">{empty}</p>
      ) : (
        <ul className="card divide-y divide-paper-edge">
          {rows.map((d) => (
            <li key={d.id}>
              <Link href={`/discussions/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{d.title}</p>
                  <p className="truncate text-xs text-ink-faint">
                    {d.book?.course_code ? `${d.book.course_code} · ` : ""}
                    {d.book?.title}
                    {d.page ? ` · p. ${d.page}` : ""}
                    {showStudent && d.student ? ` · ${d.student.full_name}` : ""} · {shortDate(d.created_at)} · {d.discussion_messages?.[0]?.count ?? 0} msg
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
  );
}
