"use client";

import { useState } from "react";
import type { Publication } from "@/lib/types";

// Renders as plain `pub_title` / `pub_url` inputs so the surrounding
// <form action={updateProfile}> can pick them up with formData.getAll() —
// no separate submit handler needed here.
export function PublicationsEditor({ initial }: { initial: Publication[] }) {
  const [rows, setRows] = useState<Publication[]>(initial.length ? initial : [{ title: "", url: "" }]);

  function update(i: number, field: "title" | "url", value: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2">
          <input
            name="pub_title"
            placeholder="Title"
            value={r.title}
            onChange={(e) => update(i, "title", e.target.value)}
            className="input"
          />
          <input
            name="pub_url"
            placeholder="https://… (optional)"
            value={r.url}
            onChange={(e) => update(i, "url", e.target.value)}
            className="input"
          />
          <button
            type="button"
            className="shrink-0 text-xs text-ink-faint hover:text-clay"
            onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="text-xs font-medium text-forest hover:underline" onClick={() => setRows((rs) => [...rs, { title: "", url: "" }])}>
        + Add publication
      </button>
    </div>
  );
}
