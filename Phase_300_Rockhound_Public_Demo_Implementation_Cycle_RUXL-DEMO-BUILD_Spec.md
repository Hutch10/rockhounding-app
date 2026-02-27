# Phase 300 — Rockhound Public Demo Implementation Cycle (RUXL-DEMO-BUILD)

---

## Canonical JSON: Public Demo Implementation Cycle

```json
{
  "phase": 300,
  "layer": "RUXL-DEMO-BUILD",
  "scope": [
    "Build full public-facing demo slice",
    "Mobile and desktop clients",
    "Sync engine",
    "UI polish",
    "Packaging for all platforms",
    "Demo data population",
    "Stability and performance hardening"
  ],
  "requirements": {
    "mobile": [
      "Demo-ready app shell",
      "Field specimen creation, editing, and viewing",
      "Photo capture, geolocation, and session grouping",
      "Search, filter, and collection management",
      "Offline-first operation",
      "UI polish: navigation, loading, error states"
    ],
    "desktop": [
      "Demo-ready desktop shell",
      "Specimen review, editing, and organization",
      "Photo, geolocation, and session display",
      "Advanced search, filtering, and batch operations",
      "UI polish: resizable panels, keyboard shortcuts, error boundaries"
    ],
    "sync": [
      "Deterministic local sync engine",
      "Cross-device specimen, collection, and session sync",
      "Conflict resolution: last-write-wins",
      "Sync status indicators and error handling"
    ],
    "ui_polish": [
      "Consistent visual hierarchy",
      "Responsive layouts",
      "Accessible color and contrast",
      "Demo-specific onboarding and walkthrough"
    ],
    "packaging": [
      "Android APK/AAB",
      "iOS TestFlight/sideload",
      "Windows installer",
      "macOS app bundle"
    ],
    "demo_data": [
      "Pre-populated demo specimens, collections, and sessions",
      "Demo user accounts (if needed)",
      "Field session walkthroughs"
    ],
    "stability": [
      "Stress-tested for 1,000+ specimens",
      "Crash recovery and error boundaries",
      "Performance profiling and optimization"
    ]
  },
  "acceptance_criteria": [
    "Demo runs on all target devices (mobile, desktop)",
    "All core flows (create, edit, sync, organize, search) work end-to-end",
    "UI is polished and accessible",
    "Demo data is present and usable",
    "No critical errors or crashes during demo walkthrough"
  ],
  "regeneration_safe": true,
  "single_pass": true,
  "output_format": ["canonical_json", "human_readable"]
}
```

---

## Human-Readable: Public Demo Implementation Cycle (Ultra-Dense)

- Scope: Build full public-facing demo slice (mobile, desktop, sync, UI polish, packaging, demo data, stability)

### Mobile

- Demo-ready app shell
- Field specimen create/edit/view
- Photo, geolocation, session grouping
- Search, filter, collections
- Offline-first
- UI polish: navigation, loading, error states

### Desktop

- Demo-ready desktop shell
- Specimen review/edit/organize
- Photo, geolocation, session display
- Advanced search/filter/batch ops
- UI polish: resizable panels, shortcuts, error boundaries

### Sync

- Deterministic local sync engine
- Cross-device specimen/collection/session sync
- Conflict resolution: last-write-wins
- Sync status indicators, error handling

### UI Polish

- Consistent visual hierarchy
- Responsive layouts
- Accessible color/contrast
- Demo onboarding/walkthrough

### Packaging

- Android APK/AAB
- iOS TestFlight/sideload
- Windows installer
- macOS app bundle

### Demo Data

- Pre-populated demo specimens, collections, sessions
- Demo user accounts (if needed)
- Field session walkthroughs

### Stability

- Stress-tested for 1,000+ specimens
- Crash recovery, error boundaries
- Performance profiling/optimization

### Acceptance Criteria

- Demo runs on all target devices
- All core flows work end-to-end
- UI is polished and accessible
- Demo data present/usable
- No critical errors/crashes during walkthrough

---

_This specification is deterministic, ultra-dense, single-pass, and regeneration-safe. All requirements and flows are encoded in both canonical JSON and human-readable form for direct operationalization._
