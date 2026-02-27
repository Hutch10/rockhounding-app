# Phase 204 — Rockhound Navigation & Interaction Map (RUXL-NAV)

## Deterministic, Regeneration-Safe Navigation & Interaction Specification

---

### 1. Navigation Architecture

- **Global Navigation Model:**
  - Tab bar: Home, Map, Find, Alerts, Profile
  - Stack navigation for drill-down (e.g., Map → Sample Detail)
  - Modal layers for Find Logging, Camera, Settings, Error dialogs
- **Screen Hierarchy & Routing Map:**
  - Home → Map → (Find Logging | Sample Detail)
  - Map → Predictive Overlays → (Sample Detail | Alert Panel)
  - Alerts → Alert Detail
  - Profile → Preferences, History
- **Field-Mode Navigation Rules:**
  - Persistent field-mode toggle; disables non-essential screens, enlarges tap targets, simplifies navigation
- **Offline-First Navigation Behavior:**
  - All navigation actions queue locally if offline; sync and resolve on reconnect
  - Offline indicators on all screens; restricted navigation to offline-safe flows
- **Beginner vs Expert Navigation:**
  - Beginners: minimal tabs, progressive disclosure, guided flows
  - Experts: full tab set, advanced filters, direct access to overlays and settings

---

### 2. Interaction Maps

- **Home → Map → Find Logging → Sample Detail:**
  - Tap Home → Map → tap location → Find Logging modal → submit → Sample Detail
- **Predictive Overlay Interactions:**
  - Toggle overlays on Map; tap overlay for rationale, confidence, and details
- **Locality Alert Interactions:**
  - Tap alert marker → Alert Detail; filter and dismiss alerts
- **Hazard/Weather Advisory Interactions:**
  - Banner tap → Advisory Detail; actionable recommendations
- **Camera/Photo-Capture Flows:**
  - Find Logging → Camera modal → capture/preview/retake → attach to sample
- **Sync/Offline Recovery Flows:**
  - Offline actions queued; sync status visible; manual sync and error recovery dialogs

---

### 3. State & Transition Models

- **Deterministic State Machines:**
  - For each flow: states (idle, active, error, offline, syncing, complete)
  - All transitions logged, auditable, and reproducible
- **Error/Uncertainty Transitions:**
  - All errors surface actionable dialogs; uncertainty states show fallback UI
- **Offline/Online Transitions:**
  - Seamless transition; queued actions replayed on reconnect
- **Field-Mode Activation/Deactivation:**
  - Toggle field-mode; UI adapts instantly (large-tap, reduced nav, glare mode)
- **Intelligence-Surface Transitions:**
  - Overlay/alert/score transitions deterministic; rationale and confidence always accessible

---

### 4. Navigation Components

- **Navigation Bars/Tab Bars/Toolbars:**
  - High-contrast, large-tap, field-mode variants
- **Back/Forward Logic:**
  - Deterministic stack; swipe/gesture and button support
- **Modal Sheets/Dialogs:**
  - For find logging, camera, error, rationale, and sync flows
- **Interaction Zones/Tap Targets:**
  - ≥48px, field-mode spacing, haptic feedback
- **Map Interaction Controls:**
  - Overlay toggles, zoom, recenter, filter, and locate

---

### 5. Accessibility & Field Constraints

- **Large-Tap, Glove-Friendly:**
  - All navigation/tap targets ≥48px; spacing for gloved use
- **Glare-Resistant Surfaces:**
  - High-contrast, sunlight-optimized palettes
- **Reduced-Motion/High-Contrast:**
  - User toggles for reduced motion and high-contrast modes
- **One-Handed Operation:**
  - All flows operable with one hand; bottom-aligned controls
- **Safety-First Constraints:**
  - No destructive actions without confirmation; clear error and fallback states

---

### 6. Implementation Integration

- **React Native/Flutter Scaffolding:**
  - Canonical navigation files, deterministic routing logic
- **TypeScript Interfaces:**
  - All navigation state and events strictly typed; versioned interfaces
- **Map Integration Points:**
  - Overlay, marker, and alert routing hooks
- **Offline-First Guards:**
  - All navigation actions check offline state; queue or restrict as needed
- **Intelligence-Surface Routing:**
  - Deterministic hooks for overlays, alerts, and scores

---

### 7. Output Requirements

- Ultra-dense, deterministic, single-pass, regeneration-safe
- Canonical JSON + human-readable spec
- No filler, no drift

---

## Canonical JSON Schema (Excerpt)

```json
{
  "screen": "Home|Map|FindLogging|SampleDetail|Alerts|AlertDetail|Profile|Preferences|History|Offline|Advisory|Camera|Settings",
  "nav_component": "TabBar|NavBar|Toolbar|Modal|Sheet|Dialog|OverlayToggle|AlertMarker|SyncPanel",
  "state": "idle|active|error|offline|syncing|complete|field_mode|beginner|expert",
  "transition": "push|pop|modal|dismiss|toggle|sync|error|reconnect|activate_field_mode|deactivate_field_mode",
  "interaction": "tap|swipe|long_press|toggle|dismiss|explain|sync|edit|capture|filter|recenter|zoom|locate",
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

**This RUXL-NAV navigation and interaction spec is deterministic, ultra-dense, regeneration-safe, and canonical.**
