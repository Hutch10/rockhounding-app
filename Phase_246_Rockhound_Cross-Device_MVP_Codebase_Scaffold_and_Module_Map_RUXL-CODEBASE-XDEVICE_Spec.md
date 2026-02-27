# Phase 246 — Rockhound Cross-Device MVP Codebase Scaffold & Module Map (RUXL-CODEBASE-XDEVICE)

## Deterministic, Regeneration-Safe, Parallelized Codebase Scaffold Specification

---

### 1. Repository & Project Layout (Parallel Phase A)

- **Repo Structure:** Monorepo (single repo, all platforms/modules); rationale: maximizes cross-device consistency, shared infra, deterministic builds.
- **Root Folders:** /engine, /client-mobile, /client-desktop, /sync, /infra, /shared
- **RUXL Layer Mapping:**
  - /engine: substrate, core engine, determinism
  - /client-mobile: UI, navigation, sync, offline
  - /client-desktop: UI, navigation, sync, offline
  - /sync: sync protocol, conflict resolution
  - /infra: CI, scripts, deployment
  - /shared: data model, types, canonical schemas, utilities
- **Canonical JSON Directory Tree:**

```json
{
  "root": "/",
  "folders": [
    { "name": "engine", "layers": ["substrate", "engine"] },
    { "name": "client-mobile", "layers": ["ui", "sync"] },
    { "name": "client-desktop", "layers": ["ui", "sync"] },
    { "name": "sync", "layers": ["sync", "conflict_resolution"] },
    { "name": "infra", "layers": ["ci", "scripts"] },
    { "name": "shared", "layers": ["data_model", "schemas", "utils"] }
  ]
}
```

---

### 2. Core Engine & Substrate Modules (Parallel Phase B)

- **Modules:** substrate-core, rules-engine, determinism, regeneration, engine-api
- **Interfaces:**
  - substrate-core: `init(config): EngineContext`
  - rules-engine: `evaluate(rule, context): Result`
  - determinism: `validate(state): boolean`
  - regeneration: `replay(log): State`
  - engine-api: `sync(data): SyncResult`
- **Canonical JSON:**

```json
{
  "modules": [
    { "name": "substrate-core", "interfaces": ["init(config):EngineContext"] },
    { "name": "rules-engine", "interfaces": ["evaluate(rule,context):Result"] },
    { "name": "determinism", "interfaces": ["validate(state):boolean"] },
    { "name": "regeneration", "interfaces": ["replay(log):State"] },
    { "name": "engine-api", "interfaces": ["sync(data):SyncResult"] }
  ]
}
```

---

### 3. Client Applications (Mobile & Desktop) (Parallel Phase C)

- **Mobile:** React Native (screens: Home, Collect, Identify, Log, Review, Sync)
- **Desktop:** Electron (screens: Home, Collect, Identify, Log, Review, Sync)
- **Navigation:** Tabbed, offline-first, sync triggers on navigation
- **State Management:** Redux/Context, deterministic state
- **Canonical JSON:**

```json
{
  "clients": [
    { "type": "mobile", "screens": ["Home", "Collect", "Identify", "Log", "Review", "Sync"] },
    { "type": "desktop", "screens": ["Home", "Collect", "Identify", "Log", "Review", "Sync"] }
  ]
}
```

---

### 4. Sync & Offline-First Layer (Parallel Phase D)

- **Modules:** sync-core, conflict-resolution, batcher, retry, local-adapter-mobile, local-adapter-desktop
- **Data Flow:** Client ↔ Local Adapter ↔ Sync Core ↔ Remote Peer
- **Canonical JSON:**

```json
{
  "modules": [
    "sync-core",
    "conflict-resolution",
    "batcher",
    "retry",
    "local-adapter-mobile",
    "local-adapter-desktop"
  ],
  "flow": ["client", "local_adapter", "sync_core", "remote_peer"]
}
```

---

### 5. Data Model & Persistence Implementation (Parallel Phase E)

- **Entities:** Specimen, Location, Session, Note, Media, Classification, SyncState
- **Repositories:** specimenRepo, locationRepo, sessionRepo, noteRepo, mediaRepo, classificationRepo, syncStateRepo
- **Canonical JSON:**

```json
{
  "entities": ["Specimen", "Location", "Session", "Note", "Media", "Classification", "SyncState"],
  "repos": [
    "specimenRepo",
    "locationRepo",
    "sessionRepo",
    "noteRepo",
    "mediaRepo",
    "classificationRepo",
    "syncStateRepo"
  ]
}
```

---

### 6. Testing, Tooling & Dev Workflow Integration (Parallel Phase F)

- **Test Layout:** /tests/unit, /tests/integration, /tests/device, /tests/e2e
- **Codegen Hooks:** schema-gen, api-client-gen
- **CI Integration:** scripts in /infra, package.json, CI config
- **Canonical JSON:**

```json
{
  "tests": ["unit", "integration", "device", "e2e"],
  "codegen": ["schema-gen", "api-client-gen"],
  "ci": ["infra/scripts", "package.json", "ci_config"]
}
```

---

### 7. Initial Task Graph & Bootstrapping Plan (Parallel Phase G)

- **Tasks:**
  1. Scaffold repo + root folders
  2. Add shared data model + schemas
  3. Create engine/substrate modules
  4. Scaffold client-mobile and client-desktop
  5. Add sync layer modules
  6. Add test and infra scaffolding
- **Dependencies:** Each step depends on previous; acceptance = folder/module exists, passes lint/build
- **Canonical JSON:**

```json
{
  "tasks": [
    { "id": 1, "desc": "Scaffold repo + root folders", "deps": [] },
    { "id": 2, "desc": "Add shared data model + schemas", "deps": [1] },
    { "id": 3, "desc": "Create engine/substrate modules", "deps": [2] },
    { "id": 4, "desc": "Scaffold client-mobile and client-desktop", "deps": [3] },
    { "id": 5, "desc": "Add sync layer modules", "deps": [4] },
    { "id": 6, "desc": "Add test and infra scaffolding", "deps": [5] }
  ]
}
```

---

### 8. Output Requirements

- Ultra-dense, deterministic, single-pass, parallel micro-phase execution, regeneration-safe
- Canonical JSON + human-readable spec
- No filler, no drift

---

**This RUXL-CODEBASE-XDEVICE codebase scaffold spec is deterministic, ultra-dense, regeneration-safe, and canonical.**
