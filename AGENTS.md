# Base44 Dev Environment — Mamlakah

## Stack
React 18 + Vite 6 frontend. Backend is the external Supabase project (ref: mtfrvdccubwqdnmnudyu), which is now reachable. A local Postgres + PostgREST stack is also available as a fallback.

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
The app's `src/lib/supabase.js` creates a Supabase client pointing at `VITE_SUPABASE_URL`. The real Supabase credentials are in `/run/base44/app.env` and used directly (no local override in compose).

**If the external Supabase becomes unreachable again:** add `VITE_SUPABASE_URL=https://8000-${BASE44_PUBLIC_HOST_SUFFIX}` and a valid PostgREST JWT as `VITE_SUPABASE_ANON_KEY` to the `web` service `environment:` section in `docker-compose.base44.yml` to fall back to the local PostgREST stack.

## Verify
- `curl -sf http://localhost:3000/` returns the landing page HTML
- Login at `/MemberLogin` with real Supabase member credentials → navigates to `/Dashboard`
