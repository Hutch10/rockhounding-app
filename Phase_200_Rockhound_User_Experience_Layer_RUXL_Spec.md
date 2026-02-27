# Phase 200 — Rockhound User Experience Layer (RUXL)

## Deterministic, Regeneration-Safe UX Specification

---

### 1. Core Screens

- **Home Screen (Field Mode):** Minimal, high-contrast dashboard with quick access to map, find logging, and alerts.
- **Map View with Predictive Overlays:** Full-screen map with toggleable overlays (mineral likelihood, hazards, weather, access); live location and compass.
- **Find Logging Flow:** Guided, stepwise flow: location capture → photo → sample details → confidence check → submit; offline-first with local queue.
- **Sample Detail View:** Rich sample metadata, photos, confidence score, intelligence overlays, and edit/redact options.
- **Locality Alerts Panel:** Real-time, location-based alerts; filterable by type (hazard, opportunity, weather).
- **Offline Mode UI:** Persistent offline indicator, local data queue status, and sync-on-reconnect controls.
- **Weather & Hazard Advisory Surfaces:** Contextual banners and map overlays for weather, hazard, and access advisories.
- **Profile & Personalization:** User profile, skill level, preferences, and history; controls for alert sensitivity and overlay density.

---

### 2. Interaction Patterns

- **Logging a Find:** Tap map or quick-action button → guided flow; all steps undoable before sync.
- **Intelligence for Beginners:** Default overlays minimal; progressive disclosure for advanced layers; onboarding tips.
- **Prediction Explanation:** Tap any prediction for rationale, confidence, and data sources.
- **Uncertainty Communication:** All predictions/advisories show confidence bars and uncertainty icons; clear fallback messaging.
- **Offline-First Surfacing:** All actions show offline/queued status; explicit sync controls; no data loss on disconnect.

---

### 3. Visual Language

- **Color System:** High-contrast, glare-resistant palette; colorblind-safe variants for overlays and alerts.
- **Iconography:** Simple, bold icons for field use; consistent metaphors for actions and intelligence types.
- **Typography:** Large, legible sans-serif fonts; scalable for accessibility.
- **Motion & Transitions:** Subtle, deterministic transitions; no distracting animations; haptic feedback for key actions.
- **Accessibility Invariants:** Full screen reader support, large-tap targets, adjustable text size, and color contrast compliance.

---

### 4. Intelligence Presentation

- **Predictive Overlays:** Map layers for mineral likelihood, hazards, weather, and access; toggleable and filterable.
- **Mineral-Likelihood Scoring UI:** Per-location and per-sample scores with confidence bars and rationale popovers.
- **Locality Alerts:** Persistent panel and push notifications; actionable, filterable, and dismissible.
- **Hazard Advisories:** Contextual banners and overlays; severity color-coding and recommended actions.
- **Seasonal Intelligence:** Dynamic overlays and alerts based on season/weather; clear update indicators.
- **Confidence Indicators:** All intelligence outputs show confidence and uncertainty; tap for explanation.

---

### 5. Field Mode Experience

- **Large-Tap Targets:** All interactive elements ≥48px; spacing for gloved use.
- **Glare-Resistant Colors:** Palette optimized for sunlight readability; dark mode for night use.
- **Low-Signal Behavior:** Offline-first UI, local caching, and clear sync status; no blocking on network loss.
- **Battery-Optimized States:** Reduced polling, dark mode, and low-power overlays when battery is low.

---

### 6. Output Requirements

- Ultra-dense, deterministic, single-pass, regeneration-safe.
- Canonical JSON + human-readable spec.
- No filler, no drift.

---

## Canonical JSON Schema (Excerpt)

```json
{
  "screen": "home|map|find_logging|sample_detail|alerts|offline|advisory|profile",
  "element": "button|overlay|alert|banner|input|icon|text|panel",
  "state": "active|offline|queued|synced|error|low_battery|glare_mode|beginner|expert",
  "interaction": "tap|swipe|long_press|toggle|dismiss|explain|sync|edit|redact",
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

**This RUXL UX spec is deterministic, ultra-dense, regeneration-safe, and canonical.**
