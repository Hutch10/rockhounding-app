# Phase 132 — Field Intelligence Loop Live Activation (FILLA)

## Deterministic, Regeneration-Safe Activation Specification

---

### 1. Activation Architecture

- **Live Environment Wiring:** Bidirectional, deterministic wiring between Rockhound (field) and Lapidary (cloud) using canonical event bus and API endpoints.
- **State Machines:**
  - Activation, retry, and fallback state machines for both directions.
  - States: `idle` → `activating` → `active` → `retrying` → `fallback` → `error` → `resolved`.
  - All transitions deterministic, logged, and auditable.
- **Offline-First Guarantees:**
  - All activation events queued locally until confirmed by cloud.
  - Deterministic replay on reconnect; no data loss.
- **Canonical Events & Transitions:**
  - All activation events and transitions conform to published canonical JSON schema.

---

### 2. Rockhound Live Integration

- **Real-Time Data Capture & Sync:**
  - Immediate event capture; local queue for offline-first; deterministic sync logic.
- **Predictive Overlay Rendering:**
  - Overlays rendered in real-time based on live intelligence; fallback to last-known-good overlays if degraded.
- **Locality Alert Activation:**
  - Alerts triggered by proximity, context, and live intelligence; deterministic alert logic.
- **Error & Degraded-Mode Handling:**
  - All errors surfaced as actionable notifications; degraded mode with minimal overlays and clear user messaging.

---

### 3. Lapidary Live Integration

- **Ingestion & Scoring Activation:**
  - Real-time ingestion of field events; deterministic scoring and enrichment pipeline.
- **Intelligence-Return Activation:**
  - Alerts, overlays, and advisories generated and returned in real-time; deterministic outbound state machine.
- **Seasonal & Weather Intelligence Hooks:**
  - Live hooks for current/forecasted conditions; overlays and advisories updated dynamically.
- **Personalization Activation:**
  - Intelligence tailored to user profile, history, and context; deterministic personalization logic.

---

### 4. Monitoring & Telemetry

- **Deterministic Telemetry Schema:**
  - All activation, sync, and intelligence events logged to canonical telemetry schema.
- **Activation Health Indicators:**
  - Real-time health metrics for event flow, sync status, and intelligence delivery.
- **Replay-Safe Logs:**
  - All logs idempotent and replay-safe; no duplicate or lost events.
- **Founder-Grade Observability:**
  - Full traceability and explainability for all activation flows.

---

### 5. Governance & Safety

- **Activation Versioning:**
  - All activation logic, schemas, and state machines versioned; backward compatibility enforced.
- **Rollback & Forward-Only Rules:**
  - Deterministic rollback to last-known-good; forward-only for schema evolution.
- **Regeneration Constraints:**
  - All live outputs reproducible from canonical inputs and schema; no hidden state.
- **Safety Rails:**
  - All live intelligence bounded by explainability, risk thresholds, and user override.

---

### 6. Output Requirements

- Ultra-dense, deterministic, single-pass, regeneration-safe.
- Canonical JSON + human-readable spec.
- No filler, no drift.

---

## Canonical JSON Schema (Excerpt)

```json
{
  "activation_event": "activate|retry|fallback|error|resolved",
  "timestamp": "2026-01-25T12:34:56Z",
  "source": "rockhound|lapidary",
  "state": "idle|activating|active|retrying|fallback|error|resolved",
  "payload": {
    "event_type": "find_logged|sample_added|location_tagged|photo_captured|offline_sync",
    "intelligence": {
      "mineral_likelihood": 0.87,
      "alerts": [{ "type": "hazard", "severity": "high" }],
      "advisories": [{ "type": "access", "status": "restricted" }],
      "overlays": [{ "layer": "mineral", "score": 0.87 }]
    },
    "user_id": "string",
    "location": { "lat": 40.123, "lng": -105.456 }
  },
  "telemetry": {
    "health": "ok|degraded|error",
    "explainability": "string"
  },
  "version": "1.0.0"
}
```

---

**This FILLA activation spec is deterministic, ultra-dense, regeneration-safe, and canonical.**
