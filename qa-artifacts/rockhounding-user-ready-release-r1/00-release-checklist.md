# ROCKHOUNDING — User-Ready Release Checklist R1

**Branch:** `feat/sprint-4-field-mode`  
**SHA under evaluation:** `97da640` (local release-candidate tip; **ahead of origin** — redeploy preview before owner acceptance)  
**Prior deployed preview SHA:** `25b82ba` → https://rockhound-mzzbgdmp8-hutchs-projects-ef99514e.vercel.app  
**Supabase:** Rockhounding v1 `dcbjjvygjhmngwzuwdjj` ACTIVE_HEALTHY  
**Date:** 2026-09-28

This checklist is executable and auditable. Gates are independent. Fail closed.

---

## ACCEPTANCE_GATE

| Field           | Value                                                                                                                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Owner           | Product owner (browser) + release coordinator (machine evidence)                                                                                                                                                                                                         |
| Evidence        | `docs/certification/ROCKHOUNDING-LIVE-SUPABASE-ACCEPTANCE-R1.md`; preview OTP network proof; Playwright field/collection/offline suite                                                                                                                                   |
| Pass criteria   | Owner completes magic-link → session → protected routes → Field UI (High-Glare, Permission Summary, trust) → Quick Log → offline save → reconnect → server-confirmed sync → `/collection` + find visibility → logout → protected-route gate on **corrected** preview SHA |
| Block criteria  | `"Failed to fetch"`; Digest/server crash on `/collection`; sync marked success without server confirmation; High-Glare/Permission Summary/trust absent; logout leaves session open                                                                                       |
| Rollback action | Keep production untouched; pin preview to last known-good deployment; do not promote                                                                                                                                                                                     |

### Owner-browser steps (exact — do not fabricate)

Target: https://rockhound-mzzbgdmp8-hutchs-projects-ef99514e.vercel.app (SHA `25b82ba…`)

1. Open `/login` (complete Vercel SSO if prompted).
2. Request magic link for owner email; open email; complete `/auth/callback`.
3. Confirm authenticated session (account/me or protected shell).
4. Open a protected route (`/field` or `/collection`).
5. Enter Field Mode; confirm current frozen shell.
6. Confirm High-Glare toggle visible; toggle on/off; confirm persist after refresh.
7. Confirm Field Permission Summary visible.
8. Confirm Location / Access / Geology trust summary visible.
9. Quick Log a find/observation locally.
10. Confirm offline/local save when network unavailable (optional airplane mode).
11. Reconnect; wait for **server-confirmed** sync (must not claim SYNCED before confirmation).
12. Open `/collection`; confirm no crash.
13. Confirm specimen/find visibility for owner only.
14. Logout.
15. Confirm protected routes redirect to login.

Machine-verified so far (not owner-complete): preview OTP reaches `dcbjjvygjhmngwzuwdjj…/auth/v1/otp`; collection/sync code fixes on tip; High-Glare in deployed bundle.

---

## FIELD_GATE

| Field           | Value                                                                                                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner           | Field QA + release coordinator                                                                                                                                                                                                |
| Evidence        | Playwright `e2e/field-mode`, `e2e/offline-sync`, `e2e/collection`; viewport artifacts under `qa-artifacts/rockhounding-r2-2-env-test-preview-gate/08-local-browser/`; a11y pack `qa-artifacts/rockhounding-cursor-3-22-a11y/` |
| Pass criteria   | Critical field paths covered: Field shell, High-Glare, Quick Log gating online/offline, empty collection; at least one mobile + desktop viewport smoke; no release-blocking layout/control failures on certified tip          |
| Block criteria  | Missing High-Glare; Quick Log allowed on prohibited online; empty `/collection` crashes; primary FAB/target < 44px on field path                                                                                              |
| Rollback action | Revert field UI commits; redeploy prior certified tip; do not promote                                                                                                                                                         |

### Field matrix (execute / mark)

Viewports: 360×800, 390×844, 412×915, tablet, Windows desktop  
States: high-glare; GPS granted/denied/lost; online; weak; offline start; offline during capture; reconnect during queued sync; duplicate retry; refresh during pending sync; restart with pending local work; camera unavailable; photo denied; long notes; empty collection; large collection

Mark each cell: PASS / FAIL / NO_EVIDENCE / OWNER_DEVICE.

---

## TRUST_GATE

| Field           | Value                                                                                                                                                                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Owner           | Domain/legal data steward + release coordinator                                                                                                                                                                                                                                                                          |
| Evidence        | Launch dataset inventory; seed migration audit; Source Governance / UGES invariants                                                                                                                                                                                                                                      |
| Pass criteria   | Launch region does **not** claim nationwide completeness; every release-ready site has provenance, access authority, collecting authority, Visit/Collect/Route, closure, freshness, source URL/reference, certainty, conflict — or explicit UNKNOWN; fail closed; no fictional legal records treated as production truth |
| Block criteria  | Inferring permission from ownership/map/mine/historic/claims/road/permit-alone; unresolved conflicts marked allowed; seed/demo rows shipped as legal truth without quarantine labeling                                                                                                                                   |
| Rollback action | Remove/quarantine non-compliant rows from production path; keep preview; do not promote                                                                                                                                                                                                                                  |

### Required counts (report even if zero)

- verified release-ready sites
- permit-required
- managed/pay
- permission-required
- closed/prohibited
- unresolved/conflicted

---

## SECURITY_GATE

| Field           | Value                                                                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner           | Security reviewer + release coordinator                                                                                                                                      |
| Evidence        | Live remediation cert; advisor notes; env contract; no service-role client exposure                                                                                          |
| Pass criteria   | No RELEASE_BLOCKING findings; Preview public Supabase env points at Rockhounding `dcbjjvygjhmngwzuwdjj`; service role not client-exposed; auth OTP path reaches live project |
| Block criteria  | Cross-tenant view leak; auth env pointing at deleted/wrong project; service-role in NEXT_PUBLIC; unexplained schema drift on Rockhounding-critical objects                   |
| Rollback action | Revert env to last known-good Preview values; redeploy; do not promote                                                                                                       |

---

## PRODUCTION_GATE

| Field           | Value                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Owner           | Release coordinator (requires explicit owner authorization to promote)                                                                                                               |
| Evidence        | All other gates PASS; `test:ci`; type-check; build; Playwright; owner acceptance on corrected preview                                                                                |
| Pass criteria   | ACCEPTANCE + FIELD + TRUST + SECURITY PASS; machine gates green; rollback procedure documented; no debug fixtures/fictional legal in production path; production env parity reviewed |
| Block criteria  | Any prior gate BLOCKED; owner acceptance incomplete; production promote without written authorization                                                                                |
| Rollback action | **Do not promote.** If a mistaken promote occurs: Vercel instant rollback to previous production deployment; confirm Rockhounding Supabase slot unchanged; revoke bad aliases        |

### Explicit rule

**No production promotion in this phase without separate written owner authorization.**

---

## Machine gate commands

```bash
pnpm test:ci
pnpm --filter web type-check
pnpm --filter web run build
pnpm exec playwright test e2e/field-mode.spec.ts e2e/collection.spec.ts e2e/offline-sync.spec.ts
git diff --check
```

## Rollback procedure (preview / candidate)

1. Identify last READY good deployment ID + SHA.
2. Redeploy that SHA to `rockhound-web` Preview (do not promote).
3. Confirm Preview env still targets `dcbjjvygjhmngwzuwdjj`.
4. Re-run OTP smoke + `/login` + Field High-Glare bundle check.
5. Leave production untouched.
