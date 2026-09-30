import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePublisher } from "@/lib/session";
import { deleteBook, updateBook } from "@/app/actions";
import type { Book } from "@/lib/types";

export default async function EditPublicationPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const { supabase, user } = await requirePublisher();
  const { data } = await supabase.from("books").select("*").eq("id", params.id).eq("lecturer_id", user.id).maybeSingle();
  if (!data) notFound();
  const b = data as Book;
  const save = updateBook.bind(null, b.id, "publisher");
  const remove = deleteBook.bind(null, b.id, "publisher");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/publisher" className="text-sm text-forest hover:underline">← Dashboard</Link>
        <h1 className="text-3xl font-semibold">Edit publication</h1>
      </div>
      {searchParams.error && <p className="rounded bg-clay-light px-3 py-2 text-sm text-clay">{searchParams.error}</p>}
      <form action={save} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" name="title" defaultValue={b.title} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="subject">Subject / program</label>
          <input id="subject" name="subject" defaultValue={b.subject ?? ""} placeholder="e.g. Computer Science" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={4} defaultValue={b.description} className="input" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="authors">Authors</label>
            <input id="authors" name="authors" defaultValue={b.authors ?? ""} placeholder="A. Mensah, B. Owusu" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="journal_name">Journal / publication</label>
            <input id="journal_name" name="journal_name" defaultValue={b.journal_name ?? ""} placeholder="Journal of..." className="input" />
          </div>
          <div>
            <label className="label" htmlFor="published_year">Published year</label>
            <input id="published_year" name="published_year" type="number" min={1900} max={2100} defaultValue={b.published_year ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="doi">DOI (optional)</label>
            <input id="doi" name="doi" defaultValue={b.doi ?? ""} placeholder="10.xxxx/xxxxx" className="input" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="buy_price">Buy price (GH₵)</label>
            <input id="buy_price" name="buy_price" type="number" min={0} step="0.01" defaultValue={b.buy_price ?? ""} placeholder="Not for sale" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="rent_price">Rent price (GH₵)</label>
            <input id="rent_price" name="rent_price" type="number" min={0} step="0.01" defaultValue={b.rent_price ?? ""} placeholder="Not for rent" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="rent_days">Rental days</label>
            <input id="rent_days" name="rent_days" type="number" min={1} max={365} defaultValue={b.rent_days} className="input" />
          </div>
        </div>
        <p className="text-xs text-ink-faint">Leave a price empty to switch that option off. At least one is required. Price changes don&apos;t affect students who already paid.</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="published" defaultChecked={b.published} /> Published
        </label>

        <p className="text-xs text-ink-faint">Study assistant pricing for this title is set by Lectern, not by publishers.</p>

        <button className="btn-primary">Save changes</button>
      </form>

      <form action={remove} className="card flex items-center justify-between gap-4 p-4">
        <p className="text-sm text-ink-soft">Delete this publication permanently. Only possible if nobody has bought or rented it.</p>
        <button className="btn-danger">Delete</button>
      </form>
    </div>
  );
}
