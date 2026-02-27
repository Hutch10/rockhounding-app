# Phase 251 — Rockhound Cross-Device MVP Build Cycle 2: Field Intelligence & Enhanced Specimen Model (RUXL-BUILD-CYCLE-TWO)

---

## Canonical JSON: Build Cycle 2 Plan

```json
{
  "phase": 251,
  "layer": "RUXL-BUILD-CYCLE-TWO",
  "micro_phases": {
    "A": {
      "name": "Cycle Definition & Scope",
      "specimen_model_expansion": [
        "Rock/mineral type (structured)",
        "Condition/quality",
        "Field tags",
        "Environmental context"
      ],
      "field_intelligence": [
        "Suggest likely rock/mineral categories based on user input (rule-based, offline)",
        "Provide quick-reference field tips (offline)"
      ],
      "non_goals": ["No ML classification", "No media capture", "No advanced search"]
    },
    "B": {
      "name": "Engine & Substrate Feature Expansion",
      "tasks": [
        "Add deterministic state transitions for new specimen attributes",
        "Implement suggestion engine hooks (rule-based, offline)"
      ],
      "acceptance_criteria": ["Engine returns structured suggestions and validates new fields"]
    },
    "C": {
      "name": "Data Model & Persistence Expansion",
      "tasks": [
        "Add new fields to schema with versioned migration",
        "Update repositories/DAOs and queries"
      ],
      "acceptance_criteria": ["Upgraded schema loads existing Build Cycle 1 data without drift"]
    },
    "D": {
      "name": "Sync Layer Enhancements",
      "tasks": [
        "Sync new specimen fields across devices",
        "Add sync events for suggestion usage (telemetry only)"
      ],
      "acceptance_criteria": ["Enhanced specimens remain consistent across devices"]
    },
    "E": {
      "name": "Mobile Client Enhancements — Field Intelligence",
      "tasks": [
        "Add structured fields to 'New Specimen'",
        "Add suggestion UI component (deterministic, offline)",
        "Add quick-reference field tips panel"
      ],
      "acceptance_criteria": ["User can select suggested types and save enhanced specimens"]
    },
    "F": {
      "name": "Desktop Client Enhancements — Review & Edit",
      "tasks": [
        "Add structured fields to detail/edit views",
        "Add suggestion engine access for desktop edits"
      ],
      "acceptance_criteria": ["Desktop can view/edit all enhanced fields"]
    },
    "G": {
      "name": "Testing, Telemetry & Demo Path",
      "tests": [
        "Engine: new logic for suggestions and validation",
        "Schema migration: data upgrade and drift check",
        "Sync: enhanced fields consistency",
        "UI: mobile and desktop flows"
      ],
      "telemetry": ["suggestion usage", "field-tip access"],
      "demo_script": [
        "Step 1: Field capture with suggestions",
        "Step 2: Sync to desktop",
        "Step 3: Edit with structured fields"
      ]
    },
    "H": {
      "name": "Canonical JSON Build Cycle 2 Plan",
      "output": "Full Build Cycle 2 plan as canonical JSON, including tasks, IDs, dependencies, subsystems, acceptance criteria. Regeneration-safe and importable."
    }
  },
  "regeneration_safe": true,
  "single_pass": true,
  "output_format": ["canonical_json", "human_readable"]
}
```

---

## Human-Readable: Build Cycle 2 (Ultra-Dense, Parallel Micro-Phases)

### A. Cycle Definition & Scope

- Expand specimen model: rock/mineral type (structured), condition/quality, field tags, environmental context
- Field intelligence: suggest likely categories (rule-based, offline), quick-reference field tips
- Non-goals: no ML, no media, no advanced search

### B. Engine & Substrate Feature Expansion

- Add deterministic state transitions for new attributes
- Implement suggestion engine hooks (rule-based, offline)
- Acceptance: engine returns structured suggestions, validates new fields

### C. Data Model & Persistence Expansion

- Add new fields to schema with versioned migration
- Update repositories/DAOs and queries
- Acceptance: upgraded schema loads Build Cycle 1 data without drift

### D. Sync Layer Enhancements

- Sync new specimen fields across devices
- Add sync events for suggestion usage (telemetry)
- Acceptance: enhanced specimens remain consistent across devices

### E. Mobile Client Enhancements — Field Intelligence

- Add structured fields to "New Specimen"
- Add suggestion UI (deterministic, offline)
- Add quick-reference field tips panel
- Acceptance: user can select suggestions, save enhanced specimens

### F. Desktop Client Enhancements — Review & Edit

- Add structured fields to detail/edit views
- Add suggestion engine for desktop edits
- Acceptance: desktop can view/edit all enhanced fields

### G. Testing, Telemetry & Demo Path

- Tests: engine logic, schema migration, sync, UI flows
- Telemetry: suggestion usage, field-tip access
- Demo: field capture with suggestions → sync → desktop edit

### H. Canonical JSON Build Cycle 2 Plan

- Output: Full Build Cycle 2 plan as canonical JSON (tasks, IDs, dependencies, subsystems, acceptance criteria)

---

_This specification is deterministic, ultra-dense, single-pass, parallelized, and regeneration-safe. All protocols and tasks are encoded in both canonical JSON and human-readable form for direct operationalization._
