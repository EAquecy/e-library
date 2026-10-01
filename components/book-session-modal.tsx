"use client";

import { useState } from "react";
import { BookSession } from "@/components/book-session";
import type { SessionSchedule } from "@/lib/types";

export function BookSessionModal({
  bookId,
  bookTitle,
  rate,
  immediateRate,
  groupRate,
  schedule,
  className = "btn-ghost",
  label = "Book session",
}: {
  bookId: string;
  bookTitle: string;
  rate: number;
  immediateRate: number;
  groupRate: number;
  schedule: SessionSchedule | null;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg space-y-1 rounded-lg bg-paper p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Book a session</p>
                <h3 className="text-xl font-semibold">{bookTitle}</h3>
              </div>
              <button type="button" className="text-sm text-ink-faint hover:text-ink" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <BookSession bookId={bookId} rate={rate} immediateRate={immediateRate} groupRate={groupRate} schedule={schedule} />
          </div>
        </div>
      )}
    </>
  );
}
