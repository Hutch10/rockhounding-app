# Phase 247 — Rockhound Cross-Device MVP Initial Implementation Task Graph & Execution Plan (RUXL-IMPL-TASKGRAPH-XDEVICE)

## Deterministic, Regeneration-Safe, Parallelized Implementation Task Graph

---

### 1. Task Graph Overview (Parallel Phase A)

- **Subsystems:** core engine/substrate, data model, sync, mobile client, desktop client, observability, infra/tooling
- **Critical Path:** Scaffold → Engine/Substrate → Data Model → Sync → Clients → Observability/Infra
- **Dependencies:** Each group depends on previous; sync and data model can proceed in parallel after engine scaffold.

---

### 2. Core Engine & Substrate Tasks (Parallel Phase B)

- Scaffold substrate-core module
- Implement determinism primitives
- Implement regeneration safety logic
- Expose engine API to clients
- **Acceptance:** Engine core can be initialized, validates state, replays logs, and exposes sync API

---

### 3. Data Model & Persistence Tasks (Parallel Phase C)

- Define entities/types (Specimen, Location, etc.)
- Implement repositories/DAOs
- Implement migrations
- Enforce schema at runtime
- **Tests:** CRUD, migration, and schema validation for all entities

---

### 4. Sync & Offline-First Tasks (Parallel Phase D)

- Scaffold sync-core module
- Implement push/pull protocol
- Add conflict resolution logic
- Add retry/batching
- Integrate local adapters (mobile/desktop)
- **Acceptance:** Sync works offline, resumes, and resolves conflicts deterministically

---

### 5. Client Implementation Tasks — Mobile & Desktop (Parallel Phase E)

- Scaffold mobile and desktop apps
- Implement navigation and core screens
- Wire state management to engine/sync
- Implement field capture, logging, review, sync status
- **Vertical Slice:** One end-to-end flow (collect → log → sync → review) works on both phone and desktop

---

### 6. Testing, Tooling & CI Tasks (Parallel Phase F)

- Set up unit/integration/device/e2e test harnesses
- Add linting/formatting
- Scaffold CI pipeline (build, test, lint)
- Add reproducible environment configs
- **Tests:** Minimal suite must pass before field test

---

### 7. Milestones & Execution Phases (Parallel Phase G)

- **Phase 1: Scaffold** (repo, folders, configs)
- **Phase 2: Engine+Data** (engine, data model, storage)
- **Phase 3: Sync** (protocol, adapters, offline)
- **Phase 4: Clients** (mobile/desktop, UI, flows)
- **Phase 5: Field-Ready** (vertical slice, field test, feedback)
- **Field-Ready Alpha:** All core flows work on at least one mobile and one desktop device

---

### 8. Canonical JSON Task Graph (Parallel Phase H)

```json
{
  "tasks": [
    {
      "id": 1,
      "desc": "Scaffold repo and root folders",
      "deps": [],
      "subsystem": "infra",
      "phase": 1,
      "accept": "folders exist, build runs"
    },
    {
      "id": 2,
      "desc": "Implement substrate-core module",
      "deps": [1],
      "subsystem": "engine",
      "phase": 2,
      "accept": "init() works"
    },
    {
      "id": 3,
      "desc": "Implement determinism primitives",
      "deps": [2],
      "subsystem": "engine",
      "phase": 2,
      "accept": "validate() passes"
    },
    {
      "id": 4,
      "desc": "Implement regeneration safety logic",
      "deps": [2],
      "subsystem": "engine",
      "phase": 2,
      "accept": "replay() works"
    },
    {
      "id": 5,
      "desc": "Define entities/types",
      "deps": [1],
      "subsystem": "data_model",
      "phase": 2,
      "accept": "types defined"
    },
    {
      "id": 6,
      "desc": "Implement repositories/DAOs",
      "deps": [5],
      "subsystem": "data_model",
      "phase": 2,
      "accept": "CRUD works"
    },
    {
      "id": 7,
      "desc": "Implement migrations",
      "deps": [6],
      "subsystem": "data_model",
      "phase": 2,
      "accept": "migrations run"
    },
    {
      "id": 8,
      "desc": "Enforce schema at runtime",
      "deps": [6],
      "subsystem": "data_model",
      "phase": 2,
      "accept": "invalid data rejected"
    },
    {
      "id": 9,
      "desc": "Scaffold sync-core module",
      "deps": [1],
      "subsystem": "sync",
      "phase": 3,
      "accept": "sync-core exists"
    },
    {
      "id": 10,
      "desc": "Implement push/pull protocol",
      "deps": [9],
      "subsystem": "sync",
      "phase": 3,
      "accept": "push/pull works"
    },
    {
      "id": 11,
      "desc": "Add conflict resolution logic",
      "deps": [10],
      "subsystem": "sync",
      "phase": 3,
      "accept": "conflicts resolved"
    },
    {
      "id": 12,
      "desc": "Add retry/batching",
      "deps": [10],
      "subsystem": "sync",
      "phase": 3,
      "accept": "retries/batching work"
    },
    {
      "id": 13,
      "desc": "Integrate local adapters",
      "deps": [10],
      "subsystem": "sync",
      "phase": 3,
      "accept": "adapters work"
    },
    {
      "id": 14,
      "desc": "Scaffold mobile app",
      "deps": [1],
      "subsystem": "client_mobile",
      "phase": 4,
      "accept": "app runs"
    },
    {
      "id": 15,
      "desc": "Scaffold desktop app",
      "deps": [1],
      "subsystem": "client_desktop",
      "phase": 4,
      "accept": "app runs"
    },
    {
      "id": 16,
      "desc": "Implement navigation/screens (mobile)",
      "deps": [14],
      "subsystem": "client_mobile",
      "phase": 4,
      "accept": "screens render"
    },
    {
      "id": 17,
      "desc": "Implement navigation/screens (desktop)",
      "deps": [15],
      "subsystem": "client_desktop",
      "phase": 4,
      "accept": "screens render"
    },
    {
      "id": 18,
      "desc": "Wire state management to engine/sync (mobile)",
      "deps": [16, 2, 9],
      "subsystem": "client_mobile",
      "phase": 4,
      "accept": "state flows"
    },
    {
      "id": 19,
      "desc": "Wire state management to engine/sync (desktop)",
      "deps": [17, 2, 9],
      "subsystem": "client_desktop",
      "phase": 4,
      "accept": "state flows"
    },
    {
      "id": 20,
      "desc": "Implement field capture/logging/review/sync (mobile)",
      "deps": [18],
      "subsystem": "client_mobile",
      "phase": 4,
      "accept": "vertical slice works"
    },
    {
      "id": 21,
      "desc": "Implement field capture/logging/review/sync (desktop)",
      "deps": [19],
      "subsystem": "client_desktop",
      "phase": 4,
      "accept": "vertical slice works"
    },
    {
      "id": 22,
      "desc": "Set up test harnesses",
      "deps": [1],
      "subsystem": "testing",
      "phase": 1,
      "accept": "tests run"
    },
    {
      "id": 23,
      "desc": "Add linting/formatting",
      "deps": [1],
      "subsystem": "infra",
      "phase": 1,
      "accept": "linter runs"
    },
    {
      "id": 24,
      "desc": "Scaffold CI pipeline",
      "deps": [1],
      "subsystem": "infra",
      "phase": 1,
      "accept": "CI runs"
    },
    {
      "id": 25,
      "desc": "Add reproducible env configs",
      "deps": [1],
      "subsystem": "infra",
      "phase": 1,
      "accept": "env reproducible"
    }
  ]
}
```

---

### 9. Output Requirements

- Ultra-dense, deterministic, single-pass, parallel micro-phase execution, regeneration-safe
- Canonical JSON + human-readable spec
- No filler, no drift

---

**This RUXL-IMPL-TASKGRAPH-XDEVICE implementation task graph is deterministic, ultra-dense, regeneration-safe, and canonical.**
