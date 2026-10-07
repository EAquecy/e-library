import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { shortDate, cedis, formatSchedule } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import type { AvailabilityBlock, Profile } from "@/lib/types";

export default async function PersonProfilePage({ params }: { params: { id: string } }) {
  const { supabase } = await requireProfile();

  const [{ data: profileRow }, { data: blocks }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", params.id).maybeSingle(),
    supabase
      .from("availability_blocks")
      .select("*")
      .eq("owner_id", params.id)
      .gte("end_date", new Date().toISOString().slice(0, 10))
      .order("start_date"),
  ]);
  if (!profileRow || (profileRow.role !== "lecturer" && profileRow.role !== "publisher")) notFound();
  const person = profileRow as Profile;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-start gap-4 sm:gap-5">
        <Avatar path={person.avatar_path} name={person.full_name} size={96} />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{person.role === "lecturer" ? "Lecturer" : "Publisher"}</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">{person.full_name}</h1>
          <p className="text-ink-soft">
            {[person.institution, person.department].filter(Boolean).join(" · ") || " "}
          </p>
        </div>
      </div>

      {person.bio && <p className="whitespace-pre-line text-ink-soft">{person.bio}</p>}

      {person.publications.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Publications</h2>
          <ul className="card divide-y divide-paper-edge">
            {person.publications.map((p, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 text-sm">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium">{p.title}</span>
                  {p.url ? (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-forest underline underline-offset-2 hover:text-forest/80"
                    >
                      View publication <span aria-hidden>↗</span>
                    </a>
                  ) : (
                    <span className="text-xs text-ink-faint">No link provided</span>
                  )}
                </div>
                {p.date && <span className="shrink-0 text-xs text-ink-faint">{shortDate(p.date)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(person.private_session_schedule || person.public_session_schedule) && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Session availability</h2>
          <div className="card grid gap-4 p-4 sm:grid-cols-2">
            {person.private_session_schedule && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Private sessions</p>
                <p className="text-sm text-ink-soft">{formatSchedule(person.private_session_schedule)}</p>
                <p className="mt-1 text-xs text-ink-faint">{cedis(person.session_rate)} / 30 min</p>
              </div>
            )}
            {person.public_session_schedule && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Public / class sessions</p>
                <p className="text-sm text-ink-soft">{formatSchedule(person.public_session_schedule)}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-ink-faint">To book a session, open a discussion on one of their titles and request one there.</p>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Calendar</h2>
        {!blocks || blocks.length === 0 ? (
          <p className="text-sm text-ink-soft">No upcoming unavailability — open for sessions.</p>
        ) : (
          <ul className="card divide-y divide-paper-edge">
            {(blocks as AvailabilityBlock[]).map((b) => (
              <li key={b.id} className="px-4 py-3 text-sm">
                <span className="font-medium">
                  {shortDate(b.start_date)}
                  {b.end_date !== b.start_date && <> – {shortDate(b.end_date)}</>}
                </span>
                {b.note && <span className="text-ink-soft"> · {b.note}</span>}
                {b.link && (
                  <>
                    {" · "}
                    <a href={b.link} target="_blank" rel="noopener noreferrer" className="text-forest hover:underline">
                      Join / sign up →
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/browse" className="inline-block text-sm text-ink-faint hover:text-ink">← Back to browse</Link>
    </div>
  );
}
