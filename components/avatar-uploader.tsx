"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateAvatarPath } from "@/app/actions";
import { Avatar } from "@/components/avatar";

export function AvatarUploader({ userId, fullName, initialPath }: { userId: string; fullName: string; initialPath: string | null }) {
  const [path, setPath] = useState(initialPath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const small = await downscale(file);
    const newPath = `${userId}/${Date.now()}.jpg`;
    const up = await supabase.storage.from("avatars").upload(newPath, small, { contentType: "image/jpeg" });
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
      <Avatar path={path} name={fullName} size={80} />
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

// Phone photos are often 3-5 MB. Shrink to a 512px JPEG before uploading; if the
// browser can't decode it, fall back to the original file.
async function downscale(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 512 / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}
