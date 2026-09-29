"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { payForAiUse } from "@/app/actions";
import { AI_MODES, pageRangeFor, type AiKind, type AiScope, type AiTier } from "@/lib/ai";
import { cedis, dateTime } from "@/lib/format";
import type { AiUsage } from "@/lib/types";

export function StudyAssistant({
  bookId,
  price,
  currentPage,
  open,
  onClose,
}: {
  bookId: string;
  price: number;
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
  const [result, setResult] = useState<{ output: string; kind: AiKind; scope: AiScope; range: string; tier?: AiTier } | null>(null);
  const [moreResult, setMoreResult] = useState<{ output: string; range: string } | null>(null);
  const [history, setHistory] = useState<AiUsage[]>([]);

  useEffect(() => {
    setResult(null);
    setMoreResult(null);
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

  async function runGeneration(tier?: AiTier) {
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
    const res = await fetch("/api/ai/generate", {
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
    setMoreResult(null);
    try {
      const output = await runGeneration(kind === "questions" ? "free" : undefined);
      setResult({ output, kind, scope, range, tier: kind === "questions" ? "free" : undefined });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function generateMore() {
    setMoreBusy(true);
    setError(null);
    try {
      const output = await runGeneration("more");
      setMoreResult({ output, range });
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
            {busy ? "Thinking…" : kind === "questions" ? "Generate · Free" : `Generate · ${cedis(price)} (test)`}
          </button>

          {result && (
            <div className="card space-y-2 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                {AI_MODES.find((m) => m.kind === result.kind)?.label} · {result.range}
                {result.tier === "free" && <span className="ml-1 rounded-full bg-forest/10 px-2 py-0.5 text-forest">Free set</span>}
              </p>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{result.output}</div>
            </div>
          )}

          {kind === "questions" && result && (
            <button className="btn-ghost w-full" disabled={busy || moreBusy} onClick={generateMore}>
              {moreBusy ? "Thinking…" : `Generate more questions · ${cedis(price)} (test)`}
            </button>
          )}

          {moreResult && (
            <div className="card space-y-2 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                More practice questions · {moreResult.range}
              </p>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{moreResult.output}</div>
            </div>
          )}

          {history.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Previous generations</p>
              {history.map((h) => (
                <details key={h.id} className="card p-3 text-sm">
                  <summary className="cursor-pointer font-medium">
                    {AI_MODES.find((m) => m.kind === h.kind)?.label} · p. {h.page_from === h.page_to ? h.page_from : `${h.page_from}–${h.page_to}`} · {dateTime(h.created_at)}
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-ink-soft">{h.output}</p>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
