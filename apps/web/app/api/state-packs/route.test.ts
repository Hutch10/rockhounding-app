/**
 * State Packs API Tests
 * Build Document Step 11: Tests for GET /api/state-packs and GET /api/state-packs/:state
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as getList } from './route';
import { GET as getSingle } from './[state]/route';
import { NextRequest } from 'next/server';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(() =>
          Promise.resolve({ data: { signedUrl: 'https://example.com/signed' } })
        ),
      })),
    },
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({})),
}));

describe('GET /api/state-packs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no packs exist', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = createClient({} as any);
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    } as any);

    const response = await getList();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('returns list of packs with signed URLs', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = createClient({} as any);
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() =>
          Promise.resolve({
            data: [
              {
                id: 'pack-1',
                state: 'CA',
                file_path: 'CA.json',
                size_bytes: 1024000,
                updated_at: '2024-01-01T00:00:00Z',
                created_at: '2024-01-01T00:00:00Z',
              },
              {
                id: 'pack-2',
                state: 'TX',
                file_path: 'TX.json',
                size_bytes: 2048000,
                updated_at: '2024-01-02T00:00:00Z',
                created_at: '2024-01-02T00:00:00Z',
              },
            ],
            error: null,
          })
        ),
      })),
    } as any);

    const response = await getList();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0]).toEqual({
      state: 'CA',
      updated_at: '2024-01-01T00:00:00Z',
      size_bytes: 1024000,
      download_url: 'https://example.com/signed',
    });
    expect(data[1]).toEqual({
      state: 'TX',
      updated_at: '2024-01-02T00:00:00Z',
      size_bytes: 2048000,
      download_url: 'https://example.com/signed',
    });
  });

  it('returns 500 on database error', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = createClient({} as any);
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() =>
          Promise.resolve({ data: null, error: { message: 'Database error' } })
        ),
      })),
    } as any);

    const response = await getList();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch state packs');
  });
});

describe('GET /api/state-packs/:state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid state code (not 2 letters)', async () => {
    const request = new NextRequest('http://localhost/api/state-packs/CAL', {
      method: 'GET',
    });

    const response = await getSingle(request, { params: { state: 'CAL' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid state code (must be 2 letters)');
  });

  it('returns 400 for invalid state code (lowercase)', async () => {
    const request = new NextRequest('http://localhost/api/state-packs/ca', {
      method: 'GET',
    });

    const response = await getSingle(request, { params: { state: 'ca' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid state code (must be 2 letters)');
  });

  it('returns 404 when pack does not exist', async () => {
    const request = new NextRequest('http://localhost/api/state-packs/ZZ', {
      method: 'GET',
    });

    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = createClient({} as any);
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: null, error: { message: 'Not found' } })
          ),
        })),
      })),
    } as any);

    const response = await getSingle(request, { params: { state: 'ZZ' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('State pack not found');
  });

  it('returns pack with signed URL when pack exists', async () => {
    const request = new NextRequest('http://localhost/api/state-packs/CA', {
      method: 'GET',
    });

    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = createClient({} as any);
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                id: 'pack-1',
                state: 'CA',
                file_path: 'CA.json',
                size_bytes: 1024000,
                updated_at: '2024-01-01T00:00:00Z',
                created_at: '2024-01-01T00:00:00Z',
              },
              error: null,
            })
          ),
        })),
      })),
    } as any);

    const response = await getSingle(request, { params: { state: 'CA' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      state: 'CA',
      updated_at: '2024-01-01T00:00:00Z',
      size_bytes: 1024000,
      download_url: 'https://example.com/signed',
    });
  });

  it('converts lowercase state code to uppercase', async () => {
    const request = new NextRequest('http://localhost/api/state-packs/tx', {
      method: 'GET',
    });

    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = createClient({} as any);
    const mockEq = vi.fn(() => ({
      single: vi.fn(() =>
        Promise.resolve({
          data: {
            id: 'pack-2',
            state: 'TX',
            file_path: 'TX.json',
            size_bytes: 2048000,
            updated_at: '2024-01-02T00:00:00Z',
            created_at: '2024-01-02T00:00:00Z',
          },
          error: null,
        })
      ),
    }));

    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: mockEq,
      })),
    } as any);

    const response = await getSingle(request, { params: { state: 'tx' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.state).toBe('TX');
    expect(mockEq).toHaveBeenCalledWith('state', 'TX');
  });

  it('returns 500 when signed URL generation fails', async () => {
    const request = new NextRequest('http://localhost/api/state-packs/CA', {
      method: 'GET',
    });

    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = createClient({} as any);
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                id: 'pack-1',
                state: 'CA',
                file_path: 'CA.json',
                size_bytes: 1024000,
                updated_at: '2024-01-01T00:00:00Z',
                created_at: '2024-01-01T00:00:00Z',
              },
              error: null,
            })
          ),
        })),
      })),
    } as any);

    // Mock signed URL failure
    vi.mocked(mockSupabase.storage.from).mockReturnValue({
      createSignedUrl: vi.fn(() => Promise.resolve({ data: null })),
    } as any);

    const response = await getSingle(request, { params: { state: 'CA' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to generate download URL');
  });
});
