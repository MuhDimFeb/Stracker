# STRACKER - Gamer's Hobby Fund Tracker

Gamified savings tracker for planning game and digital asset purchases during sales, so hobby spending never eats into the core budget.

**Stack:** React + Vite + TypeScript, TailwindCSS v4, ESLint, Clerk (auth), Supabase (database), Steam store API + IsThereAnyDeal (prices).

## Setup

```bash
npm install
cp .env.example .env   # then fill in the keys
npm run dev
```

Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

## Environment variables

| Variable | Where from |
| --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk dashboard > API keys |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Supabase > Project settings > API |
| `ITAD_API_KEY` | https://isthereanydeal.com/apps/my/ (server-side only, optional) |

## Database

1. In Supabase, add Clerk as a third-party auth provider (Authentication > Sign In / Up).
2. Run `supabase/schema.sql` in the SQL editor.

Without Clerk login or Supabase keys, data is kept in the browser's localStorage.

## Steam and price data

- Game search and prices come from the Steam store API (`cc=id`, IDR). Browsers cannot call it directly, so requests go through `/steam/*`: a proxy in `vite.config.ts` for dev and a rewrite in `vercel.json` for production.
- All-time lows come from `api/lows.ts` (IsThereAnyDeal). Without `ITAD_API_KEY` the app shows the lowest price it has seen instead.

## Deploy (Vercel)

Import the repo, add the environment variables above, deploy. `vercel.json` already contains the Steam rewrite.

## Project structure

```
api/lows.ts          all-time low endpoint (Vercel function, also served in dev)
src/App.tsx          homepage, search overlay, balance panel
src/Account.tsx      account page: games, XP, quests
src/data.ts          types, quests, XP/level logic
src/lib/             currency, steam, supabase helpers
supabase/schema.sql  table + RLS policies
```
