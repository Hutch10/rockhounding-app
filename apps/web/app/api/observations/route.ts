/**
 * POST /api/observations - Create Observation
 * Build Document Rule: Professional geologist field observations (private)
 *
 * LOCKED CONTRACT:
 * - Observations are PRIVATE by default
 * - Required: locationId, title
 * - Optional: notes, tags
 * - Returns created observation with id + timestamps
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type {
  CreateObservationResponse,
  ObservationErrorResponse,
} from './types';

import { ApiClientError, createApiClient } from '@/lib/api';
import type { CreateObservationRequest } from '@/lib/api';

// Zod schema matches SDK CreateObservationRequest
const CreateObservationSchema = z.object({
  locationId: z.string().min(1),
  title: z.string().min(1, 'Title is required'),
  notes: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
});

function getUserId(request: NextRequest): string {
  return request.headers.get('x-user-id') ?? 'test-user-123';
}

/**
 * POST /api/observations
 * Create a new field observation
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateObservationResponse | ObservationErrorResponse>> {
  try {
    const userId = getUserId(request);
    const api = createApiClient({
      headers: { 'x-user-id': userId },
    });

    const body = await request.json();
    const parseResult = CreateObservationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: parseResult.error.errors.map((e) => e.message).join(', '),
        },
        { status: 400 }
      );
    }

    const data: CreateObservationRequest = parseResult.data;
    const observation = await api.createObservation(data);
    const response: CreateObservationResponse = { success: true, observation };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json(
        { error: error.message, details: error.details != null ? String(error.details) : undefined },
        { status: error.status || 500 }
      );
    }
    console.error('Unexpected error in POST /api/observations', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
