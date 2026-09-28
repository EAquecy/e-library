"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<"student" | "lecturer">(params.get("role") === "lecturer" ? "lecturer" : "student");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email")).trim();
    const password = String(fd.get("password"));
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: String(fd.get("full_name") || "").trim(),
            role,
            student_id: String(fd.get("student_id") || "").trim(),
            department: String(fd.get("department") || "").trim(),
          },
        },
      });
      if (error) {
        setBusy(false);
        return setError(error.message);
      }
      if (!data.session) {
        // Account is auto-confirmed in this MVP; sign in straight away.
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setBusy(false);
          return setNotice("Account created. Check your email to confirm it, then sign in.");
        }
      }
      router.replace(role === "lecturer" ? "/lecturer" : "/browse");
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    router.replace(params.get("next") || "/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="mb-1 text-3xl font-semibold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p className="mb-6 text-sm text-ink-soft">
        {mode === "login" ? "Sign in to continue reading." : "Students buy, rent and read. Lecturers publish and answer questions."}
      </p>

      <form onSubmit={onSubmit} className="card space-y-4 p-6">
        {mode === "signup" && (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-md bg-paper-deep p-1">
              {(["student", "lecturer"] as const).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`rounded px-3 py-2 text-sm font-medium capitalize ${role === r ? "bg-white shadow-sm" : "text-ink-soft"}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div>
              <label className="label" htmlFor="full_name">Full name</label>
              <input className="input" id="full_name" name="full_name" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {role === "student" && (
                <div>
                  <label className="label" htmlFor="student_id">Student ID</label>
                  <input className="input" id="student_id" name="student_id" required />
                </div>
              )}
              <div className={role === "lecturer" ? "col-span-2" : ""}>
                <label className="label" htmlFor="department">Department</label>
                <input className="input" id="department" name="department" placeholder="e.g. Computer Science" />
              </div>
            </div>
          </>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" minLength={6} required autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </div>
        {error && <p className="rounded bg-clay-light px-3 py-2 text-sm text-clay">{error}</p>}
        {notice && <p className="rounded bg-forest-light px-3 py-2 text-sm text-forest">{notice}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : `Create ${role} account`}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-soft">
        {mode === "login" ? (
          <>New here? <Link className="text-forest underline" href="/signup">Create an account</Link></>
        ) : (
          <>Already have an account? <Link className="text-forest underline" href="/login">Sign in</Link></>
        )}
      </p>
    </div>
  );
}
