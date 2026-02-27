# Phase 301 — Rockhound Public Demo Packaging & Presentation Cycle (RUXL-DEMO-PRESENT)

---

## Canonical JSON: Public Demo Packaging & Presentation Cycle

```json
{
  "phase": 301,
  "layer": "RUXL-DEMO-PRESENT",
  "scope": [
    "Prepare, package, and present the public-facing Rockhound demo",
    "Demo deck structure",
    "Landing page copy",
    "Screenshot plan",
    "Screen recording plan",
    "Founder script integration",
    "Demo data seeding",
    "Distribution packaging",
    "Device test matrix",
    "Dry-run rehearsal protocol"
  ],
  "requirements": {
    "demo_deck": [
      "Title slide: Rockhound Demo Overview",
      "Problem/solution slides",
      "Feature walkthrough slides (mobile, desktop, sync)",
      "Screenshots and annotated highlights",
      "Demo data and scenario slides",
      "Call-to-action and next steps"
    ],
    "landing_page": [
      "Concise headline",
      "Value proposition",
      "Demo highlights",
      "Screenshots",
      "Call-to-action (download, contact, feedback)"
    ],
    "screenshots": [
      "Mobile: onboarding, specimen creation, field session, search, collections",
      "Desktop: review, edit, organize, batch ops, sync status",
      "Sync: cross-device continuity"
    ],
    "screen_recordings": [
      "Mobile: create specimen, photo capture, sync",
      "Desktop: review/edit specimen, batch organize, sync",
      "Cross-device: specimen appears after sync"
    ],
    "founder_script": [
      "Integrated narrative for live/demo deck/recordings",
      "Key talking points for each feature and flow",
      "Demo data story integration"
    ],
    "demo_data": [
      "Seeded demo specimens, collections, sessions",
      "Demo user accounts (if needed)",
      "Field session walkthroughs"
    ],
    "packaging": [
      "Android APK/AAB",
      "iOS TestFlight/sideload",
      "Windows installer",
      "macOS app bundle"
    ],
    "device_test_matrix": [
      "Mobile: Android (3+ devices, 2+ OS versions), iOS (2+ devices, 2+ OS versions)",
      "Desktop: Windows (2+ versions), macOS (2+ versions)"
    ],
    "dry_run_protocol": [
      "Full rehearsal with founder script",
      "Device matrix walkthrough",
      "Demo data reset and validation",
      "Timing and flow check",
      "Contingency plan for demo failures"
    ]
  },
  "acceptance_criteria": [
    "Demo deck is complete and visually clear",
    "Landing page copy is concise and compelling",
    "Screenshots and recordings cover all core flows",
    "Founder script is integrated and rehearsed",
    "Demo data is seeded and validated",
    "All packaging is tested on device matrix",
    "Dry-run protocol is executed without critical issues"
  ],
  "regeneration_safe": true,
  "single_pass": true,
  "output_format": ["canonical_json", "human_readable"]
}
```

---

## Human-Readable: Public Demo Packaging & Presentation Cycle (Ultra-Dense)

- Scope: Prepare, package, present public demo (deck, landing, screenshots, recordings, script, data, packaging, test matrix, dry-run)

### Demo Deck

- Title, problem/solution, feature walkthrough (mobile/desktop/sync), screenshots, demo data/scenario, call-to-action

### Landing Page

- Headline, value prop, demo highlights, screenshots, call-to-action

### Screenshots

- Mobile: onboarding, specimen create, field session, search, collections
- Desktop: review, edit, organize, batch ops, sync status
- Sync: cross-device continuity

### Screen Recordings

- Mobile: create specimen, photo, sync
- Desktop: review/edit, batch organize, sync
- Cross-device: specimen appears after sync

### Founder Script

- Integrated narrative for live/deck/recordings
- Key talking points per feature/flow
- Demo data story

### Demo Data

- Seeded specimens, collections, sessions
- Demo user accounts (if needed)
- Field session walkthroughs

### Packaging

- Android APK/AAB, iOS TestFlight/sideload, Windows installer, macOS app bundle

### Device Test Matrix

- Mobile: Android (3+ devices, 2+ OS), iOS (2+ devices, 2+ OS)
- Desktop: Windows (2+), macOS (2+)

### Dry-Run Protocol

- Full rehearsal with script
- Device matrix walkthrough
- Demo data reset/validation
- Timing/flow check
- Contingency for failures

### Acceptance Criteria

- Deck complete/clear, landing copy compelling, screenshots/recordings cover all flows, script integrated/rehearsed, data seeded/validated, packaging tested, dry-run executed without critical issues

---

_This specification is deterministic, ultra-dense, single-pass, and regeneration-safe. All requirements and flows are encoded in both canonical JSON and human-readable form for direct operationalization._
