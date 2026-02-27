# Phase 203 — Rockhound UI Component System (RUXL-COMP)

## Deterministic, Regeneration-Safe UI Component System Specification

---

### 1. Component Architecture

- **Taxonomy:**
  - Primitives: Button, Icon, Input, Card, ListItem, Banner, Tab, Toolbar, Modal, Sheet, Dialog, OfflineIndicator
  - Composites: SampleCard, LocalityAlertCard, HazardCard, WeatherCard, MapOverlay, CameraInterface, SyncPanel
  - Screens: Home, Map, FindLogging, SampleDetail, Alerts, Offline, Advisory, Profile
- **Naming Conventions:** Deterministic, kebab-case for files, PascalCase for components (e.g., SampleCard, map-overlay-layer)
- **Props/States/Events/Transitions:**
  - All props and states typed (TypeScript interfaces)
  - Events: onPress, onChange, onSync, onDismiss, onCapture, onRetry, onExplain
  - State transitions deterministic, logged, and auditable
- **Accessibility Invariants:**
  - Large-tap, screen reader, colorblind-safe, adjustable text, field-mode compliance
- **Field-Mode Constraints:**
  - Glare-resistant, glove-friendly, motion-tolerant, offline-first

---

### 2. Core UI Components

- **Buttons:** Primary, Secondary, Destructive, FieldMode (≥48px, high-contrast, haptic feedback)
- **Cards:** SampleCard, LocalityAlertCard, HazardCard, WeatherCard (info, actions, confidence, rationale)
- **Lists/ListItems:** Deterministic ordering, swipeable actions, offline/queued indicators
- **Modals/Sheets/Dialogs:** For find logging, error, rationale, and confirmation flows
- **Alerts/Banners:** Persistent, dismissible, severity-coded, actionable
- **Tabs/Navigation/Toolbars:** Stack/tab navigation, field-mode toolbars, deep link support
- **Inputs:** Text, Number, Photo, Location (with validation, offline queueing)
- **Camera Interface:** Guided capture, preview, retake, offline storage
- **Offline/Sync Components:** Status indicators, sync controls, error/retry flows

---

### 3. Map & Intelligence Components

- **Predictive Overlay Layers:** Mineral-likelihood, hazard, weather, access overlays; toggleable, filterable
- **Locality Alert Markers:** Real-time, filterable, tap for details
- **Mineral-Likelihood Heatmaps:** Confidence gradients, tap for rationale
- **Hazard/Weather Overlays:** Severity color-coding, actionable banners
- **Confidence/Uncertainty UI:** Bars, icons, rationale popovers
- **Tap Targets/Interaction Zones:** ≥48px, field-mode spacing, haptic feedback

---

### 4. Component Tokens & Design Primitives

- **Color Tokens:** Field-mode, dark mode, glare-resistant, colorblind-safe
- **Typography Tokens:** Large, legible, scalable
- **Spacing/Radius/Elevation/Motion Tokens:** Deterministic, field-tested values
- **Iconography System:** Bold, simple, consistent metaphors
- **Interaction States:** Hover, Press, Disabled, Offline, Synced, Error

---

### 5. Implementation Integration

- **React Native/Flutter Scaffolding:** Canonical component files, deterministic prop/state models
- **TypeScript Interfaces:** All components strictly typed; versioned interfaces
- **Navigation Integration:** Stack/tab navigation, deep link, offline state handling
- **Offline-First Behavior:** All components support offline/queued states, sync, and error recovery
- **Map Rendering Integration:** Deterministic overlay and marker rendering pipeline

---

### 6. Documentation Package

- **Usage Guidelines:** For every component: props, states, events, code samples
- **Interaction Diagrams:** Deterministic diagrams for all flows
- **Accessibility Docs:** Screen reader, color contrast, large-tap, field-mode
- **Canonical JSON Schemas:** For all component state and intelligence payloads

---

### 7. Output Requirements

- Ultra-dense, deterministic, single-pass, regeneration-safe
- Canonical JSON + human-readable spec
- No filler, no drift

---

## Canonical JSON Schema (Excerpt)

```json
{
  "component": "Button|Card|ListItem|Modal|Sheet|Dialog|Banner|Tab|Toolbar|Input|CameraInterface|OfflineIndicator|SampleCard|LocalityAlertCard|HazardCard|WeatherCard|MapOverlay|SyncPanel",
  "screen": "Home|Map|FindLogging|SampleDetail|Alerts|Offline|Advisory|Profile",
  "state": "active|offline|queued|synced|error|low_battery|glare_mode|beginner|expert",
  "props": { "label": "string", "icon": "string", "onPress": "function", "disabled": "boolean" },
  "event": "onPress|onChange|onSync|onDismiss|onCapture|onRetry|onExplain",
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

**This RUXL-COMP component system spec is deterministic, ultra-dense, regeneration-safe, and canonical.**
