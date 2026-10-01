import { WEEKDAYS } from "@/lib/format";
import type { SessionSchedule } from "@/lib/types";

// Standardized availability input — a day-of-week grid plus a start/end
// time, submitted as plain form fields (`${name}_days` repeated,
// `${name}_start`, `${name}_end`) so the enclosing <form action={...}>
// server action can read them with formData.getAll()/get(). No free text.
export function SchedulePicker({ name, label, initial }: { name: string; label: string; initial: SessionSchedule | null }) {
  const days = new Set(initial?.days ?? []);
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map((day) => (
          <label key={day} className="flex items-center gap-1.5 rounded-md border border-paper-edge bg-white px-2.5 py-1.5 text-sm has-[:checked]:border-forest has-[:checked]:bg-forest-light">
            <input type="checkbox" name={`${name}_days`} value={day} defaultChecked={days.has(day)} className="accent-forest" />
            {day}
          </label>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm">
        <input type="time" name={`${name}_start`} defaultValue={initial?.start ?? ""} className="input max-w-36" />
        <span className="text-ink-faint">to</span>
        <input type="time" name={`${name}_end`} defaultValue={initial?.end ?? ""} className="input max-w-36" />
      </div>
    </div>
  );
}
