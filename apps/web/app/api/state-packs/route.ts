/**
 * State Packs API - GET /api/state-packs
 * Build Document Step 11: List all available state packs
 *
 * Returns:
 * - state (2-letter code)
 * - version
 * - updatedAt
 */

import { NextResponse } from 'next/server';

import { ApiClientError, createApiClient } from '@/lib/api';
import type { StatePackSummary } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/state-packs
 * List all available state packs
 */
export async function GET() {
  try {
    const api = createApiClient();
    const packs: StatePackSummary[] = await api.listStatePacks();
    return NextResponse.json(packs);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 500 }
      );
    }
    console.error('State packs list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
