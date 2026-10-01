"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelConsultation, payConsultation, respondConsultation, setMeetingLink } from "@/app/actions";
import { cedis } from "@/lib/format";
import type { Consultation } from "@/lib/types";

export function SessionActions({ c, isLecturer, isBooker = true }: { c: Consultation; isLecturer: boolean; isBooker?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState(c.meeting_link ?? "");
  const [note, setNote] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong");
      else {
        setError(null);
        router.refresh();
      }
    });

  const canEditLink = (isLecturer || isBooker) && (c.status === "requested" || c.status === "confirmed");

  if (isLecturer) {
    if (c.status === "requested") {
      return (
        <div className="w-full space-y-2 sm:w-72">
          <input className="input" placeholder="Meeting link (Google Meet, Zoom…)" value={link} onChange={(e) => setLink(e.target.value)} />
          <input className="input" placeholder="Note to student (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={pending} onClick={() => run(() => respondConsultation(c.id, "confirmed", link, note))}>Confirm</button>
            <button className="btn-danger flex-1" disabled={pending} onClick={() => run(() => respondConsultation(c.id, "declined", "", note))}>Decline</button>
          </div>
          {error && <p className="text-sm text-clay">{error}</p>}
        </div>
      );
    }
    if (c.status === "confirmed") {
      return (
        <div className="w-full space-y-2 sm:w-72">
          <MeetingLinkEditor link={link} setLink={setLink} pending={pending} onSave={() => run(() => setMeetingLink(c.id, link))} />
          <button className="btn-ghost" disabled={pending} onClick={() => run(() => respondConsultation(c.id, "completed", "", ""))}>Mark completed</button>
          {error && <p className="text-sm text-clay">{error}</p>}
        </div>
      );
    }
    return null;
  }

  if (!isBooker) {
    return c.meeting_link ? null : <p className="text-xs text-ink-faint">Booked by a fellow learner.</p>;
  }

  return (
    <div className="flex flex-col gap-2 sm:w-72">
      {canEditLink && <MeetingLinkEditor link={link} setLink={setLink} pending={pending} onSave={() => run(() => setMeetingLink(c.id, link))} />}
      {c.status === "confirmed" && !c.paid && (
        <button className="btn-gold" disabled={pending} onClick={() => run(() => payConsultation(c.id))}>
          {pending ? "Processing…" : `Pay ${cedis(c.fee)} (test)`}
        </button>
      )}
      {(c.status === "requested" || c.status === "confirmed") && !c.paid && (
        <button className="btn-danger" disabled={pending} onClick={() => run(() => cancelConsultation(c.id))}>Cancel</button>
      )}
      {error && <p className="text-sm text-clay">{error}</p>}
    </div>
  );
}

function MeetingLinkEditor({
  link,
  setLink,
  pending,
  onSave,
}: {
  link: string;
  setLink: (v: string) => void;
  pending: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex gap-2">
      <input
        className="input flex-1"
        placeholder="Zoom or Google Meet link"
        value={link}
        onChange={(e) => setLink(e.target.value)}
      />
      <button type="button" className="btn-ghost shrink-0" disabled={pending} onClick={onSave}>
        Save link
      </button>
    </div>
  );
}
