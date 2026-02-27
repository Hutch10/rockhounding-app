/**
 * Rockhound CaptureSession Integration Helpers (Stub)
 */

import type { CaptureSession, CaptureMedia, CapturePreprocessingStatus } from '@rockhounding/shared/capture-session-schema';
import type { StorageManager } from '@/lib/storage/manager';
import type { QueryClient } from '@tanstack/react-query';

// Offline storage stubs
export async function cacheCaptureSessionOffline(session: CaptureSession, storageManager: StorageManager): Promise<void> {}
export async function loadCaptureSessionOffline(sessionId: string, storageManager: StorageManager): Promise<CaptureSession | null> { return null; }
export async function removeCaptureSessionOffline(sessionId: string, storageManager: StorageManager): Promise<void> {}

// Sync engine stubs
export async function enqueueCaptureSessionSync(session: CaptureSession, syncEngine: any, operation: 'create' | 'update' | 'delete'): Promise<void> {}
export async function markCaptureSessionSynced(sessionId: string, syncEngine: any): Promise<void> {}

// Telemetry stubs
export function emitCaptureSessionTelemetry(event: string, session: CaptureSession, telemetry: any, extra?: Record<string, any>): void {}

// Pipeline stubs
export async function runCameraSpecimenPipeline(session: CaptureSession, specimenPipeline: any): Promise<CaptureSession> { return session; }

// FieldSession linkage stubs
export async function linkCaptureSessionToFieldSession(sessionId: string, fieldSessionId: string, storageManager: StorageManager): Promise<void> {}

// FindLog creation stubs
export async function createFindLogFromCaptureSession(session: CaptureSession, findLogManager: any, opts?: any): Promise<any> { return null; }

// Status resolution stubs
export function resolvePreprocessingStatus(media: CaptureMedia[]): CapturePreprocessingStatus { return 'RAW' as CapturePreprocessingStatus; }
export function resolveClassificationStatus(media: CaptureMedia[]): boolean { return false; }

// Integrity stubs
export async function maintainReferentialIntegrity(session: CaptureSession, storageManager: StorageManager, findLogManager: any): Promise<void> {}

// React utilities stubs
export function optimisticUpdateCaptureSession(queryClient: QueryClient, session: CaptureSession): void {}
export function backgroundRefreshCaptureSessions(queryClient: QueryClient, userId: string): void {}
export function crossEntityInvalidation(queryClient: QueryClient, sessionId: string, findLogId?: string): void {}

export const CaptureSessionIntegration = {
  cacheCaptureSessionOffline,
  loadCaptureSessionOffline,
  removeCaptureSessionOffline,
  enqueueCaptureSessionSync,
  markCaptureSessionSynced,
  emitCaptureSessionTelemetry,
  runCameraSpecimenPipeline,
  linkCaptureSessionToFieldSession,
  createFindLogFromCaptureSession,
  resolvePreprocessingStatus,
  resolveClassificationStatus,
  maintainReferentialIntegrity,
  optimisticUpdateCaptureSession,
  backgroundRefreshCaptureSessions,
  crossEntityInvalidation,
};
