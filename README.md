# Lectern · campus e-library

Lecturers upload books and handouts (PDF) for sale or rent. Students buy or rent, read in a protected in-browser reader that remembers their page, bookmark pages, and open discussions with the lecturer.

**Stack:** Next.js 14 (App Router) · Supabase (Postgres, Auth, Storage, Realtime) · Tailwind · pdf.js · Vercel

## Features

**Students**
- Browse and search the catalogue, filter by course code
- Buy (own forever) or rent for N days; renting again extends the rental
- Reader: saved page on every turn, bookmarks with notes, zoom, keyboard navigation
- Watermark with name, student ID and email on every page; no download, right-click or print
- Rentals lock automatically when they expire (checked in the database and live in the reader)
- **Ask** from any page opens a discussion, public or private, sent to the lecturer for approval
- Private discussions can book a paid one-on-one session (30 or 60 min)

**Lecturers**
- Upload PDF + optional cover, set buy price and/or rent price and period; page count detected automatically
- Dashboard: sales, active rentals, earnings, pending approvals
- Approve, decline, close or reopen discussions; realtime chat
- Confirm session requests with a meeting link; set your rate per 30 minutes in Settings

## Security model
All rules live in Postgres (see `supabase/migrations`), not just the UI:
- Row-level security on every table; students only see their own purchases, progress, bookmarks and sessions
- PDFs sit in a private storage bucket, readable only by the owning lecturer or a student with an active purchase/rental
- Purchases, rentals, discussions and sessions go through `SECURITY DEFINER` functions that validate every step (e.g. can't pay before the lecturer confirms, can't book before approval, can't change your role)

## Payments
Currently **mock** (`mock_checkout`, `mock_pay_consultation`). To go live, replace those calls with Paystack (MoMo + card): initialize the transaction in a server action, then create the entitlement from a verified Paystack webhook.

## Local setup
```bash
npm install
cp .env.example .env.local   # Supabase URL + publishable key
npm run dev
```

## Database
Migrations in `supabase/migrations` are already applied to the Supabase project `e-library`. For a fresh project: `supabase link` then `supabase db push`.

> MVP note: `20260928000200_autoconfirm_email.sql` confirms accounts on sign-up so nobody waits for an email. Drop that trigger when you want real email verification.
