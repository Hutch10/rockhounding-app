# Phase 131 — Field Intelligence Loop Operationalization (FILO)

## Deterministic, Ultra-Dense Operational Blueprint

---

### 1. Implementation Blueprint

#### Rockhound (Field App)

- **Data Capture:** Deterministic event triggers (`find_logged`, `sample_added`, `location_tagged`, `photo_captured`, `offline_sync`).
- **Normalization:** Canonical JSON schema enforcement; UTC timestamps, WGS84 geocoordinates, device/session metadata.
- **Sync Logic:** Local queue for offline-first; idempotent, retryable sync; user-controlled review/redaction before upload.
- **State Machine:**
  - States: `idle` → `capturing` → `pending_sync` → `synced` → `error`/`retry`
  - Transitions deterministic, logged, and auditable.

#### Lapidary (Cloud Intelligence Platform)

- **Ingestion:** Deterministic parsing and validation of canonical JSON events.
- **Scoring:** Apply v1 mineral-likelihood model; assign confidence and rationale.
- **Enrichment:** Add environmental, session, and locality metadata.
- **Intelligence Return:** Generate overlays, alerts, advisories; deterministic state machine for outbound intelligence.
- **State Machine:**
  - States: `received` → `processing` → `enriched` → `intelligence_ready` → `delivered` → `error`/`retry`
  - All transitions logged and reproducible.

#### Offline-First Guarantees

- All field actions cached until confirmed by cloud.
- No data loss on disconnect; deterministic replay on reconnect.

---

### 2. Intelligence Models

#### Mineral-Likelihood Scoring Model v1

- Inputs: location, user history, sample metadata, environmental context.
- Output: score (0–1), rationale, confidence.
- Deterministic: identical input yields identical output.

#### Locality-Based Alert Engine

- Triggers: proximity to recent finds, hazards, or opportunities.
- Output: alert type, location, rationale.
- Deterministic: alert logic versioned and auditable.

#### Hazard & Access Advisory Engine

- Inputs: weather, land access, known hazards.
- Output: advisories with severity, rationale, and recommended action.
- Deterministic: all advisories versioned and explainable.

#### Seasonal & Weather-Linked Intelligence Hooks

- Dynamic overlays and alerts based on current/forecasted conditions.
- Deterministic: all hooks versioned and reproducible.

---

### 3. UX Operationalization

#### Predictive Overlays Rendering Pipeline

- Map overlays, cards, and notifications rendered from canonical intelligence JSON.
- Deterministic rendering order and fallback logic.

#### Interaction Patterns

- Beginners: minimal overlays, progressive disclosure, guided rationale.
- Experts: full overlays, advanced filters, direct feedback.

#### Accessibility Invariants

- All overlays and alerts accessible via screen readers, colorblind-safe palettes, large-text modes.

#### Error & Uncertainty Communication

- All predictions/advisories include rationale, confidence, and uncertainty bounds.
- Errors surfaced as actionable, non-blocking notifications.

---

### 4. Governance & Safety

#### Versioning & Schema Evolution

- All schemas, models, and logic versioned; backward compatibility enforced.

#### Deterministic Regeneration Rules

- All outputs reproducible from canonical inputs and schema; no hidden state.

#### Auditability & Explainability

- All transactions logged with immutable audit trail; all intelligence outputs include rationale.

#### Safety Rails

- All predictions and advisories bounded by explainability and risk thresholds; user override for critical actions.

---

### 5. Output Requirements

- Ultra-dense, deterministic, single-pass, regeneration-safe.
- Canonical JSON + human-readable spec.
- No filler, no drift.

---

## Canonical JSON Schema (Excerpt)

```json
{
  "event": "find_logged|sample_added|location_tagged|photo_captured|offline_sync",
  "timestamp": "2026-01-25T12:34:56Z",
  "location": { "lat": 40.123, "lng": -105.456 },
  "user_id": "string",
  "confidence": 0.92,
  "metadata": {
    "device": "string",
    "session_id": "string",
    "weather": "string",
    "elevation": 1234
  },
  "media": [{ "type": "photo", "ref": "url|base64" }],
  "enriched": true,
  "privacy": {
    "user_control": true,
    "redacted": false
  },
  "intelligence": {
    "mineral_likelihood": 0.87,
    "alerts": [{ "type": "hazard", "severity": "high", "rationale": "Recent weather event" }],
    "advisories": [{ "type": "access", "status": "restricted", "rationale": "Private land" }],
    "overlays": [{ "layer": "mineral", "score": 0.87 }],
    "explainability": {
      "rationale": "Model v1, location, weather, user history",
      "confidence": 0.87,
      "uncertainty": 0.05
    }
  }
}
```

---

**This FILO operational blueprint is deterministic, ultra-dense, regeneration-safe, and canonical.**
