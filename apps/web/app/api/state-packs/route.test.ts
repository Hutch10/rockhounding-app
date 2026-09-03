/**
 * State Packs API Tests - GET /api/state-packs and GET /api/state-packs/:state
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as getList } from './route';
import { GET as getSingle } from './[state]/route';
import { NextRequest } from 'next/server';
import { ApiClientError } from '@/lib/api';

const mockPacks = [{ state: 'CA', version: '1.0.0', updatedAt: '2024-01-01T00:00:00.000Z' }];

const mockPackDetail = {
  state: 'CA',
  version: '1.0.0',
  updatedAt: '2024-01-01T00:00:00.000Z',
  dataUrl: 'https://example.com/ca.pack',
  checksum: 'abc123',
};

const mockListStatePacks = vi.fn();
const mockGetStatePack = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    createApiClient: vi.fn(() => ({
      listStatePacks: mockListStatePacks,
      getStatePack: mockGetStatePack,
    })),
  };
});

beforeEach(() => {
  mockListStatePacks.mockReset();
  mockGetStatePack.mockReset();
  mockListStatePacks.mockResolvedValue(mockPacks);
  mockGetStatePack.mockResolvedValue(mockPackDetail);
});

describe('GET /api/state-packs', () => {
  it('returns empty array when no packs exist', async () => {
    mockListStatePacks.mockResolvedValue([]);

    const response = await getList();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('returns list of packs from backend', async () => {
    const response = await getList();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockPacks);
  });

  it('returns 500 on backend error', async () => {
    mockListStatePacks.mockRejectedValue(new ApiClientError('Failed to fetch state packs', 500));

    const response = await getList();
    expect(response.status).toBe(500);
  });
});

describe('GET /api/state-packs/:state', () => {
  it('returns 400 for invalid state code', async () => {
    const request = new NextRequest('http://localhost/api/state-packs/california');
    const response = await getSingle(request, { params: { state: 'california' } });

    expect(response.status).toBe(400);
    expect(mockGetStatePack).not.toHaveBeenCalled();
  });

  it('returns pack detail for valid state', async () => {
    const request = new NextRequest('http://localhost/api/state-packs/ca');
    const response = await getSingle(request, { params: { state: 'ca' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockPackDetail);
    expect(mockGetStatePack).toHaveBeenCalledWith('CA');
  });

  it('returns 404 when pack does not exist', async () => {
    mockGetStatePack.mockRejectedValue(
      new ApiClientError('State pack not found', 404, 'NOT_FOUND')
    );

    const request = new NextRequest('http://localhost/api/state-packs/xx');
    const response = await getSingle(request, { params: { state: 'xx' } });

    expect(response.status).toBe(404);
  });
});
