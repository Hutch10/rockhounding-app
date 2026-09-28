# Gate status board — final handoff (2026-09-28)

**Classification:** `ROCKHOUNDING_RELEASE_CLOSURE_GATES_BLOCKED`

FIELD/UX machine evidence is green and Production §6A is applied (no promote), but **runtime launch data is not activated** (OPRD pack artifact-only; synthetic seed may still appear). Owner-browser acceptance and launch-data activation remain.

| Gate                  | Status                                 | Evidence                                                             |
| --------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| TRUST_GATE (artifact) | **PASS**                               | `04-trust-launch-pack.md`: 12 release-ready OPRD sites               |
| TRUST_GATE (runtime)  | **BLOCKED**                            | `06-launch-data-activation.md` Option B; synthetic seed not replaced |
| FIELD_GATE            | **PASS**                               | Playwright handoff **21/21** incl. field-resilience 12/12            |
| SECURITY_GATE         | **PASS** (env applied; Auth URL owner) | Production §6A vars present; Supabase Auth allowlist still owner     |
| UX_GATE               | **PASS**                               | Tip includes glare/copy/nav/sync (`a533ff6`+)                        |
| ACCEPTANCE_GATE       | **OWNER_PENDING**                      | `05-acceptance-retest.md` → SHA `cf8d6e2` READY                      |
| PRODUCTION_GATE       | **BLOCKED**                            | No production promotion authorized                                   |

## Preview identity (owner acceptance target)

| Field             | Value                                                                              |
| ----------------- | ---------------------------------------------------------------------------------- |
| Origin tip        | `cf8d6e2`                                                                          |
| Deployment        | `dpl_H2NSgAQ4wew6Rw1pqh2qfA47YtSX` **READY**                                       |
| **Preferred URL** | https://rockhound-web-git-feat-sprint-4-db1580-hutchs-projects-ef99514e.vercel.app |
| Unique URL        | https://rockhound-onv1zxquk-hutchs-projects-ef99514e.vercel.app                    |
| Supabase          | `dcbjjvygjhmngwzuwdjj` **ACTIVE_HEALTHY**                                          |

Before acceptance: confirm alias deployment SHA == `origin/feat/sprint-4-field-mode`. Auth allowlist: `07-auth-url-allowlist.md`.

## Machine gates (handoff)

| Gate                             | Result                     |
| -------------------------------- | -------------------------- |
| test:ci                          | 882/76 PASS                |
| type-check                       | PASS                       |
| build                            | PASS (after `.next` clean) |
| Playwright                       | 21/21 PASS                 |
| git diff --check (handoff paths) | PASS                       |

## Remaining owner actions

1. Execute `05-acceptance-retest.md` on branch Preview alias (verify SHA == origin tip)
2. Apply `07-auth-url-allowlist.md` in Supabase Dashboard
3. Decide launch-data activation per `06-launch-data-activation.md` (or keep demo non-authoritative)
4. Explicit authorize production promote (separate)

## Explicit non-claims

- No production promotion performed.
- OPRD 12-site pack not in runtime discovery.
- Synthetic AZ/OR seed not certified as real.
