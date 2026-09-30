"use client";

import { useState, useTransition } from "react";
import { rateBook } from "@/app/actions";

export function RatingWidget({ bookId, initialRating, initialReview }: { bookId: string; initialRating: number | null; initialReview: string | null }) {
  const [rating, setRating] = useState(initialRating ?? 0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState(initialReview ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="card space-y-3 p-4">
      <p className="text-sm font-semibold">{initialRating ? "Your rating" : "Rate this title"}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className={`text-2xl leading-none ${(hover || rating) >= n ? "text-amber-500" : "text-ink-faint/40"}`}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        rows={2}
        placeholder="Optional review…"
        className="input resize-none"
      />
      <button
        className="btn-primary py-1.5"
        disabled={pending || !rating}
        onClick={() =>
          start(async () => {
            const res = await rateBook(bookId, rating, review);
            if (!res.ok) return setError(res.error);
            setError(null);
            setSaved(true);
          })
        }
      >
        {pending ? "Saving…" : initialRating ? "Update rating" : "Submit rating"}
      </button>
      {saved && <p className="text-xs text-forest">Thanks — your rating was saved.</p>}
      {error && <p className="text-xs text-clay">{error}</p>}
    </div>
  );
}
