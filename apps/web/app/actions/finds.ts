'use server';

import type { FindV1 } from '@rockhounding/shared';

import { mapFindRowToV1 } from '@/lib/finds/map-find-row';
import { createClient } from '@/lib/supabase/server';

/**
 * Read-only server action for find detail pages.
 * Writes go through StorageManager → orchestrator → POST /api/v1/sync/batch only.
 */

export async function getFindById(id: string): Promise<FindV1 | null> {
  const supabase = createClient();

  const result = await supabase
    .from('finds')
    .select(
      'id, user_id, trip_id, material_name, material_taxonomy_id, is_fuzzy, confidence_metrics, notes, discovered_at, created_at, idempotency_key'
    )
    .eq('id', id)
    .single();

  if (result.error !== null || result.data === null) {
    return null;
  }

  return mapFindRowToV1(result.data);
}
