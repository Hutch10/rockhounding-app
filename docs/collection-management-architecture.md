# Collection Management Architecture

## Overview

The Collection Management subsystem handles the complete lifecycle of specimens from field collection through permanent storage and organization. It provides deterministic state transitions, hierarchical storage, flexible tagging, themed collections, and seamless integration with field operations and lapidary projects.

## Table of Contents

1. [Complete Lifecycle Flow](#complete-lifecycle-flow)
2. [Core Entities](#core-entities)
3. [State Machine](#state-machine)
4. [Storage Management](#storage-management)
5. [Organization Systems](#organization-systems)
6. [Integration with FindLog](#integration-with-findlog)
7. [Integration with Lapidary Studio](#integration-with-lapidary-studio)
8. [Event Sourcing](#event-sourcing)
9. [Offline Sync](#offline-sync)
10. [Usage Examples](#usage-examples)

---

## Complete Lifecycle Flow

### End-to-End Journey

```
FIELD → TRANSIT → HOME → COLLECTION → DISPLAY/STUDIO

1. FIELD EXPEDITION
   ├─ FieldSession active
   ├─ FindLog created (specimen found)
   ├─ Photos, GPS, notes captured
   └─ State: Field data

2. TRANSITION TO COLLECTION
   ├─ Specimen created from FindLog
   ├─ Provenance preserved (find_log_id link)
   ├─ State: FIELD_COLLECTED
   └─ Sync event queued (priority 90)

3. TRANSIT & RECEIVING
   ├─ State: FIELD_COLLECTED → IN_TRANSIT
   ├─ Specimen traveling home
   ├─ State: IN_TRANSIT → RECEIVED
   └─ Arrived home, ready for processing

4. PROCESSING
   ├─ State: RECEIVED → CLEANING
   ├─ Clean, trim, prepare specimen
   ├─ State: CLEANING → IDENTIFYING
   ├─ Identify material, document properties
   ├─ State: IDENTIFYING → CATALOGING
   └─ Assign catalog number, photograph

5. STORAGE
   ├─ State: CATALOGING → STORED
   ├─ Assign to StorageLocation
   ├─ Add to CollectionGroups
   ├─ Apply Tags
   └─ State: Permanent storage

6. UTILIZATION
   ├─ Display: STORED → ON_DISPLAY
   ├─ Loan: STORED → ON_LOAN
   ├─ Lapidary: STORED → IN_STUDIO
   ├─ Sale: STORED → SOLD
   └─ Donation: STORED → DONATED
```

### Integration Architecture

```
┌─────────────────┐
│  FieldSession   │
│   (Active)      │
└────────┬────────┘
         │
         ▼
    ┌────────┐
    │FindLog │◄────────┐
    └────┬───┘         │
         │         Link for
         │        Provenance
         ▼             │
  ┌─────────────┐      │
  │  Specimen   │──────┘
  │ (Created)   │
  └──────┬──────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────┐
│ Storage │ │   Tags   │
│Location │ │Collection│
└─────────┘ └──────────┘
         │
         ▼
  ┌──────────────┐
  │   Lapidary   │
  │    Studio    │
  └──────────────┘
```

---

## Core Entities

### 1. Specimen

Individual specimen in collection, linked to FindLog for complete provenance.

```typescript
interface Specimen {
  // Identity & Provenance
  id: string;
  specimen_number: string; // Unique catalog number (e.g., "QZ-2024-001")
  find_log_id?: string; // Link to field FindLog
  field_session_id?: string; // Original FieldSession
  capture_session_id?: string; // Camera identification session

  // Material
  material_id: string;
  material_name: string;
  variety?: string;

  // State & Condition
  state: SpecimenState; // Lifecycle state
  condition: SpecimenCondition; // Physical condition

  // Physical Properties
  weight_grams?: number;
  dimensions_mm?: { length; width; height };
  color?: string;
  luster?: string;
  transparency?: string;
  crystal_system?: string;

  // Acquisition
  acquisition_method: AcquisitionMethod;
  acquisition_date: Date;
  acquisition_cost?: number;
  acquired_from?: string;

  // Location
  collection_location?: string; // Where collected
  collection_site?: string;
  collection_coordinates?: { lat; lon };

  // Storage
  storage_location_id?: string;
  storage_position?: string;

  // Organization
  collection_group_ids: string[];
  tag_ids: string[];

  // Documentation
  title?: string;
  description?: string;
  photo_paths: string[];

  // Scientific
  scientific_name?: string;
  chemical_formula?: string;
  hardness_mohs?: number;
  specific_gravity?: number;

  // Valuation
  estimated_value?: number;
  appraisal_date?: Date;

  // Lapidary
  lapidary_project_id?: string;
  intended_use?: string;

  // Flags
  is_favorite: boolean;
  is_for_sale: boolean;
  is_for_trade: boolean;
  is_on_display: boolean;
}
```

**Key Features:**

- Unique catalog number with format: `{MaterialCode}-{Year}-{SequenceNumber}`
- Complete provenance via `find_log_id`
- Deterministic state machine
- Event sourcing with sequence numbers
- Offline-first sync

### 2. StorageLocation

Hierarchical physical storage system.

```typescript
interface StorageLocation {
  id: string;
  parent_location_id?: string; // For nested storage

  name: string; // "Main Shelf", "Red Box"
  type: StorageLocationType; // ROOM, SHELF, BOX, etc.
  code?: string; // Short code (e.g., "SH-01")

  description?: string;
  dimensions?: string;
  capacity?: number; // Max specimens
  current_count: number; // Current specimens (auto-updated)

  is_primary: boolean;
  sort_order: number;
}
```

**Hierarchy Example:**

```
Rock Room (RM-01)
  └─ Main Shelf (RM-01-SH-01)
      ├─ Red Box (RM-01-SH-01-BX-01)
      ├─ Blue Box (RM-01-SH-01-BX-02)
      └─ Display Case (RM-01-SH-01-DC-01)
```

### 3. Tag

Labels for organizing specimens.

```typescript
interface Tag {
  id: string;
  name: string; // "Quartz", "Arizona", "Museum Quality"
  type: TagType; // CATEGORY, LOCATION, QUALITY, etc.
  color?: string; // UI color (#3B82F6)
  icon?: string;

  parent_tag_id?: string; // Hierarchical tags
  sort_order: number;
  specimen_count: number; // Auto-updated
}
```

**Tag Types:**

- **CATEGORY**: Material categories (Quartz, Feldspar)
- **LOCATION**: Geographic (Arizona, California, Colorado)
- **QUALITY**: Quality levels (Museum, Display, Study, Cull)
- **PROJECT**: Project-based (Lapidary, Research, Education)
- **CUSTOM**: User-defined

### 4. CollectionGroup

Themed collections or sets.

```typescript
interface CollectionGroup {
  id: string;
  name: string; // "Colorado Collection"
  type: CollectionGroupType; // LOCATION, THEME, etc.
  slug: string; // URL-friendly

  description?: string;
  notes?: string;

  parent_group_id?: string;
  is_public: boolean; // Share publicly
  sort_order: number;

  // Aggregated metrics (auto-updated)
  specimen_count: number;
  total_weight_grams?: number;
  estimated_total_value?: number;

  cover_photo_path?: string;
  photo_paths: string[];
}
```

**Collection Types:**

- **MATERIAL_TYPE**: All quartz specimens
- **LOCATION**: Arizona collection
- **DATE_RANGE**: 2024 finds
- **THEME**: Fluorescent minerals
- **PROJECT**: Lapidary projects
- **CUSTOM**: User-defined grouping

---

## State Machine

### Specimen Lifecycle States

```
FIELD_COLLECTED → IN_TRANSIT → RECEIVED
                                   ↓
                              CLEANING
                                   ↓
                             IDENTIFYING
                                   ↓
                              CATALOGING
                                   ↓
                               STORED ──────┐
                                   ↓        │
              ┌────────────────────┴────────┼──────────┐
              ↓                    ↓        ↓          ↓
         ON_DISPLAY            ON_LOAN  IN_STUDIO   SOLD
              │                    │        │
              │                    │    DESTROYED
              └────────────────────┴────────┘
                                   ↓
                                STORED

Terminal States: SOLD, DONATED, DESTROYED
Recovery: LOST → STORED (if found)
```

### State Transition Rules

```typescript
const VALID_SPECIMEN_TRANSITIONS = {
  FIELD_COLLECTED: [IN_TRANSIT, RECEIVED],
  IN_TRANSIT: [RECEIVED, LOST],
  RECEIVED: [CLEANING, IDENTIFYING, CATALOGING],
  CLEANING: [IDENTIFYING, CATALOGING, STORED],
  IDENTIFYING: [CATALOGING, STORED],
  CATALOGING: [STORED, ON_DISPLAY],
  STORED: [ON_DISPLAY, ON_LOAN, IN_STUDIO, SOLD, DONATED, LOST],
  ON_DISPLAY: [STORED, ON_LOAN, SOLD, DONATED],
  ON_LOAN: [STORED, LOST],
  IN_STUDIO: [STORED, DESTROYED],
  SOLD: [], // Terminal
  DONATED: [], // Terminal
  LOST: [STORED], // Can be found
  DESTROYED: [], // Terminal
};
```

### Condition Assessment

```typescript
enum SpecimenCondition {
  EXCELLENT, // Museum quality, no damage
  VERY_GOOD, // Minor imperfections
  GOOD, // Some wear, fully intact
  FAIR, // Noticeable damage, still valuable
  POOR, // Significant damage
  DAMAGED, // Heavily damaged but salvageable
}
```

---

## Storage Management

### Hierarchical Storage

```typescript
// Room > Shelf > Box structure
const room = await createStorageLocation({
  name: 'Rock Room',
  type: StorageLocationType.ROOM,
  code: 'RM-01',
  parent_location_id: undefined,
});

const shelf = await createStorageLocation({
  name: 'Main Shelf',
  type: StorageLocationType.SHELF,
  code: 'RM-01-SH-01',
  parent_location_id: room.id,
  capacity: 50,
});

const box = await createStorageLocation({
  name: 'Red Box',
  type: StorageLocationType.BOX,
  code: 'RM-01-SH-01-BX-01',
  parent_location_id: shelf.id,
  capacity: 20,
});
```

### Storage Path Building

```typescript
const path = buildStorageLocationPath(box, allLocations);
// Returns: "Rock Room > Main Shelf > Red Box"
```

### Capacity Management

```typescript
// Check capacity
const isFull = isStorageLocationFull(shelf);
const available = getAvailableCapacity(shelf);
// Returns: 27 (if 23/50 used)

// Auto-updated by triggers
// When specimen moved to location:
// - current_count incremented
// - When moved away: current_count decremented
```

### Storage Code Generation

```typescript
// Generate hierarchical codes
generateStorageLocationCode(StorageLocationType.SHELF, undefined, 1);
// Returns: "SH-01"

generateStorageLocationCode(StorageLocationType.BOX, 'SH-01', 3);
// Returns: "SH-01-BX-03"
```

---

## Organization Systems

### Tagging System

```typescript
// Create tags
const quartzTag = await createTag({
  name: 'Quartz',
  type: TagType.CATEGORY,
  color: '#3B82F6',
  icon: 'crystal',
});

const arizonaTag = await createTag({
  name: 'Arizona',
  type: TagType.LOCATION,
  color: '#EF4444',
  icon: 'map-pin',
});

// Tag specimen
const { specimen, event } = tagSpecimen(mySpecimen, quartzTag.id, 'Quartz', TagType.CATEGORY);

// Multiple tags per specimen
specimen.tag_ids = [quartzTag.id, arizonaTag.id, displayQualityTag.id];
```

### Collection Groups

```typescript
// Create themed collection
const coloradoCollection = await createCollectionGroup({
  name: 'Colorado Collection',
  type: CollectionGroupType.LOCATION,
  slug: 'colorado-collection',
  description: 'Specimens collected in Colorado',
  is_public: false,
});

// Add specimens
const { specimen, event } = addSpecimenToGroup(
  mySpecimen,
  coloradoCollection.id,
  sortOrder: 5
);

// Metrics auto-calculated by triggers
coloradoCollection.specimen_count;        // 15
coloradoCollection.total_weight_grams;    // 2450.5
coloradoCollection.estimated_total_value; // 750.00
```

### Collection Statistics

```typescript
// Query aggregated stats
const stats = await db.query(`
  SELECT * FROM collection_statistics
  WHERE user_id = $1
`, [userId]);

// Returns:
{
  total_specimens: 150,
  specimens_stored: 120,
  specimens_on_display: 20,
  specimens_in_studio: 5,
  favorite_specimens: 30,
  total_weight_grams: 15250.5,
  total_estimated_value: 3500.00,
  unique_materials: 45,
  storage_locations_used: 12
}
```

---

## Integration with FindLog

### Creating Specimen from FindLog

```typescript
// User returns from field session
const fieldSession = await getFieldSession(sessionId);
const findLogs = await getFindLogsForSession(sessionId);

// Convert each FindLog to Specimen
for (const findLog of findLogs) {
  // Generate unique specimen number
  const specimenNumber = generateSpecimenNumber(
    'QZ', // Material code
    2024, // Year
    sequenceNumber // Auto-incremented
  );
  // Returns: "QZ-2024-001"

  // Create specimen
  const { specimen, event } = await createSpecimenFromFindLog(findLog, {
    userId: currentUser.id,
    deviceId: getDeviceId(),
    specimenNumber,
  });

  // Specimen inherits from FindLog:
  specimen.find_log_id = findLog.id;
  specimen.field_session_id = findLog.session_id;
  specimen.material_id = findLog.material_id;
  specimen.weight_grams = findLog.weight_grams;
  specimen.photo_paths = [...findLog.photo_paths];
  specimen.collection_coordinates = {
    lat: findLog.lat,
    lon: findLog.lon,
  };
  specimen.notes = findLog.notes;

  // Condition mapped from quality rating
  specimen.condition = mapQualityToCondition(findLog.quality_rating);
  // quality_rating 9-10 → EXCELLENT
  // quality_rating 7-8  → VERY_GOOD
  // quality_rating 5-6  → GOOD
  // quality_rating 3-4  → FAIR
  // quality_rating 1-2  → POOR

  // Initial state
  specimen.state = SpecimenState.FIELD_COLLECTED;
  specimen.acquisition_method = AcquisitionMethod.FIELD_COLLECTED;
  specimen.acquisition_date = findLog.logged_at;

  // Event queued for sync (priority 90)
  await queueEvent(event);
}
```

### Provenance Chain

```
FieldSession (expedition)
    ↓
FindLog (specimen found)
    ↓ (find_log_id link)
Specimen (in collection)
    ↓
StorageLocation, Tags, CollectionGroups
```

Query complete provenance:

```typescript
const specimen = await db.specimens
  .where('id')
  .equals(specimenId)
  .with('findLog')
  .with('findLog.fieldSession')
  .first();

// Access complete history
specimen.findLog.logged_at; // When found
specimen.findLog.fieldSession.title; // "Colorado Expedition 2024"
specimen.findLog.lat; // GPS coordinates
specimen.collection_location; // "Near creek, Colorado"
```

---

## Integration with Lapidary Studio

### Sending Specimen to Studio

```typescript
// User wants to cut/polish specimen
const { specimen, event } = sendSpecimenToStudio(
  mySpecimen,
  lapidaryProjectId,
  intendedUse: 'Cabochon cutting'
);

// State changed
specimen.state = SpecimenState.IN_STUDIO;
specimen.lapidary_project_id = lapidaryProjectId;
specimen.intended_use = 'Cabochon cutting';

// High priority sync (80)
event.type = 'specimen.sent_to_studio';
event.payload = {
  previous_state: SpecimenState.STORED,
  intended_use: 'Cabochon cutting',
};
```

### Studio Workflow

```
STORED → IN_STUDIO (project created)
    ↓
  [Cutting/Polishing in Lapidary Studio]
    ↓
IN_STUDIO → STORED (project completed)
    OR
IN_STUDIO → DESTROYED (mishap during cutting)
```

### Tracking Results

```typescript
// Lapidary Studio creates output gems
const lapidaryProject = await getLapidaryProject(projectId);

// Link back to source specimen
lapidaryProject.source_specimen_id = specimen.id;

// Create new specimen for cut gem
const cutGem = await createSpecimen({
  material_id: specimen.material_id,
  material_name: specimen.material_name + ' (Cut)',
  acquisition_method: AcquisitionMethod.INHERITED,
  notes: `Cut from specimen ${specimen.specimen_number}`,
  parent_specimen_id: specimen.id, // Track lineage
});

// Return source specimen to storage
const { specimen: returned } = changeSpecimenState(
  specimen,
  SpecimenState.STORED,
  'Returned from lapidary project'
);
```

---

## Event Sourcing

### Event Types

```typescript
type CollectionEvent =
  | SpecimenCreatedFromFindLogEvent // FindLog → Specimen
  | SpecimenStateChangedEvent // State transitions
  | SpecimenStoredEvent // Moved to storage
  | SpecimenAddedToGroupEvent // Added to collection
  | SpecimenTaggedEvent // Tagged
  | SpecimenSentToStudioEvent // Sent to lapidary
  | StorageLocationCreatedEvent // Location created
  | CollectionGroupCreatedEvent // Group created
  | TagCreatedEvent; // Tag created
```

### Event Sequence Example

```
Seq 0: specimen.created_from_findlog
       └─→ Specimen exists (FIELD_COLLECTED)

Seq 1: specimen.state_changed
       └─→ FIELD_COLLECTED → RECEIVED

Seq 2: specimen.state_changed
       └─→ RECEIVED → CATALOGING

Seq 3: specimen.stored
       └─→ Moved to "Main Shelf", state = STORED

Seq 4: specimen.tagged
       └─→ Tagged "Quartz"

Seq 5: specimen.added_to_group
       └─→ Added to "Colorado Collection"

Seq 6: specimen.sent_to_studio
       └─→ State = IN_STUDIO, project linked
```

### Deterministic Replay

```typescript
async function replaySpecimen(specimenId: string): Promise<Specimen> {
  const events = await db.events.where('specimen_id').equals(specimenId).sortBy('sequence_number');

  let specimen = await db.specimens.get(specimenId);

  for (const event of events) {
    specimen = applyCollectionEvent(specimen, event);
  }

  return specimen;
}

function applyCollectionEvent(specimen: Specimen, event: CollectionEvent): Specimen {
  switch (event.type) {
    case 'specimen.state_changed':
      specimen.state = event.payload.new_state;
      break;

    case 'specimen.stored':
      specimen.storage_location_id = event.storage_location_id;
      specimen.storage_position = event.payload.storage_position;
      specimen.state = SpecimenState.STORED;
      break;

    case 'specimen.tagged':
      if (!specimen.tag_ids.includes(event.tag_id)) {
        specimen.tag_ids.push(event.tag_id);
      }
      break;

    case 'specimen.added_to_group':
      if (!specimen.collection_group_ids.includes(event.collection_group_id)) {
        specimen.collection_group_ids.push(event.collection_group_id);
      }
      break;
  }

  return specimen;
}
```

---

## Offline Sync

### Sync Priority Order

```typescript
export const COLLECTION_SYNC_PRIORITIES = {
  SPECIMEN_CREATED_FROM_FINDLOG: 90, // High priority (creates entity)
  STORAGE_LOCATION_CREATED: 85, // Before specimens stored
  COLLECTION_GROUP_CREATED: 85, // Before specimens added
  TAG_CREATED: 85, // Before specimens tagged
  SPECIMEN_SENT_TO_STUDIO: 80, // Workflow integration
  SPECIMEN_STATE_CHANGED: 75, // State changes important
  SPECIMEN_STORED: 70, // Storage updates
  SPECIMEN_UPDATED: 65, // General updates
  SPECIMEN_TAGGED: 60, // Tag associations
  SPECIMEN_ADDED_TO_GROUP: 60, // Collection associations
};
```

### Sync Flow

```
OFFLINE OPERATION:
1. User creates specimens from FindLogs
2. Assigns to storage locations
3. Tags specimens
4. Creates collections
5. All events queued with priorities

CONNECTION RESTORED:
6. Sync worker processes by priority:
   a. specimen.created_from_findlog (90)
   b. storage_location.created (85)
   c. tag.created (85)
   d. collection_group.created (85)
   e. specimen.sent_to_studio (80)
   f. specimen.state_changed (75)
   g. specimen.stored (70)
   h. specimen.tagged (60)

7. Server validates, persists, acknowledges
8. Client updates sync_status to SYNCED
```

### Batch Sync

```typescript
async function syncSpecimenWithDependencies(specimenId: string) {
  const specimen = await db.specimens.get(specimenId);

  // 1. Ensure storage location synced first
  if (specimen.storage_location_id) {
    await syncStorageLocation(specimen.storage_location_id);
  }

  // 2. Ensure tags synced
  for (const tagId of specimen.tag_ids) {
    await syncTag(tagId);
  }

  // 3. Ensure collection groups synced
  for (const groupId of specimen.collection_group_ids) {
    await syncCollectionGroup(groupId);
  }

  // 4. Sync specimen events
  const events = await db.events
    .where('specimen_id')
    .equals(specimenId)
    .and((e) => e.sync_status !== SyncStatus.SYNCED)
    .sortBy('sequence_number');

  for (const event of events) {
    await syncEvent(event);
  }
}
```

---

## Usage Examples

### Example 1: Complete Lifecycle

```typescript
// 1. Return from field trip with FindLogs
const findLogs = await getFindLogsForSession(sessionId);

// 2. Create specimens
for (const findLog of findLogs) {
  const specimenNumber = generateSpecimenNumber('QZ', 2024, nextSequence++);
  const { specimen } = await createSpecimenFromFindLog(findLog, {
    userId: user.id,
    deviceId: device.id,
    specimenNumber,
  });

  // 3. Transition through states
  let { specimen: updated } = changeSpecimenState(specimen, SpecimenState.IN_TRANSIT);

  // Arrived home
  ({ specimen: updated } = changeSpecimenState(updated, SpecimenState.RECEIVED));

  // Clean specimen
  ({ specimen: updated } = changeSpecimenState(updated, SpecimenState.CLEANING));

  // Catalog and photograph
  ({ specimen: updated } = changeSpecimenState(updated, SpecimenState.CATALOGING));

  // Update with detailed info
  updated.title = 'Smoky Quartz Crystal';
  updated.description = 'Beautiful smoky quartz with excellent clarity';
  updated.chemical_formula = 'SiO₂';
  updated.hardness_mohs = 7;
  updated.specific_gravity = 2.65;
  updated.estimated_value = 50;

  // 4. Store in location
  ({ specimen: updated } = moveSpecimenToStorage(updated, mainShelf.id, 'Row 2, Position 5'));

  // 5. Tag
  ({ specimen: updated } = tagSpecimen(updated, quartzTag.id, 'Quartz', TagType.CATEGORY));

  // 6. Add to collection
  ({ specimen: updated } = addSpecimenToGroup(updated, coloradoCollection.id, sortOrder));

  // 7. Mark as favorite
  updated.is_favorite = true;

  await db.specimens.put(updated);
}

// 8. Sync when online
await syncAllSpecimens();
```

### Example 2: Hierarchical Storage Setup

```typescript
// Create room
const rockRoom = await createStorageLocation({
  name: 'Rock Room',
  type: StorageLocationType.ROOM,
  code: generateStorageLocationCode(StorageLocationType.ROOM, undefined, 1),
  is_primary: true,
  capacity: undefined, // Unlimited
});

// Create shelves
const shelf1 = await createStorageLocation({
  name: 'Display Shelf',
  type: StorageLocationType.SHELF,
  code: generateStorageLocationCode(StorageLocationType.SHELF, rockRoom.code, 1),
  parent_location_id: rockRoom.id,
  capacity: 50,
});

const shelf2 = await createStorageLocation({
  name: 'Storage Shelf',
  type: StorageLocationType.SHELF,
  code: generateStorageLocationCode(StorageLocationType.SHELF, rockRoom.code, 2),
  parent_location_id: rockRoom.id,
  capacity: 100,
});

// Create boxes on storage shelf
const boxes = await Promise.all([
  createStorageLocation({
    name: 'Red Box - Quartz',
    type: StorageLocationType.BOX,
    code: generateStorageLocationCode(StorageLocationType.BOX, shelf2.code, 1),
    parent_location_id: shelf2.id,
    capacity: 20,
  }),
  createStorageLocation({
    name: 'Blue Box - Feldspar',
    type: StorageLocationType.BOX,
    code: generateStorageLocationCode(StorageLocationType.BOX, shelf2.code, 2),
    parent_location_id: shelf2.id,
    capacity: 20,
  }),
]);

// Query storage path
const path = buildStorageLocationPath(boxes[0], allLocations);
// Returns: "Rock Room > Storage Shelf > Red Box - Quartz"

// Check capacity
console.log(getAvailableCapacity(boxes[0])); // 20 (empty)
```

### Example 3: Themed Collections

```typescript
// Create collections
const fluorescents = await createCollectionGroup({
  name: 'Fluorescent Minerals',
  type: CollectionGroupType.THEME,
  slug: 'fluorescent-minerals',
  description: 'Minerals that fluoresce under UV light',
  is_public: true, // Share with community
});

const lapidaryProjects = await createCollectionGroup({
  name: 'Lapidary Projects',
  type: CollectionGroupType.PROJECT,
  slug: 'lapidary-projects',
  description: 'Specimens designated for cutting and polishing',
});

const museumQuality = await createCollectionGroup({
  name: 'Museum Quality',
  type: CollectionGroupType.CUSTOM,
  slug: 'museum-quality',
  description: 'Best specimens in collection',
});

// Add specimens to multiple collections
const specimen = mySpecimens[0];
addSpecimenToGroup(specimen, fluorescents.id, 1);
addSpecimenToGroup(specimen, museumQuality.id, 5);

// Metrics auto-calculated
fluorescents.specimen_count; // 25
fluorescents.total_weight_grams; // 3250.5
fluorescents.estimated_total_value; // 2500.00
```

### Example 4: Lapidary Integration

```typescript
// Select specimen for cutting
const specimen = await db.specimens
  .where('material_id')
  .equals('quartz')
  .and((s) => s.weight_grams > 100)
  .and((s) => s.condition === SpecimenCondition.GOOD)
  .first();

// Send to studio
const lapidaryProject = await createLapidaryProject({
  name: 'Smoky Quartz Cabochon',
  type: 'cabochon',
  material_id: specimen.material_id,
});

const { specimen: inStudio } = sendSpecimenToStudio(
  specimen,
  lapidaryProject.id,
  'Cabochon cutting - 25mm x 18mm'
);

// Work on project...

// Complete project, return specimen
const { specimen: returned } = changeSpecimenState(
  inStudio,
  SpecimenState.STORED,
  'Lapidary project completed'
);

// Create new specimen for finished gem
const finishedGem = await createSpecimen({
  material_id: specimen.material_id,
  material_name: specimen.material_name + ' Cabochon',
  acquisition_method: AcquisitionMethod.INHERITED,
  acquisition_date: new Date(),
  weight_grams: 15, // After cutting
  notes: `Cut from specimen ${specimen.specimen_number}`,
  photo_paths: ['path/to/finished-cab.jpg'],
  parent_specimen_id: specimen.id,
  lapidary_project_id: lapidaryProject.id,
  state: SpecimenState.STORED,
});
```

---

## Summary

The Collection Management subsystem provides:

✅ **Complete lifecycle** - Field → Transit → Storage → Display/Studio  
✅ **Deterministic state machine** - 14 states with enforced transitions  
✅ **Hierarchical storage** - Nested locations (Room > Shelf > Box)  
✅ **Flexible organization** - Tags and themed collections  
✅ **FindLog integration** - Complete provenance tracking  
✅ **Lapidary Studio integration** - Workflow for cutting/polishing  
✅ **Event sourcing** - Complete audit trail with replay  
✅ **Offline-first** - Priority-based sync with dependency ordering  
✅ **Automatic metrics** - Counts, weights, values auto-calculated  
✅ **Spatial queries** - Find specimens by collection location

This architecture ensures specimens are organized, tracked, and managed throughout their entire lifecycle from field discovery to permanent collection placement or lapidary transformation.
