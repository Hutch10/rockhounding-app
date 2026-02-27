/**
 * Collection Management Schema Tests
 * 
 * Comprehensive test suite for specimen collection management system.
 * Tests lifecycle transitions, state machine, CRUD operations, and business logic.
 */

import { describe, it, expect } from 'vitest';
import {
  // Enums
  SpecimenState,
  SpecimenCondition,
  AcquisitionMethod,
  StorageLocationType,
  TagType,
  CollectionGroupType,
  SyncStatus,
  
  // Interfaces
  Specimen,
  StorageLocation,
  Tag,
  CollectionGroup,
  
  // Schemas
  SpecimenSchema,
  StorageLocationSchema,
  TagSchema,
  CollectionGroupSchema,
  
  // Business logic
  isValidSpecimenTransition,
  getAllowedNextStates,
  generateSpecimenNumber,
  parseSpecimenNumber,
  buildSpecimenFromFindLog,
  calculateCollectionGroupValue,
  generateStorageLocationCode,
  buildStorageLocationPath,
  isStorageLocationFull,
  getAvailableCapacity,
  
  // CRUD operations
  createSpecimenFromFindLog,
  changeSpecimenState,
  moveSpecimenToStorage,
  addSpecimenToGroup,
  tagSpecimen,
  sendSpecimenToStudio,
  
  // Constants
  COLLECTION_SYNC_PRIORITIES,
} from './collection-management-schema';

// =====================================================
// TEST FACTORIES
// =====================================================

function createMockFindLog() {
  return {
    id: crypto.randomUUID(),
    session_id: crypto.randomUUID(),
    material_id: 'quartz',
    material_name: 'Quartz',
    variety: 'Smoky',
    quality_rating: 8,
    weight_grams: 125.5,
    notes: 'Found near creek bed',
    photo_paths: ['path/to/photo1.jpg', 'path/to/photo2.jpg'],
    lat: 40.7128,
    lon: -74.0060,
    location_description: 'Creek near hiking trail, Colorado',
    logged_at: new Date('2024-06-15T14:30:00Z'),
  };
}

function createMockSpecimen(): Specimen {
  return {
    id: crypto.randomUUID(),
    user_id: crypto.randomUUID(),
    device_id: 'device-123',
    
    find_log_id: crypto.randomUUID(),
    field_session_id: crypto.randomUUID(),
    capture_session_id: undefined,
    
    material_id: 'quartz',
    material_name: 'Quartz',
    variety: 'Smoky',
    
    specimen_number: 'QZ-2024-001',
    state: SpecimenState.STORED,
    condition: SpecimenCondition.VERY_GOOD,
    
    weight_grams: 125.5,
    dimensions_mm: {
      length: 45,
      width: 30,
      height: 25,
    },
    color: 'Brown',
    luster: 'Vitreous',
    transparency: 'Translucent',
    crystal_system: 'Hexagonal',
    
    acquisition_method: AcquisitionMethod.FIELD_COLLECTED,
    acquisition_date: new Date('2024-06-15'),
    acquisition_cost: undefined,
    acquisition_cost_currency: undefined,
    acquired_from: undefined,
    
    collection_location: 'Colorado',
    collection_site: 'Creek near hiking trail',
    collection_coordinates: {
      lat: 40.7128,
      lon: -74.0060,
    },
    
    storage_location_id: crypto.randomUUID(),
    storage_position: 'Shelf 2, Row 3',
    
    collection_group_ids: [],
    tag_ids: [],
    
    title: 'Smoky Quartz Crystal',
    description: 'Beautiful smoky quartz crystal',
    notes: 'Found near creek bed',
    photo_paths: ['path/to/photo1.jpg'],
    
    scientific_name: 'Silicon Dioxide',
    chemical_formula: 'SiO₂',
    hardness_mohs: 7,
    specific_gravity: 2.65,
    
    estimated_value: 50,
    estimated_value_currency: 'USD',
    appraisal_date: undefined,
    appraised_by: undefined,
    
    lapidary_project_id: undefined,
    intended_use: undefined,
    
    is_favorite: false,
    is_for_sale: false,
    is_for_trade: false,
    is_on_display: false,
    
    metadata: {},
    
    sequence_number: 5,
    
    sync_status: SyncStatus.SYNCED,
    sync_priority: 90,
    sync_attempts: 1,
    last_sync_attempt_at: new Date('2024-06-15T15:00:00Z'),
    synced_at: new Date('2024-06-15T15:00:00Z'),
    
    version: 3,
    
    client_created_at: new Date('2024-06-15T14:30:00Z'),
    created_at: new Date('2024-06-15T14:30:00Z'),
    updated_at: new Date('2024-06-15T15:00:00Z'),
  };
}

function createMockStorageLocation(): StorageLocation {
  return {
    id: crypto.randomUUID(),
    user_id: crypto.randomUUID(),
    device_id: 'device-123',
    
    parent_location_id: undefined,
    
    name: 'Main Shelf',
    type: StorageLocationType.SHELF,
    code: 'SH-01',
    
    description: 'Main display shelf in rock room',
    dimensions: '48x24x72 inches',
    capacity: 50,
    current_count: 23,
    
    is_primary: true,
    sort_order: 1,
    
    photo_path: 'path/to/shelf.jpg',
    notes: 'For display-quality specimens',
    
    sequence_number: 0,
    
    sync_status: SyncStatus.SYNCED,
    sync_priority: 85,
    sync_attempts: 0,
    last_sync_attempt_at: undefined,
    synced_at: new Date('2024-01-15T10:00:00Z'),
    
    version: 1,
    
    client_created_at: new Date('2024-01-15T10:00:00Z'),
    created_at: new Date('2024-01-15T10:00:00Z'),
    updated_at: new Date('2024-01-15T10:00:00Z'),
  };
}

function createMockTag(): Tag {
  return {
    id: crypto.randomUUID(),
    user_id: crypto.randomUUID(),
    device_id: 'device-123',
    
    name: 'Quartz',
    type: TagType.CATEGORY,
    color: '#3B82F6',
    icon: 'crystal',
    
    parent_tag_id: undefined,
    sort_order: 1,
    
    specimen_count: 12,
    
    description: 'Quartz specimens',
    metadata: {},
    
    sequence_number: 0,
    
    sync_status: SyncStatus.SYNCED,
    sync_priority: 85,
    sync_attempts: 0,
    last_sync_attempt_at: undefined,
    synced_at: new Date('2024-01-10T10:00:00Z'),
    
    version: 1,
    
    client_created_at: new Date('2024-01-10T10:00:00Z'),
    created_at: new Date('2024-01-10T10:00:00Z'),
    updated_at: new Date('2024-01-10T10:00:00Z'),
  };
}

function createMockCollectionGroup(): CollectionGroup {
  return {
    id: crypto.randomUUID(),
    user_id: crypto.randomUUID(),
    device_id: 'device-123',
    
    name: 'Colorado Collection',
    type: CollectionGroupType.LOCATION,
    slug: 'colorado-collection',
    
    description: 'Specimens collected in Colorado',
    notes: 'Focus on Rocky Mountain finds',
    
    parent_group_id: undefined,
    is_public: false,
    sort_order: 1,
    
    specimen_count: 15,
    total_weight_grams: 2450.5,
    estimated_total_value: 750,
    
    cover_photo_path: 'path/to/cover.jpg',
    photo_paths: ['path/to/photo1.jpg', 'path/to/photo2.jpg'],
    
    metadata: {},
    
    sequence_number: 0,
    
    sync_status: SyncStatus.SYNCED,
    sync_priority: 85,
    sync_attempts: 0,
    last_sync_attempt_at: undefined,
    synced_at: new Date('2024-01-20T10:00:00Z'),
    
    version: 1,
    
    client_created_at: new Date('2024-01-20T10:00:00Z'),
    created_at: new Date('2024-01-20T10:00:00Z'),
    updated_at: new Date('2024-01-20T10:00:00Z'),
  };
}

// =====================================================
// STATE MACHINE TESTS
// =====================================================

describe('Specimen State Machine', () => {
  it('should allow valid state transitions', () => {
    expect(isValidSpecimenTransition(
      SpecimenState.FIELD_COLLECTED,
      SpecimenState.IN_TRANSIT
    )).toBe(true);
    
    expect(isValidSpecimenTransition(
      SpecimenState.IN_TRANSIT,
      SpecimenState.RECEIVED
    )).toBe(true);
    
    expect(isValidSpecimenTransition(
      SpecimenState.RECEIVED,
      SpecimenState.CLEANING
    )).toBe(true);
    
    expect(isValidSpecimenTransition(
      SpecimenState.CATALOGING,
      SpecimenState.STORED
    )).toBe(true);
    
    expect(isValidSpecimenTransition(
      SpecimenState.STORED,
      SpecimenState.ON_DISPLAY
    )).toBe(true);
  });
  
  it('should reject invalid state transitions', () => {
    expect(isValidSpecimenTransition(
      SpecimenState.FIELD_COLLECTED,
      SpecimenState.SOLD
    )).toBe(false);
    
    expect(isValidSpecimenTransition(
      SpecimenState.IN_TRANSIT,
      SpecimenState.ON_DISPLAY
    )).toBe(false);
    
    expect(isValidSpecimenTransition(
      SpecimenState.SOLD,
      SpecimenState.STORED
    )).toBe(false);
  });
  
  it('should return allowed next states', () => {
    const nextStates = getAllowedNextStates(SpecimenState.STORED);
    
    expect(nextStates).toContain(SpecimenState.ON_DISPLAY);
    expect(nextStates).toContain(SpecimenState.ON_LOAN);
    expect(nextStates).toContain(SpecimenState.IN_STUDIO);
    expect(nextStates).toContain(SpecimenState.SOLD);
    expect(nextStates).not.toContain(SpecimenState.FIELD_COLLECTED);
  });
  
  it('should have empty next states for terminal states', () => {
    expect(getAllowedNextStates(SpecimenState.SOLD)).toEqual([]);
    expect(getAllowedNextStates(SpecimenState.DONATED)).toEqual([]);
    expect(getAllowedNextStates(SpecimenState.DESTROYED)).toEqual([]);
  });
  
  it('should allow finding lost specimens', () => {
    expect(isValidSpecimenTransition(
      SpecimenState.LOST,
      SpecimenState.STORED
    )).toBe(true);
  });
});

// =====================================================
// SPECIMEN NUMBER TESTS
// =====================================================

describe('Specimen Number Generation', () => {
  it('should generate correctly formatted specimen numbers', () => {
    expect(generateSpecimenNumber('QZ', 2024, 1)).toBe('QZ-2024-001');
    expect(generateSpecimenNumber('FLD', 2024, 42)).toBe('FLD-2024-042');
    expect(generateSpecimenNumber('CAL', 2024, 123)).toBe('CAL-2024-123');
  });
  
  it('should uppercase material code', () => {
    expect(generateSpecimenNumber('qz', 2024, 1)).toBe('QZ-2024-001');
  });
  
  it('should pad sequence number to 3 digits', () => {
    expect(generateSpecimenNumber('QZ', 2024, 1)).toBe('QZ-2024-001');
    expect(generateSpecimenNumber('QZ', 2024, 10)).toBe('QZ-2024-010');
    expect(generateSpecimenNumber('QZ', 2024, 100)).toBe('QZ-2024-100');
  });
  
  it('should parse specimen numbers', () => {
    const parsed = parseSpecimenNumber('QZ-2024-001');
    
    expect(parsed).toEqual({
      materialCode: 'QZ',
      year: 2024,
      sequenceNumber: 1,
    });
  });
  
  it('should return null for invalid specimen numbers', () => {
    expect(parseSpecimenNumber('invalid')).toBeNull();
    expect(parseSpecimenNumber('QZ-2024')).toBeNull();
    expect(parseSpecimenNumber('2024-001')).toBeNull();
  });
});

// =====================================================
// FINDLOG TO SPECIMEN CONVERSION TESTS
// =====================================================

describe('FindLog to Specimen Conversion', () => {
  it('should convert FindLog to Specimen correctly', () => {
    const findLog = createMockFindLog();
    const specimen = buildSpecimenFromFindLog({
      findLog,
      specimenNumber: 'QZ-2024-001',
      userId: 'user-123',
      deviceId: 'device-456',
    });
    
    expect(specimen.find_log_id).toBe(findLog.id);
    expect(specimen.field_session_id).toBe(findLog.session_id);
    expect(specimen.material_id).toBe(findLog.material_id);
    expect(specimen.material_name).toBe(findLog.material_name);
    expect(specimen.variety).toBe(findLog.variety);
    expect(specimen.specimen_number).toBe('QZ-2024-001');
    expect(specimen.state).toBe(SpecimenState.FIELD_COLLECTED);
    expect(specimen.acquisition_method).toBe(AcquisitionMethod.FIELD_COLLECTED);
  });
  
  it('should map quality rating to condition', () => {
    const findLog = createMockFindLog();
    
    // Quality 9-10 -> EXCELLENT
    findLog.quality_rating = 9;
    let specimen = buildSpecimenFromFindLog({
      findLog,
      specimenNumber: 'QZ-2024-001',
      userId: 'user-123',
      deviceId: 'device-456',
    });
    expect(specimen.condition).toBe(SpecimenCondition.EXCELLENT);
    
    // Quality 7-8 -> VERY_GOOD
    findLog.quality_rating = 8;
    specimen = buildSpecimenFromFindLog({
      findLog,
      specimenNumber: 'QZ-2024-002',
      userId: 'user-123',
      deviceId: 'device-456',
    });
    expect(specimen.condition).toBe(SpecimenCondition.VERY_GOOD);
    
    // Quality 5-6 -> GOOD
    findLog.quality_rating = 6;
    specimen = buildSpecimenFromFindLog({
      findLog,
      specimenNumber: 'QZ-2024-003',
      userId: 'user-123',
      deviceId: 'device-456',
    });
    expect(specimen.condition).toBe(SpecimenCondition.GOOD);
  });
  
  it('should copy photos from FindLog', () => {
    const findLog = createMockFindLog();
    const specimen = buildSpecimenFromFindLog({
      findLog,
      specimenNumber: 'QZ-2024-001',
      userId: 'user-123',
      deviceId: 'device-456',
    });
    
    expect(specimen.photo_paths).toEqual(findLog.photo_paths);
  });
  
  it('should set collection coordinates from FindLog', () => {
    const findLog = createMockFindLog();
    const specimen = buildSpecimenFromFindLog({
      findLog,
      specimenNumber: 'QZ-2024-001',
      userId: 'user-123',
      deviceId: 'device-456',
    });
    
    expect(specimen.collection_coordinates).toEqual({
      lat: findLog.lat,
      lon: findLog.lon,
    });
  });
});

// =====================================================
// COLLECTION GROUP VALUE CALCULATION TESTS
// =====================================================

describe('Collection Group Value Calculation', () => {
  it('should calculate total weight', () => {
    const specimens = [
      { ...createMockSpecimen(), weight_grams: 100 },
      { ...createMockSpecimen(), weight_grams: 200 },
      { ...createMockSpecimen(), weight_grams: 150 },
    ];
    
    const result = calculateCollectionGroupValue(specimens);
    expect(result.total_weight_grams).toBe(450);
  });
  
  it('should calculate total value', () => {
    const specimens = [
      { ...createMockSpecimen(), estimated_value: 50 },
      { ...createMockSpecimen(), estimated_value: 100 },
      { ...createMockSpecimen(), estimated_value: 75 },
    ];
    
    const result = calculateCollectionGroupValue(specimens);
    expect(result.estimated_total_value).toBe(225);
  });
  
  it('should handle specimens without weight or value', () => {
    const specimens = [
      { ...createMockSpecimen(), weight_grams: 100, estimated_value: 50 },
      { ...createMockSpecimen(), weight_grams: undefined, estimated_value: undefined },
    ];
    
    const result = calculateCollectionGroupValue(specimens);
    expect(result.total_weight_grams).toBe(100);
    expect(result.estimated_total_value).toBe(50);
  });
  
  it('should count specimens correctly', () => {
    const specimens = [
      createMockSpecimen(),
      createMockSpecimen(),
      createMockSpecimen(),
    ];
    
    const result = calculateCollectionGroupValue(specimens);
    expect(result.specimen_count).toBe(3);
  });
});

// =====================================================
// STORAGE LOCATION TESTS
// =====================================================

describe('Storage Location Code Generation', () => {
  it('should generate codes for top-level locations', () => {
    expect(generateStorageLocationCode(StorageLocationType.SHELF, undefined, 1))
      .toBe('SH-01');
    expect(generateStorageLocationCode(StorageLocationType.CABINET, undefined, 5))
      .toBe('CB-05');
  });
  
  it('should generate hierarchical codes', () => {
    expect(generateStorageLocationCode(StorageLocationType.BOX, 'SH-01', 3))
      .toBe('SH-01-BX-03');
    expect(generateStorageLocationCode(StorageLocationType.DRAWER, 'CB-02', 5))
      .toBe('CB-02-DR-05');
  });
  
  it('should use correct type prefixes', () => {
    expect(generateStorageLocationCode(StorageLocationType.ROOM, undefined, 1))
      .toBe('RM-01');
    expect(generateStorageLocationCode(StorageLocationType.DISPLAY_CASE, undefined, 1))
      .toBe('DC-01');
    expect(generateStorageLocationCode(StorageLocationType.SAFE, undefined, 1))
      .toBe('SF-01');
  });
});

describe('Storage Location Path Building', () => {
  it('should build path for top-level location', () => {
    const location = createMockStorageLocation();
    location.name = 'Main Shelf';
    location.parent_location_id = undefined;
    
    const path = buildStorageLocationPath(location, []);
    expect(path).toBe('Main Shelf');
  });
  
  it('should build hierarchical path', () => {
    const room = { ...createMockStorageLocation(), id: 'room-1', name: 'Rock Room', parent_location_id: undefined };
    const shelf = { ...createMockStorageLocation(), id: 'shelf-1', name: 'Shelf 1', parent_location_id: 'room-1' };
    const box = { ...createMockStorageLocation(), id: 'box-1', name: 'Red Box', parent_location_id: 'shelf-1' };
    
    const allLocations = [room, shelf, box];
    const path = buildStorageLocationPath(box, allLocations);
    
    expect(path).toBe('Rock Room > Shelf 1 > Red Box');
  });
});

describe('Storage Location Capacity', () => {
  it('should identify full locations', () => {
    const location = createMockStorageLocation();
    location.capacity = 50;
    location.current_count = 50;
    
    expect(isStorageLocationFull(location)).toBe(true);
  });
  
  it('should identify non-full locations', () => {
    const location = createMockStorageLocation();
    location.capacity = 50;
    location.current_count = 23;
    
    expect(isStorageLocationFull(location)).toBe(false);
  });
  
  it('should handle locations without capacity', () => {
    const location = createMockStorageLocation();
    location.capacity = undefined;
    location.current_count = 100;
    
    expect(isStorageLocationFull(location)).toBe(false);
  });
  
  it('should calculate available capacity', () => {
    const location = createMockStorageLocation();
    location.capacity = 50;
    location.current_count = 23;
    
    expect(getAvailableCapacity(location)).toBe(27);
  });
  
  it('should return null for unlimited capacity', () => {
    const location = createMockStorageLocation();
    location.capacity = undefined;
    
    expect(getAvailableCapacity(location)).toBeNull();
  });
});

// =====================================================
// CRUD OPERATION TESTS
// =====================================================

describe('Create Specimen from FindLog', () => {
  it('should create specimen and event', async () => {
    const findLog = createMockFindLog();
    const { specimen, event } = await createSpecimenFromFindLog(findLog, {
      userId: 'user-123',
      deviceId: 'device-456',
      specimenNumber: 'QZ-2024-001',
    });
    
    expect(specimen.id).toBeDefined();
    expect(specimen.specimen_number).toBe('QZ-2024-001');
    expect(specimen.state).toBe(SpecimenState.FIELD_COLLECTED);
    expect(specimen.find_log_id).toBe(findLog.id);
    
    expect(event.type).toBe('specimen.created_from_findlog');
    expect(event.specimen_id).toBe(specimen.id);
    expect(event.find_log_id).toBe(findLog.id);
  });
  
  it('should set correct sync priority', async () => {
    const findLog = createMockFindLog();
    const { specimen, event } = await createSpecimenFromFindLog(findLog, {
      userId: 'user-123',
      deviceId: 'device-456',
      specimenNumber: 'QZ-2024-001',
    });
    
    expect(specimen.sync_priority).toBe(COLLECTION_SYNC_PRIORITIES.SPECIMEN_CREATED_FROM_FINDLOG);
  });
});

describe('Change Specimen State', () => {
  it('should change state and create event', () => {
    const specimen = createMockSpecimen();
    specimen.state = SpecimenState.STORED;
    
    const { specimen: updated, event } = changeSpecimenState(
      specimen,
      SpecimenState.ON_DISPLAY,
      'Moving to display case'
    );
    
    expect(updated.state).toBe(SpecimenState.ON_DISPLAY);
    expect(updated.version).toBe(specimen.version + 1);
    expect(updated.sequence_number).toBe(specimen.sequence_number + 1);
    
    expect(event.type).toBe('specimen.state_changed');
    expect(event.payload.previous_state).toBe(SpecimenState.STORED);
    expect(event.payload.new_state).toBe(SpecimenState.ON_DISPLAY);
    expect(event.payload.reason).toBe('Moving to display case');
  });
  
  it('should reject invalid state transitions', () => {
    const specimen = createMockSpecimen();
    specimen.state = SpecimenState.FIELD_COLLECTED;
    
    expect(() => {
      changeSpecimenState(specimen, SpecimenState.SOLD);
    }).toThrow('Invalid state transition');
  });
});

describe('Move Specimen to Storage', () => {
  it('should move specimen and update state', () => {
    const specimen = createMockSpecimen();
    specimen.state = SpecimenState.CATALOGING;
    
    const { specimen: updated, event } = moveSpecimenToStorage(
      specimen,
      'location-123',
      'Shelf 2, Row 3'
    );
    
    expect(updated.storage_location_id).toBe('location-123');
    expect(updated.storage_position).toBe('Shelf 2, Row 3');
    expect(updated.state).toBe(SpecimenState.STORED);
    expect(updated.version).toBe(specimen.version + 1);
    
    expect(event.type).toBe('specimen.stored');
    expect(event.storage_location_id).toBe('location-123');
  });
});

describe('Add Specimen to Collection Group', () => {
  it('should add specimen to group', () => {
    const specimen = createMockSpecimen();
    specimen.collection_group_ids = [];
    
    const { specimen: updated, event } = addSpecimenToGroup(
      specimen,
      'group-123',
      5
    );
    
    expect(updated.collection_group_ids).toContain('group-123');
    expect(updated.version).toBe(specimen.version + 1);
    
    expect(event.type).toBe('specimen.added_to_group');
    expect(event.collection_group_id).toBe('group-123');
    expect(event.payload.sort_order).toBe(5);
  });
  
  it('should preserve existing groups', () => {
    const specimen = createMockSpecimen();
    specimen.collection_group_ids = ['group-1', 'group-2'];
    
    const { specimen: updated } = addSpecimenToGroup(
      specimen,
      'group-3',
      10
    );
    
    expect(updated.collection_group_ids).toEqual(['group-1', 'group-2', 'group-3']);
  });
});

describe('Tag Specimen', () => {
  it('should tag specimen', () => {
    const specimen = createMockSpecimen();
    specimen.tag_ids = [];
    
    const { specimen: updated, event } = tagSpecimen(
      specimen,
      'tag-123',
      'Quartz',
      TagType.CATEGORY
    );
    
    expect(updated.tag_ids).toContain('tag-123');
    expect(updated.version).toBe(specimen.version + 1);
    
    expect(event.type).toBe('specimen.tagged');
    expect(event.tag_id).toBe('tag-123');
    expect(event.payload.tag_name).toBe('Quartz');
    expect(event.payload.tag_type).toBe(TagType.CATEGORY);
  });
});

describe('Send Specimen to Studio', () => {
  it('should send specimen to lapidary studio', () => {
    const specimen = createMockSpecimen();
    specimen.state = SpecimenState.STORED;
    
    const { specimen: updated, event } = sendSpecimenToStudio(
      specimen,
      'project-123',
      'Cabochon cutting'
    );
    
    expect(updated.state).toBe(SpecimenState.IN_STUDIO);
    expect(updated.lapidary_project_id).toBe('project-123');
    expect(updated.intended_use).toBe('Cabochon cutting');
    expect(updated.version).toBe(specimen.version + 1);
    
    expect(event.type).toBe('specimen.sent_to_studio');
    expect(event.lapidary_project_id).toBe('project-123');
    expect(event.payload.previous_state).toBe(SpecimenState.STORED);
    expect(event.payload.intended_use).toBe('Cabochon cutting');
  });
});

// =====================================================
// ZOD VALIDATION TESTS
// =====================================================

describe('Specimen Zod Schema', () => {
  it('should validate valid specimen', () => {
    const specimen = createMockSpecimen();
    const result = SpecimenSchema.safeParse(specimen);
    
    expect(result.success).toBe(true);
  });
  
  it('should reject invalid UUID', () => {
    const specimen = createMockSpecimen();
    specimen.id = 'not-a-uuid';
    
    const result = SpecimenSchema.safeParse(specimen);
    expect(result.success).toBe(false);
  });
  
  it('should reject negative weight', () => {
    const specimen = createMockSpecimen();
    specimen.weight_grams = -10;
    
    const result = SpecimenSchema.safeParse(specimen);
    expect(result.success).toBe(false);
  });
  
  it('should reject invalid Mohs hardness', () => {
    const specimen = createMockSpecimen();
    specimen.hardness_mohs = 11; // Max is 10
    
    const result = SpecimenSchema.safeParse(specimen);
    expect(result.success).toBe(false);
  });
  
  it('should reject invalid currency code', () => {
    const specimen = createMockSpecimen();
    specimen.acquisition_cost_currency = 'USDD'; // Should be 3 chars
    
    const result = SpecimenSchema.safeParse(specimen);
    expect(result.success).toBe(false);
  });
});

describe('StorageLocation Zod Schema', () => {
  it('should validate valid storage location', () => {
    const location = createMockStorageLocation();
    const result = StorageLocationSchema.safeParse(location);
    
    expect(result.success).toBe(true);
  });
  
  it('should reject negative capacity', () => {
    const location = createMockStorageLocation();
    location.capacity = -5;
    
    const result = StorageLocationSchema.safeParse(location);
    expect(result.success).toBe(false);
  });
  
  it('should reject empty name', () => {
    const location = createMockStorageLocation();
    location.name = '';
    
    const result = StorageLocationSchema.safeParse(location);
    expect(result.success).toBe(false);
  });
});

describe('Tag Zod Schema', () => {
  it('should validate valid tag', () => {
    const tag = createMockTag();
    const result = TagSchema.safeParse(tag);
    
    expect(result.success).toBe(true);
  });
  
  it('should reject invalid hex color', () => {
    const tag = createMockTag();
    tag.color = 'blue'; // Should be hex format
    
    const result = TagSchema.safeParse(tag);
    expect(result.success).toBe(false);
  });
  
  it('should accept valid hex colors', () => {
    const tag = createMockTag();
    tag.color = '#FF5733';
    
    const result = TagSchema.safeParse(tag);
    expect(result.success).toBe(true);
  });
});

describe('CollectionGroup Zod Schema', () => {
  it('should validate valid collection group', () => {
    const group = createMockCollectionGroup();
    const result = CollectionGroupSchema.safeParse(group);
    
    expect(result.success).toBe(true);
  });
  
  it('should reject invalid slug format', () => {
    const group = createMockCollectionGroup();
    group.slug = 'Invalid Slug!'; // Should be lowercase with hyphens
    
    const result = CollectionGroupSchema.safeParse(group);
    expect(result.success).toBe(false);
  });
  
  it('should accept valid slug', () => {
    const group = createMockCollectionGroup();
    group.slug = 'my-collection-123';
    
    const result = CollectionGroupSchema.safeParse(group);
    expect(result.success).toBe(true);
  });
});

// =====================================================
// SYNC PRIORITY TESTS
// =====================================================

describe('Sync Priorities', () => {
  it('should have correct priority order', () => {
    expect(COLLECTION_SYNC_PRIORITIES.SPECIMEN_CREATED_FROM_FINDLOG)
      .toBeGreaterThan(COLLECTION_SYNC_PRIORITIES.SPECIMEN_STATE_CHANGED);
    
    expect(COLLECTION_SYNC_PRIORITIES.STORAGE_LOCATION_CREATED)
      .toBeGreaterThan(COLLECTION_SYNC_PRIORITIES.SPECIMEN_STORED);
    
    expect(COLLECTION_SYNC_PRIORITIES.TAG_CREATED)
      .toBeGreaterThan(COLLECTION_SYNC_PRIORITIES.SPECIMEN_TAGGED);
  });
  
  it('should prioritize entity creation over updates', () => {
    expect(COLLECTION_SYNC_PRIORITIES.SPECIMEN_CREATED_FROM_FINDLOG)
      .toBeGreaterThan(COLLECTION_SYNC_PRIORITIES.SPECIMEN_UPDATED);
    
    expect(COLLECTION_SYNC_PRIORITIES.STORAGE_LOCATION_CREATED)
      .toBeGreaterThan(COLLECTION_SYNC_PRIORITIES.STORAGE_LOCATION_UPDATED);
  });
  
  it('should prioritize studio integration', () => {
    expect(COLLECTION_SYNC_PRIORITIES.SPECIMEN_SENT_TO_STUDIO)
      .toBeGreaterThan(COLLECTION_SYNC_PRIORITIES.SPECIMEN_STATE_CHANGED);
  });
});
