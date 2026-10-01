/**
 * Canonical sync ownership marker (SYNC-COORDINATOR quarantine gate).
 *
 * Live path: capture → StorageManager (rockhound-storage) → SyncManager → POST /api/v1/sync/batch
 *
 * SyncCoordinator (lib/sync/coordinator.ts, rockhound-sync) is LEGACY / DEAD and must not be
 * imported by app routes, providers, or field UI. Do not merge those queues.
 */

/** Repository-native name of the only live client sync owner. */
export const CANONICAL_SYNC_OWNER = 'SyncManager' as const;

/** Absolute module path of the canonical owner (repo-relative). */
export const CANONICAL_SYNC_MODULE = 'apps/web/lib/sync/orchestrator.ts' as const;

/** Quarantined legacy coordinator module — do not wire. */
export const QUARANTINED_SYNC_COORDINATOR_MODULE = 'apps/web/lib/sync/coordinator.ts' as const;

/** Quarantined decision for this gate. */
export const SYNC_DUPLICATE_QUARANTINE_DECISION = 'SYNC_DUPLICATE_DEAD_CODE_QUARANTINE' as const;

export type CanonicalSyncOwner = typeof CANONICAL_SYNC_OWNER;
