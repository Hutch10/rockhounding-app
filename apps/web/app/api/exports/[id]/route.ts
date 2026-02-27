/**
 * Export Status API - GET /api/exports/:id
 * Build Document Step 10: Get export job status and download URL
 */

import { NextRequest, NextResponse } from 'next/server';

import { ApiClientError, createApiClient } from '@/lib/api';
import type { ExportDetail } from '@/lib/api';

/**
 * Helper to get current user ID (temporary, will use session)
 */
function getCurrentUserId(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}

/**
 * GET /api/exports/:id
 * Fetch export job status and download URL (if COMPLETE)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ExportDetail | { error: string }>> {
  try {
    const userId = getCurrentUserId(request);
    const api = createApiClient({
      headers: userId != null ? { 'x-user-id': userId } : undefined,
    });

    const exportJob: ExportDetail = await api.getExport(params.id);
    return NextResponse.json(exportJob);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 500 }
      );
    }
    console.error('Export status fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
