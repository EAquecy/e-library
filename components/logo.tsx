export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <rect x="3" y="4" width="26" height="4" rx="1" fill="#C8962E" />
        <path d="M6 10h20l-3 14H9L6 10z" fill="#1E4D3A" />
        <rect x="14" y="24" width="4" height="4" fill="#1E4D3A" />
        <rect x="9" y="28" width="14" height="2" rx="1" fill="#1B2420" />
      </svg>
      <span className="font-serif text-xl font-semibold tracking-tight">Lectern</span>
    </span>
  );
}
