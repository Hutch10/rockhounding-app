/**
 * Rockhound CaptureSession Schema & Types
 *
 * Defines the data model, enums, interfaces, Zod schemas, and utilities for managing
 * photo/video capture sessions in the field. Supports multi-photo bursts, GPS stamping,
 * device metadata, lighting, preprocessing, classification linkage, and integration with
 * the Camera → Specimen Identification Pipeline.
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// ===================== ENUMS =====================

export enum CaptureSessionType {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
  BURST = 'BURST',
  PANORAMA = 'PANORAMA',
  TIMELAPSE = 'TIMELAPSE',
  UNKNOWN = 'UNKNOWN',
}

export enum CaptureMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  UNKNOWN = 'UNKNOWN',
}

export enum CaptureLightingCondition {
  NATURAL = 'NATURAL',
  ARTIFICIAL = 'ARTIFICIAL',
  MIXED = 'MIXED',
  LOW_LIGHT = 'LOW_LIGHT',
  FLASH = 'FLASH',
  BACKLIT = 'BACKLIT',
  UNKNOWN = 'UNKNOWN',
}

export enum CapturePreprocessingStatus {
  RAW = 'RAW',
  CROPPED = 'CROPPED',
  ENHANCED = 'ENHANCED',
  CLASSIFIED = 'CLASSIFIED',
  REJECTED = 'REJECTED',
  ERROR = 'ERROR',
}

export enum CaptureSessionState {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SYNCED = 'SYNCED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

export enum CaptureSyncStatus {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  CONFLICT = 'CONFLICT',
  FAILED = 'FAILED',
  RETRY_SCHEDULED = 'RETRY_SCHEDULED',
}

// ===================== TYPES =====================

export interface CaptureDeviceMetadata {
  deviceId: string;
  deviceModel: string;
  os: string;
  appVersion: string;
  cameraType: string; // e.g., 'rear', 'front', 'external'
  lens: string;
  focalLength?: number;
  iso?: number;
  exposureTime?: number;
  whiteBalance?: string;
  flashUsed?: boolean;
}

export interface CaptureGeoPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  timestamp: string; // ISO
}

export interface CaptureMedia {
  id: string;
  type: CaptureMediaType;
  uri: string;
  fileName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number; // For video
  exif?: Record<string, any>;
  geo: CaptureGeoPoint;
  lighting: CaptureLightingCondition;
  preprocessing: CapturePreprocessingStatus;
  classificationId?: string; // Link to classification result
  specimenId?: string; // Link to specimen if identified
  createdAt: string;
}

export interface CaptureSession {
  id: string;
  userId: string;
  fieldSessionId: string;
  type: CaptureSessionType;
  state: CaptureSessionState;
  syncStatus: CaptureSyncStatus;
  startedAt: string;
  completedAt?: string;
  location: CaptureGeoPoint;
  device: CaptureDeviceMetadata;
  media: CaptureMedia[];
  mediaCount: number;
  burstCount?: number;
  notes?: string;
  classificationPipelineRunId?: string;
  createdAt: string;
  updatedAt: string;
  isPrivate: boolean;
  isFavorite: boolean;
  version: number;
  schemaVersion: number;
}

// ===================== ZOD SCHEMAS =====================

export const CaptureGeoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  accuracy: z.number().optional(),
  timestamp: z.string(),
});

export const CaptureDeviceMetadataSchema = z.object({
  deviceId: z.string(),
  deviceModel: z.string(),
  os: z.string(),
  appVersion: z.string(),
  cameraType: z.string(),
  lens: z.string(),
  focalLength: z.number().optional(),
  iso: z.number().optional(),
  exposureTime: z.number().optional(),
  whiteBalance: z.string().optional(),
  flashUsed: z.boolean().optional(),
});

export const CaptureMediaSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(CaptureMediaType),
  uri: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
  exif: z.record(z.any()).optional(),
  geo: CaptureGeoPointSchema,
  lighting: z.nativeEnum(CaptureLightingCondition),
  preprocessing: z.nativeEnum(CapturePreprocessingStatus),
  classificationId: z.string().optional(),
  specimenId: z.string().optional(),
  createdAt: z.string(),
});

export const CaptureSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fieldSessionId: z.string(),
  type: z.nativeEnum(CaptureSessionType),
  state: z.nativeEnum(CaptureSessionState),
  syncStatus: z.nativeEnum(CaptureSyncStatus),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  location: CaptureGeoPointSchema,
  device: CaptureDeviceMetadataSchema,
  media: z.array(CaptureMediaSchema),
  mediaCount: z.number(),
  burstCount: z.number().optional(),
  notes: z.string().optional(),
  classificationPipelineRunId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isPrivate: z.boolean(),
  isFavorite: z.boolean(),
  version: z.number(),
  schemaVersion: z.number(),
});

export type CaptureSessionInput = z.infer<typeof CaptureSessionSchema>;

// ===================== UTILITY FUNCTIONS =====================

export function createNewCaptureSession(
  userId: string,
  fieldSessionId: string,
  type: CaptureSessionType,
  location: CaptureGeoPoint,
  device: CaptureDeviceMetadata
): CaptureSession {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    userId,
    fieldSessionId,
    type,
    state: CaptureSessionState.DRAFT,
    syncStatus: CaptureSyncStatus.PENDING,
    startedAt: now,
    location,
    device,
    media: [],
    mediaCount: 0,
    createdAt: now,
    updatedAt: now,
    isPrivate: false,
    isFavorite: false,
    version: 1,
    schemaVersion: 1,
  };
}

export function validateCaptureSession(session: any): { valid: boolean; errors?: string[] } {
  const result = CaptureSessionSchema.safeParse(session);
  if (result.success) return { valid: true };
  return { valid: false, errors: result.error.errors.map(e => e.message) };
}

export function isValidCaptureSessionStateTransition(
  from: CaptureSessionState,
  to: CaptureSessionState
): boolean {
  const transitions: Record<CaptureSessionState, CaptureSessionState[]> = {
    DRAFT: [CaptureSessionState.IN_PROGRESS, CaptureSessionState.DELETED],
    IN_PROGRESS: [CaptureSessionState.COMPLETED, CaptureSessionState.DRAFT, CaptureSessionState.DELETED],
    COMPLETED: [CaptureSessionState.SYNCED, CaptureSessionState.ARCHIVED, CaptureSessionState.DELETED],
    SYNCED: [CaptureSessionState.ARCHIVED, CaptureSessionState.DELETED],
    ARCHIVED: [CaptureSessionState.SYNCED, CaptureSessionState.DELETED],
    DELETED: [],
  };
  return transitions[from]?.includes(to) ?? false;
}

export function addMediaToSession(
  session: CaptureSession,
  media: CaptureMedia
): CaptureSession {
  return {
    ...session,
    media: [...session.media, media],
    mediaCount: session.mediaCount + 1,
    updatedAt: new Date().toISOString(),
  };
}

export function removeMediaFromSession(
  session: CaptureSession,
  mediaId: string
): CaptureSession {
  const filtered = session.media.filter(m => m.id !== mediaId);
  return {
    ...session,
    media: filtered,
    mediaCount: filtered.length,
    updatedAt: new Date().toISOString(),
  };
}

export function updateCaptureSessionState(
  session: CaptureSession,
  newState: CaptureSessionState
): CaptureSession {
  if (!isValidCaptureSessionStateTransition(session.state, newState)) {
    throw new Error(`Invalid state transition: ${session.state} → ${newState}`);
  }
  return {
    ...session,
    state: newState,
    updatedAt: new Date().toISOString(),
    completedAt: newState === CaptureSessionState.COMPLETED ? new Date().toISOString() : session.completedAt,
  };
}

export function getCaptureSessionStatusDisplay(state: CaptureSessionState): string {
  switch (state) {
    case CaptureSessionState.DRAFT: return 'Draft';
    case CaptureSessionState.IN_PROGRESS: return 'In Progress';
    case CaptureSessionState.COMPLETED: return 'Completed';
    case CaptureSessionState.SYNCED: return 'Synced';
    case CaptureSessionState.ARCHIVED: return 'Archived';
    case CaptureSessionState.DELETED: return 'Deleted';
    default: return 'Unknown';
  }
}

export function filterCaptureSessionsByType(
  sessions: CaptureSession[],
  types: CaptureSessionType[]
): CaptureSession[] {
  return sessions.filter(s => types.includes(s.type));
}

export function filterCaptureSessionsByState(
  sessions: CaptureSession[],
  states: CaptureSessionState[]
): CaptureSession[] {
  return sessions.filter(s => states.includes(s.state));
}

export function sortCaptureSessions(
  sessions: CaptureSession[],
  sortBy: 'startedAt' | 'completedAt' | 'mediaCount',
  order: 'asc' | 'desc' = 'desc'
): CaptureSession[] {
  return [...sessions].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'mediaCount') {
      cmp = a.mediaCount - b.mediaCount;
    } else {
      cmp = (a[sortBy] || '').localeCompare(b[sortBy] || '');
    }
    return order === 'asc' ? cmp : -cmp;
  });
}

export function getCaptureSessionMapBounds(sessions: CaptureSession[]): { north: number; south: number; east: number; west: number } | null {
  if (!sessions.length) return null;
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  sessions.forEach(s => {
    minLat = Math.min(minLat, s.location.latitude);
    maxLat = Math.max(maxLat, s.location.latitude);
    minLon = Math.min(minLon, s.location.longitude);
    maxLon = Math.max(maxLon, s.location.longitude);
  });
  return { north: maxLat, south: minLat, east: maxLon, west: minLon };
}

export function getCaptureSessionSummary(session: CaptureSession) {
  return {
    id: session.id,
    type: session.type,
    state: session.state,
    mediaCount: session.mediaCount,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    location: session.location,
    isFavorite: session.isFavorite,
  };
}

// ===================== CONSTANTS =====================

export const CAPTURE_SESSION_STORAGE_KEY = 'capture_session';
export const CAPTURE_SESSION_ENTITY_TYPE = 'capture_session';
