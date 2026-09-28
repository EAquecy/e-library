"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setDiscussionStatus, setDiscussionVisibility } from "@/app/actions";

export function DiscussionControls({
  id,
  status,
  visibility,
  isLecturer,
  isAuthor,
}: {
  id: string;
  status: string;
  visibility: "public" | "private";
  isLecturer: boolean;
  isAuthor: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong");
      else {
        setError(null);
        router.refresh();
      }
    });

  if (!isLecturer && !isAuthor) return null;

  return (
    <div className="card space-y-3 p-4">
      {isLecturer && (
        <div className="space-y-2">
          <h3 className="font-semibold">Moderate</h3>
          {status === "pending" && (
            <div className="flex gap-2">
              <button className="btn-primary flex-1" disabled={pending} onClick={() => run(() => setDiscussionStatus(id, "approved"))}>Approve</button>
              <button className="btn-danger flex-1" disabled={pending} onClick={() => run(() => setDiscussionStatus(id, "declined"))}>Decline</button>
            </div>
          )}
          {status === "approved" && (
            <button className="btn-ghost w-full" disabled={pending} onClick={() => run(() => setDiscussionStatus(id, "closed"))}>Close discussion</button>
          )}
          {(status === "closed" || status === "declined") && (
            <button className="btn-ghost w-full" disabled={pending} onClick={() => run(() => setDiscussionStatus(id, "approved"))}>Reopen</button>
          )}
        </div>
      )}
      {isAuthor && (
        <div className="space-y-2">
          <h3 className="font-semibold">Who can see this</h3>
          <div className="grid grid-cols-2 gap-1 rounded-md bg-paper-deep p-1">
            {(["public", "private"] as const).map((v) => (
              <button
                key={v}
                disabled={pending || visibility === v}
                onClick={() => run(() => setDiscussionVisibility(id, v))}
                className={`rounded px-3 py-1.5 text-sm font-medium capitalize ${visibility === v ? "bg-white shadow-sm" : "text-ink-soft"}`}
              >
                {v}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-faint">
            {visibility === "public" ? "Classmates with this title can read and reply." : "Only you and your lecturer can see this."}
          </p>
        </div>
      )}
      {error && <p className="text-sm text-clay">{error}</p>}
    </div>
  );
}
