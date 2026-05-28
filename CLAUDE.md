# Session context — gas tank detection platform

> Snapshot of where the project stands, for picking up a future session
> without re-reading the full conversation.

## What this is

A geospatial sales prospecting tool that finds businesses using
industrial gas tanks (LNG, welding gases, oxy-acetylene) by analysing
satellite imagery across user-drawn industrial zones. Target customer
profile: welders, metal fabricators, small manufacturers — businesses
that often have no website and aren't in business registries, so they
must be discovered visually via the gas infrastructure on their
premises.

UK-focused. Demo zone seeded in the SQL is **Park Royal**, west London.
End user: streetalexander13@gmail.com.

## Where the code lives

- **Original branch**: `alexanderstreet53/Happy-talk`, branch
  `claude/gas-tank-detection-platform-jIaxZ` — three commits on top of
  the old Flutter "Happy Talk" app (now moved to `legacy/`).
- **User's working repo (as of last Vercel build attempt)**:
  `alexanderstreet53/Gas_Sales`, branch `main`, commit `c7ea63f`.
  They appear to have copied the scaffold over to a fresh repo.
- **Local working dir**: `/home/user/Happy-talk` — still the original
  layout. Any commits I make land in the original repo; the user is
  responsible for syncing them into `Gas_Sales`.

## Architecture decisions (already locked in)

User answered an `AskUserQuestion` in turn 1:

| Decision           | Chosen                           |
| ------------------ | -------------------------------- |
| ML inference       | Separate FastAPI worker on Fly.io |
| DB / storage       | Supabase (Postgres + PostGIS + Storage) |
| Frontend           | Next.js 15 App Router            |
| Existing Flutter   | Moved to `/legacy`, untouched    |

These are not up for debate unless the user reopens them.

## Repo layout

```
apps/
  web/              Next.js 15 App Router (UI + API routes)
  worker/           FastAPI + YOLOv8, Dockerfile + fly.toml
supabase/
  migrations/0001_initial_schema.sql   PostGIS schema
  seed.sql                              Park Royal demo zone
docs/
  architecture.md    end-to-end diagram
  pipeline.md        module-by-module spec
  google-tos.md      Google Maps ToS posture, mitigations, swap plan
legacy/              old Flutter app, archived
vercel.json          points to apps/web
.env.example         master list of env vars
```

## Pipeline (one line per stage)

1. **Zones** — user draws polygon → `zones.boundary` (`geography(Polygon, 4326)`).
2. **Imagery** — zone tiled at z=19, fetched from Google Static Maps, cached in
   Supabase Storage with sha256 keys + 90d TTL, every call logged to `api_spend`.
3. **Detection** — Vercel calls the Fly worker (`POST /detect`) with a signed URL;
   YOLOv8 returns boxes; web layer georeferences them back to lat/lng and writes
   to `detections`.
4. **Consolidation** — DBSCAN at ε=25m clusters confirmed detections into `sites`;
   reverse-geocoded; one `leads` row per site.
5. **Verification** — reviewer sees crop + bbox, confirms/rejects; only confirmed
   detections feed clustering.

## Cost controls (don't weaken without asking)

- Zone-clipped tile grid: **never fetch outside polygons.** (`lib/geo/tiles.ts`)
- 90d Storage cache keyed by sha256 of canonical params. (`lib/imagery/cache.ts`)
- 24h spend cap (`IMAGERY_DAILY_CAP_USD`, default $25), fail-closed mid-sweep.
  (`lib/imagery/google.ts` → `assertWithinBudget`)
- Per-call rows in `api_spend` drive the `/spend` dashboard.
- `p-limit(IMAGERY_QPS)` caps concurrency. (`lib/imagery/queue.ts`)

## Env vars

| Name                                      | Required for       | User has it? |
| ----------------------------------------- | ------------------ | ------------ |
| `NEXT_PUBLIC_SUPABASE_URL`                | everything         | yes — `https://rwgddqfpjzqmqucwtuzs.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`    | client reads       | yes — `sb_publishable_nwiKLatImmK0i_fQYXnF8A_ShJunblW` |
| `SUPABASE_SECRET_KEY`                     | server writes      | **no — must paste sb_secret_... into Vercel** |
| `GOOGLE_MAPS_API_KEY`                     | imagery sweep      | no |
| `NEXT_PUBLIC_MAPBOX_TOKEN`                | zone drawer map    | no |
| `WORKER_URL` + `WORKER_API_KEY`           | detection          | no — worker not deployed yet |

Legacy names `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`
are still accepted by `apps/web/lib/env.ts` (`firstOf` helper).

## Commit history (on `claude/gas-tank-detection-platform-jIaxZ`)

```
91864c8  Fix Vercel build + make UI mobile friendly
fa4fbb4  Accept new-style Supabase key names
45b1bd9  Scaffold gas tank detection platform
84ab1ac  (Flutter era starts here)
```

## Build state at end of session

User ran Vercel build of commit `c7ea63f` (in `Gas_Sales` repo).
**`npm install` passed** — 562 packages, no errors, only deprecation
warnings. Output was cut off mid-`npm audit`, so we **don't know
whether `next build` itself succeeded.** Need to ask the user for the
rest of the log, or check the Vercel dashboard.

## Known issues / TODOs

1. **Next.js 15.0.3 has CVE-2025-66478.** Bump to the latest 15.x patch
   in `apps/web/package.json` next session — npm warned about it.
2. **`npm audit` reports 1 critical + 1 moderate.** Run `npm audit` to
   identify; likely the Next CVE plus a transitive dep.
3. **Google ToS for caching imagery is grey** — see `docs/google-tos.md`.
   Production-bound work should switch to Mapbox Satellite or Planet.
   The imagery layer is one file (`lib/imagery/google.ts`) — designed
   to be swapped.
4. **`apps/web/app/api/zones/[id]/fetch/route.ts`** assumes Supabase
   returns geometry as GeoJSON. User must toggle "Use GeoJSON for
   geometry" in Supabase Settings → API.
5. **Worker not deployed yet.** Detection won't work until user
   `fly launch && fly deploy` from `apps/worker/`.
6. **No live map view on the dashboard** — spec asked for pins coloured
   by status; I left it as a follow-up.
7. **No cron** to auto-resume interrupted imagery sweeps. Each chunk
   needs a manual click.
8. **`apps/web/lib/env.ts` throws at import time** if required vars are
   missing. Means builds fail until env is set. Could convert to
   lazy getters, but the explicit error has been useful so far.
9. **The user hasn't applied the SQL schema yet** as far as I know.
   Without that, every page shows the "no rows" empty state. They need
   to paste `supabase/migrations/0001_initial_schema.sql` into the
   Supabase SQL Editor.

## What I'd ask the user first when resuming

1. "What's the full Vercel build log? `npm install` passed but I never
   saw if `next build` finished. URL of the deployment?"
2. "Did you run the SQL migration? Create the `imagery` Storage bucket?
   Toggle the GeoJSON setting?"
3. "Want me to bump Next.js to patch the CVE first?"
4. "After that, the natural next step is the Google Maps key so you
   can run the first imagery sweep on Park Royal."

## User's communication style

- Direct, casual. Uses "u", abbreviations, occasional typos.
- Wants short, practical answers — not essays.
- Asks "what do I do" / "where do I paste" style questions; expects
  concrete steps with specific buttons to click.
- Won't read long preambles. Lead with the action.

## Things I should NOT do without re-asking

- Push to anything other than `claude/gas-tank-detection-platform-jIaxZ`
  on the `Happy-talk` repo. The user manages `Gas_Sales` themselves.
- Create a PR (the user hasn't asked for one).
- Add features outside the spec without checking — they want focus on
  getting the pipeline live, not breadth.
- Wipe / destructively change `legacy/` — user explicitly chose to
  preserve the Flutter app.

## Reference

- Original spec: see first user message in conversation (5-stage
  pipeline + cost controls + ToS flags). The scaffold implements all
  five stages at least skeletally.
- Decisions audit: `AskUserQuestion` in turn 1.
- Tech docs: `docs/architecture.md`, `docs/pipeline.md`,
  `docs/google-tos.md`, `supabase/README.md`, `apps/worker/README.md`.
