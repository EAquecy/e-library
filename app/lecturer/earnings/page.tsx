import { requireLecturer } from "@/lib/session";
import { getEarnings } from "@/lib/earnings";
import { EarningsView } from "@/components/earnings-view";

export default async function LecturerEarningsPage({ searchParams }: { searchParams: { filter?: string } }) {
  const { supabase, user } = await requireLecturer();
  const { rows, salesTotal, rentalsTotal, total, salesCount, rentalsCount } = await getEarnings(supabase, user.id);
  const filter = searchParams.filter === "sales" || searchParams.filter === "rentals" ? searchParams.filter : "all";
  return (
    <EarningsView
      home="lecturer"
      filter={filter}
      salesTotal={salesTotal}
      rentalsTotal={rentalsTotal}
      total={total}
      salesCount={salesCount}
      rentalsCount={rentalsCount}
      rows={rows}
    />
  );
}
