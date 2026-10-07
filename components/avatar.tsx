import Image from "next/image";
import { avatarUrl, initials } from "@/lib/format";

// Served through Next's image optimizer so a multi-MB phone photo becomes a
// few-KB thumbnail from our own domain (fast on mobile data).
export function Avatar({ path, name, size = 96, className = "" }: { path: string | null; name: string; size?: number; className?: string }) {
  const url = avatarUrl(path);
  const box = { width: size, height: size };
  if (url) {
    return <Image src={url} alt="" width={size} height={size} sizes={`${size}px`} style={box} className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <div style={box} className={`flex shrink-0 items-center justify-center rounded-full bg-forest font-semibold text-paper ${className}`}>
      <span style={{ fontSize: size * 0.28 }}>{initials(name)}</span>
    </div>
  );
}
