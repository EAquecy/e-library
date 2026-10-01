"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { payForAiUse } from "@/app/actions";
import { AI_MODES, FREE_QUESTION_TIER, pageRangeFor, QUESTION_TIER_CONFIG, type AiKind, type AiScope } from "@/lib/ai";
import { cedis, dateTime } from "@/lib/format";
import { MoleculeGrid } from "@/components/molecule-viewer";
import type { MoleculeResult } from "@/app/api/ai/molecules/route";
import type { AiUsage } from "@/lib/types";

type TierResult = { tier: number; output: string; range: string };

function parseMolecules(output: string): MoleculeResult[] {
  try {
    const arr = JSON.parse(output);
    return Array.isArray(arr) ? (arr as MoleculeResult[]) : [];
  } catch {
    return [];
  }
}

export function StudyAssistant({
  bookId,
  price,
  moleculePrice,
  questionTierPrices,
  currentPage,
  open,
  onClose,
}: {
  bookId: string;
  price: number;
  moleculePrice: number;
  // Paid practice-question tier prices for this book, keyed by tier level
  // ("1", "2", ...). New tiers just need a new key here — the UI unlocks
  // the next one automatically once the previous tier has been generated.
  questionTierPrices: Record<string, number>;
  currentPage: number;
  open: boolean;
  onClose: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [kind, setKind] = useState<AiKind>("summary");
  const [scope, setScope] = useState<AiScope>("page");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [moreBusy, setMoreBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ output: string; kind: AiKind; scope: AiScope; range: string } | null>(null);
  const [tierResults, setTierResults] = useState<TierResult[]>([]);
  const [history, setHistory] = useState<AiUsage[]>([]);

  // Paid tiers on top of the free set, in ascending order, e.g. [1, 2, ...].
  const paidTiers = useMemo(
    () =>
      Object.keys(questionTierPrices)
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b),
    [questionTierPrices]
  );
  const nextTier = kind === "questions" && result ? paidTiers[tierResults.length] : undefined;

  useEffect(() => {
    setResult(null);
    setTierResults([]);
    setError(null);
  }, [kind, scope]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("ai_usage")
      .select("*")
      .eq("book_id", bookId)
      .not("output", "is", null)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setHistory((data ?? []) as AiUsage[]));
  }, [open, supabase, bookId]);

  if (!open) return null;

  const { from, to } = pageRangeFor(scope, currentPage);
  const range = scope === "page" ? `p. ${from}` : `p. ${from}–${to}`;

  function refreshHistory() {
    supabase
      .from("ai_usage")
      .select("*")
      .eq("book_id", bookId)
      .not("output", "is", null)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setHistory((data ?? []) as AiUsage[]));
  }

  async function runGeneration(tier?: number) {
    const pay = await payForAiUse({
      bookId,
      kind,
      scope,
      pageFrom: from,
      pageTo: to,
      question: kind === "chat" ? question : undefined,
      tier,
    });
    if (!pay.ok) throw new Error(pay.error);
    const res = await fetch(kind === "molecules" ? "/api/ai/molecules" : "/api/ai/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ usageId: pay.usageId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Something went wrong");
    refreshHistory();
    return json.output as string;
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setResult(null);
    setTierResults([]);
    try {
      const output = await runGeneration(kind === "questions" ? FREE_QUESTION_TIER : undefined);
      setResult({ output, kind, scope, range });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function generateMore() {
    if (nextTier === undefined) return;
    setMoreBusy(true);
    setError(null);
    try {
      const output = await runGeneration(nextTier);
      setTierResults((prev) => [...prev, { tier: nextTier, output, range }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setMoreBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-ink/40" onClick={onClose}>
      <div className="flex w-full max-w-md flex-col bg-paper shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-paper-edge px-4 py-3">
          <div>
            <p className="eyebrow">Study assistant</p>
            <h3 className="font-serif text-lg font-semibold">Ask about this book</h3>
          </div>
          <button className="text-ink-faint hover:text-ink" onClick={onClose}>Close</button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2">
            {AI_MODES.map((m) => (
              <button
                key={m.kind}
                onClick={() => setKind(m.kind)}
                className={`rounded-md border p-2 text-left text-xs ${kind === m.kind ? "border-forest bg-white" : "border-paper-edge"}`}
              >
                <span className="block font-semibold text-sm">{m.label}</span>
                <span className="block text-ink-faint">{m.hint}</span>
              </button>
            ))}
          </div>

          {kind === "chat" && (
            <textarea className="input" rows={2} placeholder="What do you want to ask?" value={question} onChange={(e) => setQuestion(e.target.value)} />
          )}

          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink-soft">Scope:</span>
            <div className="grid grid-cols-2 gap-1 rounded-md bg-paper-deep p-1 text-xs">
              <button onClick={() => setScope("page")} className={`rounded px-2 py-1 ${scope === "page" ? "bg-white font-medium shadow-sm" : "text-ink-soft"}`}>This page ({currentPage})</button>
              <button onClick={() => setScope("book")} className={`rounded px-2 py-1 ${scope === "book" ? "bg-white font-medium shadow-sm" : "text-ink-soft"}`}>Everything so far</button>
            </div>
          </div>

          {error && <p className="rounded bg-clay-light px-3 py-2 text-sm text-clay">{error}</p>}

          <button className="btn-gold w-full" disabled={busy || moreBusy || (kind === "chat" && !question.trim())} onClick={generate}>
            {busy
              ? kind === "molecules"
                ? "Looking up molecules…"
                : "Thinking…"
              : kind === "questions" || kind === "summary"
                ? "Generate · Free"
                : kind === "molecules"
                  ? `Generate · ${cedis(moleculePrice)} (test)`
                  : `Generate · ${cedis(price)} (test)`}
          </button>

          {result && kind === "molecules" ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Come Alive 3D · {result.range}</p>
              <MoleculeGrid molecules={parseMolecules(result.output)} />
            </div>
          ) : (
            result && (
              <div className="card space-y-2 p-4">
                <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                  {AI_MODES.find((m) => m.kind === result.kind)?.label} · {result.range}
                  {kind === "questions" && <span className="rounded-full bg-forest/10 px-2 py-0.5 text-forest">Free set</span>}
                  {kind === "summary" && <span className="rounded-full bg-forest/10 px-2 py-0.5 text-forest">Free</span>}
                </p>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{result.output}</div>
              </div>
            )
          )}

          {tierResults.map((r) => (
            <div key={r.tier} className="card space-y-2 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                {QUESTION_TIER_CONFIG[r.tier]?.label ?? "More questions"} · {r.range}
              </p>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{r.output}</div>
            </div>
          ))}

          {kind === "questions" && result && nextTier !== undefined && (
            <button className="btn-ghost w-full" disabled={busy || moreBusy} onClick={generateMore}>
              {moreBusy
                ? "Thinking…"
                : `Generate more questions · ${cedis(questionTierPrices[String(nextTier)])} (test)`}
            </button>
          )}

          {history.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Previous generations</p>
              {history.map((h) => (
                <details key={h.id} className="card p-3 text-sm">
                  <summary className="cursor-pointer font-medium">
                    {AI_MODES.find((m) => m.kind === h.kind)?.label} · p. {h.page_from === h.page_to ? h.page_from : `${h.page_from}–${h.page_to}`} · {dateTime(h.created_at)}
                  </summary>
                  {h.kind === "molecules" ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {parseMolecules(h.output ?? "[]").map((m) => (
                        <span key={`${h.id}-${m.name}`} className="chip bg-paper-deep text-ink-soft">{m.name}</span>
                      ))}
                      {parseMolecules(h.output ?? "[]").length === 0 && <span className="text-ink-faint">No compounds found</span>}
                    </div>
                  ) : (
                    <p className="mt-2 whitespace-pre-wrap text-ink-soft">{h.output}</p>
                  )}
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
