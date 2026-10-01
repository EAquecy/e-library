"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestConsultation, requestImmediateConsultation, requestGroupConsultation } from "@/app/actions";
import { cedis, formatSchedule } from "@/lib/format";
import type { SessionSchedule } from "@/lib/types";

type Tab = "scheduled" | "immediate" | "group";

export function BookSession({
  discussionId,
  rate,
  immediateRate,
  groupRate,
  schedule,
}: {
  discussionId: string;
  rate: number;
  immediateRate: number;
  groupRate: number;
  schedule: SessionSchedule | null;
}) {
  const [tab, setTab] = useState<Tab>("scheduled");
  return (
    <div className="space-y-3 border-t border-paper-edge pt-3">
      <div className="grid grid-cols-3 gap-1 rounded-md bg-paper-deep p-1 text-xs">
        {([
          ["scheduled", "Scheduled"],
          ["immediate", "Immediate"],
          ["group", "Group"],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded px-2 py-1.5 font-medium ${tab === t ? "bg-white shadow-sm" : "text-ink-soft"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "scheduled" && <ScheduledForm discussionId={discussionId} rate={rate} schedule={schedule} />}
      {tab === "immediate" && <ImmediateForm discussionId={discussionId} price={immediateRate} />}
      {tab === "group" && <GroupForm discussionId={discussionId} price={groupRate} />}
    </div>
  );
}

function ScheduledForm({ discussionId, rate, schedule }: { discussionId: string; rate: number; schedule: SessionSchedule | null }) {
  const router = useRouter();
  const [minutes, setMinutes] = useState(30);
  const [when, setWhen] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const scheduleText = formatSchedule(schedule);

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!when) return setError("Pick a date and time");
        start(async () => {
          const res = await requestConsultation(discussionId, new Date(when).toISOString(), minutes);
          if (!res.ok) return setError(res.error);
          setError(null);
          setDone(true);
          setWhen("");
          router.refresh();
        });
      }}
    >
      <label className="label" htmlFor="when">Propose a time</label>
      {scheduleText ? (
        <p className="text-xs text-ink-faint">Available {scheduleText.toLowerCase()}.</p>
      ) : (
        <p className="text-xs text-clay">This lecturer hasn&apos;t set their private-session availability yet.</p>
      )}
      <input id="when" type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
      <div className="grid grid-cols-2 gap-1 rounded-md bg-paper-deep p-1">
        {[30, 60].map((m) => (
          <button type="button" key={m} onClick={() => setMinutes(m)} className={`rounded px-2 py-1.5 text-sm ${minutes === m ? "bg-white font-medium shadow-sm" : "text-ink-soft"}`}>
            {m} min · {cedis((rate * m) / 30)}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-clay">{error}</p>}
      {done && <p className="text-sm text-forest">Request sent. You pay once the lecturer confirms.</p>}
      <button className="btn-gold w-full" disabled={pending || !scheduleText}>{pending ? "Sending…" : "Request session"}</button>
    </form>
  );
}

function ImmediateForm({ discussionId, price }: { discussionId: string; price: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-soft">No date needed — the lecturer still has to approve the request. Flat price: {cedis(price)}.</p>
      {error && <p className="text-sm text-clay">{error}</p>}
      {done && <p className="text-sm text-forest">Request sent. You pay once the lecturer confirms.</p>}
      <button
        className="btn-gold w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await requestImmediateConsultation(discussionId);
            if (!res.ok) return setError(res.error);
            setError(null);
            setDone(true);
            router.refresh();
          })
        }
      >
        {pending ? "Sending…" : `Request now · ${cedis(price)}`}
      </button>
    </div>
  );
}

function GroupForm({ discussionId, price }: { discussionId: string; price: number }) {
  const router = useRouter();
  const [when, setWhen] = useState("");
  const [emails, setEmails] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const cleanEmails = emails.map((e) => e.trim()).filter(Boolean);
  const headcount = cleanEmails.length + 1;

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!when) return setError("Pick a date and time");
        if (cleanEmails.length === 0) return setError("Add at least one fellow learner's email");
        start(async () => {
          const res = await requestGroupConsultation(discussionId, new Date(when).toISOString(), cleanEmails);
          if (!res.ok) return setError(res.error);
          setError(null);
          setDone(true);
          setWhen("");
          setEmails([""]);
          router.refresh();
        });
      }}
    >
      <label className="label" htmlFor="group_when">Date and time</label>
      <input id="group_when" type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
      <div className="space-y-1">
        <p className="label">Fellow learners&apos; emails</p>
        {emails.map((email, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="email"
              className="input flex-1"
              placeholder="learner@email.com"
              value={email}
              onChange={(e) => setEmails((es) => es.map((x, idx) => (idx === i ? e.target.value : x)))}
            />
            {emails.length > 1 && (
              <button type="button" className="text-xs text-ink-faint hover:text-clay" onClick={() => setEmails((es) => es.filter((_, idx) => idx !== i))}>
                Remove
              </button>
            )}
          </div>
        ))}
        <button type="button" className="text-xs font-medium text-forest hover:underline" onClick={() => setEmails((es) => [...es, ""])}>
          + Add another learner
        </button>
      </div>
      <p className="text-xs text-ink-soft">
        {headcount} attendee{headcount === 1 ? "" : "s"} (including you) · {cedis(price)} / attendee · total {cedis(price * headcount)}
      </p>
      {error && <p className="text-sm text-clay">{error}</p>}
      {done && <p className="text-sm text-forest">Request sent. You pay once the lecturer confirms.</p>}
      <button className="btn-gold w-full" disabled={pending}>{pending ? "Sending…" : "Request group session"}</button>
    </form>
  );
}
