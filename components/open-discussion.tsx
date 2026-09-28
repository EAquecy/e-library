"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { openDiscussion } from "@/app/actions";

export function OpenDiscussionButton({
  bookId,
  page,
  className = "btn-ghost",
  label = "Open discussion",
}: {
  bookId: string;
  page?: number | null;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => !pending && setOpen(false)}>
          <form
            className="w-full max-w-lg space-y-4 rounded-lg bg-paper p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                const pageVal = String(fd.get("page") || "");
                const res = await openDiscussion({
                  bookId,
                  title: String(fd.get("title") || ""),
                  body: String(fd.get("body") || ""),
                  page: pageVal ? Number(pageVal) : null,
                  visibility,
                });
                if (!res.ok) return setError(res.error);
                router.push(`/discussions/${res.id}`);
              });
            }}
          >
            <div>
              <p className="eyebrow">New discussion</p>
              <h3 className="text-xl font-semibold">Ask your lecturer</h3>
              <p className="text-sm text-ink-soft">Your lecturer approves the session before replies open.</p>
            </div>
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <div>
                <label className="label" htmlFor="title">Question</label>
                <input className="input" id="title" name="title" required maxLength={200} placeholder="e.g. Clarify the proof in 3.2" />
              </div>
              <div>
                <label className="label" htmlFor="page">Page</label>
                <input className="input" id="page" name="page" type="number" min={1} defaultValue={page ?? ""} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="body">Details</label>
              <textarea className="input min-h-28" id="body" name="body" placeholder="What exactly is unclear?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { v: "public", t: "Public", d: "Classmates with this title can read and reply. Free." },
                  { v: "private", t: "Private", d: "Only you and your lecturer. Lets you book a paid one-on-one." },
                ] as const
              ).map((o) => (
                <label key={o.v} className={`cursor-pointer rounded-md border p-3 ${visibility === o.v ? "border-forest bg-white" : "border-paper-edge"}`}>
                  <input type="radio" className="sr-only" checked={visibility === o.v} onChange={() => setVisibility(o.v)} />
                  <span className="block text-sm font-semibold">{o.t}</span>
                  <span className="block text-xs text-ink-faint">{o.d}</span>
                </label>
              ))}
            </div>
            {error && <p className="rounded bg-clay-light px-3 py-2 text-sm text-clay">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
              <button className="btn-primary" disabled={pending}>{pending ? "Sending…" : "Send for approval"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
