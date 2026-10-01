"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateAvatarPath } from "@/app/actions";
import { avatarUrl, initials } from "@/lib/format";

export function AvatarUploader({ userId, fullName, initialPath }: { userId: string; fullName: string; initialPath: string | null }) {
  const [path, setPath] = useState(initialPath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const url = avatarUrl(path);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const newPath = `${userId}/${Date.now()}.${ext}`;
    const up = await supabase.storage.from("avatars").upload(newPath, file, { contentType: file.type });
    if (up.error) {
      setBusy(false);
      return setError(up.error.message);
    }
    const oldPath = path;
    const res = await updateAvatarPath(newPath);
    if (!res.ok) {
      setBusy(false);
      return setError(res.error);
    }
    setPath(newPath);
    if (oldPath) await supabase.storage.from("avatars").remove([oldPath]);
    setBusy(false);
  }

  async function onRemove() {
    if (!path) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const res = await updateAvatarPath(null);
    if (!res.ok) {
      setBusy(false);
      return setError(res.error);
    }
    await supabase.storage.from("avatars").remove([path]);
    setPath(null);
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-4">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- Supabase storage URL, not a static asset next/image can optimize usefully here
        <img src={url} alt="" className="h-20 w-20 rounded-full object-cover" />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-forest text-xl font-semibold text-paper">{initials(fullName)}</div>
      )}
      <div className="space-y-1">
        <div className="flex gap-2">
          <button type="button" className="btn-ghost px-3 py-1.5 text-sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Working…" : path ? "Change photo" : "Upload photo"}
          </button>
          {path && (
            <button type="button" className="text-sm text-ink-faint hover:text-clay" disabled={busy} onClick={onRemove}>
              Remove
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        {error && <p className="text-xs text-clay">{error}</p>}
      </div>
    </div>
  );
}
