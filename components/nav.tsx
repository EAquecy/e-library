import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { initials } from "@/lib/format";

export async function Nav() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { full_name: string; role: string; discussions_seen_at: string; sessions_seen_at: string } | null = null;
  let pendingDiscussions = 0;
  let pendingSessions = 0;
  if (user) {
    const { data } = await supabase.from("profiles").select("full_name, role, discussions_seen_at, sessions_seen_at").eq("id", user.id).single();
    profile = data;
    if (profile?.role === "lecturer" || profile?.role === "publisher") {
      // Count only requests that arrived since the last time this person
      // opened the Discussions / Sessions page, so the badge clears on
      // visiting instead of sticking around for every still-pending item.
      const [{ count: d }, { count: c }] = await Promise.all([
        supabase
          .from("discussions")
          .select("id", { count: "exact", head: true })
          .eq("lecturer_id", user.id)
          .eq("status", "pending")
          .gt("created_at", profile.discussions_seen_at),
        supabase
          .from("consultations")
          .select("id", { count: "exact", head: true })
          .eq("lecturer_id", user.id)
          .eq("status", "requested")
          .gt("created_at", profile.sessions_seen_at),
      ]);
      pendingDiscussions = d ?? 0;
      pendingSessions = c ?? 0;
    }
  }

  const links =
    profile?.role === "lecturer"
      ? [
          { href: "/lecturer", label: "Dashboard" },
          { href: "/lecturer/upload", label: "Upload" },
          { href: "/lecturer/earnings", label: "Earnings" },
          { href: "/discussions", label: "Discussions", badge: pendingDiscussions },
          { href: "/sessions", label: "Sessions", badge: pendingSessions },
        ]
      : profile?.role === "publisher"
        ? [
            { href: "/publisher", label: "Dashboard" },
            { href: "/publisher/upload", label: "Upload" },
            { href: "/publisher/earnings", label: "Earnings" },
            { href: "/discussions", label: "Discussions", badge: pendingDiscussions },
            { href: "/sessions", label: "Sessions", badge: pendingSessions },
          ]
        : profile
          ? [
              { href: "/library", label: "My shelf" },
              { href: "/browse", label: "Browse" },
              { href: "/discussions", label: "Discussions" },
              { href: "/sessions", label: "Sessions" },
            ]
          : [];

  const home = profile ? (profile.role === "lecturer" ? "/lecturer" : profile.role === "publisher" ? "/publisher" : "/library") : "/";

  return (
    <header className="sticky top-0 z-30 border-b border-paper-edge bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link href={home} className="shrink-0">
          <Logo />
        </Link>
        <NavLinks links={links} />
        {profile ? (
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/settings" title="Profile" className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-xs font-bold text-paper">
              {initials(profile.full_name)}
            </Link>
            <form action="/auth/signout" method="post">
              <button className="whitespace-nowrap text-xs text-ink-faint hover:text-ink">Sign out</button>
            </form>
          </div>
        ) : (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link href="/login" className="btn-ghost whitespace-nowrap px-3 py-1.5">Sign in</Link>
            <Link href="/signup" className="btn-primary whitespace-nowrap px-3 py-1.5">Create account</Link>
          </div>
        )}
      </div>
    </header>
  );
}
