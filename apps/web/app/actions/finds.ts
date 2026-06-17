'use server';

import { FindV1Schema, type FindV1 } from '@rockhounding/shared';

import { createClient } from '@/lib/supabase/server';

/**
 * Read-only server action for find detail pages.
 * Writes go through StorageManager → orchestrator → POST /api/v1/sync/batch only.
 */

export async function getFindById(id: string): Promise<FindV1 | null> {
  const supabase = createClient();

  const result = await supabase.from('finds').select('*').eq('id', id).single();

  if (result.error !== null || result.data === null) {
    return null;
  }

  return FindV1Schema.parse(result.data as unknown);
}
