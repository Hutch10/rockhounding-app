/**
 * Tests for POST /api/admin/moderate - Moderation Endpoint
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { POST } from './route';
import { ApiClientError } from '@/lib/api';
import type { ModerateResponse, ModerateErrorResponse } from './types';

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
  mockSubmitModerationReview.mockResolvedValue({ status: 'approved' });
  process.env.ADMIN_API_KEY = 'test-admin-key';
  vi.clearAllMocks();
});

describe('POST /api/admin/moderate', () => {
  it('rejects request without admin key', async () => {
    const request = new NextRequest('http://localhost/api/admin/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: '1', action: 'APPROVE' }),
    });

    const response = await POST(request);
    const json = (await response.json()) as ModerateErrorResponse;

    expect(response.status).toBe(403);
    expect(json.error).toContain('Forbidden');
    expect(mockSubmitModerationReview).not.toHaveBeenCalled();
  });

  it('rejects invalid request body (numeric id)', async () => {
    const request = new NextRequest('http://localhost/api/admin/moderate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'test-admin-key',
      },
      body: JSON.stringify({ id: 1, action: 'APPROVE' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('rejects REJECT without sufficient reason', async () => {
    const request = new NextRequest('http://localhost/api/admin/moderate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'test-admin-key',
      },
      body: JSON.stringify({ id: '1', action: 'REJECT', reason: 'short' }),
    });

    const response = await POST(request);
    const json = (await response.json()) as ModerateErrorResponse;

    expect(response.status).toBe(400);
    expect(json.error).toBe('Invalid request body');
  });

  it('approves staging record with valid admin key', async () => {
    const request = new NextRequest('http://localhost/api/admin/moderate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'test-admin-key',
        'x-user-id': 'admin-user',
      },
      body: JSON.stringify({ id: '1', action: 'APPROVE' }),
    });

    const response = await POST(request);
    const json = (await response.json()) as ModerateResponse;

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.moderation_status).toBe('APPROVED');
    expect(mockSubmitModerationReview).toHaveBeenCalledWith({
      targetType: 'location',
      targetId: '1',
      reason: 'Approved by admin',
      notes: 'action:APPROVE',
    });
  });

  it('rejects staging record with reason', async () => {
    mockSubmitModerationReview.mockResolvedValue({ status: 'rejected' });

    const request = new NextRequest('http://localhost/api/admin/moderate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'test-admin-key',
      },
      body: JSON.stringify({
        id: '2',
        action: 'REJECT',
        reason: 'Insufficient documentation for this location',
      }),
    });

    const response = await POST(request);
    const json = (await response.json()) as ModerateResponse;

    expect(response.status).toBe(200);
    expect(json.moderation_status).toBe('REJECTED');
  });

  it('propagates backend not-found errors', async () => {
    mockSubmitModerationReview.mockRejectedValue(
      new ApiClientError('Staging record not found', 404, 'NOT_FOUND')
    );

    const request = new NextRequest('http://localhost/api/admin/moderate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'test-admin-key',
      },
      body: JSON.stringify({ id: '999', action: 'APPROVE' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });
});
