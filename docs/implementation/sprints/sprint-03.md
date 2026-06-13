# Sprint 3 — Offline Sync (Weeks 5–6)

**Milestone:** M2 — Field Test Build ★  
**Goal:** First usable field-testing build  
**Exit:** Offline Quick Log → sync on reconnect → META-001 cert → **META-001A PASS (2026-06-07)**

## Sprint Backlog (execution order)

| #   | ID        | Title                          | Status           |
| --- | --------- | ------------------------------ | ---------------- |
| 1   | SYNC-003  | StorageManager queue           | done             |
| 2   | API-003   | Sync batch find complete       | done             |
| 3   | SYNC-002  | Unify SyncManager              | done             |
| 4   | SYNC-004  | Reconcile server response      | done             |
| 5   | SYNC-005  | ConnectivityListener           | done             |
| 6   | SYNC-001  | Retire legacy coordinator      | deferred         |
| 7   | FE-008    | Quick Log modal                | done             |
| 8   | API-004   | GET /api/v1/finds              | partial          |
| 9   | FE-009    | Collection My Finds            | partial          |
| 10  | FE-011    | SyncIndicator + QueueManager   | done             |
| 11  | TEST-002  | Sync batch tests               | done             |
| 12  | TEST-004  | StorageManager tests           | done (META-001A) |
| 13  | META-001  | MVP certification sign-off     | **PASS**         |
| 14  | META-001A | Field validation certification | **PASS**         |

## Certification Record

| Field                     | Value                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| **Verdict**               | **PASS**                                                                                        |
| **Certification date**    | 2026-06-07                                                                                      |
| **Certification commit**  | `PENDING_COMMIT`                                                                                |
| **META-001A report**      | [`certification-sprint-03-field-validation.md`](../certification-sprint-03-field-validation.md) |
| **Implementation report** | [`certification-sprint-03-field-build.md`](../certification-sprint-03-field-build.md)           |

## Field Test Handoff

META-001A **PASS** — committed; authorized for internal field tester preview.

After commit:

- Deploy preview to 5 internal field testers
- Distribute `docs/qa/FIELD_TEST_PLAYBOOK.md` (draft OK)
- Spot-check live airplane mode on physical device (recommended, non-blocking)

## Sprint Review Demo

1. Airplane mode ON → Quick Log → airplane OFF → find in collection
2. Show sync queue UI with pending → synced transition
