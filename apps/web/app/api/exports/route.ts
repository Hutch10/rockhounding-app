/**
 * Export Jobs API - POST /api/exports
 * Build Document Step 10: Queue export job (non-blocking)
 *
 * Accepts:
 * - type (observations/collections/materials/full)
 * - filters (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiClientError, createApiClient } from '@/lib/api';
import type { CreateExportRequest, ExportDetail } from '@/lib/api';

const CreateExportSchema = z.object({
  type: z.enum(['observations', 'collections', 'materials', 'full']),
  filters: z.record(z.unknown()).optional(),
});

/**
 * Helper to get current user ID (temporary, will use session)
 */
function getCurrentUserId(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}

/**
 * POST /api/exports
 * Queue a new export job (non-blocking)
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ExportDetail | { error: string; details?: unknown }>> {
  try {
    const userId = getCurrentUserId(request);
    const api = createApiClient({
      headers: userId ? { 'x-user-id': userId } : undefined,
    });

    const body = await request.json();
    const validation = CreateExportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const data: CreateExportRequest = validation.data;
    const exportJob = await api.createExport(data);

    return NextResponse.json(exportJob, { status: 201 });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status || 500 }
      );
    }
    console.error('Export creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
