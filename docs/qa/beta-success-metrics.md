# Closed Beta Success Metrics (M3)

**Program:** Rockhound 5-tester field cohort  
**Measurement window:** Sprint 4 (14 days)  
**Baseline:** Sprint 3 certification SHA

---

## Primary Metrics (META-003)

| Metric                       | Target           | Measurement                        | Owner   |
| ---------------------------- | ---------------- | ---------------------------------- | ------- |
| Playbook completion rate     | **≥5/5** (100%)  | Completion form                    | Beta PM |
| Sync success within 24h      | **≥95%**         | `sync_operations` applied / queued | QA      |
| P0 bugs open at cert         | **0**            | Issue tracker                      | Release |
| TEST-007 E2E pass rate       | **100%** CI runs | Playwright                         | QA      |
| Field session Quick Log time | **<15s** median  | Tester self-report                 | Beta PM |

---

## Secondary Metrics (Field Quality)

| Metric                       | Target                    | Notes                      |
| ---------------------------- | ------------------------- | -------------------------- |
| Offline logs per tester      | ≥2                        | Proves airplane path       |
| Reconnect flush success      | ≥90% without manual retry | Within 60s of online       |
| Duplicate server finds       | **0**                     | Same `client_operation_id` |
| Prohibited online block rate | **100%**                  | At seed prohibited sites   |
| Crash-free sessions          | **≥98%**                  | Sentry                     |

---

## UX Signals (Qualitative → Quantified)

| Signal                               | Collection method | Success threshold |
| ------------------------------------ | ----------------- | ----------------- |
| "I trusted the sync indicator"       | 1–5 Likert        | ≥4.0 avg          |
| "Quick Log was fast enough in field" | 1–5 Likert        | ≥4.0 avg          |
| "I knew when I was offline"          | 1–5 Likert        | ≥4.0 avg          |
| Would use on next trip               | Y/N               | ≥4/5 yes          |

---

## Known-Risk KPIs (KR-001)

| Metric                            | Target       | Interpretation                                        |
| --------------------------------- | ------------ | ----------------------------------------------------- |
| Offline logs at prohibited coords | Track count  | Accept if documented; target 0 if geohash cache lands |
| Post-sync moderation flags        | N/A Sprint 4 | Future                                                |

---

## Anti-Metrics (Fail Conditions)

- Any tester loses queued finds after refresh
- Sync indicator pending count wrong for >30s after enqueue
- Auth session lost on refresh during field session
- More than 1 duplicate find from replay

---

## Reporting

| Report               | When         | Audience          |
| -------------------- | ------------ | ----------------- |
| Daily sync health    | Daily        | Engineering       |
| Cohort pulse         | Mid-sprint   | Beta PM           |
| Beta closeout        | Sprint 4 end | Product + Release |
| META-003 cert packet | Sprint 4 end | Release gate      |

---

## Success Statement

**Closed Beta succeeds** when all primary metrics hit target, META-003 checklist passes, and at least 4/5 testers rate field usability ≥4/5 — without shipping major new features beyond Field Mode hardening and E2E coverage.
