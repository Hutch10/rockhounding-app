# Sprint 4 Certification Gates (M3 Closed Beta)

**Milestone:** M3 — Closed Beta  
**Primary gate:** G2 (`META-003`)  
**Prerequisite:** G1 (`META-001` / `META-001A`) **PASS**  
**Target date:** End Sprint 4 (Weeks 7–8)

---

## Gate Summary

| Gate | Issue    | Entry criteria             | Exit criteria                                           |
| ---- | -------- | -------------------------- | ------------------------------------------------------- |
| G2-A | TEST-007 | Sprint 3 commit on preview | Playwright offline sync E2E green in CI                 |
| G2-B | FE-010   | Map + Quick Log stable     | Field Mode shell certified (CB-F1–F5)                   |
| G2-C | META-002 | 5 testers identified       | ≥5 onboarded, playbook distributed                      |
| G2-D | META-003 | G2-A + G2-B + G2-C         | `certification-closed-beta.md` 100% sections 1, 2, 3, 6 |

---

## Pre-Sprint 4 Entry (Complete)

- [x] META-001A field validation PASS
- [x] Sprint 3 commit recorded (`7d9a807`)
- [ ] Preview deployment promoted from certification SHA
- [ ] Sentry DSN configured on preview (DEPLOY-004)

---

## Sprint 4 Mid-Sprint Gates

| Checkpoint | Week  | Criteria                                                   |
| ---------- | ----- | ---------------------------------------------------------- |
| CP-4.1     | W7 D3 | Field Mode shell navigable; Quick Log FAB in field context |
| CP-4.2     | W7 D5 | Playwright offline scenario runs locally                   |
| CP-4.3     | W8 D2 | 5 testers invited; playbook link live                      |
| CP-4.4     | W8 D5 | Bug bash complete; P0 queue empty                          |

---

## META-003 Sign-Off Blockers

These **fail** closed beta certification if open at sprint end:

1. Any P0: data loss, auth bypass, duplicate finds on replay, sync silently drops queue
2. TEST-007 not passing in CI
3. Fewer than 5 playbook completions
4. Offline prohibited logging **without** documented known-risk acceptance signed by product owner

---

## Known-Risk Review Gate (Sprint 4 Required)

| Risk ID | Description                                 | Sprint 4 action                                                               | Accept for beta?           |
| ------- | ------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------- |
| KR-001  | Offline logging allowed at prohibited sites | Document in playbook; add online E2E block test; optional geohash cache spike | Yes, with informed consent |
| KR-002  | Collection UI lacks local pending merge     | Testers use SyncIndicator + QueueManager                                      | Yes                        |
| KR-003  | No live device airplane cert in CI          | 5-tester manual playbook step 3                                               | Yes                        |

---

## Automated CI Gates (Sprint 4)

```bash
pnpm test:ci -- apps/web/lib/sync/field-validation.meta001a.test.ts apps/web/app/api/v1/sync/batch/route.test.ts
pnpm --filter web type-check
pnpm --filter web build
pnpm exec playwright test   # after TEST-007 lands
```

---

## Certification artifact

On META-003 PASS, update `docs/implementation/certification-closed-beta.md` with:

- Certified by
- Date
- Git SHA
- Beta cohort size
- Verdict PASS / FAIL
