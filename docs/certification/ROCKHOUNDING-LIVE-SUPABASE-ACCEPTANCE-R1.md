# ROCKHOUNDING — Live Supabase Acceptance R1

**Classification:** `DEPLOYMENT_VERSION_MISMATCH_CONFIRMED` → local tip **READY_FOR_OWNER_PUSH_DEPLOY_AUTHORIZATION**  
**Date:** 2026-09-25/26 (remediation + deploy-SHA / collection-sync fix window)  
**Certified local tip:** `c6e8306c230ec39d7de9e19e6d31bec010cb6243` (+ local uncommitted collection/sync hardening on this tip)  
**Deployed preview tip:** `2553d733aa5e4999051ae9bcb8a5dbe4c2ae3558`  
**Branch:** `feat/sprint-4-field-mode` (local **ahead 6** of `origin`; certified tip never pushed/deployed)  
**Project:** Rockhounding v1 `dcbjjvygjhmngwzuwdjj` (ACTIVE_HEALTHY)  
**Evidence pack:** `qa-artifacts/rockhounding-live-supabase-remediation-r1/`

## Owner-browser results (recorded)

| Step                                                                      | Result                                                                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Site URL / redirect allowlist / Vercel SSO                                | PASS                                                                                                   |
| Magic-link request / email / `/auth/callback` / session / protected route | PASS                                                                                                   |
| Quick Log local capture/queue                                             | PASS                                                                                                   |
| Field Mode High-Glare                                                     | FAIL on preview (absent) — explained by SHA mismatch                                                   |
| Sync → downstream verification                                            | PARTIAL — server `sync_operations.status=applied` + find row exists; collection/finds crash after sync |
| `/collection` Digest `2871703799`                                         | FAIL on preview — root cause below                                                                     |
| Logout                                                                    | Not completed (upstream blocked)                                                                       |

## Deployed SHA evidence (`rockhound-web`)

| Field                      | Value                                                                        |
| -------------------------- | ---------------------------------------------------------------------------- |
| Project                    | `rockhound-web` `prj_NUekhJuY90sK8wwSZTgPnHFc4o5a`                           |
| Latest READY deployment    | `dpl_F97Lr6U233VR9gPWEL767Pfkq27x`                                           |
| URL                        | `rockhound-hf01gme5b-hutchs-projects-ef99514e.vercel.app`                    |
| Branch alias               | `rockhound-web-git-feat-sprint-4-db1580-hutchs-projects-ef99514e.vercel.app` |
| Branch                     | `feat/sprint-4-field-mode`                                                   |
| **githubCommitSha**        | **`2553d733aa5e4999051ae9bcb8a5dbe4c2ae3558`**                               |
| createdAt                  | `2026-09-24T03:04:00.448Z`                                                   |
| ready                      | `2026-09-24T03:05:55.551Z`                                                   |
| `c6e8306…` deployments     | **none** (`list_deployments` sha filter count=0)                             |
| Sibling `rockhounding-web` | same SHA attempts in **ERROR** state — not owner path                        |

**Verdict:** `DEPLOYMENT_VERSION_MISMATCH_CONFIRMED`. Missing High-Glare / older Field shell is **not** a certified-code regression until `c6e8306` (with follow-up fixes) is deployed.

## Local vs deployed UI mismatch

| Feature                                  | Local current (`c6e8306`+)                                    | Deployed preview (`2553d733`)                  | Status                   |
| ---------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------- | ------------------------ |
| High-Glare control + persist             | Present (`HighGlareControl`, `data-testid=high-glare-toggle`) | Absent                                         | mismatch                 |
| Field Permission Summary                 | Present                                                       | Absent / older shell                           | mismatch                 |
| Location/Access/Geology trust UI         | Present (`TrustBadge`, permission summary)                    | Older                                          | mismatch                 |
| Geological-strata / governed field shell | Present (Cursor 3.22 field freeze)                            | Older                                          | mismatch                 |
| Quick Log FAB                            | Present                                                       | Present (older chrome)                         | partial                  |
| `/collection`                            | Static empty-safe page → link `/finds`                        | **redirects to `/finds`**                      | mismatch path            |
| Discovery ledger `/finds`                | Soft-map rows (fixed)                                         | Strict `FindV1Schema.parse` → crash after sync | defect on both until fix |

## `/collection` root cause

On deployed `2553d733`, `/collection` is `redirect('/finds')`. `/finds` does `FindV1Schema.parse(row)` on `select('*')`. Live PostgREST rows return geography as **EWKB hex strings**, DB `confidence_metrics` default lacks `total`/`metrics`, and timestamps use `+00` offsets. After owner Quick Log sync created find `b2662d83-…` (`status=applied`), opening Collection threw a server exception (Digest `2871703799`). Empty collection would not crash; **first successful sync exposed the bug**.

## Sync root cause

| Layer                 | Evidence                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server batch          | `sync_operations` row `applied` for client_operation_id `52cdfbb8-…`; find inserted                                                                                 |
| Classification        | **Not** schema/RLS denial for this successful apply; primary owner failure was **downstream collection/finds crash (A+G: old deploy + server component Zod throw)** |
| Client “verification” | Reading collection after sync fails → acceptance marked verification failed even though upload applied                                                              |

## Fixes made (local only — not pushed)

- `apps/web/lib/finds/map-find-row.ts` (+ tests): soft-map PostGIS/DB rows → FindV1 without throw
- `apps/web/app/finds/page.tsx`, `apps/web/app/actions/finds.ts`: use mapper; omit raw geography columns
- `apps/web/app/api/v1/sync/batch/handler.ts`: insert FindV1-compatible `confidence_metrics`
- `apps/web/lib/sync/orchestrator.ts`: `safeParse` sync response
- `apps/web/app/collection/page.tsx`: empty-state copy + test ids
- `e2e/collection.spec.ts`, High-Glare Playwright coverage

## Remaining step

Owner must **authorize push + Vercel preview deploy** of certified tip (including these local fixes), then repeat owner-browser acceptance (Field High-Glare, sync→collection, logout).

---

## Scope controls

| Control                               | Status   |
| ------------------------------------- | -------- |
| No secrets printed / rotated          | **Held** |
| No git push                           | **Held** |
| No deploy                             | **Held** |
| Rollin Eats / RollinClinics untouched | **Held** |
| Billing untouched                     | **Held** |
| No UI redesign / features             | **Held** |
| Do not rotate free-plan slot back     | **Held** |

## Live project state

| Project                | Ref                    | Status         | Action                         |
| ---------------------- | ---------------------- | -------------- | ------------------------------ |
| Rockhounding v1        | `dcbjjvygjhmngwzuwdjj` | ACTIVE_HEALTHY | Remediation migrations applied |
| Rollin Eats and Treats | `frucwufelmplkylcdple` | ACTIVE_HEALTHY | Untouched                      |
| RollinClinics          | `dufvincamsuusjjdfctu` | INACTIVE       | Untouched                      |

---

## Migrations applied

| Repo file                                                                  | Remote version   | Remote name                         | Applied                     |
| -------------------------------------------------------------------------- | ---------------- | ----------------------------------- | --------------------------- |
| `supabase/migrations/20260926000000_security_invoker_collection_views.sql` | `20260926011411` | `security_invoker_collection_views` | Yes (MCP `apply_migration`) |
| `supabase/migrations/20260926000001_fix_rpc_check_access_v2_cte_scope.sql` | `20260926011431` | `fix_rpc_check_access_v2_cte_scope` | Yes                         |
| `supabase/migrations/20260926000002_grant_authenticated_sync_surfaces.sql` | `20260926011655` | `grant_authenticated_sync_surfaces` | Yes (Phase 9 discovery)     |

Proposed copies remain under `supabase/migrations_proposed/` for audit trail.

---

## Migration lineage table

| version        | name                                   | repository_present | remote_present | likely_domain           | introduced_by   | still_referenced          | Rockhounding_relevant | risk_if_left                                                              | risk_if_removed                     | recommended_action          |
| -------------- | -------------------------------------- | ------------------ | -------------- | ----------------------- | --------------- | ------------------------- | --------------------- | ------------------------------------------------------------------------- | ----------------------------------- | --------------------------- |
| 20260608000000 | baseline_rockhounding_v1               | yes                | yes            | Rockhounding            | this repo       | yes                       | yes                   | none                                                                      | catastrophic                        | keep                        |
| 20260608000001 | sync_security_hardening                | yes                | yes            | Rockhounding sync       | this repo       | yes                       | yes                   | none                                                                      | high                                | keep                        |
| 20260608000002 | provenance_events                      | yes                | yes            | Rockhounding provenance | this repo       | yes                       | yes                   | none                                                                      | high                                | keep                        |
| 20260609000000 | sprint1_foundation                     | yes                | yes            | Rockhounding sprint     | this repo       | yes                       | yes                   | none                                                                      | high                                | keep                        |
| 20260610000000 | grant_locations_public_read            | yes                | yes            | Rockhounding discovery  | this repo       | yes                       | yes                   | none                                                                      | medium                              | keep                        |
| 20260611000000 | sprint2_seed_az_oregon                 | yes                | yes            | Rockhounding seed       | this repo       | yes                       | yes                   | none                                                                      | medium                              | keep                        |
| 20260615205752 | mycominer_orchestration_persistence    | no                 | yes            | MycoMiner               | foreign product | schema `mycominer` only   | no                    | low (isolated schema; no authenticated grants observed on sampled tables) | unknown / may break foreign objects | **leave**; document Class B |
| 20260615205841 | mycominer_economy_billing              | no                 | yes            | MycoMiner billing       | foreign         | mycominer invoices/tokens | no                    | low–medium                                                                | unknown                             | leave                       |
| 20260615210003 | expose_mycominer_schema                | no                 | yes            | MycoMiner API exposure  | foreign         | mycominer                 | no                    | medium if ever granted to anon                                            | unknown                             | leave; do not grant anon    |
| 20260615210954 | p0_security_hardening                  | no                 | yes            | mixed hardening         | foreign session | possibly shared           | partial               | low                                                                       | medium                              | leave                       |
| 20260615211532 | 004_workflow_org_isolation             | no                 | yes            | MycoMiner workflows     | foreign         | mycominer.workflows       | no                    | low                                                                       | unknown                             | leave                       |
| 20260615211544 | 005_marketplace_atomic_idempotency     | no                 | yes            | marketplace             | foreign         | mycominer checkout        | no                    | low                                                                       | unknown                             | leave                       |
| 20260616055613 | 006_payment_checkout_integrity         | no                 | yes            | payment                 | foreign         | mycominer                 | no                    | low                                                                       | unknown                             | leave                       |
| 20260616061047 | 006_payment_checkout_integrity_objects | no                 | yes            | payment objects         | foreign         | mycominer                 | no                    | low                                                                       | unknown                             | leave                       |
| 20260617130733 | 007_token_purchase_idempotency         | no                 | yes            | token purchase          | foreign         | mycominer                 | no                    | low                                                                       | unknown                             | leave                       |
| 20260617132355 | 008_fix_rpc_extensions_search_path     | no                 | yes            | RPC search_path         | foreign/shared  | possibly rockhound RPCs   | maybe                 | low                                                                       | medium if it fixed shared RPCs      | leave                       |
| 20260926011411 | security_invoker_collection_views      | yes (000000)       | yes            | Rockhounding security   | remediation R1  | yes                       | yes                   | none                                                                      | regresses view isolation            | keep                        |
| 20260926011431 | fix_rpc_check_access_v2_cte_scope      | yes (000001)       | yes            | Rockhounding access     | remediation R1  | yes                       | yes                   | none                                                                      | restores 42P01                      | keep                        |
| 20260926011655 | grant_authenticated_sync_surfaces      | yes (000002)       | yes            | Rockhounding sync       | remediation R1  | yes                       | yes                   | none                                                                      | breaks JWT sync                     | keep                        |

### MycoMiner / payment drift explanation

Remote-only migrations `20260615*`–`20260617*` created schema **`mycominer`** (9 tables: workflows, workflow*runs, invoices, license_tokens, marketplace*\*, token_purchase_idempotency, etc.). Application TypeScript in this repository does **not** reference `mycominer` / marketplace checkout / token purchase APIs. Classification: **B — contamination from another project/domain** co-resident on the same Supabase project (not Rockhounding product lineage). Objects are isolated under `mycominer` with postgres/service_role privileges on sampled tables. **Do not delete or supersede** these remote migrations in this window; track as schema debt. Not blocking once understood.

---

## SECURITY DEFINER views — before / after

| View                    | Before                                                                                           | After                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| specimens_complete      | postgres-owned; `reloptions` empty; authenticated SELECT; **cross-tenant leak proven** (A saw B) | `security_invoker=true`; A sees only A; B cannot see A |
| collection_statistics   | same leak (aggregate rows for other users)                                                       | caller-scoped; other=0                                 |
| storage_capacity_status | same leak                                                                                        | caller-scoped; other=0                                 |

Advisor: `security_definer_view` for these three **eliminated** (security advisor re-run 2026-09-26T01:15Z).

---

## rpc_check_access_v2 — before / after

|                               | Before                               | After                                                        |
| ----------------------------- | ------------------------------------ | ------------------------------------------------------------ |
| Runtime                       | `42P01` missing relation `ar`        | Executes                                                     |
| search_path                   | unset (mutable)                      | `public, pg_temp`                                            |
| Signature                     | unchanged `(numeric, numeric, uuid)` | unchanged                                                    |
| Fail-closed                   | N/A (hard error)                     | blank/null → `legalState=unknown` (**never** `allowed`)      |
| Allowed parcel fixture        | —                                    | `allowed` / advisory `safe`                                  |
| Prohibited parcel fixture     | —                                    | `prohibited` / `critical`                                    |
| Conflict (allowed+prohibited) | —                                    | best rule retained; `major_severity_gap`; confidence reduced |

---

## Live sync evidence

Using JWT impersonation of cert users + reversible fixtures (cleaned):

| Check                                               | Result                                    |
| --------------------------------------------------- | ----------------------------------------- |
| Access prohibited ≠ allowed                         | PASS                                      |
| Authenticated insert find (offline→upload analogue) | PASS after GRANT migration                |
| Original body preserved + enrichment appended       | PASS (`original… \| enrichment appended`) |
| Duplicate client_operation_id / idempotency_key     | PASS (`unique_violation`, count=1)        |
| User B cannot see User A find                       | PASS (0 rows)                             |
| Specimens/storage view isolation                    | PASS (see above)                          |

Note: `finds` / `observations` / `sync_operations` had RLS policies but **no** `authenticated` GRANTs — Phase 9 blocker fixed by migration 000002 without weakening RLS.

---

## Advisor results (post-apply)

### Security

| Finding                                                  | Level | Classification                                   |
| -------------------------------------------------------- | ----- | ------------------------------------------------ |
| security_definer_view on three collection views          | —     | **ELIMINATED**                                   |
| rls_disabled_in_public (`spatial_ref_sys`)               | ERROR | ACCEPTABLE (PostGIS system; out of scope)        |
| function_search_path_mutable (64)                        | WARN  | PRE-PRODUCTION (bulk; not this phase)            |
| anon/authenticated SECURITY DEFINER executable (24 each) | WARN  | PRE-PRODUCTION (includes intentional access RPC) |
| extension_in_public                                      | WARN  | ACCEPTABLE                                       |
| auth_leaked_password_protection / MFA options            | WARN  | PRE-PRODUCTION / owner auth config               |

### Performance

No performance advisor lints returned in re-run (empty list).

No remaining **BLOCKING** security issues for this acceptance window.

---

## Engineering gates

| Gate                                                                              | Result                                                        |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `pnpm test:ci`                                                                    | **879 passed / 75 files**                                     |
| Field + offline Playwright (`e2e/field-mode.spec.ts`, `e2e/offline-sync.spec.ts`) | **6 passed**                                                  |
| `pnpm --filter web type-check`                                                    | **PASS** (exit 0)                                             |
| `next build`                                                                      | **Skipped** — no application code changes in this remediation |
| `git diff --check`                                                                | **PASS** (exit 0)                                             |

---

## Owner-browser steps remaining

Do **not** fabricate confirmation. Owner must:

1. Open login page (`/login`) on intended host (local or preview).
2. Request magic link for owner email.
3. Open email inbox; open the Supabase magic link.
4. Confirm callback lands on `/auth/callback` then redirect target.
5. Confirm authenticated session (cookie / `/api/v1/me` or account UI).
6. Hit a protected route (e.g. `/field`, `/collection`).
7. Enter Field Mode.
8. Exercise Quick Log (save local observation).
9. Reconnect / trigger sync upload; wait for server confirmation (must not show SYNCED before confirmation).
10. Confirm specimen/find record exists for the owner only.
11. Logout; confirm protected routes redirect to login.

Also confirm Dashboard **Site URL** + redirect allowlist include the hosts used above.

---

## Files changed (this remediation)

- `supabase/migrations/20260926000000_security_invoker_collection_views.sql` (new)
- `supabase/migrations/20260926000001_fix_rpc_check_access_v2_cte_scope.sql` (new)
- `supabase/migrations/20260926000002_grant_authenticated_sync_surfaces.sql` (new)
- `supabase/migrations_proposed/*` (prior proposals retained)
- `docs/certification/ROCKHOUNDING-LIVE-SUPABASE-ACCEPTANCE-R1.md` (this file)
- `qa-artifacts/rockhounding-live-supabase-remediation-r1/*`

Unrelated dirty paths preserved (LoginForm, sw/workbox, .gitignore, shared index, other qa packs).

## Live DB changes

DDL/DCL only via auditable migrations listed above. Temporary probe fixtures inserted then deleted. Temporary probe function dropped. Probe metrics table `_remediation_isolation_probe` may remain for audit (no grants to anon/authenticated).

## Final classification rationale

Machine-verifiable blockers resolved: view isolation, access RPC fail-closed, migration lineage understood, live sync path + grants, advisors clear of the three view ERROR findings. **Owner magic-link browser confirmation still pending** → `ROCKHOUNDING_LIVE_SUPABASE_ACCEPTANCE_R1_OWNER_BROWSER_REQUIRED`.
