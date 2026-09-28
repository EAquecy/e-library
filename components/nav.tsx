import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "./logo";
import { initials } from "@/lib/format";

export async function Nav() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { full_name: string; role: string } | null = null;
  let pending = 0;
  if (user) {
    const { data } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
    profile = data;
    if (profile?.role === "lecturer") {
      const [{ count: d }, { count: c }] = await Promise.all([
        supabase.from("discussions").select("id", { count: "exact", head: true }).eq("lecturer_id", user.id).eq("status", "pending"),
        supabase.from("consultations").select("id", { count: "exact", head: true }).eq("lecturer_id", user.id).eq("status", "requested"),
      ]);
      pending = (d ?? 0) + (c ?? 0);
    }
  }

  const links =
    profile?.role === "lecturer"
      ? [
          { href: "/lecturer", label: "Dashboard" },
          { href: "/lecturer/upload", label: "Upload" },
          { href: "/discussions", label: "Discussions", badge: pending },
          { href: "/sessions", label: "Sessions" },
        ]
      : profile
        ? [
            { href: "/library", label: "My shelf" },
            { href: "/browse", label: "Browse" },
            { href: "/discussions", label: "Discussions" },
            { href: "/sessions", label: "Sessions" },
          ]
        : [];

  return (
    <header className="sticky top-0 z-30 border-b border-paper-edge bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href={profile ? (profile.role === "lecturer" ? "/lecturer" : "/library") : "/"}>
          <Logo />
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="relative whitespace-nowrap rounded-md px-3 py-1.5 text-ink-soft hover:bg-paper-deep hover:text-ink">
              {l.label}
              {"badge" in l && l.badge ? (
                <span className="ml-1.5 rounded-full bg-clay px-1.5 text-[10px] font-bold text-white">{l.badge}</span>
              ) : null}
            </Link>
          ))}
        </nav>
        {profile ? (
          <div className="flex items-center gap-2">
            <Link href="/settings" title="Profile" className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-xs font-bold text-paper">
              {initials(profile.full_name)}
            </Link>
            <form action="/auth/signout" method="post">
              <button className="text-xs text-ink-faint hover:text-ink">Sign out</button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost py-1.5">Sign in</Link>
            <Link href="/signup" className="btn-primary py-1.5">Create account</Link>
          </div>
        )}
      </div>
    </header>
  );
}
