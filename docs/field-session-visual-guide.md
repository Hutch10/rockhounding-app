# FieldSession Schema - Visual Guide

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      FIELD_SESSIONS                         │
├─────────────────────────────────────────────────────────────┤
│ PK  id                    UUID                              │
│ FK  user_id               UUID → auth.users                 │
│ FK  location_id           UUID → locations (optional)       │
│     device_id             TEXT                              │
│     state                 ENUM (7 values)                   │
│     sync_status           ENUM (6 values)                   │
│     version               INTEGER                           │
│     title                 TEXT                              │
│     description           TEXT                              │
│     visibility            ENUM (3 values)                   │
│                                                             │
│     start_time            TIMESTAMPTZ                       │
│     end_time              TIMESTAMPTZ                       │
│     duration_seconds      INTEGER                           │
│                                                             │
│     weather_condition     ENUM (10 values)                  │
│     temperature_celsius   NUMERIC                           │
│     field_conditions      TEXT                              │
│                                                             │
│     start_geom            GEOGRAPHY(Point)                  │
│     start_lat/lon         NUMERIC                           │
│     end_geom              GEOGRAPHY(Point)                  │
│     end_lat/lon           NUMERIC                           │
│     track_geom            GEOGRAPHY(LineString)             │
│                                                             │
│     total_specimens       INTEGER (computed)                │
│     unique_materials      INTEGER (computed)                │
│     total_weight_grams    NUMERIC (computed)                │
│     average_quality       NUMERIC (computed)                │
│     materials_found       UUID[] (computed)                 │
│     best_find_id          UUID (optional)                   │
│                                                             │
│     client_created_at     TIMESTAMPTZ                       │
│     client_updated_at     TIMESTAMPTZ                       │
│     server_synced_at      TIMESTAMPTZ                       │
│     conflict_resolution   TEXT                              │
│     created_at            TIMESTAMPTZ                       │
│     updated_at            TIMESTAMPTZ                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ 1:N
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         FIND_LOGS                           │
├─────────────────────────────────────────────────────────────┤
│ PK  id                    UUID                              │
│ FK  session_id            UUID → field_sessions             │
│ FK  user_id               UUID → auth.users                 │
│ FK  material_id           UUID → materials (optional)       │
│     device_id             TEXT                              │
│                                                             │
│     material_name         TEXT                              │
│     quality_rating        INTEGER (1-5)                     │
│     weight_grams          NUMERIC                           │
│     dimension_length_mm   NUMERIC                           │
│     dimension_width_mm    NUMERIC                           │
│     dimension_height_mm   NUMERIC                           │
│     notes                 TEXT                              │
│     photo_paths           TEXT[]                            │
│                                                             │
│     geom                  GEOGRAPHY(Point)                  │
│     lat/lon               NUMERIC                           │
│     found_at              TIMESTAMPTZ                       │
│                                                             │
│     sync_status           ENUM (6 values)                   │
│     client_created_at     TIMESTAMPTZ                       │
│     client_updated_at     TIMESTAMPTZ                       │
│     server_synced_at      TIMESTAMPTZ                       │
│     version               INTEGER                           │
│     created_at            TIMESTAMPTZ                       │
│     updated_at            TIMESTAMPTZ                       │
└─────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────┐
│                     SESSION_EVENTS                          │
├─────────────────────────────────────────────────────────────┤
│ PK  id                    UUID                              │
│ FK  session_id            UUID → field_sessions             │
│ FK  user_id               UUID → auth.users                 │
│     device_id             TEXT                              │
│     event_type            ENUM (12 types)                   │
│     payload               JSONB                             │
│     sequence_number       INTEGER (unique per session)      │
│     sync_status           ENUM (6 values)                   │
│     event_timestamp       TIMESTAMPTZ                       │
│     created_at            TIMESTAMPTZ                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ 1:1
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       SYNC_QUEUE                            │
├─────────────────────────────────────────────────────────────┤
│ PK  id                    UUID                              │
│ FK  event_id              UUID → session_events             │
│     priority              INTEGER                           │
│     retry_count           INTEGER                           │
│     max_retries           INTEGER                           │
│     next_retry_at         TIMESTAMPTZ                       │
│     last_error            TEXT                              │
│     status                ENUM (4 values)                   │
│     created_at            TIMESTAMPTZ                       │
│     updated_at            TIMESTAMPTZ                       │
└─────────────────────────────────────────────────────────────┘
```

## State Machine Diagram

```
                    ┌─────────┐
                    │  DRAFT  │
                    └────┬────┘
                         │
              ┌──────────┴──────────┐
              │                     │
          START                 CANCEL
              │                     │
              ▼                     ▼
         ┌────────┐          ┌───────────┐
         │ ACTIVE │          │ CANCELLED │ (terminal)
         └───┬────┘          └───────────┘
             │
      ┌──────┼──────┐
      │      │      │
    PAUSE   END  CANCEL
      │      │      │
      ▼      │      ▼
  ┌────────┐ │  ┌───────────┐
  │ PAUSED │ │  │ CANCELLED │
  └───┬────┘ │  └───────────┘
      │      │
   RESUME    │
      │      │
      └──────┤
             │
             ▼
      ┌────────────┐
      │ FINALIZING │
      └─────┬──────┘
            │
     ┌──────┴──────┐
     │             │
   SUCCESS      CONFLICT
     │             │
     ▼             ▼
┌───────────┐  ┌──────────┐
│ COMPLETED │  │ CONFLICT │
└───────────┘  └─────┬────┘
  (terminal)         │
                     │
              ┌──────┴──────┐
              │             │
           RESOLVE       CANCEL
              │             │
              ▼             ▼
         ┌───────────┐  ┌───────────┐
         │ COMPLETED │  │ CANCELLED │
         └───────────┘  └───────────┘
```

## Sync Flow Diagram

```
┌─────────────────────┐
│   USER ACTION       │
│  (Create/Update)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   LOCAL STORAGE     │
│   (IndexedDB)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  CREATE EVENT       │
│  (with seq number)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  QUEUE SYNC EVENT   │
│  (with priority)    │
└──────────┬──────────┘
           │
           │ Online?
           ▼
        ┌──────┐
        │  NO  │────────────┐
        └──────┘            │
           │                │
        ┌──────┐            │
        │ YES  │            │
        └──┬───┘            │
           │                │
           ▼                │
┌─────────────────────┐    │
│  SORT BY PRIORITY   │    │
│  (100 → 20)         │    │
└──────────┬──────────┘    │
           │                │
           ▼                │
┌─────────────────────┐    │
│  PROCESS BATCH      │    │
│  (send to server)   │    │
└──────────┬──────────┘    │
           │                │
      ┌────┴────┐           │
      │         │           │
    SUCCESS  FAILURE        │
      │         │           │
      ▼         ▼           │
┌─────────┐ ┌─────────┐    │
│ SYNCED  │ │  RETRY  │────┘
└─────────┘ └─────────┘
                │
                │ Max Retries?
                ▼
            ┌──────┐
            │ YES  │
            └──┬───┘
               │
               ▼
          ┌─────────┐
          │ FAILED  │
          └─────────┘
```

## Event Processing Flow

```
┌──────────────────────────────────────────────────────────┐
│              EVENT SOURCING TIMELINE                     │
└──────────────────────────────────────────────────────────┘

Time ─────────────────────────────────────────────────────▶

Seq 1: session.created
       └─→ Session exists (DRAFT state)

Seq 2: session.started
       └─→ State: DRAFT → ACTIVE
       └─→ Record start_time, start_geom

Seq 3: findlog.added (Quartz)
       └─→ FindLog created
       └─→ Metrics: total_specimens = 1

Seq 4: findlog.added (Amethyst)
       └─→ FindLog created
       └─→ Metrics: total_specimens = 2, unique_materials = 2

Seq 5: findlog.updated (Quartz weight)
       └─→ FindLog updated
       └─→ Metrics: total_weight_grams recalculated

Seq 6: session.paused
       └─→ State: ACTIVE → PAUSED

Seq 7: session.resumed
       └─→ State: PAUSED → ACTIVE

Seq 8: findlog.added (Quartz #2)
       └─→ FindLog created
       └─→ Metrics: total_specimens = 3, unique_materials = 2

Seq 9: session.ended
       └─→ State: ACTIVE → FINALIZING
       └─→ Record end_time, end_geom

Seq 10: metrics.recalculated
        └─→ Final aggregations computed
        └─→ State: FINALIZING → COMPLETED
```

## Aggregation Pipeline

```
┌────────────────────────────────────────────────────────────┐
│                     FIND_LOGS TABLE                        │
├────────────────────────────────────────────────────────────┤
│ FindLog 1: material_id=quartz    quality=4  weight=150g   │
│ FindLog 2: material_id=amethyst  quality=5  weight=200g   │
│ FindLog 3: material_id=quartz    quality=3  weight=100g   │
│ FindLog 4: material_id=calcite   quality=4  weight=75g    │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │   AGGREGATION       │
              │   FUNCTIONS         │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    COUNT(*)      COUNT(DISTINCT    SUM(weight)
      = 4         material_id)        = 525g
                      = 3
         │               │               │
         └───────────────┼───────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│               FIELD_SESSIONS TABLE                         │
├────────────────────────────────────────────────────────────┤
│ total_specimens:    4                                      │
│ unique_materials:   3                                      │
│ total_weight_grams: 525                                    │
│ average_quality:    4.0                                    │
│ materials_found:    [quartz, amethyst, calcite]            │
└────────────────────────────────────────────────────────────┘

Trigger: ON INSERT/UPDATE/DELETE find_logs
  └─→ Automatically recalculates metrics
```

## Conflict Resolution Decision Tree

```
                    ┌─────────────────┐
                    │  SYNC ATTEMPT   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Version Match?  │
                    └────┬────────┬───┘
                         │        │
                      YES │       │ NO
                         │       │
                         ▼       ▼
                  ┌──────────┐ ┌──────────────┐
                  │  SUCCESS │ │   CONFLICT   │
                  └──────────┘ └──────┬───────┘
                                      │
                        ┌─────────────┼─────────────┐
                        │             │             │
                        ▼             ▼             ▼
              ┌─────────────┐ ┌─────────────┐ ┌──────────┐
              │ CLIENT WINS │ │ SERVER WINS │ │  MANUAL  │
              └──────┬──────┘ └──────┬──────┘ └────┬─────┘
                     │               │              │
                     ▼               ▼              ▼
           ┌─────────────────┐ ┌──────────┐ ┌─────────────┐
           │ Force Update    │ │ Discard  │ │ User Decides│
           │ version += 1    │ │ Local    │ │ (UI Dialog) │
           │ Resync          │ │ Adopt    │ │ Merge Data  │
           └─────────────────┘ │ Server   │ └─────────────┘
                               └──────────┘
```

## Priority Queue Visualization

```
┌─────────────────────────────────────────────────────────┐
│                    SYNC QUEUE                           │
├──────────┬────────────────────────────┬─────────────────┤
│ Priority │ Event Type                 │ Status          │
├──────────┼────────────────────────────┼─────────────────┤
│   100    │ session.created            │ ░░░ PENDING     │
│    90    │ session.started            │ ░░░ PENDING     │
│    80    │ findlog.added (quartz)     │ ░░░ PENDING     │
│    80    │ findlog.added (amethyst)   │ ░░░ PENDING     │
│    80    │ findlog.added (calcite)    │ ░░░ PENDING     │
│    70    │ findlog.updated (quartz)   │ ░░░ PENDING     │
│    60    │ session.ended              │ ░░░ PENDING     │
│    50    │ metrics.recalculated       │ ░░░ PENDING     │
└──────────┴────────────────────────────┴─────────────────┘

     ▼ Connection Restored

┌─────────────────────────────────────────────────────────┐
│              PROCESSING (Priority Order)                │
├──────────┬────────────────────────────┬─────────────────┤
│   100    │ session.created            │ ███ PROCESSING  │
│    90    │ session.started            │ ░░░ PENDING     │
│    80    │ findlog.added (quartz)     │ ░░░ PENDING     │
│    80    │ findlog.added (amethyst)   │ ░░░ PENDING     │
│    80    │ findlog.added (calcite)    │ ░░░ PENDING     │
│    70    │ findlog.updated (quartz)   │ ░░░ PENDING     │
│    60    │ session.ended              │ ░░░ PENDING     │
│    50    │ metrics.recalculated       │ ░░░ PENDING     │
└──────────┴────────────────────────────┴─────────────────┘

     ▼ After Processing

┌─────────────────────────────────────────────────────────┐
│                 ALL SYNCED                              │
├──────────┬────────────────────────────┬─────────────────┤
│   100    │ session.created            │ ✓✓✓ COMPLETED   │
│    90    │ session.started            │ ✓✓✓ COMPLETED   │
│    80    │ findlog.added (quartz)     │ ✓✓✓ COMPLETED   │
│    80    │ findlog.added (amethyst)   │ ✓✓✓ COMPLETED   │
│    80    │ findlog.added (calcite)    │ ✓✓✓ COMPLETED   │
│    70    │ findlog.updated (quartz)   │ ✓✓✓ COMPLETED   │
│    60    │ session.ended              │ ✓✓✓ COMPLETED   │
│    50    │ metrics.recalculated       │ ✓✓✓ COMPLETED   │
└──────────┴────────────────────────────┴─────────────────┘
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT SIDE                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  React Components                    │  │
│  │  (SessionForm, FindLogForm, SessionDetail)           │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│                     ▼                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Business Logic Layer                    │  │
│  │  (State Machine, Validation, Aggregation)            │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│                     ▼                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  IndexedDB                           │  │
│  │  - sessions                                          │  │
│  │  - find_logs                                         │  │
│  │  - events                                            │  │
│  │  - sync_queue                                        │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│                     ▼                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Service Worker                          │  │
│  │  - Background Sync                                   │  │
│  │  - Priority Queue Processing                         │  │
│  │  - Retry Logic                                       │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
└─────────────────────┼───────────────────────────────────────┘
                      │
                      │ HTTP/HTTPS
                      │ (When Online)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      SERVER SIDE                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   API Routes                         │  │
│  │  /api/sessions, /api/find-logs, /api/sync/events    │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│                     ▼                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Business Logic                          │  │
│  │  (Validation, State Machine, RLS Enforcement)        │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│                     ▼                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Supabase PostgreSQL                       │  │
│  │  - field_sessions (with PostGIS)                     │  │
│  │  - find_logs (with PostGIS)                          │  │
│  │  - session_events                                    │  │
│  │  - sync_queue                                        │  │
│  │  + Triggers (auto-aggregation)                       │  │
│  │  + RLS Policies (security)                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Memory/Storage Layout

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT STORAGE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  IndexedDB (Offline-First Storage)                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │ sessions Store          (~1KB per session)         │    │
│  │ ├─ session-123                                     │    │
│  │ ├─ session-456                                     │    │
│  │ └─ session-789                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ find_logs Store         (~500B per log)            │    │
│  │ ├─ find-abc (session-123)                          │    │
│  │ ├─ find-def (session-123)                          │    │
│  │ ├─ find-ghi (session-456)                          │    │
│  │ └─ ...                                             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ events Store            (~300B per event)          │    │
│  │ ├─ event-001 (session.created)                     │    │
│  │ ├─ event-002 (session.started)                     │    │
│  │ ├─ event-003 (findlog.added)                       │    │
│  │ └─ ...                                             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ sync_queue Store        (~400B per entry)          │    │
│  │ ├─ queue-001 (priority=100, status=pending)        │    │
│  │ ├─ queue-002 (priority=90, status=pending)         │    │
│  │ └─ ...                                             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  Estimated Total: ~50-100MB for 1000 sessions              │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SERVER STORAGE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PostgreSQL (Persistent Storage)                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ field_sessions Table    (with spatial indexes)     │    │
│  │ ├─ Typical row size: ~2KB                          │    │
│  │ ├─ Spatial indexes: GIST on geom columns           │    │
│  │ └─ B-tree indexes: user_id, state, sync_status     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ find_logs Table         (with spatial indexes)     │    │
│  │ ├─ Typical row size: ~1KB                          │    │
│  │ └─ Foreign key to field_sessions (cascades)        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ session_events Table    (JSONB payloads)           │    │
│  │ ├─ Typical row size: ~500B                         │    │
│  │ └─ Index on (session_id, sequence_number)          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  Estimated: ~100GB for 1M sessions with 5M find logs       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

This visual guide provides:

✅ **Entity relationships** with all fields and foreign keys  
✅ **State machine diagram** showing all valid transitions  
✅ **Sync flow** from offline to online  
✅ **Event processing timeline** with sequence numbers  
✅ **Aggregation pipeline** showing trigger-based computation  
✅ **Conflict resolution** decision tree  
✅ **Priority queue** visualization  
✅ **Data flow architecture** client-to-server  
✅ **Storage layout** with size estimates

Use these diagrams to understand the schema architecture at a glance!
