"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

const KIND_OPTIONS: Option[] = [
  { value: "book", label: "Books" },
  { value: "handout", label: "Handouts" },
  { value: "publication", label: "Publications" },
];

export function BrowseFilters({
  courseCodes,
  subjects,
  departments,
  lecturers,
}: {
  courseCodes: string[];
  subjects: string[];
  departments: string[];
  lecturers: Option[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [yearMode, setYearMode] = useState<"exact" | "range">(params.get("yearMode") === "range" ? "range" : "exact");
  const [year, setYear] = useState(params.get("year") ?? "");
  const [yearFrom, setYearFrom] = useState(params.get("yearFrom") ?? "");
  const [yearTo, setYearTo] = useState(params.get("yearTo") ?? "");

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/browse?${next.toString()}`);
  }

  function applyYear() {
    const next = new URLSearchParams(params.toString());
    if (yearMode === "range") {
      next.set("yearMode", "range");
      next.delete("year");
      if (yearFrom) next.set("yearFrom", yearFrom);
      else next.delete("yearFrom");
      if (yearTo) next.set("yearTo", yearTo);
      else next.delete("yearTo");
    } else {
      next.delete("yearMode");
      next.delete("yearFrom");
      next.delete("yearTo");
      if (year) next.set("year", year);
      else next.delete("year");
    }
    router.push(`/browse?${next.toString()}`);
  }

  function clearYear() {
    const next = new URLSearchParams(params.toString());
    next.delete("yearMode");
    next.delete("year");
    next.delete("yearFrom");
    next.delete("yearTo");
    setYear("");
    setYearFrom("");
    setYearTo("");
    setYearMode("exact");
    router.push(`/browse?${next.toString()}`);
  }

  const yearActive = !!(params.get("year") || params.get("yearFrom") || params.get("yearTo"));
  const anyActive = !!(params.get("dept") || params.get("lecturer") || params.get("subject") || params.get("course") || params.get("kind") || yearActive);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <select className="input w-auto" value={params.get("kind") ?? ""} onChange={(e) => setParam("kind", e.target.value)}>
          <option value="">All types</option>
          {KIND_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
        {departments.length > 0 && (
          <select className="input w-auto" value={params.get("dept") ?? ""} onChange={(e) => setParam("dept", e.target.value)}>
            <option value="">All faculties</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
        {lecturers.length > 0 && (
          <select className="input w-auto" value={params.get("lecturer") ?? ""} onChange={(e) => setParam("lecturer", e.target.value)}>
            <option value="">All lecturers &amp; publishers</option>
            {lecturers.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        )}
        {subjects.length > 0 && (
          <select className="input w-auto" value={params.get("subject") ?? ""} onChange={(e) => setParam("subject", e.target.value)}>
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        {courseCodes.length > 0 && (
          <select className="input w-auto" value={params.get("course") ?? ""} onChange={(e) => setParam("course", e.target.value)}>
            <option value="">All course codes</option>
            {courseCodes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        {anyActive && (
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(params.toString());
              ["dept", "lecturer", "subject", "course", "kind", "yearMode", "year", "yearFrom", "yearTo"].forEach((k) => next.delete(k));
              setYear("");
              setYearFrom("");
              setYearTo("");
              setYearMode("exact");
              router.push(`/browse?${next.toString()}`);
            }}
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-md border border-paper-edge bg-white/60 p-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Publication year</span>
        <label className="flex items-center gap-1.5 text-xs">
          <input type="radio" checked={yearMode === "exact"} onChange={() => setYearMode("exact")} /> Specific year
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <input type="radio" checked={yearMode === "range"} onChange={() => setYearMode("range")} /> Year range
        </label>
        {yearMode === "exact" ? (
          <input
            type="number"
            min={1900}
            max={2100}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="e.g. 2023"
            className="input w-28"
          />
        ) : (
          <>
            <input
              type="number"
              min={1900}
              max={2100}
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
              placeholder="From"
              className="input w-24"
            />
            <span className="text-xs text-ink-faint">to</span>
            <input
              type="number"
              min={1900}
              max={2100}
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
              placeholder="To"
              className="input w-24"
            />
          </>
        )}
        <button type="button" onClick={applyYear} className="btn-ghost px-3 py-1.5 text-xs">Apply</button>
        {yearActive && (
          <button type="button" onClick={clearYear} className="text-xs text-clay underline">
            Clear year
          </button>
        )}
      </div>
    </div>
  );
}
