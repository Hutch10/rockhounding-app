/**
 * Export API Tests
 * Build Document Step 10: Tests for POST /api/exports and GET /api/exports/:id
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from './route';
import { GET } from './[id]/route';
import { NextRequest } from 'next/server';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(() => Promise.resolve({ data: { signedUrl: 'https://example.com/signed' } })),
      })),
    },
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({})),
}));

describe('POST /api/exports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user_id header is missing', async () => {
    const request = new NextRequest('http://localhost/api/exports', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when format is missing', async () => {
    const request = new NextRequest('http://localhost/api/exports', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123' },
      body: JSON.stringify({
        scope: 'state',
        scope_params: { state: 'CA' },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request');
  });

  it('returns 400 when format is invalid', async () => {
    const request = new NextRequest('http://localhost/api/exports', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123' },
      body: JSON.stringify({
        format: 'pdf', // Invalid format
        scope: 'state',
        scope_params: { state: 'CA' },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request');
  });

  it('returns 400 when scope is missing', async () => {
    const request = new NextRequest('http://localhost/api/exports', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123' },
      body: JSON.stringify({
        format: 'geojson',
        scope_params: { state: 'CA' },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request');
  });

  it('returns 400 when scope_params do not match scope (single_location_id)', async () => {
    const request = new NextRequest('http://localhost/api/exports', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123' },
      body: JSON.stringify({
        format: 'geojson',
        scope: 'single_location_id',
        scope_params: { state: 'CA' }, // Wrong params
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request');
  });

  it('returns 400 when scope_params do not match scope (bbox)', async () => {
    const request = new NextRequest('http://localhost/api/exports', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123' },
      body: JSON.stringify({
        format: 'kml',
        scope: 'bbox',
        scope_params: { min_lng: -120, max_lng: -119 }, // Missing lat
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request');
  });

  it('returns 400 when scope_params do not match scope (state)', async () => {
    const request = new NextRequest('http://localhost/api/exports', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123' },
      body: JSON.stringify({
        format: 'csv',
        scope: 'state',
        scope_params: { location_id: 'loc-123' }, // Wrong params
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request');
  });

  it('returns 400 when state code is not 2 characters', async () => {
    const request = new NextRequest('http://localhost/api/exports', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123' },
      body: JSON.stringify({
        format: 'geojson',
        scope: 'state',
        scope_params: { state: 'CAL' }, // Should be 2 chars
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request');
  });

  it('returns 400 when bbox coordinates are out of range', async () => {
    const request = new NextRequest('http://localhost/api/exports', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123' },
      body: JSON.stringify({
        format: 'geojson',
        scope: 'bbox',
        scope_params: {
          min_lng: -200, // Out of range
          max_lng: -119,
          min_lat: 37,
          max_lat: 38,
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request');
  });

  it('returns 400 when difficulty_max is out of range', async () => {
    const request = new NextRequest('http://localhost/api/exports', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123' },
      body: JSON.stringify({
        format: 'csv',
        scope: 'state',
        scope_params: { state: 'CA' },
        filters: { difficulty_max: 6 }, // Max is 5
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request');
  });

  it('accepts valid geojson export with state scope', async () => {
    const request = new NextRequest('http://localhost/api/exports', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123' },
      body: JSON.stringify({
        format: 'geojson',
        scope: 'state',
        scope_params: { state: 'CA' },
      }),
    });

    // Mock successful insert
    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = createClient({} as any);
    vi.mocked(mockSupabase.from).mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'export-123',
              status: 'PENDING',
              format: 'geojson',
              scope: 'state',
              created_at: '2024-01-01T00:00:00Z',
            },
            error: null,
          })),
        })),
      })),
    } as any);

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe('export-123');
    expect(data.status).toBe('PENDING');
    expect(data.format).toBe('geojson');
  });

  it('accepts valid kml export with bbox scope', async () => {
    const request = new NextRequest('http://localhost/api/exports', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123' },
      body: JSON.stringify({
        format: 'kml',
        scope: 'bbox',
        scope_params: {
          min_lng: -120,
          max_lng: -119,
          min_lat: 37,
          max_lat: 38,
        },
      }),
    });

    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = createClient({} as any);
    vi.mocked(mockSupabase.from).mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'export-456',
              status: 'PENDING',
              format: 'kml',
              scope: 'bbox',
              created_at: '2024-01-01T00:00:00Z',
            },
            error: null,
          })),
        })),
      })),
    } as any);

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.format).toBe('kml');
  });

  it('accepts valid csv export with filters', async () => {
    const request = new NextRequest('http://localhost/api/exports', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123' },
      body: JSON.stringify({
        format: 'csv',
        scope: 'state',
        scope_params: { state: 'TX' },
        filters: {
          legal_tag: 'private_permission_required',
          access_model: 'fee_dig',
          difficulty_max: 3,
          kid_friendly: true,
        },
      }),
    });

    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = createClient({} as any);
    vi.mocked(mockSupabase.from).mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'export-789',
              status: 'PENDING',
              format: 'csv',
              scope: 'state',
              created_at: '2024-01-01T00:00:00Z',
            },
            error: null,
          })),
        })),
      })),
    } as any);

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.format).toBe('csv');
  });
});

describe('GET /api/exports/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user_id header is missing', async () => {
    const request = new NextRequest('http://localhost/api/exports/export-123', {
      method: 'GET',
    });

    const response = await GET(request, { params: { id: 'export-123' } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when export not found', async () => {
    const request = new NextRequest('http://localhost/api/exports/export-123', {
      method: 'GET',
      headers: { 'x-user-id': 'user-123' },
    });

    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = createClient({} as any);
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Not found' } })),
          })),
        })),
      })),
    } as any);

    const response = await GET(request, { params: { id: 'export-123' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Export not found');
  });

  it('returns export with status PENDING', async () => {
    const request = new NextRequest('http://localhost/api/exports/export-123', {
      method: 'GET',
      headers: { 'x-user-id': 'user-123' },
    });

    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = createClient({} as any);
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'export-123',
                status: 'PENDING',
                format: 'geojson',
                scope: 'state',
                created_at: '2024-01-01T00:00:00Z',
                completed_at: null,
                file_path: null,
                error_message: null,
              },
              error: null,
            })),
          })),
        })),
      })),
    } as any);

    const response = await GET(request, { params: { id: 'export-123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('export-123');
    expect(data.status).toBe('PENDING');
    expect(data.download_url).toBeNull();
  });

  it('returns export with status RUNNING', async () => {
    const request = new NextRequest('http://localhost/api/exports/export-123', {
      method: 'GET',
      headers: { 'x-user-id': 'user-123' },
    });

    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = createClient({} as any);
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'export-123',
                status: 'RUNNING',
                format: 'kml',
                scope: 'bbox',
                created_at: '2024-01-01T00:00:00Z',
                completed_at: null,
                file_path: null,
                error_message: null,
              },
              error: null,
            })),
          })),
        })),
      })),
    } as any);

    const response = await GET(request, { params: { id: 'export-123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('RUNNING');
    expect(data.download_url).toBeNull();
  });

  it('returns export with status COMPLETE and signed download URL', async () => {
    const request = new NextRequest('http://localhost/api/exports/export-123', {
      method: 'GET',
      headers: { 'x-user-id': 'user-123' },
    });

    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = createClient({} as any);
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'export-123',
                status: 'COMPLETE',
                format: 'csv',
                scope: 'state',
                created_at: '2024-01-01T00:00:00Z',
                completed_at: '2024-01-01T00:05:00Z',
                file_path: 'user-123/export-123.csv',
                error_message: null,
              },
              error: null,
            })),
          })),
        })),
      })),
    } as any);

    const response = await GET(request, { params: { id: 'export-123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('COMPLETE');
    expect(data.completed_at).toBe('2024-01-01T00:05:00Z');
    expect(data.download_url).toBe('https://example.com/signed');
  });

  it('returns export with status FAILED and error message', async () => {
    const request = new NextRequest('http://localhost/api/exports/export-123', {
      method: 'GET',
      headers: { 'x-user-id': 'user-123' },
    });

    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = createClient({} as any);
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'export-123',
                status: 'FAILED',
                format: 'geojson',
                scope: 'state',
                created_at: '2024-01-01T00:00:00Z',
                completed_at: '2024-01-01T00:01:00Z',
                file_path: null,
                error_message: 'No locations found for state',
              },
              error: null,
            })),
          })),
        })),
      })),
    } as any);

    const response = await GET(request, { params: { id: 'export-123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('FAILED');
    expect(data.error_message).toBe('No locations found for state');
    expect(data.download_url).toBeNull();
  });
});
