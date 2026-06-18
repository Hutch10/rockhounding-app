# META-003 Final Certification Report — Closed Beta

**Gate:** G2 — Closed Beta Certification  
**Certification Lead:** Rockhound Closed Beta Certification Lead  
**Certification date:** 2026-06-18  
**Release slice:** `c8ca2b9`  
**Deploy hotfix:** `15214da` (`15214daf9036112acfa2aaa9b859be99c3d91ff3`)  
**Docs head:** `c21824d`  
**Branch:** `feat/sprint-4-field-mode`  
**Preview URL:** https://rockhound-adaoibe3b-hutchs-projects-ef99514e.vercel.app

---

## Final verdict: **FAIL**

META-003 Closed Beta **PASS is not granted.** Operational prerequisites for a five-person field cohort were not completed. No documented playbook completions, sync telemetry, or live observability evidence exists.

Engineering gates at `15214da` remain valid (30/30 unit, 6/6 E2E, type-check, build). Those results **do not substitute** for META-003 cohort and preview-operations evidence.

---

## 1. Preview configuration audit

**Deploy project:** `rockhound-web` (CLI deploy @ `15214da`, status **Ready**)  
**Env project (Git branch):** `rockhounding-web` (`feat/sprint-4-field-mode`)

| Variable                                        | `rockhound-web` Preview | `rockhounding-web` Preview (branch) | Required for META-003 |
| ----------------------------------------------- | ----------------------- | ----------------------------------- | --------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                      | **MISSING**             | SET                                 | Yes                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                 | **MISSING**             | SET                                 | Yes                   |
| `SUPABASE_SERVICE_ROLE_KEY`                     | **MISSING**             | SET                                 | Yes (server routes)   |
| `NEXT_PUBLIC_MAPBOX_TOKEN`                      | **MISSING**             | **MISSING**                         | Yes (map smoke)       |
| `NEXT_PUBLIC_SENTRY_DSN`                        | **MISSING**             | **MISSING**                         | Yes (CB-O1)           |
| `NEXT_PUBLIC_SITE_URL`                          | **MISSING**             | SET (preview URL intent)            | Yes (magic link)      |
| `SENTRY_RELEASE` / `NEXT_PUBLIC_SENTRY_RELEASE` | **MISSING**             | SET (`15214da` partial)             | Yes (CB-O2)           |

**Finding:** The live preview deployment does **not** inherit `rockhounding-web` branch env. `rockhound-web` Preview has **zero** environment variables configured.

### Auth callback URL (Supabase — Rockhounding v1 `dcbjjvygjhmngwzuwdjj`)

| Check                                       | Status                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| Callback path in app                        | `/auth/callback` (`apps/web/app/auth/callback/route.ts`)                        |
| Preview callback URL registered in Supabase | **NOT VERIFIED** (dashboard change required)                                    |
| Required redirect URL                       | `https://rockhound-adaoibe3b-hutchs-projects-ef99514e.vercel.app/auth/callback` |

**Section 1 result:** **FAIL** — preview not operationally configured for closed beta.

---

## 2. Tester accessibility audit

**Audit time:** 2026-06-18 (live)

| Check                          | Method                               | Result              | Evidence                                                                         |
| ------------------------------ | ------------------------------------ | ------------------- | -------------------------------------------------------------------------------- |
| Preview reachable (public)     | `Invoke-WebRequest`                  | **FAIL — HTTP 401** | Vercel Deployment Protection                                                     |
| Preview reachable (CLI bypass) | `vercel curl /login`                 | **FAIL**            | Returns Vercel **Authentication Required** SSO interstitial, not app login shell |
| Login functional               | Magic-link E2E on preview            | **NOT TESTED**      | Blocked by protection + missing Supabase env on deploy project                   |
| Deployment Protection resolved | Dashboard exception / shareable link | **FAIL**            | No exception configured; testers cannot reach app                                |

**Section 2 result:** **FAIL** — cohort cannot access preview without operator intervention.

---

## 3. Five-person beta cohort execution

**Playbook:** [`docs/qa/FIELD_TEST_PLAYBOOK.md`](../qa/FIELD_TEST_PLAYBOOK.md) (includes KR-001 notice)

| ID  | Profile               | Invite sent | Playbook complete | KR-001 ack | Feedback |
| --- | --------------------- | ----------- | ----------------- | ---------- | -------- |
| T1  | Power user / engineer | No          | No                | No         | —        |
| T2  | Weekend rockhound     | No          | No                | No         | —        |
| T3  | Oregon collector      | No          | No                | No         | —        |
| T4  | Poor-coverage user    | No          | No                | No         | —        |
| T5  | Skeptic / QA mindset  | No          | No                | No         | —        |

| Criterion                     | Target | Actual |
| ----------------------------- | ------ | ------ |
| CB-B1 ≥5 onboarded            | 5      | **0**  |
| CB-B2 ≥5 playbook completions | 5      | **0**  |
| CB-B3 feedback captured       | 5      | **0**  |
| KR-001 informed consent       | 5      | **0**  |

**Section 3 result:** **FAIL** — cohort not executed; invites blocked by §1–§2.

---

## 4. Operational evidence collection

| Evidence type                     | Target            | Actual           | Source                               |
| --------------------------------- | ----------------- | ---------------- | ------------------------------------ |
| Sync success rate ≥95% / 24h      | CB-B5             | **No data**      | No cohort `client_operation_id` logs |
| Offline queue behavior            | Playbook Test 4–5 | **No data**      | No field sessions                    |
| Quick Log completion              | Playbook Test 3–5 | **No data**      | No field sessions                    |
| Crash reports                     | Sentry            | **No data**      | DSN not configured on preview        |
| Sentry release health (`15214da`) | CB-O2 live        | **NOT VERIFIED** | DSN missing; no live events          |

**Section 4 result:** **FAIL** — zero operational telemetry from beta testers.

---

## 5. Engineering evidence (reference only — does not satisfy META-003)

Retained from Sprint 4 certification @ `15214da`:

| Gate                             | Result           |
| -------------------------------- | ---------------- |
| Unit tests (30)                  | PASS             |
| E2E TEST-007 (6)                 | PASS             |
| Type-check / build               | PASS             |
| CB-F1–F5 (Field Mode)            | PASS (automated) |
| CB-E3 prohibited gating (online) | PASS (automated) |
| Certified sync invariant         | Unchanged        |

---

## 6. Gate summary

| META-003 section | Result                                        |
| ---------------- | --------------------------------------------- |
| 1 Field Mode     | PASS (engineering) / **not cohort-validated** |
| 2 E2E flows      | PARTIAL — no live preview journey             |
| 3 Beta cohort    | **FAIL**                                      |
| 4 Observability  | **FAIL** (no DSN, no live events)             |
| 5 Profile        | PARTIAL — no cohort logout verify             |
| 6 Documentation  | PARTIAL — playbook ready; URL not shareable   |

| Gate          | Result   |
| ------------- | -------- |
| G2-A TEST-007 | PASS     |
| G2-B FE-010   | PASS     |
| G2-C META-002 | **FAIL** |
| G2-D META-003 | **FAIL** |

---

## 7. Blockers preventing PASS (operator actions)

1. **Mirror Supabase env** from `rockhounding-web` → `rockhound-web` Preview; redeploy
2. Set **`NEXT_PUBLIC_MAPBOX_TOKEN`** and **`NEXT_PUBLIC_SENTRY_DSN`** on preview
3. Register **Supabase auth redirect URLs** for preview hostname
4. Resolve **Deployment Protection** (exception or shareable links for T1–T5)
5. Distribute playbook + preview URL; collect **≥5 completions** with feedback and sync IDs
6. Demonstrate **sync success ≥95%** within 24h from cohort telemetry

---

## 8. Sign-off

| Role                           | Verdict                                         | Date       |
| ------------------------------ | ----------------------------------------------- | ---------- |
| Closed Beta Certification Lead | **FAIL**                                        | 2026-06-18 |
| Release Guardian               | Engineering ready @ `15214da`; ops incomplete   | 2026-06-18 |
| Re-certification trigger       | Complete §7 blockers + resubmit cohort evidence | —          |

**Next certification attempt:** After operator checklist §7 complete and `beta-cohort-roster.md` shows 5/5 completions with sync evidence.
