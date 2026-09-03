/**
 * Security Tests: Observation creation user context
 *
 * Verifies POST /api/observations forwards authenticated user to the API client.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const USER_A_ID = 'user-a-123';

const mockCreateObservation = vi.fn();
const mockCreateApiClient = vi.fn(() => ({
  createObservation: mockCreateObservation,
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    createApiClient: (...args: unknown[]) => mockCreateApiClient(...args),
  };
});

beforeEach(() => {
  mockCreateObservation.mockReset();
  mockCreateApiClient.mockClear();
  mockCreateObservation.mockResolvedValue({
    id: 'obs-1',
    locationId: 'loc-1',
    title: 'Test',
    createdAt: '2024-01-15T12:00:00.000Z',
    updatedAt: '2024-01-15T12:00:00.000Z',
  });
});

describe('Observations Security', () => {
  describe('POST /api/observations', () => {
    it('forwards x-user-id header to createApiClient', async () => {
      const request = new NextRequest('http://localhost:3000/api/observations', {
        method: 'POST',
        headers: {
          'x-user-id': USER_A_ID,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          locationId: 'loc-1',
          title: 'Quartz specimens',
        }),
      });

      const { POST } = await import('./route');
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockCreateApiClient).toHaveBeenCalledWith({
        headers: { 'x-user-id': USER_A_ID },
      });
    });

    it('rejects invalid observation payloads before backend call', async () => {
      const request = new NextRequest('http://localhost:3000/api/observations', {
        method: 'POST',
        headers: {
          'x-user-id': USER_A_ID,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ locationId: 'loc-1' }),
      });

      const { POST } = await import('./route');
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(mockCreateObservation).not.toHaveBeenCalled();
    });
  });
});
