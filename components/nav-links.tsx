"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string; badge?: number }[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link key={l.href} href={l.href} className="relative whitespace-nowrap rounded-md px-3 py-1.5 text-ink-soft hover:bg-paper-deep hover:text-ink">
            {l.label}
            {!active && l.badge ? (
              <span className="ml-1.5 rounded-full bg-clay px-1.5 text-[10px] font-bold text-white">{l.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
