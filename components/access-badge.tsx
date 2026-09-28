import { timeLeft } from "@/lib/format";

export function AccessBadge({ kind, expiresAt }: { kind: "purchase" | "rental"; expiresAt: string | null }) {
  if (kind === "purchase") return <span className="chip bg-forest-light text-forest">Owned</span>;
  const left = expiresAt ? timeLeft(expiresAt) : "";
  const expired = left === "expired";
  return <span className={`chip ${expired ? "bg-clay-light text-clay" : "bg-gold-light text-[#7A5A12]"}`}>{expired ? "Rental ended" : `Rented · ${left}`}</span>;
}
