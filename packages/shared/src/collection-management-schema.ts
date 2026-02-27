/**
 * Collection Management Schema
 * 
 * Complete data model for managing specimens after field collection.
 * Handles the lifecycle: FieldSession → FindLog → Specimen → Collection
 * 
 * Core Entities:
 * - Specimen: Individual specimen in collection (linked to FindLog)
 * - StorageLocation: Physical storage locations (shelves, boxes, drawers)
 * - Tag: Labels and categories for organizing specimens
 * - CollectionGroup: Themed collections or sets
 * 
 * Features:
 * - Deterministic lifecycle transitions
 * - Event sourcing for complete audit trail
 * - Offline-first with priority-based sync
 * - Integration with FindLog and Lapidary Studio
 */

import { z } from 'zod';

// =====================================================
// ENUMS
// =====================================================

/**
 * Specimen lifecycle states
 * Deterministic state machine from field find to collection
 */
export enum SpecimenState {
  FIELD_COLLECTED = 'FIELD_COLLECTED',     // Found in field (linked to FindLog)
  IN_TRANSIT = 'IN_TRANSIT',               // Being transported home
  RECEIVED = 'RECEIVED',                   // Arrived home, needs processing
  CLEANING = 'CLEANING',                   // Being cleaned/prepared
  IDENTIFYING = 'IDENTIFYING',             // Undergoing identification
  CATALOGING = 'CATALOGING',               // Being cataloged/documented
  STORED = 'STORED',                       // In permanent storage
  ON_DISPLAY = 'ON_DISPLAY',               // Currently displayed
  ON_LOAN = 'ON_LOAN',                     // Loaned to someone
  IN_STUDIO = 'IN_STUDIO',                 // In lapidary studio for cutting
  SOLD = 'SOLD',                           // Sold to collector
  DONATED = 'DONATED',                     // Donated to museum/institution
  LOST = 'LOST',                           // Lost or misplaced
  DESTROYED = 'DESTROYED',                 // Damaged beyond use
}

/**
 * Specimen condition assessment
 */
export enum SpecimenCondition {
  EXCELLENT = 'EXCELLENT',                 // Museum quality, no damage
  VERY_GOOD = 'VERY_GOOD',                 // Minor imperfections
  GOOD = 'GOOD',                           // Some wear, fully intact
  FAIR = 'FAIR',                           // Noticeable damage, still valuable
  POOR = 'POOR',                           // Significant damage
  DAMAGED = 'DAMAGED',                     // Heavily damaged but salvageable
}

/**
 * Acquisition methods
 */
export enum AcquisitionMethod {
  FIELD_COLLECTED = 'FIELD_COLLECTED',     // Found in field (from FindLog)
  PURCHASED = 'PURCHASED',                 // Bought from dealer/show
  TRADED = 'TRADED',                       // Traded with collector
  GIFTED = 'GIFTED',                       // Received as gift
  INHERITED = 'INHERITED',                 // Inherited from collection
  UNKNOWN = 'UNKNOWN',                     // Unknown provenance
}

/**
 * Storage location types
 */
export enum StorageLocationType {
  ROOM = 'ROOM',                           // Room (e.g., "Rock Room")
  SHELF = 'SHELF',                         // Shelf unit
  CABINET = 'CABINET',                     // Cabinet/armoire
  DRAWER = 'DRAWER',                       // Drawer
  BOX = 'BOX',                             // Storage box
  CONTAINER = 'CONTAINER',                 // Container/bin
  DISPLAY_CASE = 'DISPLAY_CASE',           // Display case
  SAFE = 'SAFE',                           // Safe for valuable specimens
}

/**
 * Tag types for organization
 */
export enum TagType {
  CATEGORY = 'CATEGORY',                   // Material category (Quartz, Feldspar, etc.)
  LOCATION = 'LOCATION',                   // Location-based (Arizona, California, etc.)
  QUALITY = 'QUALITY',                     // Quality rating (Museum, Display, Study, etc.)
  PROJECT = 'PROJECT',                     // Project-based (Lapidary, Research, etc.)
  CUSTOM = 'CUSTOM',                       // User-defined tags
}

/**
 * Collection group types
 */
export enum CollectionGroupType {
  MATERIAL_TYPE = 'MATERIAL_TYPE',         // Grouped by material (All Quartz)
  LOCATION = 'LOCATION',                   // Grouped by location (Arizona Collection)
  DATE_RANGE = 'DATE_RANGE',               // Grouped by time (2024 Finds)
  THEME = 'THEME',                         // Themed (Fluorescent Minerals)
  PROJECT = 'PROJECT',                     // Project-based (Lapidary Projects)
  CUSTOM = 'CUSTOM',                       // User-defined grouping
}

/**
 * Sync status for offline-first operation
 */
export enum SyncStatus {
  LOCAL_ONLY = 'LOCAL_ONLY',               // Not yet synced
  QUEUED = 'QUEUED',                       // Queued for sync
  SYNCING = 'SYNCING',                     // Currently syncing
  SYNCED = 'SYNCED',                       // Successfully synced
  FAILED = 'FAILED',                       // Sync failed
}

// =====================================================
// CORE INTERFACES
// =====================================================

/**
 * Specimen - Individual specimen in collection
 * 
 * Represents a physical specimen that has been collected and added to
 * the user's collection. Links back to FindLog for provenance tracking.
 */
export interface Specimen {
  // Identity
  id: string;
  user_id: string;
  device_id: string;
  
  // Provenance (links to field collection)
  find_log_id?: string;                    // Link to FindLog (if field collected)
  field_session_id?: string;               // Link to FieldSession
  capture_session_id?: string;             // Link to camera identification
  
  // Basic information
  material_id: string;                     // Material type
  material_name: string;                   // Display name
  variety?: string;                        // Variety (e.g., "Smoky" for Quartz)
  
  // Specimen details
  specimen_number: string;                 // Unique catalog number (e.g., "QZ-2024-001")
  state: SpecimenState;
  condition: SpecimenCondition;
  
  // Physical properties
  weight_grams?: number;
  dimensions_mm?: {
    length: number;
    width: number;
    height: number;
  };
  color?: string;
  luster?: string;
  transparency?: string;
  crystal_system?: string;
  
  // Acquisition
  acquisition_method: AcquisitionMethod;
  acquisition_date: Date;
  acquisition_cost?: number;               // Purchase price
  acquisition_cost_currency?: string;      // Currency code (USD, EUR, etc.)
  acquired_from?: string;                  // Dealer, show, location, etc.
  
  // Location context (from FindLog or manual entry)
  collection_location?: string;            // Where collected (city, state, country)
  collection_site?: string;                // Specific site
  collection_coordinates?: {
    lat: number;
    lon: number;
  };
  
  // Storage
  storage_location_id?: string;            // Current storage location
  storage_position?: string;               // Specific position (e.g., "Shelf 2, Row 3")
  
  // Collection organization
  collection_group_ids: string[];          // Collections this specimen belongs to
  tag_ids: string[];                       // Tags applied
  
  // Documentation
  title?: string;                          // Display title
  description?: string;                    // Detailed description
  notes?: string;                          // Additional notes
  photo_paths: string[];                   // Photos of specimen
  
  // Scientific
  scientific_name?: string;                // Scientific classification
  chemical_formula?: string;               // Chemical composition
  hardness_mohs?: number;                  // Mohs hardness scale
  specific_gravity?: number;
  
  // Valuation
  estimated_value?: number;
  estimated_value_currency?: string;
  appraisal_date?: Date;
  appraised_by?: string;
  
  // Lapidary Studio integration
  lapidary_project_id?: string;            // Link to lapidary project
  intended_use?: string;                   // Cutting, cabbing, faceting, etc.
  
  // Status flags
  is_favorite: boolean;
  is_for_sale: boolean;
  is_for_trade: boolean;
  is_on_display: boolean;
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  // Event sourcing
  sequence_number: number;                 // For deterministic replay
  
  // Sync metadata
  sync_status: SyncStatus;
  sync_priority: number;
  sync_attempts: number;
  last_sync_attempt_at?: Date;
  synced_at?: Date;
  
  // Optimistic locking
  version: number;
  
  // Timestamps
  client_created_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * StorageLocation - Physical storage locations
 * 
 * Hierarchical storage system (Room > Shelf > Box > Position)
 */
export interface StorageLocation {
  // Identity
  id: string;
  user_id: string;
  device_id: string;
  
  // Hierarchy
  parent_location_id?: string;             // Parent location (for nested storage)
  
  // Basic information
  name: string;                            // Display name (e.g., "Main Shelf", "Red Box")
  type: StorageLocationType;
  code?: string;                           // Short code (e.g., "MS-01", "RB-03")
  
  // Physical details
  description?: string;
  dimensions?: string;                     // Freeform (e.g., "24x36x12 inches")
  capacity?: number;                       // Number of specimens it can hold
  current_count: number;                   // Current specimen count
  
  // Organization
  is_primary: boolean;                     // Primary storage location
  sort_order: number;                      // Display order
  
  // Documentation
  photo_path?: string;
  notes?: string;
  
  // Event sourcing
  sequence_number: number;
  
  // Sync metadata
  sync_status: SyncStatus;
  sync_priority: number;
  sync_attempts: number;
  last_sync_attempt_at?: Date;
  synced_at?: Date;
  
  // Optimistic locking
  version: number;
  
  // Timestamps
  client_created_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Tag - Labels for organizing specimens
 */
export interface Tag {
  // Identity
  id: string;
  user_id: string;
  device_id: string;
  
  // Basic information
  name: string;                            // Tag name
  type: TagType;
  color?: string;                          // Hex color for UI
  icon?: string;                           // Icon identifier
  
  // Organization
  parent_tag_id?: string;                  // For hierarchical tags
  sort_order: number;
  
  // Usage
  specimen_count: number;                  // Number of specimens with this tag
  
  // Metadata
  description?: string;
  metadata?: Record<string, unknown>;
  
  // Event sourcing
  sequence_number: number;
  
  // Sync metadata
  sync_status: SyncStatus;
  sync_priority: number;
  sync_attempts: number;
  last_sync_attempt_at?: Date;
  synced_at?: Date;
  
  // Optimistic locking
  version: number;
  
  // Timestamps
  client_created_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * CollectionGroup - Themed collections or sets
 */
export interface CollectionGroup {
  // Identity
  id: string;
  user_id: string;
  device_id: string;
  
  // Basic information
  name: string;                            // Collection name
  type: CollectionGroupType;
  slug: string;                            // URL-friendly identifier
  
  // Details
  description?: string;
  notes?: string;
  
  // Organization
  parent_group_id?: string;                // For nested collections
  is_public: boolean;                      // Share publicly
  sort_order: number;
  
  // Aggregated metrics
  specimen_count: number;
  total_weight_grams?: number;
  estimated_total_value?: number;
  
  // Documentation
  cover_photo_path?: string;
  photo_paths: string[];
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  // Event sourcing
  sequence_number: number;
  
  // Sync metadata
  sync_status: SyncStatus;
  sync_priority: number;
  sync_attempts: number;
  last_sync_attempt_at?: Date;
  synced_at?: Date;
  
  // Optimistic locking
  version: number;
  
  // Timestamps
  client_created_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * SpecimenTag - Many-to-many relationship between Specimen and Tag
 */
export interface SpecimenTag {
  id: string;
  specimen_id: string;
  tag_id: string;
  user_id: string;
  device_id: string;
  
  // Metadata
  added_at: Date;
  
  // Sync metadata
  sync_status: SyncStatus;
  client_created_at: Date;
  created_at: Date;
}

/**
 * CollectionGroupSpecimen - Many-to-many relationship between CollectionGroup and Specimen
 */
export interface CollectionGroupSpecimen {
  id: string;
  collection_group_id: string;
  specimen_id: string;
  user_id: string;
  device_id: string;
  
  // Organization
  sort_order: number;                      // Order within collection
  notes?: string;                          // Why this specimen is in collection
  
  // Metadata
  added_at: Date;
  
  // Sync metadata
  sync_status: SyncStatus;
  client_created_at: Date;
  created_at: Date;
}

// =====================================================
// EVENT TYPES (Event Sourcing)
// =====================================================

/**
 * Base event for all collection management events
 */
export interface BaseCollectionEvent {
  id: string;
  user_id: string;
  device_id: string;
  type: string;
  timestamp: Date;
  sequence_number: number;
  sync_status: SyncStatus;
}

/**
 * Specimen created from FindLog
 */
export interface SpecimenCreatedFromFindLogEvent extends BaseCollectionEvent {
  type: 'specimen.created_from_findlog';
  specimen_id: string;
  find_log_id: string;
  field_session_id?: string;
  material_id: string;
  acquisition_date: Date;
  payload: {
    specimen_number: string;
    initial_state: SpecimenState;
    acquisition_method: AcquisitionMethod;
  };
}

/**
 * Specimen state changed
 */
export interface SpecimenStateChangedEvent extends BaseCollectionEvent {
  type: 'specimen.state_changed';
  specimen_id: string;
  payload: {
    previous_state: SpecimenState;
    new_state: SpecimenState;
    reason?: string;
  };
}

/**
 * Specimen moved to storage
 */
export interface SpecimenStoredEvent extends BaseCollectionEvent {
  type: 'specimen.stored';
  specimen_id: string;
  storage_location_id: string;
  payload: {
    previous_location_id?: string;
    storage_position?: string;
  };
}

/**
 * Specimen added to collection group
 */
export interface SpecimenAddedToGroupEvent extends BaseCollectionEvent {
  type: 'specimen.added_to_group';
  specimen_id: string;
  collection_group_id: string;
  payload: {
    sort_order: number;
  };
}

/**
 * Specimen tagged
 */
export interface SpecimenTaggedEvent extends BaseCollectionEvent {
  type: 'specimen.tagged';
  specimen_id: string;
  tag_id: string;
  payload: {
    tag_name: string;
    tag_type: TagType;
  };
}

/**
 * Specimen sent to lapidary studio
 */
export interface SpecimenSentToStudioEvent extends BaseCollectionEvent {
  type: 'specimen.sent_to_studio';
  specimen_id: string;
  lapidary_project_id: string;
  payload: {
    previous_state: SpecimenState;
    intended_use: string;
  };
}

/**
 * Storage location created
 */
export interface StorageLocationCreatedEvent extends BaseCollectionEvent {
  type: 'storage_location.created';
  storage_location_id: string;
  payload: {
    name: string;
    type: StorageLocationType;
    parent_location_id?: string;
  };
}

/**
 * Collection group created
 */
export interface CollectionGroupCreatedEvent extends BaseCollectionEvent {
  type: 'collection_group.created';
  collection_group_id: string;
  payload: {
    name: string;
    type: CollectionGroupType;
    is_public: boolean;
  };
}

/**
 * Tag created
 */
export interface TagCreatedEvent extends BaseCollectionEvent {
  type: 'tag.created';
  tag_id: string;
  payload: {
    name: string;
    type: TagType;
    color?: string;
  };
}

/**
 * Union type for all collection events
 */
export type CollectionEvent =
  | SpecimenCreatedFromFindLogEvent
  | SpecimenStateChangedEvent
  | SpecimenStoredEvent
  | SpecimenAddedToGroupEvent
  | SpecimenTaggedEvent
  | SpecimenSentToStudioEvent
  | StorageLocationCreatedEvent
  | CollectionGroupCreatedEvent
  | TagCreatedEvent;

// =====================================================
// SYNC PRIORITIES
// =====================================================

/**
 * Sync priorities for collection management events
 * Higher number = higher priority
 */
export const COLLECTION_SYNC_PRIORITIES = {
  SPECIMEN_CREATED_FROM_FINDLOG: 90,       // High priority (creates core entity)
  SPECIMEN_STATE_CHANGED: 75,              // State changes important for consistency
  SPECIMEN_STORED: 70,                     // Storage updates
  SPECIMEN_TAGGED: 60,                     // Tag associations
  SPECIMEN_ADDED_TO_GROUP: 60,             // Collection associations
  SPECIMEN_SENT_TO_STUDIO: 80,             // High priority (workflow integration)
  STORAGE_LOCATION_CREATED: 85,            // Create locations before specimens stored
  COLLECTION_GROUP_CREATED: 85,            // Create groups before specimens added
  TAG_CREATED: 85,                         // Create tags before specimens tagged
  SPECIMEN_UPDATED: 65,                    // General updates
  STORAGE_LOCATION_UPDATED: 60,
  COLLECTION_GROUP_UPDATED: 60,
  TAG_UPDATED: 60,
} as const;

// =====================================================
// ZOD VALIDATION SCHEMAS
// =====================================================

/**
 * Zod schema for Specimen
 */
export const SpecimenSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  device_id: z.string().min(1),
  
  find_log_id: z.string().uuid().optional(),
  field_session_id: z.string().uuid().optional(),
  capture_session_id: z.string().uuid().optional(),
  
  material_id: z.string().min(1),
  material_name: z.string().min(1),
  variety: z.string().optional(),
  
  specimen_number: z.string().min(1),
  state: z.nativeEnum(SpecimenState),
  condition: z.nativeEnum(SpecimenCondition),
  
  weight_grams: z.number().positive().optional(),
  dimensions_mm: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
  color: z.string().optional(),
  luster: z.string().optional(),
  transparency: z.string().optional(),
  crystal_system: z.string().optional(),
  
  acquisition_method: z.nativeEnum(AcquisitionMethod),
  acquisition_date: z.date(),
  acquisition_cost: z.number().nonnegative().optional(),
  acquisition_cost_currency: z.string().length(3).optional(),
  acquired_from: z.string().optional(),
  
  collection_location: z.string().optional(),
  collection_site: z.string().optional(),
  collection_coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }).optional(),
  
  storage_location_id: z.string().uuid().optional(),
  storage_position: z.string().optional(),
  
  collection_group_ids: z.array(z.string().uuid()),
  tag_ids: z.array(z.string().uuid()),
  
  title: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  photo_paths: z.array(z.string()),
  
  scientific_name: z.string().optional(),
  chemical_formula: z.string().optional(),
  hardness_mohs: z.number().min(1).max(10).optional(),
  specific_gravity: z.number().positive().optional(),
  
  estimated_value: z.number().nonnegative().optional(),
  estimated_value_currency: z.string().length(3).optional(),
  appraisal_date: z.date().optional(),
  appraised_by: z.string().optional(),
  
  lapidary_project_id: z.string().uuid().optional(),
  intended_use: z.string().optional(),
  
  is_favorite: z.boolean(),
  is_for_sale: z.boolean(),
  is_for_trade: z.boolean(),
  is_on_display: z.boolean(),
  
  metadata: z.record(z.unknown()).optional(),
  
  sequence_number: z.number().int().nonnegative(),
  
  sync_status: z.nativeEnum(SyncStatus),
  sync_priority: z.number().int(),
  sync_attempts: z.number().int().nonnegative(),
  last_sync_attempt_at: z.date().optional(),
  synced_at: z.date().optional(),
  
  version: z.number().int().positive(),
  
  client_created_at: z.date(),
  created_at: z.date(),
  updated_at: z.date(),
});

/**
 * Zod schema for StorageLocation
 */
export const StorageLocationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  device_id: z.string().min(1),
  
  parent_location_id: z.string().uuid().optional(),
  
  name: z.string().min(1).max(200),
  type: z.nativeEnum(StorageLocationType),
  code: z.string().max(50).optional(),
  
  description: z.string().optional(),
  dimensions: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  current_count: z.number().int().nonnegative(),
  
  is_primary: z.boolean(),
  sort_order: z.number().int().nonnegative(),
  
  photo_path: z.string().optional(),
  notes: z.string().optional(),
  
  sequence_number: z.number().int().nonnegative(),
  
  sync_status: z.nativeEnum(SyncStatus),
  sync_priority: z.number().int(),
  sync_attempts: z.number().int().nonnegative(),
  last_sync_attempt_at: z.date().optional(),
  synced_at: z.date().optional(),
  
  version: z.number().int().positive(),
  
  client_created_at: z.date(),
  created_at: z.date(),
  updated_at: z.date(),
});

/**
 * Zod schema for Tag
 */
export const TagSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  device_id: z.string().min(1),
  
  name: z.string().min(1).max(100),
  type: z.nativeEnum(TagType),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().optional(),
  
  parent_tag_id: z.string().uuid().optional(),
  sort_order: z.number().int().nonnegative(),
  
  specimen_count: z.number().int().nonnegative(),
  
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  
  sequence_number: z.number().int().nonnegative(),
  
  sync_status: z.nativeEnum(SyncStatus),
  sync_priority: z.number().int(),
  sync_attempts: z.number().int().nonnegative(),
  last_sync_attempt_at: z.date().optional(),
  synced_at: z.date().optional(),
  
  version: z.number().int().positive(),
  
  client_created_at: z.date(),
  created_at: z.date(),
  updated_at: z.date(),
});

/**
 * Zod schema for CollectionGroup
 */
export const CollectionGroupSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  device_id: z.string().min(1),
  
  name: z.string().min(1).max(200),
  type: z.nativeEnum(CollectionGroupType),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  
  description: z.string().optional(),
  notes: z.string().optional(),
  
  parent_group_id: z.string().uuid().optional(),
  is_public: z.boolean(),
  sort_order: z.number().int().nonnegative(),
  
  specimen_count: z.number().int().nonnegative(),
  total_weight_grams: z.number().nonnegative().optional(),
  estimated_total_value: z.number().nonnegative().optional(),
  
  cover_photo_path: z.string().optional(),
  photo_paths: z.array(z.string()),
  
  metadata: z.record(z.unknown()).optional(),
  
  sequence_number: z.number().int().nonnegative(),
  
  sync_status: z.nativeEnum(SyncStatus),
  sync_priority: z.number().int(),
  sync_attempts: z.number().int().nonnegative(),
  last_sync_attempt_at: z.date().optional(),
  synced_at: z.date().optional(),
  
  version: z.number().int().positive(),
  
  client_created_at: z.date(),
  created_at: z.date(),
  updated_at: z.date(),
});

// =====================================================
// BUSINESS LOGIC FUNCTIONS
// =====================================================

/**
 * Valid state transitions for Specimen lifecycle
 */
const VALID_SPECIMEN_TRANSITIONS: Record<SpecimenState, SpecimenState[]> = {
  [SpecimenState.FIELD_COLLECTED]: [SpecimenState.IN_TRANSIT, SpecimenState.RECEIVED],
  [SpecimenState.IN_TRANSIT]: [SpecimenState.RECEIVED, SpecimenState.LOST],
  [SpecimenState.RECEIVED]: [SpecimenState.CLEANING, SpecimenState.IDENTIFYING, SpecimenState.CATALOGING],
  [SpecimenState.CLEANING]: [SpecimenState.IDENTIFYING, SpecimenState.CATALOGING, SpecimenState.STORED],
  [SpecimenState.IDENTIFYING]: [SpecimenState.CATALOGING, SpecimenState.STORED],
  [SpecimenState.CATALOGING]: [SpecimenState.STORED, SpecimenState.ON_DISPLAY],
  [SpecimenState.STORED]: [SpecimenState.ON_DISPLAY, SpecimenState.ON_LOAN, SpecimenState.IN_STUDIO, SpecimenState.SOLD, SpecimenState.DONATED, SpecimenState.LOST],
  [SpecimenState.ON_DISPLAY]: [SpecimenState.STORED, SpecimenState.ON_LOAN, SpecimenState.SOLD, SpecimenState.DONATED],
  [SpecimenState.ON_LOAN]: [SpecimenState.STORED, SpecimenState.LOST],
  [SpecimenState.IN_STUDIO]: [SpecimenState.STORED, SpecimenState.DESTROYED],
  [SpecimenState.SOLD]: [],
  [SpecimenState.DONATED]: [],
  [SpecimenState.LOST]: [SpecimenState.STORED], // Found again
  [SpecimenState.DESTROYED]: [],
};

/**
 * Check if a specimen state transition is valid
 */
export function isValidSpecimenTransition(
  currentState: SpecimenState,
  newState: SpecimenState
): boolean {
  const allowedTransitions = VALID_SPECIMEN_TRANSITIONS[currentState];
  return allowedTransitions.includes(newState);
}

/**
 * Get allowed next states for a specimen
 */
export function getAllowedNextStates(currentState: SpecimenState): SpecimenState[] {
  return VALID_SPECIMEN_TRANSITIONS[currentState];
}

/**
 * Generate unique specimen number
 * Format: {MaterialCode}-{Year}-{SequenceNumber}
 * Example: QZ-2024-001
 */
export function generateSpecimenNumber(
  materialCode: string,
  year: number,
  sequenceNumber: number
): string {
  const paddedSequence = sequenceNumber.toString().padStart(3, '0');
  return `${materialCode.toUpperCase()}-${year}-${paddedSequence}`;
}

/**
 * Parse specimen number
 */
export function parseSpecimenNumber(specimenNumber: string): {
  materialCode: string;
  year: number;
  sequenceNumber: number;
} | null {
  const match = specimenNumber.match(/^([A-Z]+)-(\d{4})-(\d{3})$/);
  if (!match) return null;
  
  const materialCode = match[1];
  const yearStr = match[2];
  const sequenceStr = match[3];
  
  // Guard against undefined match groups (strict mode)
  if (!materialCode || !yearStr || !sequenceStr) return null;
  
  return {
    materialCode,
    year: parseInt(yearStr, 10),
    sequenceNumber: parseInt(sequenceStr, 10),
  };
}

/**
 * Create specimen from FindLog
 * Deterministic function for lifecycle transition
 */
export function buildSpecimenFromFindLog(data: {
  findLog: {
    id: string;
    session_id?: string;
    material_id: string;
    material_name: string;
    variety?: string;
    quality_rating?: number;
    weight_grams?: number;
    notes?: string;
    photo_paths: string[];
    lat?: number;
    lon?: number;
    location_description?: string;
    logged_at: Date;
  };
  specimenNumber: string;
  userId: string;
  deviceId: string;
}): Omit<Specimen, 'id' | 'created_at' | 'updated_at'> {
  const { findLog, specimenNumber, userId, deviceId } = data;
  
  // Map quality rating to condition
  const condition = mapQualityToCondition(findLog.quality_rating);
  
  return {
    user_id: userId,
    device_id: deviceId,
    
    // Provenance
    find_log_id: findLog.id,
    field_session_id: findLog.session_id,
    capture_session_id: undefined,
    
    // Basic info
    material_id: findLog.material_id,
    material_name: findLog.material_name,
    variety: findLog.variety,
    
    // Specimen details
    specimen_number: specimenNumber,
    state: SpecimenState.FIELD_COLLECTED,
    condition,
    
    // Physical properties from FindLog
    weight_grams: findLog.weight_grams,
    dimensions_mm: undefined,
    color: undefined,
    luster: undefined,
    transparency: undefined,
    crystal_system: undefined,
    
    // Acquisition
    acquisition_method: AcquisitionMethod.FIELD_COLLECTED,
    acquisition_date: findLog.logged_at,
    acquisition_cost: undefined,
    acquisition_cost_currency: undefined,
    acquired_from: undefined,
    
    // Location from FindLog
    collection_location: findLog.location_description,
    collection_site: undefined,
    collection_coordinates: findLog.lat && findLog.lon ? {
      lat: findLog.lat,
      lon: findLog.lon,
    } : undefined,
    
    // Storage (not yet assigned)
    storage_location_id: undefined,
    storage_position: undefined,
    
    // Collections (empty initially)
    collection_group_ids: [],
    tag_ids: [],
    
    // Documentation from FindLog
    title: undefined,
    description: undefined,
    notes: findLog.notes,
    photo_paths: [...findLog.photo_paths],
    
    // Scientific (to be filled in later)
    scientific_name: undefined,
    chemical_formula: undefined,
    hardness_mohs: undefined,
    specific_gravity: undefined,
    
    // Valuation (unknown initially)
    estimated_value: undefined,
    estimated_value_currency: undefined,
    appraisal_date: undefined,
    appraised_by: undefined,
    
    // Lapidary
    lapidary_project_id: undefined,
    intended_use: undefined,
    
    // Status flags
    is_favorite: false,
    is_for_sale: false,
    is_for_trade: false,
    is_on_display: false,
    
    // Metadata
    metadata: {},
    
    // Event sourcing
    sequence_number: 0,
    
    // Sync
    sync_status: SyncStatus.LOCAL_ONLY,
    sync_priority: COLLECTION_SYNC_PRIORITIES.SPECIMEN_CREATED_FROM_FINDLOG,
    sync_attempts: 0,
    last_sync_attempt_at: undefined,
    synced_at: undefined,
    
    // Version
    version: 1,
    
    // Timestamps
    client_created_at: new Date(),
  };
}

/**
 * Map FindLog quality rating to Specimen condition
 */
function mapQualityToCondition(qualityRating?: number): SpecimenCondition {
  if (!qualityRating) return SpecimenCondition.GOOD;
  
  if (qualityRating >= 9) return SpecimenCondition.EXCELLENT;
  if (qualityRating >= 7) return SpecimenCondition.VERY_GOOD;
  if (qualityRating >= 5) return SpecimenCondition.GOOD;
  if (qualityRating >= 3) return SpecimenCondition.FAIR;
  return SpecimenCondition.POOR;
}

/**
 * Calculate total value of collection group
 */
export function calculateCollectionGroupValue(specimens: Specimen[]): {
  total_weight_grams: number;
  estimated_total_value: number;
  specimen_count: number;
} {
  const total_weight_grams = specimens.reduce(
    (sum, s) => sum + (s.weight_grams || 0),
    0
  );
  
  const estimated_total_value = specimens.reduce(
    (sum, s) => sum + (s.estimated_value || 0),
    0
  );
  
  return {
    total_weight_grams,
    estimated_total_value,
    specimen_count: specimens.length,
  };
}

/**
 * Generate storage location code
 * Format: {TypePrefix}{ParentCode}-{Number}
 * Example: SH-01 (Shelf 1), SH01-BX-03 (Box 3 on Shelf 1)
 */
export function generateStorageLocationCode(
  type: StorageLocationType,
  parentCode: string | undefined,
  sequenceNumber: number
): string {
  const typePrefix = getStorageTypePrefix(type);
  const paddedNumber = sequenceNumber.toString().padStart(2, '0');
  
  if (parentCode) {
    return `${parentCode}-${typePrefix}-${paddedNumber}`;
  }
  
  return `${typePrefix}-${paddedNumber}`;
}

/**
 * Get storage type prefix
 */
function getStorageTypePrefix(type: StorageLocationType): string {
  const prefixes: Record<StorageLocationType, string> = {
    [StorageLocationType.ROOM]: 'RM',
    [StorageLocationType.SHELF]: 'SH',
    [StorageLocationType.CABINET]: 'CB',
    [StorageLocationType.DRAWER]: 'DR',
    [StorageLocationType.BOX]: 'BX',
    [StorageLocationType.CONTAINER]: 'CT',
    [StorageLocationType.DISPLAY_CASE]: 'DC',
    [StorageLocationType.SAFE]: 'SF',
  };
  
  return prefixes[type];
}

/**
 * Build hierarchical storage path
 * Example: "Rock Room > Main Shelf > Red Box"
 */
export function buildStorageLocationPath(
  location: StorageLocation,
  allLocations: StorageLocation[]
): string {
  const path: string[] = [location.name];
  let current = location;
  
  while (current.parent_location_id) {
    const parent = allLocations.find(l => l.id === current.parent_location_id);
    if (!parent) break;
    
    path.unshift(parent.name);
    current = parent;
  }
  
  return path.join(' > ');
}

/**
 * Check if storage location is at capacity
 */
export function isStorageLocationFull(location: StorageLocation): boolean {
  if (!location.capacity) return false;
  return location.current_count >= location.capacity;
}

/**
 * Get available capacity
 */
export function getAvailableCapacity(location: StorageLocation): number | null {
  if (!location.capacity) return null;
  return Math.max(0, location.capacity - location.current_count);
}

// =====================================================
// CRUD OPERATIONS (Deterministic)
// =====================================================

/**
 * Create specimen from FindLog
 */
export async function createSpecimenFromFindLog(
  findLog: Parameters<typeof buildSpecimenFromFindLog>[0]['findLog'],
  options: {
    userId: string;
    deviceId: string;
    specimenNumber: string;
  }
): Promise<{ specimen: Specimen; event: SpecimenCreatedFromFindLogEvent }> {
  const now = new Date();
  const specimenId = crypto.randomUUID();
  
  const specimenData = buildSpecimenFromFindLog({
    findLog,
    specimenNumber: options.specimenNumber,
    userId: options.userId,
    deviceId: options.deviceId,
  });
  
  const specimen: Specimen = {
    ...specimenData,
    id: specimenId,
    created_at: now,
    updated_at: now,
  };
  
  const event: SpecimenCreatedFromFindLogEvent = {
    id: crypto.randomUUID(),
    user_id: options.userId,
    device_id: options.deviceId,
    type: 'specimen.created_from_findlog',
    timestamp: now,
    sequence_number: 0,
    sync_status: SyncStatus.LOCAL_ONLY,
    specimen_id: specimenId,
    find_log_id: findLog.id,
    field_session_id: findLog.session_id,
    material_id: findLog.material_id,
    acquisition_date: findLog.logged_at,
    payload: {
      specimen_number: options.specimenNumber,
      initial_state: SpecimenState.FIELD_COLLECTED,
      acquisition_method: AcquisitionMethod.FIELD_COLLECTED,
    },
  };
  
  return { specimen, event };
}

/**
 * Change specimen state
 */
export function changeSpecimenState(
  specimen: Specimen,
  newState: SpecimenState,
  reason?: string
): { specimen: Specimen; event: SpecimenStateChangedEvent } {
  if (!isValidSpecimenTransition(specimen.state, newState)) {
    throw new Error(
      `Invalid state transition: ${specimen.state} -> ${newState}`
    );
  }
  
  const now = new Date();
  
  const updatedSpecimen: Specimen = {
    ...specimen,
    state: newState,
    sequence_number: specimen.sequence_number + 1,
    version: specimen.version + 1,
    updated_at: now,
  };
  
  const event: SpecimenStateChangedEvent = {
    id: crypto.randomUUID(),
    user_id: specimen.user_id,
    device_id: specimen.device_id,
    type: 'specimen.state_changed',
    timestamp: now,
    sequence_number: updatedSpecimen.sequence_number,
    sync_status: SyncStatus.LOCAL_ONLY,
    specimen_id: specimen.id,
    payload: {
      previous_state: specimen.state,
      new_state: newState,
      reason,
    },
  };
  
  return { specimen: updatedSpecimen, event };
}

/**
 * Move specimen to storage location
 */
export function moveSpecimenToStorage(
  specimen: Specimen,
  storageLocationId: string,
  storagePosition?: string
): { specimen: Specimen; event: SpecimenStoredEvent } {
  const now = new Date();
  
  const updatedSpecimen: Specimen = {
    ...specimen,
    storage_location_id: storageLocationId,
    storage_position: storagePosition,
    state: SpecimenState.STORED,
    sequence_number: specimen.sequence_number + 1,
    version: specimen.version + 1,
    updated_at: now,
  };
  
  const event: SpecimenStoredEvent = {
    id: crypto.randomUUID(),
    user_id: specimen.user_id,
    device_id: specimen.device_id,
    type: 'specimen.stored',
    timestamp: now,
    sequence_number: updatedSpecimen.sequence_number,
    sync_status: SyncStatus.LOCAL_ONLY,
    specimen_id: specimen.id,
    storage_location_id: storageLocationId,
    payload: {
      previous_location_id: specimen.storage_location_id,
      storage_position: storagePosition,
    },
  };
  
  return { specimen: updatedSpecimen, event };
}

/**
 * Add specimen to collection group
 */
export function addSpecimenToGroup(
  specimen: Specimen,
  collectionGroupId: string,
  sortOrder: number
): { specimen: Specimen; event: SpecimenAddedToGroupEvent } {
  const now = new Date();
  
  const updatedSpecimen: Specimen = {
    ...specimen,
    collection_group_ids: [...specimen.collection_group_ids, collectionGroupId],
    sequence_number: specimen.sequence_number + 1,
    version: specimen.version + 1,
    updated_at: now,
  };
  
  const event: SpecimenAddedToGroupEvent = {
    id: crypto.randomUUID(),
    user_id: specimen.user_id,
    device_id: specimen.device_id,
    type: 'specimen.added_to_group',
    timestamp: now,
    sequence_number: updatedSpecimen.sequence_number,
    sync_status: SyncStatus.LOCAL_ONLY,
    specimen_id: specimen.id,
    collection_group_id: collectionGroupId,
    payload: {
      sort_order: sortOrder,
    },
  };
  
  return { specimen: updatedSpecimen, event };
}

/**
 * Tag specimen
 */
export function tagSpecimen(
  specimen: Specimen,
  tagId: string,
  tagName: string,
  tagType: TagType
): { specimen: Specimen; event: SpecimenTaggedEvent } {
  const now = new Date();
  
  const updatedSpecimen: Specimen = {
    ...specimen,
    tag_ids: [...specimen.tag_ids, tagId],
    sequence_number: specimen.sequence_number + 1,
    version: specimen.version + 1,
    updated_at: now,
  };
  
  const event: SpecimenTaggedEvent = {
    id: crypto.randomUUID(),
    user_id: specimen.user_id,
    device_id: specimen.device_id,
    type: 'specimen.tagged',
    timestamp: now,
    sequence_number: updatedSpecimen.sequence_number,
    sync_status: SyncStatus.LOCAL_ONLY,
    specimen_id: specimen.id,
    tag_id: tagId,
    payload: {
      tag_name: tagName,
      tag_type: tagType,
    },
  };
  
  return { specimen: updatedSpecimen, event };
}

/**
 * Send specimen to lapidary studio
 */
export function sendSpecimenToStudio(
  specimen: Specimen,
  lapidaryProjectId: string,
  intendedUse: string
): { specimen: Specimen; event: SpecimenSentToStudioEvent } {
  const now = new Date();
  
  const updatedSpecimen: Specimen = {
    ...specimen,
    state: SpecimenState.IN_STUDIO,
    lapidary_project_id: lapidaryProjectId,
    intended_use: intendedUse,
    sequence_number: specimen.sequence_number + 1,
    version: specimen.version + 1,
    updated_at: now,
  };
  
  const event: SpecimenSentToStudioEvent = {
    id: crypto.randomUUID(),
    user_id: specimen.user_id,
    device_id: specimen.device_id,
    type: 'specimen.sent_to_studio',
    timestamp: now,
    sequence_number: updatedSpecimen.sequence_number,
    sync_status: SyncStatus.LOCAL_ONLY,
    specimen_id: specimen.id,
    lapidary_project_id: lapidaryProjectId,
    payload: {
      previous_state: specimen.state,
      intended_use: intendedUse,
    },
  };
  
  return { specimen: updatedSpecimen, event };
}
