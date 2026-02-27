# Phase 210 — Rockhound Multi‑Device Beta Release Plan (RUXL-BETA)

## Deterministic, Regeneration-Safe Beta Release Specification

---

### 1. Beta Scope & Objectives

- **Feature Completeness:** All Alpha features plus expanded overlays, alerts, catalog, and sync.
- **Cross-Device Stability/Performance:** Deterministic operation on iOS, Android, tablets, desktop, web; crash-free session targets.
- **Intelligence Loop Maturity:** Advanced scoring, confidence, and seasonal/weather intelligence.
- **Offline-First Reliability:** Robust offline capture, delayed sync, and recovery.
- **Field-Mode Usability:** Refined glare, glove, battery, and motion handling.

---

### 2. Feature Expansion

- **Predictive Overlays:** Enhanced accuracy, more layers, dynamic updates.
- **Locality Alerts/Hazard Advisories:** Improved timing, filtering, and severity handling.
- **Sample Catalog:** Bulk edit, advanced search, export, and richer metadata.
- **Profile/Personalization:** Skill levels, preferences, history, and alert controls.
- **Sync Engine:** Background sync, conflict resolution, deterministic merge.
- **Multi-Device Continuity:** Seamless handoff, state migration, and recovery.

---

### 3. Cross-Device Polish

- **Responsive Layouts:** Tablet/desktop refinements, orientation adaptation.
- **Input Optimization:** Touch, mouse, keyboard, stylus support; deterministic event mapping.
- **Performance Tuning:** Map, overlays, and sync optimized for all devices.
- **Accessibility/Field-Mode:** Large-tap, colorblind-safe, screen reader, glare-resistant, glove-friendly.
- **Screen-Size Adaptation:** Breakpoints and scaling for all device classes.

---

### 4. Intelligence Loop Enhancements

- **Scoring Models:** Improved accuracy, versioned, explainable.
- **Confidence/Uncertainty:** Enhanced UI, rationale, and fallback.
- **Seasonal/Weather Intelligence:** Dynamic overlays and alerts.
- **Degraded/Fallback Logic:** More robust error handling and user messaging.
- **Versioning/Rollback:** All intelligence logic versioned, rollback-capable.

---

### 5. Stability & Reliability Requirements

- **Crash-Free Sessions:** ≥99.5% crash-free rate across all devices.
- **Sync Reliability:** ≥99% successful syncs, no data loss.
- **Map Performance:** ≤1s overlay render, ≤2s map load.
- **Battery/Memory:** ≤5%/hr battery drain (field mode), ≤200MB RAM (mobile).
- **Offline Robustness:** All actions recoverable after reconnect; no data loss.

---

### 6. Telemetry & Observability

- **Telemetry Schema:** Beta-level, privacy-safe, replay-safe, versioned.
- **Health Indicators:** Real-time error, latency, sync, and field-mode health.
- **Replay-Safe Logs:** Idempotent, complete, auditable.
- **User Analytics:** Opt-in, privacy-compliant, actionable for triage.
- **Founder Dashboards:** Real-time, cross-device, deterministic event tracing.

---

### 7. Release Gating & Distribution

- **Eligibility:** Internal and select external users; device-class validation required.
- **Release Gates:** Device-specific validation, field test, and telemetry checks.
- **Staged Rollout:** Throttled, sequenced, rollback-capable.
- **Feedback/Triage:** In-app feedback, triage dashboard, deterministic bug tracking.
- **Update/Hotfix:** Weekly cadence, emergency hotfixes, deterministic rollback.

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
  "feature": "overlay|alert|catalog|profile|sync|continuity|intelligence|offline|field_mode|accessibility",
  "state": "active|offline|queued|synced|error|degraded|field_mode|beginner|expert",
  "metric": {
    "crash_free": 0.995,
    "sync_success": 0.99,
    "overlay_render_ms": 1000,
    "map_load_ms": 2000,
    "battery_drain_hr": 0.05,
    "ram_mb": 200
  },
  "release_channel": "beta",
  "feedback": {
    "in_app": true,
    "triage_dashboard": true
  },
  "version": "1.0.0"
}
```

---

**This RUXL-BETA beta release spec is deterministic, ultra-dense, regeneration-safe, and canonical.**
