/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/await-thenable */
import { SyncBatchResponseSchema } from '@rockhounding/shared';
import { NextResponse } from 'next/server';

import { processSyncBatch } from './handler';

import { createClient } from '@/lib/supabase/server';

/**
 * API V1 BATCH SYNC ENDPOINT
 *
 * Single upload path for offline field operations.
 */

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = await processSyncBatch(supabase, user.id, body);
    return NextResponse.json(SyncBatchResponseSchema.parse(result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Batch sync failed';
    console.error('[Sync] Batch failed:', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
