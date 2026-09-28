"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkout } from "@/app/actions";
import { cedis } from "@/lib/format";

type Option = { kind: "purchase" | "rental"; price: number; label: string; sub: string };

export function CheckoutPanel({
  bookId,
  buyPrice,
  rentPrice,
  rentDays,
  canBuy,
  hasActiveRental,
}: {
  bookId: string;
  buyPrice: number | null;
  rentPrice: number | null;
  rentDays: number;
  canBuy: boolean;
  hasActiveRental: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Option | null>(null);
  const [method, setMethod] = useState("momo");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const options: Option[] = [];
  if (buyPrice !== null && canBuy) options.push({ kind: "purchase", price: buyPrice, label: "Buy", sub: "Yours to keep, read any time" });
  if (rentPrice !== null && canBuy)
    options.push({ kind: "rental", price: rentPrice, label: hasActiveRental ? `Extend ${rentDays} days` : `Rent for ${rentDays} days`, sub: hasActiveRental ? "Added on top of your current rental" : "Access ends automatically" });

  if (!options.length) return null;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <button key={o.kind} onClick={() => { setSelected(o); setError(null); }} className="card p-4 text-left transition hover:border-forest hover:bg-white">
            <p className="text-sm font-semibold text-ink-soft">{o.label}</p>
            <p className="font-serif text-2xl font-semibold">{cedis(o.price)}</p>
            <p className="text-xs text-ink-faint">{o.sub}</p>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => !pending && setSelected(null)}>
          <div className="w-full max-w-sm space-y-4 rounded-lg bg-paper p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div>
              <p className="eyebrow">Checkout</p>
              <h3 className="text-xl font-semibold">{selected.label} · {cedis(selected.price)}</h3>
            </div>
            <div className="space-y-2">
              {[
                { id: "momo", label: "Mobile Money", sub: "MTN MoMo, Telecel Cash, AirtelTigo" },
                { id: "card", label: "Debit / credit card", sub: "Visa, Mastercard" },
              ].map((m) => (
                <label key={m.id} className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 ${method === m.id ? "border-forest bg-white" : "border-paper-edge"}`}>
                  <input type="radio" name="method" checked={method === m.id} onChange={() => setMethod(m.id)} />
                  <span>
                    <span className="block text-sm font-medium">{m.label}</span>
                    <span className="block text-xs text-ink-faint">{m.sub}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="rounded bg-gold-light px-3 py-2 text-xs text-[#7A5A12]">Test mode: no money is charged. Real payments plug in here later.</p>
            {error && <p className="rounded bg-clay-light px-3 py-2 text-sm text-clay">{error}</p>}
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" disabled={pending} onClick={() => setSelected(null)}>Cancel</button>
              <button
                className="btn-primary flex-1"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await checkout(bookId, selected.kind);
                    if (!res.ok) return setError(res.error);
                    setSelected(null);
                    router.push(`/read/${bookId}`);
                  })
                }
              >
                {pending ? "Processing…" : `Pay ${cedis(selected.price)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
