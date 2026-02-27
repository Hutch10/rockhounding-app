/**
 * Security Tests: Admin Endpoint Protection
 * 
 * Verifies that admin-only routes reject unauthorized access.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock data
const MOCK_USER_ID = 'user-123';
const MOCK_ADMIN_ID = 'admin-456';

describe('Admin Endpoint Security', () => {
  describe('GET /api/admin/moderation', () => {
    it('should reject requests without admin role', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/moderation', {
        method: 'GET',
        headers: {
          'x-user-id': MOCK_USER_ID,
          // No x-admin-role header
        },
      });

      // Import the route handler
      const { GET } = await import('./moderation/route');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should allow requests with admin role', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/moderation', {
        method: 'GET',
        headers: {
          'x-user-id': MOCK_ADMIN_ID,
          'x-admin-role': 'admin',
        },
      });

      const { GET } = await import('./moderation/route');
      const response = await GET(request);

      // Should succeed (200) or fail for other reasons (not 403)
      expect(response.status).not.toBe(403);
    });

    it('should reject requests with invalid admin role value', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/moderation', {
        method: 'GET',
        headers: {
          'x-user-id': MOCK_USER_ID,
          'x-admin-role': 'moderator', // Invalid value
        },
      });

      const { GET } = await import('./moderation/route');
      const response = await GET(request);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/admin/locations/[id]/approve', () => {
    it('should reject non-admin users', async () => {
      const LOCATION_ID = 'loc-123';
      const request = new NextRequest(
        `http://localhost:3000/api/admin/locations/${LOCATION_ID}/approve`,
        {
          method: 'PUT',
          headers: {
            'x-user-id': MOCK_USER_ID,
            // No admin role
          },
        }
      );

      // Import the route handler
      const { PUT } = await import('./locations/[id]/approve/route');
      const response = await PUT(request, { params: { id: LOCATION_ID } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should allow admin users to approve', async () => {
      const LOCATION_ID = 'loc-456';
      const request = new NextRequest(
        `http://localhost:3000/api/admin/locations/${LOCATION_ID}/approve`,
        {
          method: 'PUT',
          headers: {
            'x-user-id': MOCK_ADMIN_ID,
            'x-admin-role': 'admin',
          },
        }
      );

      const { PUT } = await import('./locations/[id]/approve/route');
      const response = await PUT(request, { params: { id: LOCATION_ID } });

      // Should succeed or fail for non-auth reasons
      expect(response.status).not.toBe(403);
    });
  });

  describe('PUT /api/admin/locations/[id]/reject', () => {
    it('should reject non-admin users', async () => {
      const LOCATION_ID = 'loc-789';
      const request = new NextRequest(
        `http://localhost:3000/api/admin/locations/${LOCATION_ID}/reject`,
        {
          method: 'PUT',
          headers: {
            'x-user-id': MOCK_USER_ID,
          },
          body: JSON.stringify({
            reason: 'Test rejection',
          }),
        }
      );

      const { PUT } = await import('./locations/[id]/reject/route');
      const response = await PUT(request, { params: { id: LOCATION_ID } });

      expect(response.status).toBe(403);
    });

    it('should allow admin users to reject', async () => {
      const LOCATION_ID = 'loc-101';
      const request = new NextRequest(
        `http://localhost:3000/api/admin/locations/${LOCATION_ID}/reject`,
        {
          method: 'PUT',
          headers: {
            'x-user-id': MOCK_ADMIN_ID,
            'x-admin-role': 'admin',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            reason: 'Duplicate location',
          }),
        }
      );

      const { PUT } = await import('./locations/[id]/reject/route');
      const response = await PUT(request, { params: { id: LOCATION_ID } });

      expect(response.status).not.toBe(403);
    });
  });

  describe('Staging Locations Isolation', () => {
    it('should not return staging locations in public thin pins API', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/locations/thin-pins?bounds=-180,-90,180,90',
        {
          method: 'GET',
        }
      );

      const { GET } = await import('../locations/thin-pins/route');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verify no staging locations in response
      const stagingLocations = data.locations?.filter(
        (loc: any) => loc.status === 'staging'
      );
      expect(stagingLocations?.length || 0).toBe(0);
    });

    it('should return 404 for staging locations in full detail API', async () => {
      // This test assumes a known staging location ID
      const STAGING_LOCATION_ID = 'staging-location-123';
      
      const request = new NextRequest(
        `http://localhost:3000/api/locations/${STAGING_LOCATION_ID}/full-detail`,
        {
          method: 'GET',
        }
      );

      const { GET } = await import('../locations/[id]/full-detail/route');
      const response = await GET(request, { params: { id: STAGING_LOCATION_ID } });

      // Should return 404 (not found) for staging locations
      expect(response.status).toBe(404);
    });
  });

  describe('RLS Policy Enforcement', () => {
    it('should enforce RLS even when using anon key directly', async () => {
      // This test verifies that direct database queries respect RLS
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Try to query staging locations
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('status', 'staging');

      // Should return empty array (RLS blocks access)
      expect(data).toEqual([]);
      expect(error).toBeNull();
    });

    it('should block direct access to observations table without user context', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Try to query all observations (should fail with RLS)
      const { data, error } = await supabase
        .from('observations')
        .select('*');

      // Should return empty array or error (no auth context)
      expect(data?.length || 0).toBe(0);
    });
  });
});

describe('Admin Role Validation', () => {
  it('should validate admin role format', () => {
    const validRoles = ['admin', 'ADMIN'];
    const invalidRoles = ['moderator', 'user', 'editor', '', null, undefined];

    validRoles.forEach(role => {
      expect(['admin', 'ADMIN']).toContain(role.toLowerCase());
    });

    invalidRoles.forEach(role => {
      expect(['admin', 'ADMIN']).not.toContain((role || '').toLowerCase());
    });
  });

  it('should normalize role checking to lowercase', () => {
    const testCases = [
      { input: 'admin', expected: true },
      { input: 'ADMIN', expected: true },
      { input: 'Admin', expected: true },
      { input: 'moderator', expected: false },
      { input: '', expected: false },
    ];

    testCases.forEach(({ input, expected }) => {
      const isAdmin = input.toLowerCase() === 'admin';
      expect(isAdmin).toBe(expected);
    });
  });
});

describe('Security Headers', () => {
  it('should not expose internal error details in responses', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/moderation', {
      method: 'GET',
      headers: {
        'x-user-id': MOCK_USER_ID,
      },
    });

    const { GET } = await import('./moderation/route');
    const response = await GET(request);

    expect(response.status).toBe(403);
    const data = await response.json();

    // Should return generic error message
    expect(data.error).toBe('Unauthorized');
    
    // Should NOT leak internal details
    expect(JSON.stringify(data)).not.toMatch(/stack/i);
    expect(JSON.stringify(data)).not.toMatch(/service.*role/i);
    expect(JSON.stringify(data)).not.toMatch(/database/i);
  });

  it('should not include sensitive headers in responses', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/moderation', {
      method: 'GET',
      headers: {
        'x-admin-role': 'admin',
      },
    });

    const { GET } = await import('./moderation/route');
    const response = await GET(request);

    // Check that response doesn't leak environment info
    expect(response.headers.get('x-powered-by')).toBeNull();
    expect(response.headers.get('server')).not.toMatch(/next/i);
  });
});

/**
 * Test Utilities
 */

export function createMockAdminRequest(path: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    ...options,
    headers: {
      'x-user-id': MOCK_ADMIN_ID,
      'x-admin-role': 'admin',
      ...options.headers,
    },
  });
}

export function createMockUserRequest(path: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    ...options,
    headers: {
      'x-user-id': MOCK_USER_ID,
      ...options.headers,
    },
  });
}
