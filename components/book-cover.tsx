import { coverUrl } from "@/lib/format";

const PALETTE = ["#1E4D3A", "#B4532A", "#C8962E", "#2F4858", "#6B3E5E", "#3D5A2A"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function BookCover({
  title,
  courseCode,
  coverPath,
  kind,
  size = "md",
}: {
  title: string;
  courseCode: string | null;
  coverPath: string | null;
  kind?: "book" | "handout" | "publication";
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "sm" ? "w-14 h-20 text-[9px]" : size === "lg" ? "w-48 h-68 text-sm" : "w-full aspect-[3/4] text-xs";
  const url = coverUrl(coverPath);
  const label = courseCode ?? (kind === "handout" ? "HANDOUT" : kind === "publication" ? "PUBLICATION" : "");
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`${dims} rounded-r-md rounded-l-sm object-cover shadow-book`} style={size === "lg" ? { height: "17rem" } : undefined} />;
  }
  const bg = PALETTE[hash(title) % PALETTE.length];
  return (
    <div
      className={`${dims} relative flex flex-col justify-between overflow-hidden rounded-r-md rounded-l-sm p-3 text-paper shadow-book`}
      style={{ background: bg, ...(size === "lg" ? { height: "17rem" } : {}) }}
    >
      <div className="absolute inset-y-0 left-0 w-1.5 bg-black/15" />
      <span className="font-semibold tracking-widest opacity-80">{label}</span>
      {size !== "sm" && <span className="font-serif text-[1.35em] leading-snug">{title}</span>}
    </div>
  );
}
