"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { createClient } from "@/lib/supabase/client";
import { loadPdfjs } from "@/lib/pdf";
import { timeLeft } from "@/lib/format";
import { OpenDiscussionButton } from "./open-discussion";
import { StudyAssistant } from "./study-assistant";

type Bookmark = { id: string; page: number; note: string | null };

export function Reader({
  bookId,
  title,
  userId,
  isStudent,
  initialPage,
  initialBookmarks,
  watermark,
  expiresAt,
  aiPrice,
  questionTierPrices,
}: {
  bookId: string;
  title: string;
  userId: string;
  isStudent: boolean;
  initialPage: number;
  initialBookmarks: Bookmark[];
  watermark: string;
  expiresAt: string | null;
  aiPrice: number;
  questionTierPrices: Record<string, number>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(Math.max(1, initialPage));
  const [zoom, setZoom] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
  const [panelOpen, setPanelOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [expired, setExpired] = useState(false);
  const [pageInput, setPageInput] = useState(String(initialPage));
  const [focused, setFocused] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const renderTask = useRef<RenderTask | null>(null);

  // Load the document through the access-checked route
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/books/${bookId}/file`, { cache: "no-store" });
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not open this title");
        const data = new Uint8Array(await res.arrayBuffer());
        const pdfjs = await loadPdfjs();
        const pdf = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
        if (cancelled) return;
        setDoc(pdf);
        setNumPages(pdf.numPages);
        setPage((p) => Math.min(p, pdf.numPages));
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Could not open this title");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  // Render current page
  const render = useCallback(async () => {
    if (!doc || !canvasRef.current || !wrapRef.current) return;
    const pdfPage = await doc.getPage(page);
    const base = pdfPage.getViewport({ scale: 1 });
    const width = Math.min(wrapRef.current.clientWidth, 900);
    const scale = (width / base.width) * zoom;
    const viewport = pdfPage.getViewport({ scale });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = canvasRef.current;
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    const ctx = canvas.getContext("2d")!;
    renderTask.current?.cancel();
    const task = pdfPage.render({ canvasContext: ctx, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined });
    renderTask.current = task;
    try {
      await task.promise;
    } catch {
      /* cancelled by a newer render */
    }
  }, [doc, page, zoom]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const onResize = () => render();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [render]);

  // Save progress (debounced)
  useEffect(() => {
    setPageInput(String(page));
    if (!isStudent || !doc) return;
    setSaving("saving");
    const t = setTimeout(async () => {
      await supabase
        .from("reading_progress")
        .upsert({ student_id: userId, book_id: bookId, current_page: page, updated_at: new Date().toISOString() });
      setSaving("saved");
    }, 700);
    return () => clearTimeout(t);
  }, [page, isStudent, doc, supabase, userId, bookId]);

  // Lock the reader when a rental runs out mid-session
  useEffect(() => {
    if (!expiresAt) return;
    const check = () => setExpired(new Date(expiresAt).getTime() <= Date.now());
    check();
    const i = setInterval(check, 30000);
    return () => clearInterval(i);
  }, [expiresAt]);

  // Blur the page while this tab isn't the one on screen — makes a screenshot
  // taken while quickly switching away, or of another app captured over a
  // background tab, less useful. Only for students; not a real defense
  // against a deliberate screenshot of the focused tab, just friction.
  useEffect(() => {
    if (!isStudent) return;
    const update = () => setFocused(document.visibilityState === "visible" && document.hasFocus());
    update();
    document.addEventListener("visibilitychange", update);
    window.addEventListener("blur", update);
    window.addEventListener("focus", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("blur", update);
      window.removeEventListener("focus", update);
    };
  }, [isStudent]);

  const go = useCallback((p: number) => setPage((cur) => Math.min(Math.max(1, p), numPages || cur)), [numPages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") go(page + 1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") go(page - 1);
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "p")) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, page]);

  const current = bookmarks.find((b) => b.page === page);

  async function toggleBookmark() {
    if (current) {
      setBookmarks((bs) => bs.filter((b) => b.id !== current.id));
      await supabase.from("bookmarks").delete().eq("id", current.id);
    } else {
      const note = window.prompt("Add a note to this bookmark (optional)") ?? null;
      const { data } = await supabase
        .from("bookmarks")
        .insert({ student_id: userId, book_id: bookId, page, note: note?.trim() || null })
        .select("id, page, note")
        .single();
      if (data) setBookmarks((bs) => [...bs, data as Bookmark].sort((a, b) => a.page - b.page));
    }
  }

  async function removeBookmark(id: string) {
    setBookmarks((bs) => bs.filter((b) => b.id !== id));
    await supabase.from("bookmarks").delete().eq("id", id);
  }

  if (expired) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Your rental has ended</h1>
        <p className="mb-6 text-ink-soft">You stopped on page {page}. It&apos;s saved for when you renew.</p>
        <Link href={`/books/${bookId}`} className="btn-primary">Renew or buy</Link>
      </div>
    );
  }

  return (
    <div className="-mx-4 sm:-mx-6">
      {/* Toolbar */}
      <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 border-b border-paper-edge bg-paper/95 px-4 py-2 backdrop-blur sm:px-6">
        <Link href={`/books/${bookId}`} className="mr-1 max-w-[40vw] truncate font-serif font-semibold hover:underline" title={title}>
          {title}
        </Link>
        {expiresAt && <span className="chip bg-gold-light text-[#7A5A12]">{timeLeft(expiresAt)}</span>}
        <div className="ml-auto flex items-center gap-1">
          <button className="btn-ghost px-2.5 py-1.5" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page">‹</button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              go(Number(pageInput) || page);
            }}
            className="flex items-center gap-1 text-sm"
          >
            <input className="input w-14 px-2 py-1 text-center" value={pageInput} onChange={(e) => setPageInput(e.target.value)} inputMode="numeric" aria-label="Page number" />
            <span className="text-ink-faint">/ {numPages || "…"}</span>
          </form>
          <button className="btn-ghost px-2.5 py-1.5" onClick={() => go(page + 1)} disabled={!numPages || page >= numPages} aria-label="Next page">›</button>
          <span className="mx-1 h-5 w-px bg-paper-edge" />
          <button className="btn-ghost px-2.5 py-1.5" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))} aria-label="Zoom out">−</button>
          <button className="btn-ghost px-2.5 py-1.5" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))} aria-label="Zoom in">+</button>
          {isStudent && (
            <>
              <span className="mx-1 h-5 w-px bg-paper-edge" />
              <button
                className={`btn px-2.5 py-1.5 ${current ? "bg-gold text-ink" : "btn-ghost"}`}
                onClick={toggleBookmark}
                title={current ? "Remove bookmark" : "Bookmark this page"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={current ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                <span className="hidden sm:inline">{current ? "Bookmarked" : "Bookmark"}</span>
              </button>
              <button className="btn-ghost px-2.5 py-1.5" onClick={() => setPanelOpen((o) => !o)}>
                Bookmarks ({bookmarks.length})
              </button>
              <OpenDiscussionButton bookId={bookId} page={page} className="btn-primary px-2.5 py-1.5" label="Ask" />
              <button className="btn-gold px-2.5 py-1.5" onClick={() => setAssistantOpen(true)}>
                Study assistant
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex">
        {/* Page */}
        <div ref={wrapRef} className="protected relative flex-1 overflow-auto px-4 py-6 sm:px-6" onContextMenu={(e) => e.preventDefault()}>
          {loadError ? (
            <div className="card mx-auto max-w-md p-8 text-center text-clay">{loadError}</div>
          ) : !doc ? (
            <div className="mx-auto flex aspect-[3/4] w-full max-w-[640px] animate-pulse items-center justify-center rounded bg-white text-ink-faint">Opening…</div>
          ) : (
            <div className="relative mx-auto w-fit bg-white shadow-book">
              <canvas
                ref={canvasRef}
                className={`block transition-[filter] duration-150 ${!focused ? "blur-2xl" : ""}`}
                onDragStart={(e) => e.preventDefault()}
              />
              <Watermark text={watermark} />
              {!focused && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/40">
                  <p className="rounded bg-ink/80 px-3 py-1.5 text-xs font-medium text-paper">Reading paused</p>
                </div>
              )}
            </div>
          )}
          {isStudent && doc && (
            <p className="mt-3 text-center text-xs text-ink-faint">
              {saving === "saving" ? "Saving your place…" : saving === "saved" ? `Place saved at page ${page}` : ""}
            </p>
          )}
        </div>

        {/* Bookmarks panel */}
        {panelOpen && (
          <aside className="w-72 shrink-0 border-l border-paper-edge bg-white/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Bookmarks</h3>
              <button className="text-xs text-ink-faint" onClick={() => setPanelOpen(false)}>Close</button>
            </div>
            {bookmarks.length === 0 ? (
              <p className="text-sm text-ink-soft">No bookmarks yet. Tap Bookmark on any page.</p>
            ) : (
              <ul className="space-y-2">
                {bookmarks.map((b) => (
                  <li key={b.id} className={`group rounded-md border p-2 ${b.page === page ? "border-forest bg-forest-light" : "border-paper-edge bg-white"}`}>
                    <div className="flex items-center justify-between">
                      <button className="text-sm font-semibold text-forest hover:underline" onClick={() => go(b.page)}>Page {b.page}</button>
                      <button className="text-xs text-ink-faint hover:text-clay" onClick={() => removeBookmark(b.id)}>Remove</button>
                    </div>
                    {b.note && <p className="mt-1 text-xs text-ink-soft">{b.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}
      </div>

      <StudyAssistant
        bookId={bookId}
        price={aiPrice}
        questionTierPrices={questionTierPrices}
        currentPage={page}
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
      />
    </div>
  );
}

function Watermark({ text }: { text: string }) {
  const rows = Array.from({ length: 8 });
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -inset-1/2 flex rotate-[-28deg] flex-col justify-around">
        {rows.map((_, i) => (
          <div key={i} className="whitespace-nowrap text-center text-sm font-semibold text-ink opacity-[0.07]">
            {`${text}   ·   `.repeat(6)}
          </div>
        ))}
      </div>
    </div>
  );
}
