# Phase 253 — Rockhound Cross-Device MVP Build Cycle 4: Collections, Search & Field-Ready Data Operations (RUXL-BUILD-CYCLE-FOUR)

---

## Canonical JSON: Build Cycle 4 Plan

```json
{
  "phase": 253,
  "layer": "RUXL-BUILD-CYCLE-FOUR",
  "micro_phases": {
    "A": {
      "name": "Cycle Definition & Scope",
      "capabilities": [
        "Collections (user-defined groups of specimens)",
        "Search & filtering (local, offline)",
        "Bulk operations (multi-select, batch tagging)"
      ],
      "non_goals": ["No cloud search", "No advanced analytics", "No map UI yet"]
    },
    "B": {
      "name": "Engine & Substrate Feature Expansion",
      "tasks": [
        "Add deterministic state transitions for collection CRUD",
        "Add/remove specimen from collection",
        "Implement search queries (structured + free text)",
        "Implement batch operations"
      ],
      "acceptance_criteria": ["Engine supports all operations with deterministic results"]
    },
    "C": {
      "name": "Data Model & Persistence Expansion",
      "entities": ["Collection", "CollectionMembership"],
      "tasks": [
        "Add indexes for search and filtering",
        "Implement versioned migration from Cycle 3 schema"
      ],
      "acceptance_criteria": ["Upgraded schema loads all prior data without drift"]
    },
    "D": {
      "name": "Search & Filtering Layer",
      "tasks": [
        "Implement offline search engine: free-text and structured filters",
        "Implement deterministic ranking rules"
      ],
      "acceptance_criteria": ["Search returns stable, reproducible results"]
    },
    "E": {
      "name": "Mobile Client Enhancements — Field Usability",
      "tasks": [
        "Add search bar and filter panel",
        "Add 'Add to Collection' flow",
        "Add multi-select mode for batch operations"
      ],
      "acceptance_criteria": ["User can organize and search specimens in the field"]
    },
    "F": {
      "name": "Desktop Client Enhancements — Review & Organization",
      "tasks": [
        "Add full collection management UI",
        "Add advanced filtering panel",
        "Add batch edit tools (tags, type, notes)"
      ],
      "acceptance_criteria": ["Desktop becomes the primary organization environment"]
    },
    "G": {
      "name": "Sync Layer Enhancements",
      "tasks": [
        "Sync collections and memberships",
        "Sync search indexes (or rebuild deterministically on device)",
        "Add sync events for batch operations"
      ],
      "acceptance_criteria": ["Collections and search remain consistent across devices"]
    },
    "H": {
      "name": "Testing, Telemetry & Demo Path",
      "tests": ["Collection CRUD", "Search correctness", "Batch operations", "Sync propagation"],
      "telemetry": ["Search queries", "Collection creation", "Batch edits"],
      "demo_script": [
        "Step 1: Create specimens in field",
        "Step 2: Organize into collections",
        "Step 3: Search/filter",
        "Step 4: Sync to desktop",
        "Step 5: Batch edit"
      ]
    },
    "I": {
      "name": "Canonical JSON Build Cycle 4 Plan",
      "output": "Full Build Cycle 4 plan as canonical JSON, including tasks, IDs, dependencies, subsystems, acceptance criteria. Regeneration-safe and importable."
    }
  },
  "regeneration_safe": true,
  "single_pass": true,
  "output_format": ["canonical_json", "human_readable"]
}
```

---

## Human-Readable: Build Cycle 4 (Ultra-Dense, Parallel Micro-Phases)

### A. Cycle Definition & Scope

- Capabilities: collections (user-defined groups), search/filtering (offline), bulk operations (multi-select, batch tagging)
- Non-goals: no cloud search, no advanced analytics, no map UI

### B. Engine & Substrate Feature Expansion

- Add deterministic state transitions for collection CRUD, add/remove specimen, search queries, batch ops
- Acceptance: engine supports all operations with deterministic results

### C. Data Model & Persistence Expansion

- Add entities: Collection, CollectionMembership
- Add indexes for search/filtering
- Implement versioned migration from Cycle 3 schema
- Acceptance: upgraded schema loads all prior data without drift

### D. Search & Filtering Layer

- Implement offline search engine: free-text, structured filters
- Implement deterministic ranking rules
- Acceptance: search returns stable, reproducible results

### E. Mobile Client Enhancements — Field Usability

- Add search bar, filter panel, "Add to Collection" flow, multi-select for batch ops
- Acceptance: user can organize/search specimens in the field

### F. Desktop Client Enhancements — Review & Organization

- Add full collection management UI, advanced filtering, batch edit tools
- Acceptance: desktop is primary organization environment

### G. Sync Layer Enhancements

- Sync collections/memberships, search indexes (or rebuild), batch ops events
- Acceptance: collections/search consistent across devices

### H. Testing, Telemetry & Demo Path

- Tests: collection CRUD, search correctness, batch ops, sync propagation
- Telemetry: search queries, collection creation, batch edits
- Demo: create specimens → organize into collections → search/filter → sync → batch edit

### I. Canonical JSON Build Cycle 4 Plan

- Output: Full Build Cycle 4 plan as canonical JSON (tasks, IDs, dependencies, subsystems, acceptance criteria)

---

_This specification is deterministic, ultra-dense, single-pass, parallelized, and regeneration-safe. All protocols and tasks are encoded in both canonical JSON and human-readable form for direct operationalization._
