# Phase 205 — Rockhound Interactive Prototype Specification (RUXL-PROT)

## Deterministic, Regeneration-Safe Interactive Prototype Specification

---

### 1. Prototype Architecture

- **Structure:**
  - Frames: Home, Map, Find Logging, Sample Detail, Alerts, Advisory, Offline, Profile
  - Flows: Linear and branching flows for all user journeys
  - Hotspots: Deterministic tap/gesture zones for all interactive elements
- **Screen Linking Rules:**
  - All screens linked via deterministic navigation map (RUXL-NAV)
  - Modal and sheet transitions follow stack/modal logic; overlays and dialogs always dismissible
- **Modal/Sheet Behavior:**
  - Modals: Find Logging, Camera, Error, Rationale, Sync
  - Sheets: Alert details, advisory details, sample edit
- **Field-Mode Constraints:**
  - Large-tap, glare-resistant, offline-first, battery-optimized, one-handed operation
- **Offline-First Prototype Behavior:**
  - All flows operable offline; offline indicators and sync transitions present in all relevant screens

---

### 2. Screen-by-Screen Prototype Definition

- **Home Screen:**
  - Quick access to Map, Find Logging, Alerts, Profile
  - Field-mode toggle, offline indicator, battery status
- **Map View:**
  - Predictive overlays toggle, tap for rationale/confidence, zoom/recenter, alert markers
- **Find Logging Flow:**
  - Camera modal → photo capture/preview/retake → metadata entry (location, notes, confidence) → save (offline queue if needed)
- **Sample Detail View:**
  - Photo, metadata, overlays, edit/redact, rationale popover
- **Locality Alert Interactions:**
  - Tap marker → alert detail sheet; filter/dismiss alerts
- **Hazard/Weather Advisory Interactions:**
  - Banner tap → advisory detail sheet; actionable recommendations
- **Offline Mode Transitions:**
  - All actions queue locally; sync status and manual sync controls
- **Profile/Personalization Flows:**
  - Edit profile, adjust alert/overlay preferences, view history

---

### 3. Interaction Models

- **Gestures:** Tap, long-press, drag, swipe, map pinch/zoom
- **Overlay Activation/Dismissal:** Toggle overlays, tap for details, dismiss overlays with swipe or tap-out
- **Confidence/Uncertainty Interactions:** Tap confidence bar for rationale, uncertainty icon for explanation
- **Beginner/Expert Modes:** Progressive disclosure for beginners, advanced controls for experts
- **Error/Degraded-Mode:** Actionable error dialogs, fallback overlays, clear user messaging

---

### 4. Intelligence Surface Prototyping

- **Predictive Overlay Animations:** Deterministic fade/slide for overlay transitions; no distracting motion
- **Locality Alert Timing/Appearance:** Real-time marker appearance, persistent alert panel, dismissible alerts
- **Hazard Advisory Surfacing:** Contextual banners, severity color-coding, tap for details
- **Seasonal Intelligence Transitions:** Dynamic overlays and alerts based on season/weather; update indicators
- **Confidence Indicator Behavior:** Bar/indicator always visible; tap for rationale and uncertainty

---

### 5. Field Mode Prototype Behavior

- **Glare-Resistant Visuals:** High-contrast, sunlight-optimized palette; dark mode for night
- **Large-Tap Interactions:** All tap targets ≥48px; spacing for gloves
- **Low/No-Signal Flows:** Offline indicators, local queue, sync-on-reconnect
- **Battery-Optimized States:** Reduced polling, dark mode, low-power overlays
- **Safety-First Constraints:** No destructive actions without confirmation; clear fallback states

---

### 6. Prototype Implementation Integration

- **Figma-Ready Frames:** All screens and flows described for direct Figma import
- **Component Mapping:** All UI mapped to RUXL-COMP components
- **Navigation Mapping:** All flows mapped to RUXL-NAV navigation structure
- **Interaction Logic Mapping:** All interactions mapped to RUXL-OPS logic
- **Offline-First Logic Mapping:** All offline/queue/sync flows mapped to RUXL patterns

---

### 7. Output Requirements

- Ultra-dense, deterministic, single-pass, regeneration-safe
- Canonical JSON + human-readable spec
- No filler, no drift

---

## Canonical JSON Schema (Excerpt)

```json
{
  "frame": "Home|Map|FindLogging|SampleDetail|Alerts|Advisory|Offline|Profile|Camera|Modal|Sheet",
  "hotspot": "button|overlay|alert_marker|tab|toolbar|input|photo|sync|toggle|panel",
  "interaction": "tap|long_press|drag|swipe|pinch|zoom|toggle|dismiss|explain|sync|edit|capture|filter|recenter",
  "state": "active|offline|queued|synced|error|low_battery|glare_mode|beginner|expert",
  "transition": "push|pop|modal|dismiss|toggle|sync|error|reconnect|activate_field_mode|deactivate_field_mode",
  "intelligence": {
    "type": "mineral_likelihood|hazard|weather|access|seasonal",
    "score": 0.87,
    "confidence": 0.92,
    "uncertainty": 0.08,
    "rationale": "string"
  },
  "accessibility": {
    "large_tap": true,
    "glare_resistant": true,
    "reduced_motion": true,
    "high_contrast": true,
    "one_handed": true
  },
  "version": "1.0.0"
}
```

---

**This RUXL-PROT interactive prototype spec is deterministic, ultra-dense, regeneration-safe, and canonical.**
