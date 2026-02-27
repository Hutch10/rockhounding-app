# Phase 209 — Rockhound Alpha Build Definition (RUXL-ALPHA)

## Deterministic, Regeneration-Safe Alpha Build Specification

---

### 1. Alpha Build Scope

- **Core Screens:** Home, Map, Find Logging, Sample Detail, Profile
- **Intelligence Features:** Basic scoring, overlays, locality alerts
- **Offline-First Data Capture:** Local storage for all actions; no data loss on disconnect
- **Sync Engine:** Manual or automatic sync; deterministic queue and retry
- **Cross-Device Continuity:** Start on one device, continue on another; state and data integrity
- **Field-Mode UI/Constraints:** Glare-resistant, glove-friendly, low-battery optimized

---

### 2. Alpha Feature Set

- **Map Rendering:** Basic predictive overlays; toggleable layers
- **Find Logging:** Camera capture, metadata entry, offline queue
- **Sample Catalog:** View, edit, delete samples; local and synced
- **Locality Alerts:** Basic, real-time, filterable
- **Hazard/Weather Advisories:** Stubbed or basic banners/overlays
- **Profile/Personalization:** Basic user profile, preferences
- **Offline Mode/Delayed Sync:** All actions queue and sync on reconnect

---

### 3. Cross-Device Delivery

- **Mobile:** iOS/Android builds (React Native)
- **Desktop:** Windows/macOS/Linux (Electron/PWA)
- **Web:** React Native Web build
- **Tablet:** Responsive layouts, large-tap targets
- **Future Devices:** Compatibility stubs for headsets, wearables, car dashboards

---

### 4. Engineering Implementation Plan

- **Component Integration:** All UI from RUXL-COMP
- **Navigation Integration:** All flows from RUXL-NAV
- **Prototype-to-Code Mapping:** All screens/flows from RUXL-PROT
- **Data/Sync Integration:** Offline-first and sync logic from RUXL-XDEV
- **Intelligence Loop:** MVP-level integration for overlays, scoring, alerts

---

### 5. Build Pipeline & Tooling

- **CI/CD Pipeline:** Automated builds/tests for all platforms
- **Build Scripts:** Deterministic scripts for mobile, desktop, web
- **Versioning/Release Tagging:** Semantic versioning, cross-platform tags
- **Build Reproducibility:** All builds reproducible from source; rollback/fallback logic

---

### 6. Acceptance Criteria

- **Device Coverage:** Must run on all target device classes
- **Offline Functionality:** Must function offline for extended periods
- **Sync Reliability:** Must sync without data loss
- **Overlay Rendering:** Must render overlays correctly
- **Degraded/Fallback States:** Must handle errors and degraded modes
- **Field-Mode Usability:** Must meet all field-mode constraints

---

### 7. Founder Test Plan

- **Install:** On all personal devices (mobile, desktop, web, tablet)
- **Field Test Routes:** Real-world, multi-environment
- **Cross-Device Continuity:** Start/continue actions across devices
- **Offline/Delayed Sync:** Capture offline, sync later, verify data integrity
- **Intelligence Spot Checks:** Validate scoring, overlays, alerts
- **Observability/Telemetry:** Validate logs, error capture, and dashboards

---

### 8. Output Requirements

- Ultra-dense, deterministic, single-pass, regeneration-safe
- Canonical JSON + human-readable spec
- No filler, no drift

---

## Canonical JSON Schema (Excerpt)

```json
{
  "platform": "ios|android|windows|macos|linux|web|tablet|headset|wearable|car",
  "screen": "home|map|find_logging|sample_detail|profile",
  "feature": "scoring|overlay|locality_alert|offline_capture|sync|catalog|advisory|profile|personalization",
  "state": "active|offline|queued|synced|error|degraded|field_mode|beginner|expert",
  "test": {
    "type": "install|field_route|cross_device|offline_sync|intelligence_check|telemetry",
    "result": "pass|fail|error|recovered"
  },
  "version": "1.0.0"
}
```

---

**This RUXL-ALPHA alpha build spec is deterministic, ultra-dense, regeneration-safe, and canonical.**
