/**
 * Security Tests: Admin Endpoint Protection
 *
 * Verifies POST /api/admin/moderate rejects unauthorized access.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockSubmitModerationReview = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    createApiClient: vi.fn(() => ({
      submitModerationReview: mockSubmitModerationReview,
    })),
  };
});

beforeEach(() => {
  mockSubmitModerationReview.mockReset();
  process.env.ADMIN_API_KEY = 'test-admin-key';
});

describe('Admin Endpoint Security', () => {
  describe('POST /api/admin/moderate', () => {
    it('rejects requests without admin key', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: '1', action: 'APPROVE' }),
      });

      const { POST } = await import('./moderate/route');
      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Forbidden');
    });

    it('rejects requests with invalid admin key', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'wrong-key',
        },
        body: JSON.stringify({ id: '1', action: 'APPROVE' }),
      });

      const { POST } = await import('./moderate/route');
      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it('accepts requests with valid admin key', async () => {
      mockSubmitModerationReview.mockResolvedValue({ status: 'approved' });

      const request = new NextRequest('http://localhost:3000/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'test-admin-key',
        },
        body: JSON.stringify({ id: '1', action: 'APPROVE' }),
      });

      const { POST } = await import('./moderate/route');
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });
});
