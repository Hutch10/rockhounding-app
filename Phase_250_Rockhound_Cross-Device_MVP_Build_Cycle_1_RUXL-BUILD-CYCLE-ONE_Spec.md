# Phase 250 — Rockhound Cross-Device MVP Build Cycle 1: First Vertical Field Slice (RUXL-BUILD-CYCLE-ONE)

---

## Canonical JSON: Build Cycle 1 Plan

```json
{
  "phase": 250,
  "layer": "RUXL-BUILD-CYCLE-ONE",
  "micro_phases": {
    "A": {
      "name": "Vertical Slice Definition",
      "scope": [
        "Create a specimen in the field",
        "Capture basic metadata: name, type, location, notes",
        "Save locally",
        "View and edit on desktop after sync (or simulated sync if offline-only)"
      ],
      "non_goals": ["No advanced classification", "No media", "No complex search"]
    },
    "B": {
      "name": "Engine & Substrate Feature Tasks",
      "tasks": [
        "Implement domain primitives for specimens and sessions",
        "Wire deterministic state transitions for create/update/read of specimens",
        "Expose API for clients to create and persist specimens"
      ],
      "acceptance_criteria": ["Engine can create and persist a specimen via API used by clients"]
    },
    "C": {
      "name": "Data Model & Persistence Feature Tasks",
      "tasks": [
        "Implement concrete schema for specimens and sessions",
        "Implement repositories/DAOs and basic queries for the slice"
      ],
      "acceptance_criteria": ["Specimen created on one device is durably stored and retrievable"]
    },
    "D": {
      "name": "Sync / Cross-Device Behavior for the Slice",
      "tasks": [
        "Implement minimal sync path for specimens (local loopback or single-device simulation)",
        "Define conflict behavior: last-write-wins or simple guard"
      ],
      "acceptance_criteria": ["Specimen created on Device A appears on Device B after sync step"]
    },
    "E": {
      "name": "Mobile Client Feature Tasks — Field Capture",
      "tasks": [
        "Implement 'New Specimen' screen with required fields",
        "Wire to engine and storage (and sync trigger if applicable)",
        "Implement basic list/detail view for created specimens"
      ],
      "acceptance_criteria": ["User can create and view specimens on mobile"]
    },
    "F": {
      "name": "Desktop Client Feature Tasks — Review & Edit",
      "tasks": [
        "Implement list/detail view for synced specimens",
        "Implement basic edit flow (update notes, name, type)",
        "Wire changes back through engine and storage (and sync)"
      ],
      "acceptance_criteria": ["User can review and edit a specimen created on mobile"]
    },
    "G": {
      "name": "Testing, Telemetry & Demo Path",
      "tests": [
        "Engine: create/persist specimen",
        "Data: schema, storage, retrieval",
        "Sync: specimen appears on both devices",
        "Mobile: create/view specimen",
        "Desktop: review/edit specimen"
      ],
      "telemetry": ["errors", "success", "sync events"],
      "demo_script": [
        "Step 1: On mobile, create a new specimen with metadata",
        "Step 2: Save specimen locally",
        "Step 3: Trigger sync (or simulate)",
        "Step 4: On desktop, view synced specimen",
        "Step 5: Edit specimen on desktop and save"
      ]
    },
    "H": {
      "name": "Canonical JSON Build Cycle 1 Plan",
      "output": "Full Build Cycle 1 plan as canonical JSON, including tasks, IDs, dependencies, subsystems, acceptance criteria. Regeneration-safe and suitable for direct import."
    }
  },
  "regeneration_safe": true,
  "single_pass": true,
  "output_format": ["canonical_json", "human_readable"]
}
```

---

## Human-Readable: Build Cycle 1 (Ultra-Dense, Parallel Micro-Phases)

### A. Vertical Slice Definition

- Scope: Create specimen in field, capture metadata (name, type, location, notes), save locally, view/edit on desktop after sync (or simulated sync)
- Non-goals: No advanced classification, no media, no complex search

### B. Engine & Substrate Feature Tasks

- Implement domain primitives for specimens/sessions
- Wire deterministic state transitions for create/update/read
- Expose API for clients
- Acceptance: Engine can create/persist specimen via client API

### C. Data Model & Persistence Feature Tasks

- Implement concrete schema for specimens/sessions
- Implement repositories/DAOs and basic queries
- Acceptance: Specimen created on one device is durably stored/retrievable

### D. Sync / Cross-Device Behavior for the Slice

- Implement minimal sync path (local loopback or simulation)
- Define conflict: last-write-wins/simple guard
- Acceptance: Specimen created on Device A appears on Device B after sync

### E. Mobile Client Feature Tasks — Field Capture

- Implement "New Specimen" screen (required fields)
- Wire to engine/storage (+ sync trigger)
- Implement basic list/detail view
- Acceptance: User can create/view specimens on mobile

### F. Desktop Client Feature Tasks — Review & Edit

- Implement list/detail view for synced specimens
- Implement basic edit flow (update notes, name, type)
- Wire changes back through engine/storage (+ sync)
- Acceptance: User can review/edit specimen created on mobile

### G. Testing, Telemetry & Demo Path

- Tests: engine, data, sync, mobile, desktop
- Telemetry: errors, success, sync events
- Demo: mobile create → sync → desktop review/edit

### H. Canonical JSON Build Cycle 1 Plan

- Output: Full Build Cycle 1 plan as canonical JSON (tasks, IDs, dependencies, subsystems, acceptance criteria)

---

_This specification is deterministic, ultra-dense, single-pass, parallelized, and regeneration-safe. All protocols and tasks are encoded in both canonical JSON and human-readable form for direct operationalization._
