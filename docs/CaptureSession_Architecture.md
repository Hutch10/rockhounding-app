# Rockhound CaptureSession Subsystem Architecture Documentation

**Version:** 1.0  
**Last Updated:** 2026-01-25

---

## Navigation Index

1. [Subsystem Overview](#subsystem-overview)
2. [Data Flow Diagrams](#data-flow-diagrams)
3. [Lifecycle State Machine](#lifecycle-state-machine)
4. [Event Sourcing Model](#event-sourcing-model)
5. [Offline-First Persistence Strategy](#offline-first-persistence-strategy)
6. [Sync Engine Integration](#sync-engine-integration)
7. [Telemetry Instrumentation](#telemetry-instrumentation)
8. [Preprocessing & Classification Pipeline](#preprocessing--classification-pipeline)
9. [Relationships: FieldSession & FindLog](#relationships-fieldsession--findlog)
10. [React Hooks & UI Components](#react-hooks--ui-components)
11. [Integration Helpers](#integration-helpers)
12. [Database Schema](#database-schema)
13. [Usage Examples](#usage-examples)
14. [Best Practices](#best-practices)
15. [Performance Considerations](#performance-considerations)
16. [Troubleshooting Guide](#troubleshooting-guide)

---

## 1. Subsystem Overview

The **CaptureSession** subsystem manages all photo and video capture sessions in the field, supporting multi-photo bursts, GPS stamping, device metadata, lighting conditions, preprocessing status, classification linkage, and integration with the Camera → Specimen Identification Pipeline. It is designed for mobile-first workflows, offline-first operation, and robust event sourcing.

**Key Features:**

- Multi-media capture (photo, video, burst, panorama, timelapse)
- GPS and device metadata stamping
- Lighting and preprocessing status tracking
- Classification pipeline integration
- Event sourcing for all mutations
- Offline-first with sync queueing
- Telemetry instrumentation
- Relationships to FieldSession and FindLog

---

## 2. Data Flow Diagrams

### High-Level Data Flow

```
User Action
   ↓
Camera UI Components
   ↓
CaptureSessionManager
   ↓
Offline Storage (debounced)
   ↓
Sync Engine (queued)
   ↓
Database (capture_sessions, raw_captures, ...)
   ↓
Preprocessing/Classification Pipeline
   ↓
Telemetry
   ↓
Dashboard/Analytics
```

### Event Sourcing Flow

```
Mutation (create/update/delete)
   ↓
CaptureSessionManager.emitChange()
   ↓
Event listeners (UI, Telemetry, Sync)
   ↓
capture_events table (audit/replay)
```

---

## 3. Lifecycle State Machine

### State Diagram

```
DRAFT → IN_PROGRESS → COMPLETED → SYNCED → ARCHIVED/DELETED
```

| State       | Description          | Allowed Transitions       |
| ----------- | -------------------- | ------------------------- |
| DRAFT       | Initial, not started | IN_PROGRESS, DELETED      |
| IN_PROGRESS | Capturing media      | COMPLETED, DRAFT, DELETED |
| COMPLETED   | All captures done    | SYNCED, ARCHIVED, DELETED |
| SYNCED      | Synced to server     | ARCHIVED, DELETED         |
| ARCHIVED    | Inactive, retained   | SYNCED, DELETED           |
| DELETED     | Soft-deleted         | (terminal)                |

---

## 4. Event Sourcing Model

- All mutations emit a **CaptureSessionChangeEvent**
- Events are replay-safe and idempotent
- Events are logged in the **capture_events** table
- Event types: created, updated, deleted, stateChanged, mediaAdded, mediaRemoved, classified
- Event listeners update UI, trigger telemetry, and enqueue sync

---

## 5. Offline-First Persistence Strategy

- All sessions and media are cached in **Offline Storage** (IndexedDB/localStorage)
- Debounced writes (default: 500ms) prevent excessive I/O
- Sync Engine queues mutations for background sync
- On reconnect, queued events are synced to server
- Conflict resolution is deterministic and replay-safe

---

## 6. Sync Engine Integration

- All CRUD and media mutations are enqueued for sync
- Sync status tracked via **sync_status** field
- Integration helpers: enqueueCaptureSessionSync, markCaptureSessionSynced
- Sync Engine processes events in priority order
- Background refresh and optimistic updates supported

---

## 7. Telemetry Instrumentation

- All key events emit telemetry signals
- Instrumented via **emitCaptureSessionTelemetry** helper
- Events: session_created, session_updated, session_deleted, media_added, media_removed, state_changed, classified
- Telemetry data includes sessionId, userId, type, state, mediaCount, and extra context
- Data used for analytics, dashboard, and user behavior tracking

---

## 8. Preprocessing & Classification Pipeline

- Media preprocessing status tracked per capture
- Classification pipeline links media to specimen IDs
- Integration via **runCameraSpecimenPipeline** helper
- Status resolution via **resolvePreprocessingStatus** and **resolveClassificationStatus**
- Results stored in **processed_captures** and **classification_results** tables

---

## 9. Relationships: FieldSession & FindLog

- Each CaptureSession is linked to a **FieldSession** via field_session_id
- Classified media can create or link to **FindLog** entries
- Referential integrity maintained via **maintainReferentialIntegrity** helper
- Cross-entity invalidation supported for React Query

---

## 10. React Hooks & UI Components

### Hooks

- useCaptureSessionProviderReady
- useCaptureSession
- useCaptureSessionList
- useCaptureSessionsByGPS
- useCaptureSessionsByPreprocessing
- useClassifiedCaptureSessions
- useCaptureSessionTimeline
- useCreateCaptureSession
- useUpdateCaptureSession
- useDeleteCaptureSession
- useAddMediaToSession
- useRemoveMediaFromSession
- useTransitionCaptureSessionState
- useRunClassificationPipeline
- useLinkCaptureSessionToFindLog

### UI Components

- CaptureButton (accessible, mobile-first)
- BurstModeToggle
- MetadataPanel
- CaptureReviewCard
- CaptureSessionTimeline
- CaptureSessionErrorBoundary

---

## 11. Integration Helpers

- cacheCaptureSessionOffline
- loadCaptureSessionOffline
- removeCaptureSessionOffline
- enqueueCaptureSessionSync
- markCaptureSessionSynced
- emitCaptureSessionTelemetry
- runCameraSpecimenPipeline
- linkCaptureSessionToFieldSession
- createFindLogFromCaptureSession
- resolvePreprocessingStatus
- resolveClassificationStatus
- maintainReferentialIntegrity
- optimisticUpdateCaptureSession
- backgroundRefreshCaptureSessions
- crossEntityInvalidation

---

## 12. Database Schema

### Tables

- capture_sessions
- raw_captures
- processed_captures
- classification_results
- capture_events

### Indexes

- 30+ indexes for user, session, type, state, sync, location, media, classification, event
- PostGIS GIST indexes for geospatial queries

### RLS Policies

- User isolation for all tables

### Triggers

- update_capture_sessions_timestamp (updated_at)
- update_media_count_trigger (media_count)
- update_preprocessing_status_trigger
- log_capture_event_trigger (event sourcing)

### Materialized Views

- capture_session_complete
- preprocessing_metrics
- classification_metrics

### Stored Procedures

- get_capture_sessions_by_field_session
- get_capture_sessions_by_date_range
- get_capture_sessions_by_gps
- get_capture_sessions_by_status

---

## 13. Usage Examples

### Creating a CaptureSession

```typescript
const { mutate: createSession } = useCreateCaptureSession();
createSession({
  userId,
  fieldSessionId,
  type: 'BURST',
  location: { latitude, longitude, ... },
  device: { deviceModel, cameraType, ... },
  opts: { isPrivate: true, notes: 'Field test' }
});
```

### Adding Media (Multi-photo Burst)

```typescript
const { mutate: addMedia } = useAddMediaToSession();
addMedia({ sessionId, media: { ... } });
```

### Running Classification Pipeline

```typescript
const { mutate: classify } = useRunClassificationPipeline();
classify(sessionId);
```

### Linking to FindLog

```typescript
const { mutate: linkToFindLog } = useLinkCaptureSessionToFindLog();
linkToFindLog({ sessionId, findLogId });
```

---

## 14. Best Practices

- Always use CaptureSessionProvider for context
- Use optimistic updates for fast UI feedback
- Debounce writes to offline storage
- Ensure all mutations are idempotent and replay-safe
- Use React Query for caching and invalidation
- Maintain referential integrity between sessions, media, and FindLogs
- Instrument telemetry for all key events
- Use materialized views for dashboard metrics
- Validate all input with Zod schemas

---

## 15. Performance Considerations

- Use indexed queries for all user/session lookups
- PostGIS GIST indexes for fast GPS queries
- Debounced persistence reduces I/O load
- Materialized views cache expensive aggregations
- Sync Engine batches and prioritizes events
- React Query caching minimizes redundant fetches

---

## 16. Troubleshooting Guide

**Problem:** Session not appearing in list

- Check offline cache and sync status
- Ensure RLS policies allow user access
- Verify React Query keys and invalidation

**Problem:** Media not classified

- Check preprocessing status
- Ensure pipeline integration is configured
- Review classification_results table

**Problem:** Telemetry not recorded

- Verify telemetry integration
- Check event emission in manager and helpers

**Problem:** Cross-entity updates not reflected

- Use crossEntityInvalidation helper
- Ensure background refresh is triggered

**Problem:** Sync conflicts

- Review sync queue and conflict resolution logic
- Ensure idempotent operations in manager and helpers

---

## Summary

The CaptureSession subsystem provides robust, mobile-first management of field media, with full offline-first persistence, event sourcing, sync integration, telemetry, and classification pipeline linkage. All components are designed for performance, reliability, and extensibility in production environments.
