"use client";

import { useState, useTransition } from "react";
import { addAvailabilityBlock, removeAvailabilityBlock } from "@/app/actions";
import { shortDate } from "@/lib/format";
import type { AvailabilityBlock } from "@/lib/types";

export function AvailabilityManager({ initialBlocks }: { initialBlocks: AvailabilityBlock[] }) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add() {
    setError(null);
    start(async () => {
      const res = await addAvailabilityBlock({ startDate, endDate: endDate || startDate, note, link });
      if (!res.ok) return setError(res.error);
      setBlocks((bs) =>
        [
          ...bs,
          {
            id: crypto.randomUUID(),
            owner_id: "",
            start_date: startDate,
            end_date: endDate || startDate,
            note: note.trim() || null,
            link: link.trim() || null,
            created_at: new Date().toISOString(),
          },
        ].sort((a, b) => a.start_date.localeCompare(b.start_date))
      );
      setStartDate("");
      setEndDate("");
      setNote("");
      setLink("");
    });
  }

  function remove(id: string) {
    setBlocks((bs) => bs.filter((b) => b.id !== id));
    start(async () => {
      await removeAvailabilityBlock(id);
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <p className="text-sm font-semibold">Mark a date range</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="av_start">From</label>
            <input id="av_start" type="date" min={today} className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="av_end">To</label>
            <input id="av_end" type="date" min={startDate || today} className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <p className="mt-1 text-xs text-ink-faint">Optional — defaults to same day</p>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="av_note">Note (shown publicly — e.g. &ldquo;At a conference&rdquo;, &ldquo;Unavailable&rdquo;)</label>
          <input id="av_note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Unavailable" />
        </div>
        <div>
          <label className="label" htmlFor="av_link">Link (optional — e.g. webinar signup, conference page)</label>
          <input id="av_link" type="url" className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
        </div>
        {error && <p className="text-xs text-clay">{error}</p>}
        <button className="btn-primary py-1.5" disabled={pending || !startDate} onClick={add}>
          {pending ? "Adding…" : "Add to calendar"}
        </button>
      </div>

      {blocks.length === 0 ? (
        <p className="text-sm text-ink-soft">Nothing marked yet — your calendar will show as fully open.</p>
      ) : (
        <ul className="card divide-y divide-paper-edge">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">
                  {shortDate(b.start_date)}
                  {b.end_date !== b.start_date && <> – {shortDate(b.end_date)}</>}
                </p>
                {b.note && <p className="text-xs text-ink-soft">{b.note}</p>}
                {b.link && (
                  <a href={b.link} target="_blank" rel="noopener noreferrer" className="text-xs text-forest hover:underline">
                    {b.link}
                  </a>
                )}
              </div>
              <button className="text-xs text-ink-faint hover:text-clay" onClick={() => remove(b.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
