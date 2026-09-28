const STYLES: Record<string, string> = {
  pending: "bg-gold-light text-[#7A5A12]",
  requested: "bg-gold-light text-[#7A5A12]",
  approved: "bg-forest-light text-forest",
  confirmed: "bg-forest-light text-forest",
  completed: "bg-paper-deep text-ink-soft",
  closed: "bg-paper-deep text-ink-soft",
  declined: "bg-clay-light text-clay",
  cancelled: "bg-clay-light text-clay",
  public: "bg-white text-ink-soft border border-paper-edge",
  private: "bg-ink text-paper",
};

export function StatusChip({ value }: { value: string }) {
  return <span className={`chip ${STYLES[value] ?? "bg-paper-deep text-ink-soft"}`}>{value}</span>;
}
