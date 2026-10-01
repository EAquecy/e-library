import type { SupabaseClient } from "@supabase/supabase-js";

export type EarningsRow = {
  id: string;
  kind: "purchase" | "rental";
  amount: number;
  created_at: string;
  expires_at: string | null;
  book_id: string;
  book_title: string;
  student_email: string;
};

export async function getEarnings(supabase: SupabaseClient, ownerId: string) {
  const { data } = await supabase.rpc("owner_activity");

  const rows: EarningsRow[] = ((data ?? []) as unknown as {
    entitlement_id: string;
    book_id: string;
    book_title: string;
    kind: "purchase" | "rental";
    amount: number;
    student_email: string;
    created_at: string;
    expires_at: string | null;
  }[]).map((e) => ({
    id: e.entitlement_id,
    kind: e.kind,
    amount: Number(e.amount),
    created_at: e.created_at,
    expires_at: e.expires_at,
    book_id: e.book_id,
    book_title: e.book_title,
    student_email: e.student_email,
  }));

  // ownerId is unused now that ownership is enforced inside the RPC itself,
  // but kept in the signature so callers don't need to change.
  void ownerId;

  const sales = rows.filter((r) => r.kind === "purchase");
  const rentals = rows.filter((r) => r.kind === "rental");
  const sum = (xs: EarningsRow[]) => xs.reduce((s, r) => s + r.amount, 0);

  return {
    rows,
    salesTotal: sum(sales),
    rentalsTotal: sum(rentals),
    total: sum(rows),
    salesCount: sales.length,
    rentalsCount: rentals.length,
  };
}
