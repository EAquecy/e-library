"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { postMessage } from "@/app/actions";
import { dateTime, initials } from "@/lib/format";
import type { Message } from "@/lib/types";

type Names = Record<string, { name: string; role: string }>;

export function Thread({
  discussionId,
  initial,
  names: initialNames,
  me,
  lecturerId,
  canPost,
  status,
}: {
  discussionId: string;
  initial: Message[];
  names: Names;
  me: string;
  lecturerId: string;
  canPost: boolean;
  status: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>(initial);
  const [names, setNames] = useState<Names>(initialNames);
  const [text, setText] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [showVideo, setShowVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canAttachVideo = me === lecturerId;
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const namesRef = useRef(names);
  namesRef.current = names;

  useEffect(() => {
    const channel = supabase
      .channel(`disc-${discussionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "discussion_messages", filter: `discussion_id=eq.${discussionId}` },
        async (payload) => {
          const m = payload.new as Message;
          setMessages((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, m]));
          if (!namesRef.current[m.author_id]) {
            const { data } = await supabase.from("profiles").select("id, full_name, role").eq("id", m.author_id).single();
            if (data) setNames((n) => ({ ...n, [data.id]: { name: data.full_name, role: data.role } }));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, discussionId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function refresh() {
    const { data } = await supabase.from("discussion_messages").select("*").eq("discussion_id", discussionId).order("created_at");
    if (data) setMessages(data as Message[]);
  }

  return (
    <div className="card flex min-h-[24rem] flex-col">
      <div className="flex-1 space-y-4 p-4">
        {messages.length === 0 && <p className="text-sm text-ink-faint">No messages yet.</p>}
        {messages.map((m) => {
          const mine = m.author_id === me;
          const isLect = m.author_id === lecturerId;
          const who = names[m.author_id]?.name ?? "Someone";
          return (
            <div key={m.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${isLect ? "bg-forest text-paper" : "bg-paper-deep text-ink"}`}>
                {initials(who)}
              </div>
              <div className={`max-w-[80%] ${mine ? "text-right" : ""}`}>
                <p className="mb-0.5 text-xs text-ink-faint">
                  <span className="font-semibold text-ink-soft">{who}</span>
                  {isLect && <span className="ml-1 chip bg-forest-light px-1.5 text-forest">Lecturer</span>} · {dateTime(m.created_at)}
                </p>
                <div className={`inline-block whitespace-pre-wrap rounded-lg px-3 py-2 text-left text-sm ${mine ? "bg-forest text-paper" : isLect ? "border border-forest/30 bg-forest-light" : "bg-white"}`}>
                  {m.body}
                  {m.video_url && (
                    <div className={m.body ? "mt-2" : ""}>
                      <a
                        href={m.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 text-xs font-medium underline ${mine ? "text-paper" : "text-forest"}`}
                      >
                        ▶ Watch video explanation
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {canPost ? (
        <form
          className="space-y-2 border-t border-paper-edge p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const body = text;
            const video = videoUrl;
            start(async () => {
              const res = await postMessage(discussionId, body, video);
              if (!res.ok) return setError(res.error);
              setText("");
              setVideoUrl("");
              setShowVideo(false);
              setError(null);
              refresh();
            });
          }}
        >
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  (e.currentTarget.form as HTMLFormElement).requestSubmit();
                }
              }}
              rows={2}
              placeholder="Write a reply… (Enter to send, Shift+Enter for a new line)"
              className="input flex-1 resize-none"
            />
            <button className="btn-primary self-end" disabled={pending || (!text.trim() && !videoUrl.trim())}>Send</button>
          </div>
          {canAttachVideo && (
            <div>
              {showVideo ? (
                <input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  type="url"
                  placeholder="Paste a YouTube, Loom or Drive link explaining this"
                  className="input text-sm"
                />
              ) : (
                <button type="button" onClick={() => setShowVideo(true)} className="text-xs text-forest underline">
                  + Attach a video explanation
                </button>
              )}
            </div>
          )}
        </form>
      ) : (
        <p className="border-t border-paper-edge p-3 text-center text-sm text-ink-soft">
          {status === "pending" ? "Waiting for the lecturer to approve this discussion." : status === "declined" ? "The lecturer declined this discussion." : "This discussion is closed."}
        </p>
      )}
      {error && <p className="px-3 pb-3 text-sm text-clay">{error}</p>}
    </div>
  );
}
