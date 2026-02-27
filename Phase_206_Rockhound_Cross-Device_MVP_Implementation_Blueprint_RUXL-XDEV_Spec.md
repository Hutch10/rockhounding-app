# Phase 206 — Rockhound Cross‑Device MVP Implementation Blueprint (RUXL‑XDEV)

## Deterministic, Regeneration-Safe Multi-Platform Implementation Specification

---

### 1. Cross‑Device Architecture

- **Unified Codebase:** React Native core, React Native Web for browsers, Electron for desktop, PWA for universal access.
- **Device-Agnostic Component Model:** All RUXL-COMP components abstracted for platform-specific rendering; single source of truth for logic and state.
- **Responsive Layout System:** Deterministic grid/flex layouts, breakpoints for phone, tablet, desktop, and ultra-wide; orientation-aware.
- **Input-Agnostic Interaction Model:** All interactions mapped to touch, mouse, stylus, keyboard; deterministic event handling.
- **Orientation/Screen-Size Adaptation:** Layout and controls adapt to portrait/landscape, split-screen, and multi-window.

---

### 2. Platform Runtime Definitions

- **Mobile:** iOS/Android via React Native; native modules for camera, location, notifications.
- **Desktop:** Windows/macOS/Linux via Electron (bundled React Native Web); PWA fallback for lightweight installs.
- **Web:** React Native Web for all modern browsers; service worker for offline/PWA.
- **Tablet-Optimized:** Responsive layouts, larger tap targets, split-view support.
- **Future-Device Layer:** Abstraction for headsets, wearables, car dashboards; input/output adapters.

---

### 3. Offline‑First Multi‑Device Data Layer

- **Local Database Schema:** SQLite/AsyncStorage for mobile, IndexedDB for web/PWA, filesystem/LevelDB for Electron.
- **Sync Engine:** Deterministic, versioned sync protocol; local queue, conflict resolution, and merge rules.
- **Conflict Resolution:** Last-write-wins with user review for conflicts; deterministic merge logic.
- **Multi-Device Continuity:** All actions and data portable and recoverable across devices; deterministic replay and recovery.
- **Field-Mode Offline:** Full field-mode support offline on all platforms; local overlays, alerts, and logging.

---

### 4. Intelligence Loop Integration

- **Cross-Platform Intelligence Pipeline:** Canonical API for intelligence-return; deterministic data flow to all devices.
- **Predictive Overlay Rendering:** Platform-optimized overlays; performance-tuned for mobile, desktop, web.
- **Locality Alerts:** Real-time, filterable, actionable on all device types.
- **Hazard/Weather Advisory:** Contextual banners, overlays, and notifications; deterministic update logic.
- **Confidence/Uncertainty Handling:** Consistent UI and logic for all platforms; rationale and confidence always accessible.

---

### 5. UI & Navigation Integration

- **Component Mapping:** All RUXL-COMP components mapped to platform-specific renderers; style tokens adapt to device.
- **Navigation Mapping:** Stack/tab/modal navigation for mobile; sidebar/toolbar for desktop/web; field-mode navigation on all.
- **Accessibility/Field Constraints:** Large-tap, colorblind-safe, screen reader, and field-mode compliance everywhere.

---

### 6. Engineering Roadmap

- **Build Order:**
  1. Core logic, data layer, and RUXL-COMP components
  2. Mobile (iOS/Android) MVP
  3. Web (React Native Web/PWA) MVP
  4. Desktop (Electron) MVP
  5. Tablet and future-device adapters
- **Parallel Workstreams:** Mobile, web, and desktop teams work in parallel; shared codebase and CI/CD.
- **Integration Checkpoints:** Deterministic milestones for cross-platform sync, overlays, and navigation.
- **Prototype-to-MVP Transition:** All prototype flows mapped to MVP; no drift.
- **Field Test Readiness:** All platforms pass offline, sync, and field-mode tests; deterministic recovery from errors.

---

### 7. Output Requirements

- Ultra-dense, deterministic, single-pass, regeneration-safe
- Canonical JSON + human-readable spec
- No filler, no drift

---

## Canonical JSON Schema (Excerpt)

```json
{
  "platform": "ios|android|windows|macos|linux|web|tablet|headset|wearable|car",
  "component": "Button|Card|MapOverlay|Alert|Camera|SyncPanel|Profile|Catalog|OfflineIndicator",
  "runtime": "react_native|react_native_web|electron|pwa|native_module|adapter",
  "input": "touch|mouse|keyboard|stylus|voice|sensor",
  "state": "active|offline|queued|synced|error|low_battery|glare_mode|field_mode|beginner|expert",
  "sync": {
    "status": "pending|synced|conflict|error|recovered",
    "last_sync": "2026-01-25T12:34:56Z"
  },
  "intelligence": {
    "type": "mineral_likelihood|hazard|weather|access|seasonal",
    "score": 0.87,
    "confidence": 0.92,
    "uncertainty": 0.08,
    "rationale": "string"
  },
  "accessibility": {
    "screen_reader": true,
    "large_tap": true,
    "colorblind_safe": true,
    "adjustable_text": true
  },
  "version": "1.0.0"
}
```

---

**This RUXL-XDEV cross-device implementation spec is deterministic, ultra-dense, regeneration-safe, and canonical.**
