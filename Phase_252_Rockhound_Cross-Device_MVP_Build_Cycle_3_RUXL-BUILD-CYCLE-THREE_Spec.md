# Phase 252 — Rockhound Cross-Device MVP Build Cycle 3: Media, Geolocation & Field Session Intelligence (RUXL-BUILD-CYCLE-THREE)

---

## Canonical JSON: Build Cycle 3 Plan

```json
{
  "phase": 252,
  "layer": "RUXL-BUILD-CYCLE-THREE",
  "micro_phases": {
    "A": {
      "name": "Cycle Definition & Scope",
      "capabilities": [
        "Photo capture & attachment (mobile-first)",
        "Automatic geolocation tagging (GPS)",
        "Field session intelligence (grouping specimens by outing/time/location)"
      ],
      "non_goals": ["No video", "No multi-photo editing", "No map visualization yet"]
    },
    "B": {
      "name": "Engine & Substrate Feature Expansion",
      "tasks": [
        "Add deterministic state transitions for media attachments (single photo per specimen)",
        "Add deterministic state transitions for geolocation metadata",
        "Add deterministic state transitions for session grouping logic"
      ],
      "acceptance_criteria": [
        "Engine can create/update/read specimens with media, location, and session"
      ]
    },
    "C": {
      "name": "Data Model & Persistence Expansion",
      "fields": ["photo_uri", "gps_lat", "gps_lon", "gps_accuracy", "session_id"],
      "tasks": ["Implement versioned migration from Cycle 2 schema"],
      "acceptance_criteria": ["Upgraded schema loads all prior data without drift"]
    },
    "D": {
      "name": "Sync Layer Enhancements",
      "tasks": [
        "Sync media metadata (not binary blobs)",
        "Sync geolocation fields and session IDs",
        "Add sync events for media capture and session creation"
      ],
      "acceptance_criteria": ["Enhanced specimens remain consistent across devices"]
    },
    "E": {
      "name": "Mobile Client Enhancements — Field Capture",
      "tasks": [
        "Add photo capture button to 'New Specimen'",
        "Add geolocation auto-fill with manual override",
        "Add session auto-assignment (create or join active session)"
      ],
      "acceptance_criteria": ["User can capture photo, location, and session in one flow"]
    },
    "F": {
      "name": "Desktop Client Enhancements — Review & Edit",
      "tasks": [
        "Display photo thumbnail",
        "Display geolocation metadata",
        "Display session grouping in list/detail views"
      ],
      "acceptance_criteria": ["Desktop can view/edit all new fields"]
    },
    "G": {
      "name": "Field Session Intelligence",
      "tasks": [
        "Implement session lifecycle: auto-start on first specimen, auto-end after inactivity threshold, deterministic session naming (timestamp/location)"
      ],
      "acceptance_criteria": ["Specimens created in the same outing are grouped automatically"]
    },
    "H": {
      "name": "Testing, Telemetry & Demo Path",
      "tests": ["Media capture", "Geolocation tagging", "Session grouping", "Sync propagation"],
      "telemetry": ["Photo capture", "GPS acquisition", "Session creation/closure"],
      "demo_script": [
        "Step 1: Capture specimen with photo and GPS",
        "Step 2: Auto-session grouping",
        "Step 3: Sync to desktop",
        "Step 4: Review on desktop"
      ]
    },
    "I": {
      "name": "Canonical JSON Build Cycle 3 Plan",
      "output": "Full Build Cycle 3 plan as canonical JSON, including tasks, IDs, dependencies, subsystems, acceptance criteria. Regeneration-safe and importable."
    }
  },
  "regeneration_safe": true,
  "single_pass": true,
  "output_format": ["canonical_json", "human_readable"]
}
```

---

## Human-Readable: Build Cycle 3 (Ultra-Dense, Parallel Micro-Phases)

### A. Cycle Definition & Scope

- Capabilities: photo capture & attachment (mobile-first), automatic geolocation tagging (GPS), field session intelligence (grouping by outing/time/location)
- Non-goals: no video, no multi-photo editing, no map visualization

### B. Engine & Substrate Feature Expansion

- Add deterministic state transitions for media, geolocation, session grouping
- Acceptance: engine can create/update/read specimens with media, location, session

### C. Data Model & Persistence Expansion

- Add fields: photo_uri, gps_lat, gps_lon, gps_accuracy, session_id
- Implement versioned migration from Cycle 2 schema
- Acceptance: upgraded schema loads all prior data without drift

### D. Sync Layer Enhancements

- Sync media metadata (not blobs), geolocation fields, session IDs
- Add sync events for media capture/session creation
- Acceptance: enhanced specimens remain consistent across devices

### E. Mobile Client Enhancements — Field Capture

- Add photo capture button to "New Specimen"
- Add geolocation auto-fill/manual override
- Add session auto-assignment (create/join active session)
- Acceptance: user can capture photo, location, session in one flow

### F. Desktop Client Enhancements — Review & Edit

- Display photo thumbnail, geolocation metadata, session grouping
- Acceptance: desktop can view/edit all new fields

### G. Field Session Intelligence

- Implement session lifecycle: auto-start, auto-end, deterministic naming
- Acceptance: specimens in same outing grouped automatically

### H. Testing, Telemetry & Demo Path

- Tests: media capture, geolocation tagging, session grouping, sync propagation
- Telemetry: photo capture, GPS acquisition, session creation/closure
- Demo: capture specimen (photo+GPS) → auto-session → sync → desktop review

### I. Canonical JSON Build Cycle 3 Plan

- Output: Full Build Cycle 3 plan as canonical JSON (tasks, IDs, dependencies, subsystems, acceptance criteria)

---

_This specification is deterministic, ultra-dense, single-pass, parallelized, and regeneration-safe. All protocols and tasks are encoded in both canonical JSON and human-readable form for direct operationalization._
