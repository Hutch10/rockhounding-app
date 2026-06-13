# MVP Certification Criteria (M2 Field Test Build)

**Gate:** G1  
**Issue:** META-001  
**Target:** End Sprint 3

Sign-off template:

```
Certified by: ___________
Date: ___________
Git SHA: ___________
Environment: preview / staging
```

## 1. Authentication

| ID     | Criterion                              | Pass |
| ------ | -------------------------------------- | ---- |
| MVP-A1 | Magic link login completes             | [ ]  |
| MVP-A2 | Session persists after browser refresh | [ ]  |
| MVP-A3 | Unauthenticated user cannot Quick Log  | [ ]  |

## 2. Map & Sites

| ID     | Criterion                                               | Pass |
| ------ | ------------------------------------------------------- | ---- |
| MVP-M1 | Map loads pins in viewport <3s LTE                      | [ ]  |
| MVP-M2 | Pin color reflects access_status                        | [ ]  |
| MVP-M3 | PinPopup shows access + trust + material without scroll | [ ]  |
| MVP-M4 | Site detail Tier-1 above fold on 390×844                | [ ]  |
| MVP-M5 | Prohibited site: Quick Log disabled                     | [ ]  |

## 3. Trust

| ID     | Criterion                                                       | Pass |
| ------ | --------------------------------------------------------------- | ---- |
| MVP-T1 | All four trust badges render on seed sites                      | [ ]  |
| MVP-T2 | Community site never shows Official badge                       | [ ]  |
| MVP-T3 | Trust category comes from API (view source: no client override) | [ ]  |

## 4. Offline & Sync

| ID     | Criterion                                           | Pass |
| ------ | --------------------------------------------------- | ---- |
| MVP-S1 | Quick Log saves in airplane mode                    | [ ]  |
| MVP-S2 | Sync indicator shows pending count                  | [ ]  |
| MVP-S3 | On reconnect, find syncs within 60s                 | [ ]  |
| MVP-S4 | Duplicate log does not create duplicate server find | [ ]  |
| MVP-S5 | Collection shows synced find with server id         | [ ]  |

## 5. Build & Test

| ID     | Criterion                         | Pass |
| ------ | --------------------------------- | ---- |
| MVP-B1 | `pnpm test` pass                  | [ ]  |
| MVP-B2 | `pnpm --filter web build` pass    | [ ]  |
| MVP-B3 | TEST-002 sync batch contract pass | [ ]  |
| MVP-B4 | TEST-003 trust resolver pass      | [ ]  |

## 6. Seed Data

| ID     | Criterion                       | Pass |
| ------ | ------------------------------- | ---- |
| MVP-D1 | ≥20 sites in ≥1 seed state      | [ ]  |
| MVP-D2 | ≥1 prohibited site testable     | [ ]  |
| MVP-D3 | Each trust category represented | [ ]  |

**Minimum pass rate:** 100% of sections 3, 4, 5. Sections 1-2, 6 required.
