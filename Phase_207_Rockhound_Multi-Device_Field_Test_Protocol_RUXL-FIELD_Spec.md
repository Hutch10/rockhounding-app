# Phase 207 — Rockhound Multi‑Device Field Test Protocol (RUXL-FIELD)

## Deterministic, Regeneration-Safe Field Test Specification

---

### 1. Field Test Architecture

- **Multi-Device Test Matrix:** iOS, Android, tablets, Windows, macOS, Linux, web, future devices (headsets, wearables, car dashboards)
- **Device-Class Capability Mapping:** Map required/optional features per device class (camera, GPS, offline, overlays, notifications)
- **Offline-First Test Scenarios:** All flows tested with no signal, delayed sync, and recovery
- **Field-Mode Environmental Constraints:** Sunlight, gloves, motion, low battery, cold, wet, and rapid-logging conditions

---

### 2. Core Test Scenarios

- **Map Rendering & Predictive Overlays:** Validate overlays, toggles, and performance on all devices
- **Find Logging:** Camera capture, metadata entry, offline save, and sync on reconnect
- **Sample Catalog Interactions:** View, edit, redact, and sync samples across devices
- **Locality Alerts & Hazard Advisories:** Real-time and delayed alert/advisory validation
- **Offline Capture & Delayed Sync:** All actions queue and sync deterministically
- **Cross-Device Continuity:** Start action on one device, continue/complete on another; state and data integrity

---

### 3. Intelligence Loop Validation

- **Basic Scoring Return:** Validate intelligence return for all find types
- **Overlay Correctness & Timing:** Overlays appear with correct data and timing
- **Confidence/Uncertainty Behavior:** Confidence bars, rationale, and uncertainty icons always accessible
- **Degraded/Fallback Logic:** Test fallback overlays and messaging in degraded states
- **Multi-Device Consistency:** Intelligence outputs consistent across all device classes

---

### 4. Cross-Device UX Validation

- **Responsive Layout:** All screens adapt to device size/orientation
- **Input Method Differences:** Validate touch, mouse, keyboard, stylus interactions
- **Navigation Consistency:** All navigation flows match RUXL-NAV spec
- **Accessibility/Field Constraints:** Large-tap, colorblind-safe, screen reader, glare-resistant, glove-friendly
- **Beginner/Expert Modes:** Validate progressive disclosure and advanced controls

---

### 5. Performance & Reliability Testing

- **Load/Stress Tests:** Simulate high event rates, rapid logging, and overlays
- **Battery Impact:** Measure battery drain on mobile/tablet in field mode
- **Memory/CPU Constraints:** Validate performance on low-spec desktop/web devices
- **Network Variability:** Test all flows under low/no/intermittent signal
- **Sync Engine Reliability:** All queued actions sync without loss or duplication

---

### 6. Field Test Protocol

- **Test Routes/Locations:** Predefined real-world routes (urban, rural, remote, elevation, weather)
- **Environmental Conditions:** Test in sun, shade, cold, gloves, wet, and rapid-logging
- **Logging/Reporting:** Deterministic log capture, error reporting, and scenario tagging
- **Replay-Safe Telemetry:** All telemetry idempotent, replay-safe, and complete
- **Founder-Grade Observability:** Full traceability and explainability for all test events

---

### 7. Output Requirements

- Ultra-dense, deterministic, single-pass, regeneration-safe
- Canonical JSON + human-readable spec
- No filler, no drift

---

## Canonical JSON Schema (Excerpt)

```json
{
  "device": "ios|android|tablet|windows|macos|linux|web|headset|wearable|car",
  "scenario": "map_overlay|find_logging|sample_catalog|alert|advisory|offline_capture|delayed_sync|cross_device|performance|battery|network|accessibility|field_mode|beginner|expert",
  "environment": "sun|shade|cold|gloves|wet|motion|low_battery|no_signal|intermittent_signal|rapid_logging",
  "input": "touch|mouse|keyboard|stylus|voice|sensor",
  "state": "active|offline|queued|synced|error|degraded|recovered|complete",
  "result": {
    "success": true,
    "metrics": { "latency_ms": 1234, "battery_drain": 0.05 },
    "anomalies": [{ "type": "overlay", "expected": "string", "actual": "string" }]
  },
  "telemetry": {
    "field_test": true,
    "replay_safe": true,
    "explainability": "string"
  },
  "version": "1.0.0"
}
```

---

**This RUXL-FIELD field test protocol is deterministic, ultra-dense, regeneration-safe, and canonical.**
