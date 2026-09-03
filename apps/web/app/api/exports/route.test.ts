/**
 * Export API Tests - POST /api/exports and GET /api/exports/:id
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from './route';
import { GET } from './[id]/route';
import { NextRequest } from 'next/server';
import { ApiClientError } from '@/lib/api';

const mockExport = {
  id: 'export-1',
  type: 'observations' as const,
  status: 'PENDING' as const,
  createdAt: '2024-01-15T12:00:00.000Z',
  updatedAt: '2024-01-15T12:00:00.000Z',
};

const mockCreateExport = vi.fn();
const mockGetExport = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    createApiClient: vi.fn(() => ({
      createExport: mockCreateExport,
      getExport: mockGetExport,
    })),
  };
});

beforeEach(() => {
  mockCreateExport.mockReset();
  mockGetExport.mockReset();
  mockCreateExport.mockResolvedValue(mockExport);
  mockGetExport.mockResolvedValue(mockExport);
});

describe('POST /api/exports', () => {
  it('returns 400 when type is missing', async () => {
    const request = new NextRequest('http://localhost/api/exports', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123', 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters: { state: 'CA' } }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request');
    expect(mockCreateExport).not.toHaveBeenCalled();
  });

  it('returns 400 when type is invalid', async () => {
    const request = new NextRequest('http://localhost/api/exports', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123', 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'pdf' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('queues export with valid type', async () => {
    const request = new NextRequest('http://localhost/api/exports', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'observations',
        filters: { state: 'CA' },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual(mockExport);
    expect(mockCreateExport).toHaveBeenCalledWith({
      type: 'observations',
      filters: { state: 'CA' },
    });
  });

  it('propagates ApiClientError from backend', async () => {
    mockCreateExport.mockRejectedValue(new ApiClientError('Unauthorized', 401, 'UNAUTHORIZED'));

    const request = new NextRequest('http://localhost/api/exports', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123', 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'full' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});

describe('GET /api/exports/:id', () => {
  it('returns export status from backend', async () => {
    const request = new NextRequest('http://localhost/api/exports/export-1', {
      headers: { 'x-user-id': 'user-123' },
    });

    const response = await GET(request, { params: { id: 'export-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockExport);
    expect(mockGetExport).toHaveBeenCalledWith('export-1');
  });

  it('returns 404 when export not found', async () => {
    mockGetExport.mockRejectedValue(new ApiClientError('Export not found', 404, 'NOT_FOUND'));

    const request = new NextRequest('http://localhost/api/exports/missing', {
      headers: { 'x-user-id': 'user-123' },
    });

    const response = await GET(request, { params: { id: 'missing' } });
    expect(response.status).toBe(404);
  });
});
