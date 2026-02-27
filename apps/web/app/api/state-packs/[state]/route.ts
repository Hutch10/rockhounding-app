/**
 * State Pack API - GET /api/state-packs/:state
 * Build Document Step 11: Get single state pack metadata
 *
 * Returns:
 * - state
 * - version
 * - updatedAt
 * - dataUrl
 * - checksum
 */

import { NextRequest, NextResponse } from 'next/server';

import { ApiClientError, createApiClient } from '@/lib/api';
import type { StatePackDetail } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/state-packs/:state
 * Get metadata for a specific state pack
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { state: string } }
) {
  try {
    const state = params.state.toUpperCase();

    if (!/^[A-Z]{2}$/.test(state)) {
      return NextResponse.json(
        { error: 'Invalid state code (must be 2 letters)' },
        { status: 400 }
      );
    }

    const api = createApiClient();
    const pack: StatePackDetail = await api.getStatePack(state);
    return NextResponse.json(pack);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 500 }
      );
    }
    console.error('State pack fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
