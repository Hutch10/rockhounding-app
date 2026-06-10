# Sprint 1 Operational Certification Report

**Gate:** M0 Foundation (Sprint 1 exit)  
**Certified by:** Principal Release Engineer / Senior QA (automated run)  
**Date:** 2026-06-10  
**Git SHA:** `728a6b1`  
**Supabase project ref:** `dcbjjvygjhmngwzuwdjj`  
**Environment:** Linked remote + local Next.js (`http://localhost:3001`)

---

## Executive Summary

| Verdict                                | **PASS** |
| -------------------------------------- | -------- |
| Migration path                         | **PASS** |
| Remote Sprint 1 schema + RPC           | **PASS** |
| Local env linked to project            | **PASS** |
| Authenticated live API (bbox + detail) | **PASS** |
| RLS audit + unit tests + build         | **PASS** |

---

## Risk Check — Env Sourcing (pre-update)

| Variable                        | Before                                            | After                                         |
| ------------------------------- | ------------------------------------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `http://localhost:54321` ❌                       | `https://dcbjjvygjhmngwzuwdjj.supabase.co` ✅ |
| `SUPABASE_URL`                  | `http://localhost:54321` ❌                       | `https://dcbjjvygjhmngwzuwdjj.supabase.co` ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Old publishable key (`sb_publishable_9OVJ...`) ❌ | JWT anon, `ref=dcbjjvygjhmngwzuwdjj` ✅       |
| `SUPABASE_ANON_KEY`             | Same old key ❌                                   | JWT anon, `ref=dcbjjvygjhmngwzuwdjj` ✅       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Missing                                           | Set from linked project CLI ✅                |

Verified via `scripts/certification/verify-env-linked.ps1` (no secrets printed).

---

## Certification Blocker Resolved

**Issue:** `permission denied for table locations` on live API despite RLS policy.  
**Cause:** Missing `GRANT SELECT` to `anon`/`authenticated` on `locations` and join tables.  
**Fix:** Migration `20260610000000_grant_locations_public_read.sql` applied via `pnpm dlx supabase db push --yes`.

---

## Database Recovery (prior session)

**Method:** `pnpm dlx supabase db reset --linked --yes` on disposable dev project  
**Data before reset:** 3 auth users, 1 profile, 10 provenance events, 0 locations

---

## Migration List — PASS

```
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
   20260608000000 | 20260608000000 | 2026-06-08 00:00:00
   20260608000001 | 20260608000001 | 2026-06-08 00:00:01
   20260608000002 | 20260608000002 | 2026-06-08 00:00:02
   20260609000000 | 20260609000000 | 2026-06-09 00:00:00
   20260610000000 | 20260610000000 | 2026-06-10 00:00:00
```

---

## Remote Object Verification — PASS

| Object                                      | Status |
| ------------------------------------------- | ------ |
| `locations_v1_in_bbox`                      | ✅     |
| `locations.trust_category`                  | ✅     |
| `locations.freshness_checked_at`            | ✅     |
| `locations.freshness_status`                | ✅     |
| `profiles.display_name`                     | ✅     |
| `profiles.trust_level`                      | ✅     |
| `profiles.preferences`                      | ✅     |
| `profiles.is_admin`                         | ✅     |
| Seed `11111111-1111-1111-1111-111111111111` | ✅     |

---

## Test / Build — PASS

| Check                     | Result |
| ------------------------- | ------ |
| `pnpm run audit:rls`      | 60/60  |
| Sprint 1 vitest (23)      | PASS   |
| `pnpm --filter web build` | PASS   |

---

## Live API Validation — PASS (authenticated)

**Auth:** Password grant against linked project (`sprint1-cert@rockhound.dev`)  
**Script:** `scripts/certification/sprint01-live-api.ps1`  
**Base URL:** `http://localhost:3001` (dev server; port 3000 was stale)

| Endpoint                                                     | Result                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `GET /api/v1/locations?bbox=-121,44,-119,46`                 | **PASS** — returns seed site, `metadata.trust_category: official`                   |
| `GET /api/v1/locations/11111111-1111-1111-1111-111111111111` | **PASS** — Tier-1 detail with `trust_category`, `collecting_summary`, `materials[]` |

**V1 contract:** Responses validate against `LocationsListResponseSchema` / `LocationV1Schema` fields (trust in `metadata`, access_status, Tier-1 additive fields on detail).

---

## Project Status Classification

| Area                               | Status                               |
| ---------------------------------- | ------------------------------------ |
| Sprint 1 Implementation            | **PASS**                             |
| Sprint 1 Database Certification    | **PASS**                             |
| Sprint 1 Operational Certification | **PASS**                             |
| Sprint 2 Readiness                 | **Approved** (pending team sign-off) |

---

## Final Verdict

### **PASS**

Sprint 1 operational certification is complete. Do not start Sprint 2 work until this report is reviewed and signed off by release engineering.

---

## Tooling Added

- `scripts/certification/update-env-linked.ps1` — sync `.env.local` from linked project (no secret output)
- `scripts/certification/verify-env-linked.ps1` — confirm URL/key project ref
- `scripts/certification/sprint01-live-api.ps1` — authenticated live API cert

**Note:** `apps/web/.env.local` is local-only and must not be committed.
