# Rockhound Unified Interaction Layer Blueprint (UILB)

---

## Navigation Index

1. Unified Interaction Model
2. End-to-End User Flows (Parallel Micro-Phases)
3. Unified Component Architecture
4. Data Flow & Integration Surfaces
5. Performance & Reliability Guarantees
6. Architecture Diagrams (Text-Described)
7. Implementation Blueprint

---

## 1. Unified Interaction Model

- **Cross-Subsystem Event Graph**: All subsystems emit/consume events via a central event bus. Events: FieldSessionEvent, CaptureEvent, FindLogEvent, SpecimenEvent, CollectionEvent, AnalyticsEvent, TelemetryEvent, SyncEvent, SettingsEvent.
- **Deterministic State Propagation**: State transitions are event-driven, strictly ordered by logical timestamp (Lamport clock). Subsystems subscribe to relevant event types; state changes propagate via immutable event payloads.
- **Replay-Safe Event Sourcing**: All state changes append-only to event log; replay reconstructs state deterministically. Idempotent event handlers ensure no duplicate side effects.
- **Offline-First Guarantees**: All events queued locally; subsystems operate on local state. Sync Engine flushes event queue on connectivity, preserving order.
- **Sync Conflict Resolution Matrix**: Per-entity, per-field merge strategies: last-write-wins (default), CRDT for collections, manual merge for FindLog/Specimen, auto-resolve for telemetry/analytics.

---

## 2. End-to-End User Flows (Parallel Micro-Phases)

- **FieldSession**: create → active (event: sessionStarted) → paused (event: sessionPaused) → resumed (event: sessionResumed) → completed (event: sessionCompleted). All transitions emit events, update local and remote state.
- **CaptureSession**: burst capture (event: captureStarted) → preprocessing (event: capturePreprocessed) → classification (event: captureClassified) → linkage (event: captureLinked). Each phase parallelizable, events replay-safe.
- **FindLog**: draft (event: findDrafted) → submitted (event: findSubmitted) → verified (event: findVerified). Drafts stored offline, submitted on sync, verified by reviewer.
- **Specimen Pipeline**: raw capture (event: specimenCaptured) → processed (event: specimenProcessed) → classified (event: specimenClassified) → specimen (event: specimenFinalized). Each step emits events, supports offline.
- **Collection**: add (event: collectionAdded) → categorize (event: collectionCategorized) → annotate (event: collectionAnnotated) → archive (event: collectionArchived). All actions event-driven, CRDT merge for concurrent edits.
- **Dashboard Analytics**: refresh (event: analyticsRefreshRequested) → aggregate (event: analyticsAggregated) → display (event: analyticsDisplayed). Telemetry and FindLog events feed analytics.
- **Telemetry**: emit (event: telemetryEmitted) → aggregate (event: telemetryAggregated) → report (event: telemetryReported). All emissions local-first, batch sync.
- **Sync Engine**: multi-queue (per-entity, per-priority), flushes on connectivity, retries on failure, preserves event order.

---

## 3. Unified Component Architecture

- **Shared UI Primitives**: Button, Input, Modal, Banner, List, Card, Map, Toast, ProgressBar, Icon, Tooltip. All subsystems use shared primitives for consistency.
- **Cross-Subsystem Hooks**: useEventBus, useOfflineQueue, useSyncStatus, useTelemetry, useSettings. Hooks abstract event subscription, state, and sync.
- **Interaction Contracts**: All components accept event handlers, state props, error boundaries. Contracts enforce deterministic state and error propagation.
- **Error Boundaries/Retry**: All async ops wrapped in error boundaries; retry logic with exponential backoff, offline fallback.
- **Accessibility/Outdoor Constraints**: High-contrast, large touch targets, screen reader support, haptic feedback, low-glare color palette.

---

## 4. Data Flow & Integration Surfaces

- **Subsystem Data Contracts**: Typed interfaces for all event payloads; versioned schemas for backward compatibility.
- **Event Routing**: Central event bus routes events to subscribers; supports filtering, transformation, and replay.
- **Background Tasks**: Sync, telemetry, analytics aggregation, cache cleanup run as background jobs, resumable after interruption.
- **Offline Cache Layering**: Multi-tier cache: in-memory → local storage → persistent DB. All writes append to event log.
- **Sync Engine Integration**: All subsystems enqueue events; Sync Engine dequeues, syncs, and updates state.
- **Telemetry Instrumentation**: All user/system actions emit telemetry events; batch aggregation, privacy filters applied before sync.

---

## 5. Performance & Reliability Guarantees

- **Deterministic Ordering**: All events ordered by logical timestamp; event log replay yields identical state.
- **Idempotency**: All event handlers idempotent; duplicate events have no effect.
- **Latency Budgets**: UI: <100ms for local ops, <1s for sync feedback. Sync: <5s for batch flush.
- **Failure Modes/Recovery**: All failures logged, retried with backoff; user notified for unrecoverable errors; local state always recoverable from event log.
- **Observability**: All subsystems emit health, error, and performance metrics; centralized dashboard for monitoring.

---

## 6. Architecture Diagrams (Text-Described)

- **Unified Subsystem Map**: Central event bus connects FieldSession, FindLog, CaptureSession, Specimen Pipeline, Collection, Analytics, Dashboard, Telemetry, Sync Engine, Offline Storage, Settings. All subsystems both emit and consume events.
- **Event Propagation Diagram**: User action → UI primitive → event emitted to bus → relevant subsystems update state → event logged → sync engine queues for remote sync.
- **Offline/Sync Layering Diagram**: UI → in-memory state → local event log → persistent storage → sync queue → remote backend. All layers replayable and recoverable.
- **Cross-Entity Lifecycle Alignment**: FieldSession, CaptureSession, FindLog, Specimen, Collection lifecycles aligned via event phases; transitions trigger cross-entity updates (e.g., new FindLog updates Collection, triggers Analytics refresh).

---

## 7. Implementation Blueprint

- **Directory Structure**:
  - /src
    - /components (UI primitives)
    - /hooks (cross-subsystem logic)
    - /events (event types, bus)
    - /state (event log, reducers)
    - /subsystems (FieldSession, FindLog, etc.)
    - /sync (Sync Engine, offline queue)
    - /telemetry
    - /analytics
    - /settings
    - /utils (shared helpers)
- **Shared Libraries**: event-bus, offline-queue, telemetry, sync-engine, crdt-utils
- **Naming Conventions**: PascalCase for components, camelCase for hooks/vars, UPPER_SNAKE for event types
- **Testing Strategy**: 100% unit test coverage for event handlers, reducers, and sync logic; integration tests for cross-subsystem flows; E2E tests for user flows; chaos tests for offline/sync edge cases
- **Hardening**: Fuzz event payloads, simulate network failures, enforce schema validation, monitor event log integrity

---

**This UILB ensures deterministic, replay-safe, offline-first, and highly observable interactions across all Rockhound subsystems, supporting robust, high-throughput field operations.**
