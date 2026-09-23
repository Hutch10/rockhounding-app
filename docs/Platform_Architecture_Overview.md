# Rockhound Platform End-to-End Architecture Overview

**Version:** 1.0  
**Last Updated:** 2026-01-25

---

## Navigation Index

1. [Executive Summary](#executive-summary)
2. [High-Level Platform Architecture](#high-level-platform-architecture)
3. [Subsystems Overview](#subsystems-overview)
   - [FieldSession](#fieldsession)
   - [FindLog](#findlog)
   - [Camera → Specimen Identification Pipeline](#camera--specimen-identification-pipeline)
   - [CaptureSession](#capturesession)
   - [Collection Management](#collection-management)
   - [Collection Analytics](#collection-analytics)
   - [Dashboard](#dashboard)
   - [Telemetry](#telemetry)
   - [Sync Engine](#sync-engine)
   - [Offline Storage & Caching](#offline-storage--caching)
   - [Settings & Personalization](#settings--personalization)
   - [Shared/Core Libraries](#sharedcore-libraries)
4. [Data Flow & Integration Patterns](#data-flow--integration-patterns)
5. [Event Sourcing, Determinism & Auditability](#event-sourcing-determinism--auditability)
6. [Day in the Life of a FieldSession](#day-in-the-life-of-a-fieldsession)
7. [Best Practices & Platform Guarantees](#best-practices--platform-guarantees)

---

## 1. Executive Summary

Rockhound is a mobile-first, offline-capable platform for geological fieldwork, specimen collection, and analytics. It integrates robust event sourcing, deterministic workflows, and auditability across all major subsystems, enabling users to plan field sessions, log finds, capture specimens, sync data, and analyze collections with confidence and reliability.

---

## 2. High-Level Platform Architecture

**Diagram (described):**

- At the center: **FieldSession** (user's active trip/session)
- Surrounding: **FindLog**, **CaptureSession**, **Camera → Specimen Pipeline**, **Collection Management**, **Dashboard**, **Telemetry**, **Sync Engine**, **Offline Storage**, **Settings**, **Shared Libraries**
- Shared domain primitive for geology + access + observations: **[Universal Geological Evidence Schema (UGES) R1](UNIVERSAL_GEOLOGICAL_EVIDENCE_SCHEMA.md)** — not yet a persistence or MCP layer
- Source/layer catalog: **[Geological Layer Registry R1](GEOLOGICAL_LAYER_REGISTRY.md)** — persistence-free metadata; does not fetch, render, or authorize collection
- Discoverable resource index: **[Resource Catalog R1](RESOURCE_CATALOG.md)** — datasets/APIs/documents as metadata only; adapters are a later phase
- Source admission policy: **[Source Governance Contract R1](SOURCE_GOVERNANCE_CONTRACT.md)** — whether a cataloged source may be used; not evidence, not permission, not adapters
- Architectural contract catalog: **[Building Block Registry R1](BUILDING_BLOCK_REGISTRY.md)** — identity, version, lifecycle, and compatibility of domain contracts; not scientific, legal, or permission truth
- Field-science primitives: **[Observation / Sample Model R1](OBSERVATION_SAMPLE_MODEL.md)** — observations, sampling events, and specimens; not assertions, not permission, not adapters
- Lineage kernel: **[Provenance Activity Kernel R1](PROVENANCE_ACTIVITY_KERNEL.md)** — entities, activities, and agents; not truth, not authority, not adapters
- Temporal context: **[Truth Clock / Evidence Availability R1](TRUTH_CLOCK_AVAILABILITY.md)** — when evidence was true, published, retrieved, and whether it is fit for a use; not certainty and not permission
- Translation boundary: **[Source Adapter Contract R1](SOURCE_ADAPTER_CONTRACT.md)** — how supplied source material becomes candidate entities; not a live adapter, not authority, and not evidence admission
- Holding state: **[Evidence Quarantine R1](EVIDENCE_QUARANTINE.md)** — preserves material that cannot safely proceed; not a rejection bin, not admission, and not verification
- First executable translation: **[Offline Fixture Adapters R1](OFFLINE_FIXTURE_ADAPTERS.md)** — deterministic local fixtures through the closed contracts; not a live provider and not evidence admission
- Purpose gate: **[Evidence Admission Engine R1](EVIDENCE_ADMISSION_ENGINE.md)** — whether candidate evidence may support a specified purpose; not a field decision and not a live provider
- Decision evidence: **[Decision Evidence Contracts R1](DECISION_EVIDENCE_CONTRACTS.md)** — which admitted evidence a decision class requires; completeness is not the decision outcome
- Decision context: **[Decision Snapshot R1](DECISION_SNAPSHOT.md)** — immutable record of the contract, receipts, gaps, and time used to prepare an evaluation; not an outcome
- Decision outcome: **[Decision Evaluator R1](DECISION_EVALUATOR.md)** — deterministic outcome from a valid snapshot and an exact synthetic rule set
- Decision receipt: **[Decision Receipt R1](DECISION_RECEIPT.md)** — immutable record of that outcome, pinned to the snapshot hash, rule set, and evaluator version
- Live-provider gate: **[First Live Provider Readiness Gate](FIRST_LIVE_PROVIDER_READINESS_GATE.md)** — audit of whether one read-only source may later enter that same chain; it does not fetch, select a provider, or grant production authority
- Live read controls: **[Live Read Path Controls R1](LIVE_READ_PATH_CONTROLS.md)** and **[Disclosure Governance R1](DISCLOSURE_GOVERNANCE.md)** — operation authorization and pre-materialization spatial release; neither implies the other
- First provider candidate: **[First Live Provider Selection R1](FIRST_LIVE_PROVIDER_SELECTION.md)** — USGS SGMC geologic map units for geological context only; not a live integration and not a production decision
- Arrows indicate data flow: FieldSession orchestrates, FindLog and CaptureSession feed data, Camera → Specimen Pipeline classifies, Collection Management aggregates, Dashboard visualizes, Telemetry tracks, Sync Engine synchronizes, Offline Storage caches, Settings personalizes, Shared Libraries provide core logic

---

## 3. Subsystems Overview

### FieldSession

- **Responsibilities:** Orchestrates field trips, manages session lifecycle, links all finds and captures
- **Key Entities:** FieldSession, SessionMetadata, Participants
- **Primary Workflows:** Create session, start/stop, add notes, link finds/captures
- **Integration Points:** FindLog, CaptureSession, Sync Engine, Dashboard
- **Offline/Sync:** Fully offline-first, syncs on reconnect, event-sourced

### FindLog

- **Responsibilities:** Logs individual finds/specimens, tracks identification, quality, location, photos
- **Key Entities:** FindLog, MaterialIdentification, QualityAssessment, SpecimenLink
- **Primary Workflows:** Create/edit/delete find, rate quality, add photos, link to specimens
- **Integration Points:** FieldSession, CaptureSession, Camera → Specimen Pipeline, Sync Engine, Telemetry
- **Offline/Sync:** Debounced offline persistence, sync queue, event sourcing

### Camera → Specimen Identification Pipeline

- **Responsibilities:** Processes captured media, classifies specimens, links to FindLogs
- **Key Entities:** RawCapture, ProcessedCapture, ClassificationResult
- **Primary Workflows:** Capture media, preprocess, classify, link results
- **Integration Points:** CaptureSession, FindLog, Telemetry, Sync Engine
- **Offline/Sync:** Local preprocessing, queued classification, syncs results

### CaptureSession

- **Responsibilities:** Manages photo/video capture sessions, multi-photo bursts, device/GPS metadata
- **Key Entities:** CaptureSession, CaptureMedia, DeviceMetadata
- **Primary Workflows:** Start session, capture media, review, link to FieldSession/FindLog
- **Integration Points:** FieldSession, Camera → Specimen Pipeline, Offline Storage, Sync Engine, Telemetry
- **Offline/Sync:** Debounced writes, background sync, event sourcing

### Collection Management

- **Responsibilities:** Organizes specimens, manages collections, supports curation and tagging
- **Key Entities:** Collection, Specimen, Tag, CurationHistory
- **Primary Workflows:** Create/edit collections, add/remove specimens, tag, curate
- **Integration Points:** FindLog, Dashboard, Sync Engine
- **Offline/Sync:** Local cache, sync queue, event sourcing

### Collection Analytics

- **Responsibilities:** Aggregates and analyzes collection data, computes metrics, trends
- **Key Entities:** AnalyticsReport, Metric, Trend
- **Primary Workflows:** Generate reports, visualize metrics, track trends
- **Integration Points:** Dashboard, Telemetry, Sync Engine
- **Offline/Sync:** Materialized views, cached analytics, syncs on demand

### Dashboard

- **Responsibilities:** Central UI for reviewing sessions, finds, captures, analytics
- **Key Entities:** DashboardView, SessionSummary, FindSummary, AnalyticsWidget
- **Primary Workflows:** View session timeline, review finds/captures, analyze metrics
- **Integration Points:** All subsystems, Telemetry
- **Offline/Sync:** Reads from local cache, syncs for latest data

### Telemetry

- **Responsibilities:** Tracks user actions, system events, performance metrics
- **Key Entities:** TelemetryEvent, UserMetric
- **Primary Workflows:** Emit/record events, aggregate metrics, analyze usage
- **Integration Points:** All subsystems, Dashboard, Analytics
- **Offline/Sync:** Local event queue, syncs to server, event sourcing

### Sync Engine

- **Responsibilities:** Manages data synchronization, conflict resolution, batching
- **Key Entities:** SyncQueue, SyncEvent, ConflictRecord
- **Primary Workflows:** Enqueue events, batch sync, resolve conflicts
- **Integration Points:** All subsystems, Offline Storage
- **Offline/Sync:** Queues offline, syncs on reconnect, deterministic replay

### Offline Storage & Caching

- **Responsibilities:** Caches all entities for offline use, supports debounced writes
- **Key Entities:** StorageEntry, CacheIndex
- **Primary Workflows:** Read/write cache, invalidate, refresh
- **Integration Points:** All subsystems, Sync Engine
- **Offline/Sync:** IndexedDB/localStorage, replay-safe

### Settings & Personalization

- **Responsibilities:** Manages user preferences, session settings, personalization
- **Key Entities:** UserSettings, PersonalizationProfile
- **Primary Workflows:** Update settings, apply preferences
- **Integration Points:** Dashboard, FieldSession, Offline Storage
- **Offline/Sync:** Local cache, syncs on demand

### Shared/Core Libraries

- **Responsibilities:** Provide type safety, validation, utility functions, event sourcing logic
- **Key Entities:** TypeScript interfaces, Zod schemas, UtilityFunctions
- **Primary Workflows:** Validate entities, enforce state machines, emit events
- **Integration Points:** All subsystems
- **Offline/Sync:** Used everywhere, ensures determinism

---

## 4. Data Flow & Integration Patterns

**Described Diagram:**

- User interacts with Dashboard/FieldSession
- Actions flow to FindLog and CaptureSession
- Captures processed by Camera → Specimen Pipeline
- Results linked to FindLog and Collection Management
- All mutations emit events (event sourcing)
- Events cached offline, queued for Sync Engine
- Telemetry tracks all actions
- Analytics aggregates data for Dashboard

---

## 5. Event Sourcing, Determinism & Auditability

- All subsystems emit events for every mutation
- Events are idempotent and replay-safe
- Event logs (capture_events, find_log_events, etc.) provide full audit trail
- Sync Engine replays events deterministically on reconnect
- Database triggers ensure auditability and versioning
- Materialized views and stored procedures support analytics and reporting

---

## 6. Day in the Life of a FieldSession

**Narrative:**

1. **Planning:** User creates a FieldSession, sets location, adds participants, reviews settings
2. **Starting:** User begins session, app caches session offline, syncs metadata
3. **Logging Finds:** User discovers specimens, logs FindLogs with material identification, quality, GPS, photos
4. **Capturing Specimens:** User starts CaptureSession, takes multi-photo bursts, device/GPS metadata stamped
5. **Classification:** Camera → Specimen Pipeline processes captures, classifies specimens, links results to FindLogs
6. **Reviewing:** User reviews session timeline, finds, captures in Dashboard; analytics widgets show metrics
7. **Syncing:** App queues all events for Sync Engine; on reconnect, events are synced, conflicts resolved deterministically
8. **Analyzing:** Collection Analytics aggregates data, trends visualized in Dashboard
9. **Personalizing:** User updates settings, preferences applied to session and dashboard views
10. **Auditing:** All actions are logged, event sourcing enables full replay and auditability

---

## 7. Best Practices & Platform Guarantees

- All subsystems are offline-first, sync on reconnect
- Event sourcing ensures deterministic, replay-safe workflows
- Auditability enforced via event logs and triggers
- Type safety and validation via shared/core libraries
- Integration points are well-defined and decoupled
- Materialized views and stored procedures optimize analytics
- Telemetry and analytics provide actionable insights
- User privacy and data isolation via RLS policies

---

---

## 8. Post-V1 Planning

For UX, operational patterns, and feature scopes planned after the V1.0 milestone, refer to:

- [Post-V1 Location Discovery Patterns](product/POST_V1_LOCATION_DISCOVERY_PATTERNS.md)
- [Post-V1 Candidate Register](product/POST_V1_CANDIDATE_REGISTER.md)

---

**End of Document**
