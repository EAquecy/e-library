import Link from "next/link";
import { requirePublisher } from "@/lib/session";
import { BookCover } from "@/components/book-cover";
import { cedis } from "@/lib/format";
import type { Book } from "@/lib/types";

export default async function PublisherDashboard({ searchParams }: { searchParams: { saved?: string } }) {
  const { supabase, user, profile } = await requirePublisher();

  const [{ data: books }, { count: pendingDisc }, { count: pendingSess }] = await Promise.all([
    supabase.from("books").select("*, entitlements(kind, amount, expires_at)").eq("lecturer_id", user.id).order("created_at", { ascending: false }),
    supabase.from("discussions").select("id", { count: "exact", head: true }).eq("lecturer_id", user.id).eq("status", "pending"),
    supabase.from("consultations").select("id", { count: "exact", head: true }).eq("lecturer_id", user.id).eq("status", "requested"),
  ]);

  const rows = ((books ?? []) as (Book & { entitlements: { kind: string; amount: number; expires_at: string | null }[] })[]).map((b) => {
    const sales = b.entitlements.filter((e) => e.kind === "purchase").length;
    const rentals = b.entitlements.filter((e) => e.kind === "rental").length;
    const activeRentals = b.entitlements.filter((e) => e.kind === "rental" && e.expires_at && new Date(e.expires_at) > new Date()).length;
    const revenue = b.entitlements.reduce((s, e) => s + Number(e.amount), 0);
    return { ...b, sales, rentals, activeRentals, revenue };
  });
  const total = rows.reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Publisher</p>
          <h1 className="text-3xl font-semibold">{profile.full_name || "Your dashboard"}</h1>
        </div>
        <Link href="/publisher/upload" className="btn-primary">+ Upload a publication</Link>
      </div>
      {searchParams.saved && <p className="rounded bg-forest-light px-3 py-2 text-sm text-forest">Saved.</p>}

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Publications" value={String(rows.length)} />
        <Stat label="Earnings (test)" value={cedis(total)} />
        <Stat label="Discussions to approve" value={String(pendingDisc ?? 0)} href="/discussions" alert={!!pendingDisc} />
        <Stat label="Session requests" value={String(pendingSess ?? 0)} href="/sessions" alert={!!pendingSess} />
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Your publications</h2>
        {rows.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="mb-4 text-ink-soft">Upload your first research publication or journal as a PDF, set a price and a rental fee.</p>
            <Link href="/publisher/upload" className="btn-primary">Upload a publication</Link>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-paper-edge text-left text-xs uppercase tracking-wider text-ink-faint">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Prices</th>
                  <th className="px-4 py-3">Sold</th>
                  <th className="px-4 py-3">Rentals (active)</th>
                  <th className="px-4 py-3">Earned</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-edge">
                {rows.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <BookCover title={b.title} courseCode={b.course_code} coverPath={b.cover_path} kind={b.kind} size="sm" />
                        <div>
                          <Link href={`/books/${b.id}`} className="font-medium hover:underline">{b.title}</Link>
                          <p className="text-xs text-ink-faint">
                            {b.journal_name ?? "No journal"} {b.published_year ? `· ${b.published_year}` : ""} · {b.page_count ?? "?"} pages {!b.published && <span className="text-clay">· Unpublished</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {b.buy_price !== null && <div>Buy {cedis(b.buy_price)}</div>}
                      {b.rent_price !== null && <div>Rent {cedis(b.rent_price)} / {b.rent_days}d</div>}
                    </td>
                    <td className="px-4 py-3">{b.sales}</td>
                    <td className="px-4 py-3">{b.rentals} ({b.activeRentals})</td>
                    <td className="px-4 py-3 font-medium">{cedis(b.revenue)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/publisher/books/${b.id}`} className="btn-ghost py-1">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, href, alert }: { label: string; value: string; href?: string; alert?: boolean }) {
  const inner = (
    <div className={`card p-4 ${alert ? "border-clay/50 bg-clay-light/40" : ""}`}>
      <p className="text-xs uppercase tracking-wider text-ink-faint">{label}</p>
      <p className="font-serif text-2xl font-semibold">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
