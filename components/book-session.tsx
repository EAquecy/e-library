"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestConsultation } from "@/app/actions";
import { cedis } from "@/lib/format";

export function BookSession({ discussionId, rate }: { discussionId: string; rate: number }) {
  const router = useRouter();
  const [minutes, setMinutes] = useState(30);
  const [when, setWhen] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-2 border-t border-paper-edge pt-3"
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
      <button className="btn-gold w-full" disabled={pending}>{pending ? "Sending…" : "Request session"}</button>
    </form>
  );
}
