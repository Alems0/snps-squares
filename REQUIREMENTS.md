# SNPS Squares — Product Requirements (v1)

**Repo:** Alems0/snps-squares  
**Public name:** SNPS  
**Deploy:** free Vercel `*.vercel.app` (no paid domain without Don’s approval)  
**Stack:** React + Vite + TypeScript + Tailwind CSS v4  
**Theme (hard rule):** `@import "tailwindcss"` + `@theme` with `--color-primary: #013369` and `--color-secondary: #D50A0A`. Never use legacy `@tailwind` directives.

## Relationship to dsbsquares
- **Separate product.** Multi-tenant `Alems0/dsbsquares` stays paused.
- **Do not** copy multi-tenant / Platform Admin / $5 create-fee / `/g/slug` creator flows.
- Reuse board/claims UX patterns and NFL theme from dsbsquares where helpful; this is a clean new repo.

## Product model
- Single-admin charity Super Bowl squares.
- **One admin account** (email + password): `stecher2789@gmail.com` (allowlist / seed as sole admin).
- Admin can **open a new board each year** without redeploying (archive/close previous; start fresh season board).
- Players claim squares (guest OK): first name, last name, email required.
- **Editable host Venmo** in admin settings (players see it for payment).
- Payment methods: Venmo or Cash; admin marks paid; unpaid can be released until numbers locked.
- Optional **join password** so the board is not fully public.
- **On-screen receipt** always; **email claim receipts** in v1 (Resend or Supabase free tier).
- **CSV roster export** for admin (sanitize formula injection).
- Randomize + lock axis numbers (admin); after lock, no unpaid release.
- Scores: **sports API auto-fetch + admin override**; highlight winning squares + banner; no auto winner emails; disclaimer that admin confirms winners.
- Charity % + Q1–Final payout splits; admin configures cost/square, charity %, payouts before go-live (blank defaults until set).
- Teams: AFC/NFC placeholders; admin can set real names.

## Backend
- **Separate free Supabase project** (auth + DB). Do not share dsbsquares project/keys.
- Demo/local mode optional for UI testing without live credentials.

## Out of scope (v1)
- Multi-tenant, Platform Admin, $5 create fee, co-admins, paid custom domain, AI features.

## Phase 1 scaffold
Vite React TS, Tailwind v4 NFL theme, landing + 10×10 board shell, admin auth stubs, README, `.env.example`, Supabase migration draft.
