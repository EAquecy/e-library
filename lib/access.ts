import type { Entitlement } from "@/lib/types";

/** Collapse a student's entitlements for one book into the best current access. */
export function bestAccess(ents: Entitlement[]) {
  const owned = ents.find((e) => e.kind === "purchase");
  if (owned) return { kind: "purchase" as const, expiresAt: null, active: true };
  const rentals = ents.filter((e) => e.kind === "rental").sort((a, b) => (b.expires_at ?? "").localeCompare(a.expires_at ?? ""));
  if (!rentals.length) return null;
  const latest = rentals[0]!;
  return { kind: "rental" as const, expiresAt: latest.expires_at, active: !!latest.expires_at && new Date(latest.expires_at) > new Date() };
}
