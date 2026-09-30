export function RatingStars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "text-base" : "text-xs";
  const full = Math.round(value);
  return (
    <span className={`${cls} text-amber-500`} aria-hidden>
      {"★".repeat(full)}
      <span className="text-ink-faint/40">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export function RatingSummary({ average, count }: { average: number | null; count: number }) {
  if (!count) return <span className="text-xs text-ink-faint">No ratings yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
      <RatingStars value={average ?? 0} />
      <span>
        {(average ?? 0).toFixed(1)} ({count})
      </span>
    </span>
  );
}
