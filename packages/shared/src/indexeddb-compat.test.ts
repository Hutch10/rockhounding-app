import { describe, it, expect } from 'vitest';
import { StorageMetadataSchema } from './storage-schema';
import { RecordSyncState } from './sync-engine';

describe('IndexedDB Compatibility - Sync Status Migration', () => {
  it('StorageMetadataSchema normalizes legacy "synced" to "applied"', () => {
    const legacyLocalRecord = {
      storage_key: 'test:123',
      entity_type: 'find_log',
      entity_id: '123e4567-e89b-12d3-a456-426614174000',
      version: 1,
      schema_version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      accessed_at: new Date().toISOString(),
      size_bytes: 100,
      checksum: 'abc',
      sync_status: 'synced', // Legacy
    };

    const parsed = StorageMetadataSchema.parse(legacyLocalRecord);
    expect(parsed.sync_status).toBe('applied');
  });

  it('StorageMetadataSchema normalizes legacy uppercase "SYNCED" to "applied" (fallback if it happened to be saved)', () => {
    const legacyLocalRecord = {
      storage_key: 'test:123',
      entity_type: 'find_log',
      entity_id: '123e4567-e89b-12d3-a456-426614174000',
      version: 1,
      schema_version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      accessed_at: new Date().toISOString(),
      size_bytes: 100,
      checksum: 'abc',
      sync_status: 'SYNCED', // Legacy uppercase
    };

    const parsed = StorageMetadataSchema.parse(legacyLocalRecord);
    expect(parsed.sync_status).toBe('applied');
  });
});
