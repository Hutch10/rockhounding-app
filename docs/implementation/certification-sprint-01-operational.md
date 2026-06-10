# Sprint 1 Operational Certification Report

**Gate:** M0 Foundation (Sprint 1 exit)  
**Certified by:** Principal Database / Release / QA Engineer (automated run)  
**Date:** 2026-06-10  
**Git SHA (pre-commit):** `a212eece928eb7483dfb348adb943a6977b2fe32`  
**Supabase project ref:** `dcbjjvygjhmngwzuwdjj`  
**Environment:** Linked remote via Supabase CLI

---

## Executive Summary

| Verdict                              | **PASS WITH BLOCKERS** |
| ------------------------------------ | ---------------------- |
| Migration path (`db reset --linked`) | **PASS**               |
| Remote Sprint 1 schema objects       | **PASS**               |
| RLS audit + unit tests + build       | **PASS**               |
| Direct RPC validation (CLI)          | **PASS**               |
| Live Next.js API validation          | **BLOCKED**            |

The linked dev database was **reset cleanly** and all four migrations applied with recorded history. Sprint 1 database objects and bbox RPC are verified on remote. Live HTTP validation against `pnpm --filter web dev` failed because `apps/web/.env.local` points at `http://localhost:54321` while Docker/local Supabase is not running.

---

## What Was Wrong

1. **Dirty partial migration state** — prior `db push` attempts applied DDL via embedded `COMMIT` inside `20260608000000_baseline_rockhounding_v1.sql` without recording versions in `supabase_migrations.schema_migrations`.
2. **Non-idempotent baseline** — `CREATE TYPE` without duplicate guards, certification test scripts (`TRUNCATE`/`ROLLBACK`) inside migrations, enum `ADD VALUE` + `UPDATE` in same transaction, invalid geometry casts, and broken legacy enum renames (`APPLIED` → `APPLIED`).
3. **Local env mismatch** — `.env.local` targets local Supabase; linked remote is `dcbjjvygjhmngwzuwdjj`.

---

## What Was Changed

| Change                                                                       | File(s)                                                                                |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Removed embedded `BEGIN`/`COMMIT` from migrations                            | `20260608000000_baseline_rockhounding_v1.sql`, `20260609000000_sprint1_foundation.sql` |
| Wrapped `CREATE TYPE` in `DO $$ … duplicate_object` blocks                   | `20260608000000_baseline_rockhounding_v1.sql`                                          |
| Deferred collection analytics MVs + cert test scripts out of migration path  | `20260608000000_baseline_rockhounding_v1.sql`                                          |
| Fixed `sync_operation_status` enum (includes `accepted`/`applied` at create) | baseline                                                                               |
| Column-aware legacy `sync_status` normalization                              | baseline                                                                               |
| Added `scripts/fix-migration-idempotency.ps1`                                | tooling                                                                                |
| Added cert SQL scripts (verify + seed)                                       | `scripts/certification/`                                                               |
| Added `audit:rls` npm script                                                 | `package.json`                                                                         |

---

## Pre-Reset Safety Assessment

**Confirmed disposable dev project** (`dcbjjvygjhmngwzuwdjj`):

| Data                       | Count before reset |
| -------------------------- | ------------------ |
| `auth.users`               | 3                  |
| `public.profiles`          | 1                  |
| `public.finds`             | 0                  |
| `public.locations`         | 0                  |
| `public.provenance_events` | 10                 |

No production user data or seed locations. **Reset approved.**

---

## Database Recovery Method

**Method:** `pnpm dlx supabase db reset --linked --yes` (clean reset, not `migration repair`)

---

## Commands Run

```powershell
git log -1 --format="%H"
Get-Content .\supabase\.temp\project-ref
pnpm dlx supabase migration list
pnpm dlx supabase db reset --linked --yes
pnpm dlx supabase migration list
pnpm dlx supabase db query --linked -f scripts\certification\sprint01-seed-location.sql
pnpm dlx supabase db query --linked "SELECT proname FROM pg_proc WHERE proname='locations_v1_in_bbox'"
pnpm dlx supabase db query --linked "SELECT id, name, trust_category FROM locations_v1_in_bbox(-121, 44, -119, 46, 10)"
pnpm run audit:rls
pnpm exec vitest run apps/web/lib/trust/resolveTrustCategory.test.ts apps/web/app/api/v1/locations/route.test.ts "apps/web/app/api/v1/locations/[id]/route.test.ts"
pnpm --filter web build
pnpm --filter web dev   # then Invoke-RestMethod against localhost:3000/api/v1/locations*
```

---

## Migration List Result

```
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
   20260608000000 | 20260608000000 | 2026-06-08 00:00:00
   20260608000001 | 20260608000001 | 2026-06-08 00:00:01
   20260608000002 | 20260608000002 | 2026-06-08 00:00:02
   20260609000000 | 20260609000000 | 2026-06-09 00:00:00
```

**PASS** — all four migrations recorded on remote.

---

## Remote Object Verification

| Object                                               | Result   |
| ---------------------------------------------------- | -------- |
| `locations_v1_in_bbox`                               | **PASS** |
| `locations.trust_category`                           | **PASS** |
| `locations.freshness_checked_at`                     | **PASS** |
| `locations.freshness_status`                         | **PASS** |
| `profiles.display_name`                              | **PASS** |
| `profiles.trust_level`                               | **PASS** |
| `profiles.preferences`                               | **PASS** |
| `profiles.is_admin`                                  | **PASS** |
| Seed location `11111111-1111-1111-1111-111111111111` | **PASS** |

Direct RPC returns seed site with `trust_category: official`.

---

## Test / Build Results

| Check                      | Result                                                |
| -------------------------- | ----------------------------------------------------- |
| `pnpm run audit:rls`       | **PASS** (60/60)                                      |
| Sprint 1 vitest (23 tests) | **PASS**                                              |
| `pnpm --filter web build`  | **PASS**                                              |
| `pnpm --filter web test`   | **N/A** — no `test` script in `apps/web/package.json` |

---

## Live API Validation

| Endpoint                                     | Result      | Detail                                         |
| -------------------------------------------- | ----------- | ---------------------------------------------- |
| `GET /api/v1/locations?bbox=-121,44,-119,46` | **BLOCKED** | HTTP 500 `DB_ERROR`: `TypeError: fetch failed` |
| `GET /api/v1/locations/11111111-...`         | **BLOCKED** | HTTP 500 `DB_ERROR`                            |

**Root cause:** `apps/web/.env.local` has `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`. Docker/local Supabase is not running. Next.js cannot reach the database.

**Not faked.** Database layer validated separately via linked CLI RPC query.

### Remediation for live API PASS

1. Point `apps/web/.env.local` at linked project:
   - `NEXT_PUBLIC_SUPABASE_URL=https://dcbjjvygjhmngwzuwdjj.supabase.co`
   - `SUPABASE_URL` (same)
   - Valid `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY` from Supabase dashboard
2. Restart `pnpm --filter web dev`
3. Re-run bbox + detail requests (auth optional for public `locations` SELECT)

---

## Final Verdict

### **PASS WITH BLOCKERS**

| Layer                        | Status                                     |
| ---------------------------- | ------------------------------------------ |
| Migration path certifiable   | **PASS**                                   |
| Remote Sprint 1 schema + RPC | **PASS**                                   |
| Local build & unit tests     | **PASS**                                   |
| Live Next.js API             | **BLOCKED** (env → localhost, Docker down) |

Sprint 1 **database operational certification** is complete. **Application-layer live API certification** remains blocked until `.env.local` targets the linked project.

---

## Re-certification (live API only)

```powershell
# After updating apps/web/.env.local to linked project URL + anon key:
pnpm --filter web dev
Invoke-RestMethod "http://localhost:3000/api/v1/locations?bbox=-121,44,-119,46&limit=10"
Invoke-RestMethod "http://localhost:3000/api/v1/locations/11111111-1111-1111-1111-111111111111"
```

Update verdict to **PASS** when both return 200 with `trust_category` in response JSON.
