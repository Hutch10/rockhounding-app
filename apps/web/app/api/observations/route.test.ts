/**
 * Tests for POST /api/observations - Create Observation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { POST } from './route';
import { ApiClientError } from '@/lib/api';
import type { CreateObservationResponse, ObservationErrorResponse } from './types';

const mockObservation = {
  id: 'obs-1',
  locationId: 'loc-1',
  title: 'Quartz find',
  notes: 'Found great specimens',
  tags: ['quartz'],
  createdAt: '2024-01-15T12:00:00.000Z',
  updatedAt: '2024-01-15T12:00:00.000Z',
};

const mockCreateObservation = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    createApiClient: vi.fn(() => ({
      createObservation: mockCreateObservation,
    })),
  };
});

beforeEach(() => {
  mockCreateObservation.mockReset();
  mockCreateObservation.mockResolvedValue(mockObservation);
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';
});

describe('POST /api/observations', () => {
  it('returns 400 when required fields are missing', async () => {
    const request = new NextRequest('http://localhost/api/observations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'user-123',
      },
      body: JSON.stringify({ notes: 'missing location and title' }),
    });

    const response = await POST(request);
    const data = (await response.json()) as ObservationErrorResponse;

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
    expect(mockCreateObservation).not.toHaveBeenCalled();
  });

  it('creates observation with valid body', async () => {
    const request = new NextRequest('http://localhost/api/observations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'user-123',
      },
      body: JSON.stringify({
        locationId: 'loc-1',
        title: 'Quartz find',
        notes: 'Found great specimens',
        tags: ['quartz'],
      }),
    });

    const response = await POST(request);
    const data = (await response.json()) as CreateObservationResponse;

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.observation).toEqual(mockObservation);
    expect(mockCreateObservation).toHaveBeenCalledWith({
      locationId: 'loc-1',
      title: 'Quartz find',
      notes: 'Found great specimens',
      tags: ['quartz'],
    });
  });

  it('propagates ApiClientError status from backend', async () => {
    mockCreateObservation.mockRejectedValue(
      new ApiClientError('Location not found', 404, 'NOT_FOUND')
    );

    const request = new NextRequest('http://localhost/api/observations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'user-123',
      },
      body: JSON.stringify({
        locationId: 'missing',
        title: 'Test',
      }),
    });

    const response = await POST(request);
    const data = (await response.json()) as ObservationErrorResponse;

    expect(response.status).toBe(404);
    expect(data.error).toBe('Location not found');
  });
});
