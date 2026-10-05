"use client";

import { useState } from "react";
import { FIELD_NAMES } from "@/lib/fields";

// Multi-select chips. Renders hidden inputs so it works inside plain <form action>
// submissions, and reports changes for client-driven forms (signup).
export function InterestPicker({
  defaultValue = [],
  onChange,
  name = "interests",
}: {
  defaultValue?: string[];
  onChange?: (v: string[]) => void;
  name?: string;
}) {
  const [picked, setPicked] = useState<string[]>(defaultValue);

  function toggle(f: string) {
    const next = picked.includes(f) ? picked.filter((x) => x !== f) : [...picked, f];
    setPicked(next);
    onChange?.(next);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={`${name}_present`} value="1" />
      {picked.map((f) => (
        <input key={f} type="hidden" name={name} value={f} />
      ))}
      <div className="flex flex-wrap gap-1.5">
        {FIELD_NAMES.map((f) => {
          const on = picked.includes(f);
          return (
            <button
              type="button"
              key={f}
              aria-pressed={on}
              onClick={() => toggle(f)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                on ? "border-forest bg-forest text-paper" : "border-paper-edge bg-white text-ink-soft hover:border-forest"
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-ink-faint">{picked.length === 0 ? "Pick as many as you like. We use these to recommend titles." : `${picked.length} selected`}</p>
    </div>
  );
}
