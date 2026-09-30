import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function requireProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");
  return { supabase, user, profile: profile as Profile };
}

export function homeForRole(role: string) {
  return role === "lecturer" ? "/lecturer" : role === "publisher" ? "/publisher" : "/library";
}

export async function requireLecturer() {
  const ctx = await requireProfile();
  if (ctx.profile.role !== "lecturer") redirect(homeForRole(ctx.profile.role));
  return ctx;
}

export async function requirePublisher() {
  const ctx = await requireProfile();
  if (ctx.profile.role !== "publisher") redirect(homeForRole(ctx.profile.role));
  return ctx;
}

export async function requireStudent() {
  const ctx = await requireProfile();
  if (ctx.profile.role !== "student") redirect(homeForRole(ctx.profile.role));
  return ctx;
}
