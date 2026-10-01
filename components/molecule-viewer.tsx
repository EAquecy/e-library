"use client";

import { useEffect, useRef, useState } from "react";
import { load3Dmol } from "@/lib/molviewer";
import type { MoleculeResult } from "@/app/api/ai/molecules/route";

export function MoleculeGrid({ molecules }: { molecules: MoleculeResult[] }) {
  if (molecules.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-ink-soft">
        No chemical compounds were clearly named on this page.
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {molecules.map((m) => (
        <MoleculeCard key={`${m.name}-${m.cid}`} molecule={m} />
      ))}
    </div>
  );
}

function MoleculeCard({ molecule }: { molecule: MoleculeResult }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load3Dmol();
        if (cancelled || !ref.current || !molecule.sdf) return;
        const viewer = window.$3Dmol!.createViewer(ref.current, { backgroundColor: "white" });
        viewer.addModel(molecule.sdf, "sdf");
        viewer.setStyle({}, { stick: { radius: 0.15 }, sphere: { scale: 0.25 } });
        viewer.zoomTo();
        viewer.render();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not render this molecule");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [molecule.sdf]);

  return (
    <div className="card overflow-hidden">
      <div ref={ref} className="h-56 w-full cursor-grab bg-white active:cursor-grabbing" />
      <div className="flex items-center justify-between border-t border-paper-edge px-3 py-2">
        <span className="text-sm font-medium">{molecule.name}</span>
        {!molecule.has3d && <span className="text-[10px] text-ink-faint">2D layout — no 3D data available</span>}
      </div>
      {error && <p className="px-3 pb-2 text-xs text-clay">{error}</p>}
    </div>
  );
}
