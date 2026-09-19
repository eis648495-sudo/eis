# Base44 Dev Environment — Mamlakah

## Stack
React 18 + Vite 6 frontend. Backend is a local Postgres + PostgREST stack (replaces the external Supabase project, which is currently unreachable/paused).

## Run
`docker compose -f docker-compose.base44.yml up -d` — starts:
- **db** (postgres:16-alpine) — local database with schema + seed data
- **migrations** (one-shot) — runs `supabase/migrations/000_local_init.sql` on first boot
- **api** (postgrest/postgrest:v12.2.3) — REST API at `/rest/v1/` (Supabase-compatible)
- **proxy** (nginx:alpine) — strips `/rest/v1/` prefix, adds CORS headers, exposed on port 8000
- **web** (node:22) — Vite dev server on host port 3000, bind-mounted with live reload

## Local DB credentials
- Admin login: username `admin`, password `admin123`
- Postgres: user `postgres`, password `postgres`, db `postgres`

## How it works
The app's `src/lib/supabase.js` creates a Supabase client pointing at `VITE_SUPABASE_URL`. The compose sets this to the local PostgREST proxy (`https://8000-$BASE44_PUBLIC_HOST_SUFFIX`) with a generated JWT anon key, overriding the broken external Supabase credentials in `/run/base44/app.env`.

**When the real Supabase project is restored:** remove the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` lines from the `web` service `environment:` section in `docker-compose.base44.yml` — the app will fall back to the real credentials in `/run/base44/app.env`.

## Verify
- `curl -sf http://localhost:3000/` returns the landing page HTML
- Login at `/MemberLogin` with `admin` / `admin123` → navigates to `/Dashboard`
