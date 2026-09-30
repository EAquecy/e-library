import type { SupabaseClient } from "@supabase/supabase-js";

export type EarningsRow = {
  id: string;
  kind: "purchase" | "rental";
  amount: number;
  created_at: string;
  expires_at: string | null;
  book_id: string;
  book_title: string;
  book_kind: "book" | "handout" | "publication";
};

export async function getEarnings(supabase: SupabaseClient, ownerId: string) {
  const { data } = await supabase
    .from("entitlements")
    .select("id, kind, amount, created_at, expires_at, book:books!inner(id, title, kind, lecturer_id)")
    .eq("book.lecturer_id", ownerId)
    .order("created_at", { ascending: false });

  const rows: EarningsRow[] = ((data ?? []) as unknown as {
    id: string;
    kind: "purchase" | "rental";
    amount: number;
    created_at: string;
    expires_at: string | null;
    book: { id: string; title: string; kind: "book" | "handout" | "publication" };
  }[]).map((e) => ({
    id: e.id,
    kind: e.kind,
    amount: Number(e.amount),
    created_at: e.created_at,
    expires_at: e.expires_at,
    book_id: e.book.id,
    book_title: e.book.title,
    book_kind: e.book.kind,
  }));

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
