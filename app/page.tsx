import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeForRole } from "@/lib/session";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    redirect(homeForRole(data?.role ?? "student"));
  }

  return (
    <div className="space-y-16 py-6">
      <section className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <p className="eyebrow">Your campus e-library</p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Your lecturers&apos; books and handouts, <em className="text-forest">bought or rented</em>, read anywhere.
          </h1>
          <p className="max-w-xl text-lg text-ink-soft">
            Rent a handout for the exam period or own it for good. Pick up exactly where you stopped, bookmark
            the pages that matter, and ask your lecturer questions right from the page you&apos;re on.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup?role=student" className="btn-primary px-5 py-2.5">I&apos;m a learner</Link>
            <Link href="/signup?role=lecturer" className="btn-ghost px-5 py-2.5">I&apos;m a lecturer</Link>
            <Link href="/signup?role=publisher" className="btn-ghost px-5 py-2.5">I&apos;m a publisher</Link>
          </div>
        </div>
        <div className="relative mx-auto h-72 w-full max-w-sm">
          {[
            { t: "Intro to Microeconomics", c: "ECON 101", bg: "#1E4D3A", r: -8, x: 0 },
            { t: "Data Structures Handout", c: "CSCD 205", bg: "#B4532A", r: 4, x: 90 },
            { t: "Organic Chemistry I", c: "CHEM 211", bg: "#C8962E", r: -2, x: 45 },
          ].map((b) => (
            <div
              key={b.t}
              className="absolute top-4 flex h-60 w-40 flex-col justify-between rounded-r-md rounded-l-sm p-4 text-paper shadow-book"
              style={{ background: b.bg, transform: `rotate(${b.r}deg)`, left: b.x }}
            >
              <span className="text-[10px] font-semibold tracking-widest opacity-80">{b.c}</span>
              <span className="font-serif text-lg leading-snug">{b.t}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { h: "Buy or rent", p: "Own a title for good, or rent it for the weeks you need at a lower price. Rentals lock automatically when they end." },
          { h: "Read, resume, bookmark", p: "Your page is saved every time you turn one. Bookmark and annotate key pages and jump back in one tap." },
          { h: "Ask the author", p: "Open a discussion from any page with the lecturer or publisher behind it. Keep it public for the class, or private and book a paid one-on-one session." },
        ].map((f) => (
          <div key={f.h} className="card p-5">
            <h3 className="mb-2 text-lg font-semibold">{f.h}</h3>
            <p className="text-sm text-ink-soft">{f.p}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
