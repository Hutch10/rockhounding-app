import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Sprint 4 stub — provenance ledger integration deferred to post-beta.
 * Preserves handler contract without modifying certified sync batch logic.
 */
export interface AppendProvenanceResult {
  skipped: boolean;
  event_id?: string;
  error?: string;
}

export async function emitSyncProvenanceEvent(_params: {
  supabase: SupabaseClient;
  userId: string;
  entityType: string;
  entityId: string;
  operationType: string;
  clientOperationId: string;
  serverId: string | null;
  status: 'applied' | 'failed';
  payload?: Record<string, unknown>;
}): Promise<AppendProvenanceResult> {
  await Promise.resolve();
  return { skipped: true };
}
