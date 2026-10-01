"use client";

import { useState, useTransition } from "react";
import { rateBook } from "@/app/actions";

// Quick one-tap rating for a shelf card — no review text, just stars. Writing
// an actual review still happens on the book page, where there's room for it.
export function ShelfRate({ bookId, initialRating }: { bookId: string; initialRating: number | null }) {
  const [rating, setRating] = useState(initialRating ?? 0);
  const [hover, setHover] = useState(0);
  const [pending, start] = useTransition();

  function rate(n: number) {
    if (pending) return;
    setRating(n);
    start(async () => {
      await rateBook(bookId, n, "");
    });
  }

  return (
    <div className="flex items-center gap-0.5" title={rating ? "Your rating — tap to change" : "Rate this title"}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => rate(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className={`text-base leading-none transition-colors ${(hover || rating) >= n ? "text-amber-500" : "text-ink-faint/40 hover:text-amber-400"}`}
          aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
