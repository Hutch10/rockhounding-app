# Rockhound Production Operations Plan — Public Beta → V1.0

**Audience:** Release Engineering, SRE, Product Operations, QA  
**Phase:** Broader public beta (post–closed-beta engineering pass)  
**Baseline:** Sprint 3 sync invariant — `StorageManager` → `SyncManager` → `POST /api/v1/sync/batch`  
**Principles:** Operational excellence, reliability, evidence-based decisions. **No feature expansion in this plan.**

**Related artifacts:**

- [`../qa/beta-success-metrics.md`](../qa/beta-success-metrics.md)
- [`../implementation/certification-closed-beta.md`](../implementation/certification-closed-beta.md)
- [`../qa/FIELD_TEST_PLAYBOOK.md`](../qa/FIELD_TEST_PLAYBOOK.md)
- [`../implementation/sprint-04-preview-deployment.md`](../implementation/sprint-04-preview-deployment.md)

---

## 1. Operating model

| Role                      | Responsibility                                            |
| ------------------------- | --------------------------------------------------------- |
| **On-call (Release/SRE)** | P0/P1 alerts, deploy rollback, sync/auth incidents        |
| **Product Operations**    | Cohort health, playbook completion, KR-001 communications |
| **QA Lead**               | Regression watchlist, daily smoke, E2E CI gate            |
| **Field Systems**         | Offline/sync path validation, GPS/access UX signals       |

**Evidence sources (existing stack — configure, do not redesign):**

| Source                                                         | Use                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| **Sentry** (`NEXT_PUBLIC_SENTRY_DSN`, release = git SHA)       | Crashes, client errors, session health                  |
| **Supabase `sync_operations`**                                 | Server-side sync outcomes, idempotency, retries         |
| **Supabase `telemetry_events`** (`POST /api/telemetry/ingest`) | Client sync, performance, user_interaction              |
| **Playwright CI** (`pnpm test:e2e`)                            | Regression gate on prohibited online, offline queue UX  |
| **Vercel**                                                     | Deploy health, function errors, preview/production URLs |

---

## 2. Live telemetry dashboard

**Goal:** One operational view updated at ≤5-minute granularity for public-beta decision-making.

**Recommended layout:** Sentry (reliability) + Supabase SQL dashboard (sync/field) + CI status panel.

### 2.1 Panel definitions

| #   | Metric                                   | Definition                                                              | Primary source                           | Suggested query / signal                                                                                                                                                     |
| --- | ---------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Offline queue depth**                  | Count of ledger ops in `pending` / `failed` not yet `applied` on device | Client telemetry + optional server proxy | `telemetry_events` where `event_name = 'sync_queue_depth'` and `category = 'sync'`; aggregate `metadata.pending_count` p50/p95                                               |
| D2  | **Sync success rate**                    | `applied` ops / (`applied` + `failed`) in rolling 24h                   | `sync_operations`                        | `SELECT count(*) FILTER (WHERE status='applied') * 100.0 / NULLIF(count(*),0) FROM sync_operations WHERE processed_at > now() - interval '24 hours'`                         |
| D3  | **Retry frequency**                      | Mean and p95 `retry_count` before terminal state                        | `sync_operations` + client sync events   | Server: ops with `error_details` not null; Client: `event_name = 'sync_batch_retry'` in telemetry                                                                            |
| D4  | **Crash-free sessions**                  | `1 - (sessions_with_crash / sessions_total)` rolling 7d                 | Sentry Releases                          | Release Health → Crash Free Sessions (target ≥98%)                                                                                                                           |
| D5  | **Quick Log completion time**            | ms from modal open → local enqueue success                              | Client telemetry                         | `event_name = 'quick_log_completed'`; `metadata.duration_ms`; report p50, p95, p99                                                                                           |
| D6  | **Prohibited-area interaction attempts** | Online blocks + offline allows (KR-001)                                 | Client + API                             | Online: `quick_log_blocked_prohibited`; Offline: `quick_log_offline_enqueue` with `access_state=unknown`; API: `POST /api/v1/access/check` returning `legalState=prohibited` |

### 2.2 Client telemetry events to emit (instrumentation contract — no new product features)

Wire existing [`TelemetryBatchSchema`](../../packages/shared/src/telemetry.ts) via `/api/telemetry/ingest` (category `sync` or `user_interaction`):

| Event name                     | When                            | Metadata keys                                    |
| ------------------------------ | ------------------------------- | ------------------------------------------------ |
| `sync_queue_depth`             | Heartbeat (15s) + on enqueue    | `pending_count`, `failed_count`, `is_online`     |
| `sync_batch_result`            | After `POST /api/v1/sync/batch` | `batch_size`, `applied`, `failed`, `duration_ms` |
| `sync_batch_retry`             | Before retry flush              | `client_operation_id`, `retry_count`             |
| `quick_log_started`            | Quick Add modal open            | `surface` (`map` \| `field`)                     |
| `quick_log_completed`          | Local enqueue success           | `duration_ms`, `is_offline`, `access_state`      |
| `quick_log_blocked_prohibited` | Online prohibited block         | `lat`, `lon` (rounded 2dp), `surface`            |
| `access_check_result`          | After `/api/v1/access/check`    | `legal_state`, `duration_ms`                     |

**Privacy:** Never send exact user GPS to telemetry for navigate/maps; round coords to 2 decimal places (~1km) for prohibited-interaction analytics.

### 2.3 Dashboard panels (minimum viable)

```
┌─────────────────────────────────────────────────────────────────┐
│ ROCKHOUND OPS — Public Beta                    Env: production  │
├──────────────────────┬──────────────────────┬───────────────────┤
│ Sync success 24h     │ Queue depth p95      │ Crash-free 7d     │
│ TARGET ≥95%          │ TARGET <10           │ TARGET ≥98%       │
├──────────────────────┼──────────────────────┼───────────────────┤
│ Retry rate           │ Quick Log p50        │ Prohibited blocks │
│ TARGET <5% ops       │ TARGET <15s          │ (online) / day    │
├──────────────────────┴──────────────────────┴───────────────────┤
│ CI: E2E 6/6 │ Build │ Last deploy SHA │ P0 open: 0              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Supabase saved queries (ops)

**Sync success rate (24h):**

```sql
SELECT
  date_trunc('hour', processed_at) AS hour,
  count(*) FILTER (WHERE status = 'applied') AS applied,
  count(*) FILTER (WHERE status = 'failed') AS failed,
  round(
    100.0 * count(*) FILTER (WHERE status = 'applied')
    / NULLIF(count(*) FILTER (WHERE status IN ('applied', 'failed')), 0),
    2
  ) AS success_pct
FROM sync_operations
WHERE processed_at > now() - interval '24 hours'
GROUP BY 1
ORDER BY 1 DESC;
```

**Duplicate detection (idempotency):**

```sql
SELECT client_operation_id, count(*) AS rows
FROM sync_operations
WHERE status = 'applied'
  AND processed_at > now() - interval '7 days'
GROUP BY 1
HAVING count(*) > 1;
```

**Retry-heavy operations:**

```sql
SELECT client_operation_id, status, error_details, processed_at
FROM sync_operations
WHERE status = 'failed'
  AND processed_at > now() - interval '24 hours'
ORDER BY processed_at DESC
LIMIT 50;
```

---

## 3. Alert thresholds and escalation

### 3.1 Severity definitions

| Severity | Response time     | Examples                                                                     |
| -------- | ----------------- | ---------------------------------------------------------------------------- |
| **P0**   | ≤30 min, 24/7     | Data loss, auth bypass, sync silently drops queue, duplicate finds on replay |
| **P1**   | ≤4 h business     | Sync success <90% for 2h, crash-free <95% for 24h, build/E2E red on main     |
| **P2**   | Next business day | Elevated retries, Quick Log p95 >30s, prohibited-block UI regression         |
| **P3**   | Weekly review     | UX friction, non-blocking telemetry gaps                                     |

### 3.2 Alert rules

| Alert ID | Condition                                                 | Window     | Severity | Action                                                                      |
| -------- | --------------------------------------------------------- | ---------- | -------- | --------------------------------------------------------------------------- |
| A-01     | Sync success rate < **90%**                               | 2h rolling | P1       | Page on-call; inspect `sync_operations` failures; check Supabase RPC health |
| A-02     | Sync success rate < **80%**                               | 1h rolling | P0       | Halt cohort expansion; consider rollback                                    |
| A-03     | Any duplicate `client_operation_id` with 2+ applied finds | Instant    | P0       | Freeze deploys; run idempotency audit SQL                                   |
| A-04     | Crash-free sessions < **95%**                             | 24h        | P1       | Sentry triage; identify release regression                                  |
| A-05     | Crash-free sessions < **90%**                             | 6h         | P0       | Rollback to last known-good release SHA                                     |
| A-06     | Offline queue depth p95 > **25** per session              | 1h         | P1       | Field Systems: IndexedDB / flush path                                       |
| A-07     | `sync_batch` 5xx rate > **5%**                            | 15m        | P1       | API + Supabase connection pool                                              |
| A-08     | E2E or `pnpm --filter web build` fails on main            | Per run    | P1       | Block promote; QA owns fix or revert                                        |
| A-09     | Spike in `quick_log_blocked_prohibited` + support tickets | 24h        | P2       | Verify seed data / access RPC; not a product change without gate            |
| A-10     | Offline enqueue at prohibited coords > **N/day** (KR-001) | 24h        | P2       | Product Ops: playbook reminder; track for Sprint 5+ geohash cache           |

### 3.3 Escalation path

```
Alert fires (Sentry / Supabase / CI)
  → On-call acknowledges ≤15 min
  → P0: incident channel + incident doc + rollback decision ≤30 min
  → P1: owner assigned, daily standup until resolved
  → Post-incident: blameless note in ops log within 48h
```

**Rollback criteria:** Any P0 with user data impact → revert Vercel production to previous release SHA; do not modify certified sync batch handler without certification gate.

---

## 4. Operational review checklists

### 4.1 Daily checklist (15 min — On-call + QA)

| #    | Check                           | Pass criteria                             |
| ---- | ------------------------------- | ----------------------------------------- |
| D-01 | Dashboard D1–D6 reviewed        | All panels green or explained             |
| D-02 | Sentry new issues               | No unassigned P0/P1                       |
| D-03 | Sync success 24h                | ≥95% (warn at 92%)                        |
| D-04 | Duplicate idempotency SQL       | Zero rows                                 |
| D-05 | CI status                       | E2E 6/6, build green on release branch    |
| D-06 | Deploy drift                    | Production SHA matches certified artifact |
| D-07 | Support / feedback queue        | P0 count = 0                              |
| D-08 | KR-001 prohibited offline count | Logged; no silent policy change           |

**Daily log template:** `docs/operations/daily-ops-log-YYYY-MM-DD.md` (date, SHA, metrics snapshot, incidents, decisions).

### 4.2 Weekly checklist (60 min — Release + Product Ops + QA + Field Systems)

| #    | Check                               | Pass criteria                                |
| ---- | ----------------------------------- | -------------------------------------------- |
| W-01 | Regression watchlist (§5) full pass | All items signed                             |
| W-02 | Crash-free 7d trend                 | ≥98% or improving with root cause            |
| W-03 | Quick Log p50 trend                 | <15s median                                  |
| W-04 | Cohort / user growth vs error rate  | Errors not scaling faster than users         |
| W-05 | Playbook / support themes           | Top 3 issues documented                      |
| W-06 | Telemetry ingest volume & errors    | <1% ingest failures                          |
| W-07 | Supabase migration / RLS audit      | No drift from cert baseline                  |
| W-08 | Capacity & cost review              | Vercel + Supabase within budget              |
| W-09 | KR-001 acceptance review            | Informed consent still valid for public beta |
| W-10 | V1.0 readiness scorecard (§6)       | Updated % complete                           |

**Weekly output:** Ops review memo (metrics, incidents, watchlist, ship/no-ship recommendation).

---

## 5. Regression watchlist

Run before every production promote and weekly. **Automated where noted; manual field spot-check otherwise.**

| ID   | Area                                     | What to verify                                                | How                                           | Owner         |
| ---- | ---------------------------------------- | ------------------------------------------------------------- | --------------------------------------------- | ------------- |
| R-01 | **Offline persistence**                  | Quick Log survives refresh; queue visible in `/offline`       | E2E offline scenario + 1 device airplane test | QA            |
| R-02 | **Duplicate synchronization**            | Same `client_operation_id` → one find                         | Unit `route.test.ts` + idempotency SQL A-03   | QA            |
| R-03 | **High-Viz rendering**                   | Map pins, access fill colors, trust rings visible in sunlight | Manual: map legend + prohibited/allowed pins  | Field Systems |
| R-04 | **GPS accuracy display**                 | Field Mode strip shows coords ± accuracy when granted         | E2E CB-F2 + device check                      | QA            |
| R-05 | **Trust badge correctness**              | Community ≠ Official; verified tier matches metadata          | Pin popup + location detail sample set        | QA            |
| R-06 | **Access badge correctness**             | allowed/caution/restricted/prohibited colors match legend     | Map legend vs seed sites                      | QA            |
| R-07 | **Regulatory lockouts (online)**         | Prohibited → Quick Log disabled + banner                      | E2E CB-E3                                     | QA            |
| R-08 | **Regulatory lockouts (offline KR-001)** | Documented allow enqueue; no silent online bypass             | E2E offline + playbook notice                 | Product Ops   |
| R-09 | **Sync path invariant**                  | No second sync path introduced                                | Code review: only `orchestrator` → batch API  | Release       |
| R-10 | **External navigate privacy**            | Maps open fuzzy coords only                                   | `openExternalMaps.test.ts` + CB-E4            | QA            |
| R-11 | **Auth session**                         | Magic link + refresh persistence                              | Manual login smoke on preview/prod            | QA            |
| R-12 | **Service worker**                       | `/offline` renders when SW active                             | CB-O3 manual                                  | QA            |

**Watchlist fail policy:** Any R-01, R-02, R-07, R-09 fail → **block production promote**.

---

## 6. V1.0 production-ready criteria

**V1.0 is declared only when ALL gates below pass with evidence.** Public beta may continue under **PASS FOR ENGINEERING / COHORT PENDING** until these are met.

### 6.1 Reliability gates

| Gate  | Criterion                                                             | Evidence                        |
| ----- | --------------------------------------------------------------------- | ------------------------------- |
| V1-R1 | Sync success ≥**95%** (28-day rolling)                                | Supabase dashboard + daily logs |
| V1-R2 | Crash-free sessions ≥**99%** (28-day)                                 | Sentry Release Health           |
| V1-R3 | Zero P0 open **≥14 days**                                             | Issue tracker                   |
| V1-R4 | Duplicate finds on replay = **0** in 28-day window                    | Idempotency SQL                 |
| V1-R5 | E2E suite green **100%** on release branch for 14 consecutive CI runs | CI history                      |

### 6.2 Field & compliance gates

| Gate  | Criterion                                                     | Evidence                                              |
| ----- | ------------------------------------------------------------- | ----------------------------------------------------- |
| V1-F1 | Quick Log p50 <**15s**, p95 <**30s**                          | Telemetry D5                                          |
| V1-F2 | Online prohibited block rate **100%** on certified seed sites | E2E + field playbook                                  |
| V1-F3 | KR-001 documented + user notice live                          | Playbook + in-app/offboarding copy                    |
| V1-F4 | External maps use fuzzy coords only                           | CB-E4 tests + audit                                   |
| V1-F5 | ≥**50** public-beta field sessions with ≥2 offline logs each  | Cohort telemetry (scale-up from 5-tester closed beta) |

### 6.3 Operations gates

| Gate  | Criterion                                                   | Evidence                   |
| ----- | ----------------------------------------------------------- | -------------------------- |
| V1-O1 | Live ops dashboard operational **≥30 days**                 | Dashboard URL + daily logs |
| V1-O2 | Alert rules A-01–A-08 configured and fire-drilled           | Drill record               |
| V1-O3 | On-call runbook + rollback tested once                      | Incident drill doc         |
| V1-O4 | Sentry release + source maps on production                  | DEPLOY-004 checklist       |
| V1-O5 | Daily + weekly checklists executed **≥4 consecutive weeks** | Ops memo archive           |

### 6.4 Certification gates

| Gate  | Criterion                                            | Evidence                              |
| ----- | ---------------------------------------------------- | ------------------------------------- |
| V1-C1 | META-003 Closed Beta **full PASS** (sections 1–3, 6) | `certification-closed-beta.md` signed |
| V1-C2 | Public beta expansion cohort metrics hit targets     | `beta-success-metrics.md`             |
| V1-C3 | `GET /api/v1/me` + auth flows certified              | API-005 tests + manual logout         |
| V1-C4 | Security: RLS audit clean                            | `pnpm audit:rls` or equivalent        |
| V1-C5 | Product sign-off on known-risk register              | KR-001 accepted or mitigated          |

### 6.5 V1.0 declaration

When all §6.1–6.4 gates pass:

1. Record git SHA in `docs/implementation/certification-v1-production.md` (to be created at declaration time).
2. Tag release `v1.0.0` in Vercel + Sentry.
3. Freeze sync batch contract (`7d9a807` lineage) unless V1.1 gate process opened.

Until then, status remains: **Public Beta — operational monitoring active, V1.0 not declared.**

---

## 7. Public beta launch sequence (operations only)

| Step | Action                                                | Owner       |
| ---- | ----------------------------------------------------- | ----------- |
| 1    | Deploy production from certified SHA                  | Release     |
| 2    | Configure Sentry DSN + `SENTRY_RELEASE` on production | SRE         |
| 3    | Enable telemetry ingest monitoring                    | SRE         |
| 4    | Create Supabase saved queries + dashboard             | SRE         |
| 5    | Configure alerts A-01–A-08                            | SRE         |
| 6    | Run regression watchlist R-01–R-12                    | QA          |
| 7    | Publish playbook + KR-001 notice to beta users        | Product Ops |
| 8    | Start daily ops log                                   | On-call     |

---

## 8. Anti-patterns (do not do in public beta)

- Ship feature work under the guise of “ops fixes” without gate review
- Change `POST /api/v1/sync/batch` handler without certification
- Lower sync success thresholds without written product approval
- Disable prohibited online gating to improve funnel metrics
- Commit secrets or DSNs to the repository
- Expand cohort when A-02 or A-05 is active

---

**Document version:** 1.0  
**Last updated:** 2026-06-07  
**Owner:** Principal Release Engineer / SRE / Product Operations
