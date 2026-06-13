# 5-Tester Field Cohort Plan (M3 Closed Beta)

**Issue:** META-002  
**Duration:** 2 weeks (Sprint 4)  
**Goal:** Validate real rockhound field use without network dependency

---

## Cohort Profile

Recruit **5 testers** matching:

| #   | Profile                  | Geography | Device           | Priority scenarios            |
| --- | ------------------------ | --------- | ---------------- | ----------------------------- |
| T1  | Power user / engineer    | AZ seed   | iOS Safari       | Offline sync, queue UI        |
| T2  | Weekend rockhound        | AZ seed   | Android Chrome   | Quick Log speed, GPS          |
| T3  | Oregon collector         | OR seed   | iOS Safari       | Prohibited gating online      |
| T4  | Poor-coverage field user | AZ rural  | Android Chrome   | Airplane mode, reconnect      |
| T5  | Skeptic / QA mindset     | Either    | Desktop + mobile | Duplicate prevention, refresh |

---

## Onboarding Sequence (Per Tester)

### Day 0 — Invite

1. Send preview URL + magic-link instructions
2. Attach `docs/qa/FIELD_TEST_PLAYBOOK.md` (PDF or link)
3. Share known-risk notice (offline prohibited logging KR-001)
4. Assign seed state focus (AZ or OR)

### Day 1 — Account & Map

1. Complete magic-link login
2. Open `/map`, confirm pins load <3s on LTE
3. Tap prohibited seed site; confirm Quick Log blocked **while online**
4. Submit onboarding checklist (form)

### Days 2–7 — Field Session

1. Execute playbook Steps 1–10 in one field outing (or simulated outing)
2. Minimum: 2 offline Quick Logs, 1 reconnect sync
3. Log at least 1 find that syncs to collection

### Days 8–14 — Feedback

1. Complete feedback template (bugs + UX + sync reliability)
2. Optional: second field session if P1 fixes land

---

## Communication Cadence

| When       | Channel       | Content                    |
| ---------- | ------------- | -------------------------- |
| Kickoff    | Email / Slack | URL, playbook, risk notice |
| Mid-sprint | Slack         | "How's sync?" pulse        |
| Week 2     | Slack         | Bug fix changelog          |
| Close      | Form + retro  | META-002 completion survey |

---

## Issue Collection Workflow

```
Tester finds issue
  → Feedback form (type: bug | UX | sync | access)
  → Triage daily (Beta PM + QA)
  → Label: P0 | P1 | P2
  → P0: same-day fix or cohort pause
  → P1: Sprint 4 buffer (20%)
  → P2: backlog
```

**Required fields:** device, OS, browser, online/offline, steps, screenshot optional, `client_operation_id` if sync issue.

---

## Playbook Completion Definition

A tester **completed** the playbook when:

- [ ] All 10 steps marked done
- [ ] At least 1 find visible in collection after sync
- [ ] Feedback form submitted

**META-002 pass:** ≥5 completions.

---

## Exit Artifacts

- Cohort roster (anonymized IDs ok)
- Playbook completion log
- Feedback summary doc
- P0/P1 resolution log
- Input to META-003 certification
