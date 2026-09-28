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

export async function requireLecturer() {
  const ctx = await requireProfile();
  if (ctx.profile.role !== "lecturer") redirect("/library");
  return ctx;
}

export async function requireStudent() {
  const ctx = await requireProfile();
  if (ctx.profile.role !== "student") redirect("/lecturer");
  return ctx;
}
