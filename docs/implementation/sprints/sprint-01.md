# Sprint 1 — Foundation (Weeks 1–2)

**Milestone:** M0 — Foundation  
**Goal:** Auth works; V1 locations API live; schema repaired  
**Exit:** Authenticated bbox fetch + Tier-1 site detail via API

## Board Columns

`Backlog` → `Ready` → `In Progress` → `Review` → `Done`

## Sprint Backlog (execution order)

| #   | ID         | Title                          | Assignee | Status   |
| --- | ---------- | ------------------------------ | -------- | -------- |
| 1   | DEPLOY-001 | Environment matrix             |          | done     |
| 2   | DB-001     | Profiles V1 columns            |          | done     |
| 3   | DB-003     | trust_category on locations    |          | done     |
| 4   | DB-006     | finds + sync_operations verify |          | done     |
| 5   | DB-002     | Fix moderate_location_v2 UUID  |          | parallel |
| 6   | AUTH-001   | Magic link config              |          | done     |
| 7   | AUTH-002   | middleware.ts session          |          | done     |
| 8   | AUTH-004   | RLS audit                      |          | done     |
| 9   | API-011    | Trust resolver module          |          | done     |
| 10  | API-001    | GET /api/v1/locations          |          | done     |
| 11  | API-012    | Legacy locations shim          |          |          |
| 12  | API-002    | GET /api/v1/locations/:id      |          | done     |
| 13  | GIS-001    | Bbox index verify              |          |          |
| 14  | DEPLOY-003 | Migration CI gate              |          | done     |
| 15  | TEST-003   | Trust resolver tests           |          | done     |
| 16  | TEST-001   | API locations tests            |          | done     |
| 17  | DEPLOY-008 | Retire Worker critical path    |          |          |

## Daily Standup Prompts

- Is AUTH-002 blocking API routes?
- Is DB-003 migrated on all dev environments?
- Any legacy `/api/locations` callers remaining?

## Sprint Review Demo

1. `curl` authenticated `/api/v1/locations?bbox=...`
2. Open `/api/v1/locations/:id` JSON — show trust_category
3. Run `pnpm test` — API + trust tests green

## Retrospective Topics

- Migration friction
- Supabase local vs linked workflow
