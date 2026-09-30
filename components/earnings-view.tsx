import Link from "next/link";
import { cedis, dateTime } from "@/lib/format";
import type { EarningsRow } from "@/lib/earnings";

export function EarningsView({
  home,
  filter,
  salesTotal,
  rentalsTotal,
  total,
  salesCount,
  rentalsCount,
  rows,
}: {
  home: "lecturer" | "publisher";
  filter: "all" | "sales" | "rentals";
  salesTotal: number;
  rentalsTotal: number;
  total: number;
  salesCount: number;
  rentalsCount: number;
  rows: EarningsRow[];
}) {
  const filtered = filter === "sales" ? rows.filter((r) => r.kind === "purchase") : filter === "rentals" ? rows.filter((r) => r.kind === "rental") : rows;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{home === "publisher" ? "Publisher" : "Lecturer"}</p>
          <h1 className="text-3xl font-semibold">Earnings</h1>
        </div>
        <Link href={`/${home}`} className="text-sm text-forest hover:underline">← Dashboard</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total earned (test)" value={cedis(total)} />
        <Stat label={`From sales (${salesCount})`} value={cedis(salesTotal)} />
        <Stat label={`From rentals (${rentalsCount})`} value={cedis(rentalsTotal)} />
      </div>

      <div className="flex gap-2">
        {(["all", "sales", "rentals"] as const).map((f) => (
          <Link
            key={f}
            href={`/${home}/earnings${f === "all" ? "" : `?filter=${f}`}`}
            className={`chip py-1.5 ${filter === f ? "bg-ink text-paper" : "bg-paper-deep text-ink-soft"}`}
          >
            {f === "all" ? "All" : f === "sales" ? "Sales" : "Rentals"}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-ink-soft">
          {filter === "all" ? "No sales or rentals yet." : filter === "sales" ? "No sales yet." : "No rentals yet."}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-paper-edge text-left text-xs uppercase tracking-wider text-ink-faint">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-edge">
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <Link href={`/books/${r.book_id}`} className="font-medium hover:underline">{r.book_title}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`chip ${r.kind === "purchase" ? "bg-forest-light text-forest" : "bg-gold-light text-[#7A5A12]"}`}>
                      {r.kind === "purchase" ? "Sale" : "Rental"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{cedis(r.amount)}</td>
                  <td className="px-4 py-3 text-xs text-ink-faint">{dateTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wider text-ink-faint">{label}</p>
      <p className="font-serif text-2xl font-semibold">{value}</p>
    </div>
  );
}
