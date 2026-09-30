"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

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

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/browse?${next.toString()}`);
  }

  const hasAny = courseCodes.length > 0 || subjects.length > 0 || departments.length > 0 || lecturers.length > 0;
  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap gap-3">
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
      {(params.get("dept") || params.get("lecturer") || params.get("subject") || params.get("course")) && (
        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams(params.toString());
            next.delete("dept");
            next.delete("lecturer");
            next.delete("subject");
            next.delete("course");
            router.push(`/browse?${next.toString()}`);
          }}
          className="btn-ghost px-3 py-1.5 text-xs"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
