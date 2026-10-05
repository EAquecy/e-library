"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { InterestPicker } from "@/components/interest-picker";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const initialRole = params.get("role") === "lecturer" ? "lecturer" : params.get("role") === "publisher" ? "publisher" : "student";
  const [role, setRole] = useState<"student" | "lecturer" | "publisher">(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await submit(e.currentTarget);
    } catch {
      setBusy(false);
      setError("Couldn't reach the server. Check your internet connection (turn off any VPN, data saver or ad blocker for this site) and try again.");
    }
  }

  async function submit(form: HTMLFormElement) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const fd = new FormData(form);
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
            department: String(fd.get("department") || "").trim(),
            interests: role === "student" ? interests : [],
          },
        },
      });
      if (error) {
        setBusy(false);
        return setError(friendly(error.message));
      }
      if (!data.session) {
        // Account is auto-confirmed in this MVP; sign in straight away.
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setBusy(false);
          return setNotice("Account created. Check your email to confirm it, then sign in.");
        }
      }
      router.replace(role === "lecturer" ? "/lecturer" : role === "publisher" ? "/publisher" : "/browse");
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      return setError(friendly(error.message));
    }
    router.replace(params.get("next") || "/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="mb-1 text-3xl font-semibold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p className="mb-6 text-sm text-ink-soft">
        {mode === "login" ? "Sign in to continue reading." : "Learners buy, rent and read. Lecturers publish and answer questions. Publishers list research and journals."}
      </p>

      <form onSubmit={onSubmit} className="card space-y-4 p-6">
        {mode === "signup" && (
          <>
            <div className="grid grid-cols-3 gap-2 rounded-md bg-paper-deep p-1">
              {(["student", "lecturer", "publisher"] as const).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`rounded px-3 py-2 text-sm font-medium capitalize ${role === r ? "bg-white shadow-sm" : "text-ink-soft"}`}
                >
                  {r === "student" ? "learner" : r}
                </button>
              ))}
            </div>
            <div>
              <label className="label" htmlFor="full_name">{role === "publisher" ? "Publisher / organization name" : "Full name"}</label>
              <input className="input" id="full_name" name="full_name" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {role === "student" ? (
                <div className="col-span-2">
                  <p className="label">Interested fields</p>
                  <InterestPicker onChange={setInterests} />
                </div>
              ) : (
                <div className="col-span-2">
                  <label className="label" htmlFor="department">{role === "publisher" ? "Field / discipline (optional)" : "Department"}</label>
                  <input className="input" id="department" name="department" placeholder="e.g. Computer Science" />
                </div>
              )}
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
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : `Create ${role === "student" ? "learner" : role} account`}
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

function friendly(message: string) {
  return /failed to fetch|networkerror|load failed/i.test(message)
    ? "Couldn't reach the server. Check your internet connection (turn off any VPN, data saver or ad blocker for this site) and try again."
    : message;
}
