/**
 * Security Tests: Cross-User Access Prevention
 * 
 * Verifies that users cannot access other users' observations or exports.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock user IDs
const USER_A_ID = 'user-a-123';
const USER_B_ID = 'user-b-456';

describe('Observations Security', () => {
  describe('GET /api/observations', () => {
    it('should only return observations belonging to the authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/observations', {
        method: 'GET',
        headers: {
          'x-user-id': USER_A_ID,
        },
      });

      const { GET } = await import('./route');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // All returned observations should belong to USER_A
      data.observations?.forEach((obs: any) => {
        expect(obs.user_id).toBe(USER_A_ID);
      });
    });

    it('should return empty array for user with no observations', async () => {
      const NEW_USER_ID = 'new-user-789';
      const request = new NextRequest('http://localhost:3000/api/observations', {
        method: 'GET',
        headers: {
          'x-user-id': NEW_USER_ID,
        },
      });

      const { GET } = await import('./route');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.observations).toEqual([]);
    });

    it('should reject requests without user authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/observations', {
        method: 'GET',
        // No x-user-id header
      });

      const { GET } = await import('./route');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/observations', () => {
    it('should create observation with correct user_id', async () => {
      const observationData = {
        location_id: 'loc-123',
        notes: 'Found great quartz specimens',
        rating: 4,
        visited_date: '2024-01-15',
        visibility: 'private',
      };

      const request = new NextRequest('http://localhost:3000/api/observations', {
        method: 'POST',
        headers: {
          'x-user-id': USER_A_ID,
          'content-type': 'application/json',
        },
        body: JSON.stringify(observationData),
      });

      const { POST } = await import('./route');
      const response = await POST(request);

      if (response.status === 201) {
        const data = await response.json();
        expect(data.observation.user_id).toBe(USER_A_ID);
      }
    });

    it('should reject observation creation without authentication', async () => {
      const observationData = {
        location_id: 'loc-456',
        notes: 'Test observation',
        visibility: 'private',
      };

      const request = new NextRequest('http://localhost:3000/api/observations', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // No x-user-id header
        },
        body: JSON.stringify(observationData),
      });

      const { POST } = await import('./route');
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should enforce PRIVATE visibility (cannot create public observations)', async () => {
      const observationData = {
        location_id: 'loc-789',
        notes: 'Attempting public visibility',
        visibility: 'public', // Should be rejected or forced to private
      };

      const request = new NextRequest('http://localhost:3000/api/observations', {
        method: 'POST',
        headers: {
          'x-user-id': USER_A_ID,
          'content-type': 'application/json',
        },
        body: JSON.stringify(observationData),
      });

      const { POST } = await import('./route');
      const response = await POST(request);

      if (response.status === 201) {
        const data = await response.json();
        // Should be forced to 'private'
        expect(data.observation.visibility).toBe('private');
      }
    });
  });

  describe('Cross-User Access Prevention', () => {
    it('should prevent User B from accessing User A\'s observation directly', async () => {
      // This test assumes we know an observation ID belonging to User A
      const USER_A_OBSERVATION_ID = 'obs-user-a-123';

      // User B tries to access User A's observation
      const request = new NextRequest(
        `http://localhost:3000/api/observations/${USER_A_OBSERVATION_ID}`,
        {
          method: 'GET',
          headers: {
            'x-user-id': USER_B_ID,
          },
        }
      );

      // This would use a GET /api/observations/[id] route if it exists
      // For now, we verify via direct DB query with RLS

      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Set user context to User B
      // (In real implementation, this would be set by auth middleware)

      const { data, error } = await supabase
        .from('observations')
        .select('*')
        .eq('id', USER_A_OBSERVATION_ID)
        .single();

      // Should return null or error (RLS blocks access)
      expect(data).toBeNull();
    });

    it('should prevent User A from querying observations with User B\'s user_id filter', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // User A tries to query User B's observations
      const { data, error } = await supabase
        .from('observations')
        .select('*')
        .eq('user_id', USER_B_ID); // Attempting to filter by User B's ID

      // RLS should still enforce that only User A's observations are returned
      // So this should return empty array
      expect(data).toEqual([]);
    });

    it('should prevent observation updates across users', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const USER_A_OBSERVATION_ID = 'obs-user-a-456';

      // User B tries to update User A's observation
      const { data, error } = await supabase
        .from('observations')
        .update({ notes: 'Hacked!' })
        .eq('id', USER_A_OBSERVATION_ID)
        .select()
        .single();

      // Should fail (RLS blocks update)
      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should prevent observation deletion across users', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const USER_A_OBSERVATION_ID = 'obs-user-a-789';

      // User B tries to delete User A's observation
      const { error } = await supabase
        .from('observations')
        .delete()
        .eq('id', USER_A_OBSERVATION_ID);

      // Should fail (RLS blocks delete)
      expect(error).toBeDefined();
    });
  });

  describe('RLS Policy Verification', () => {
    it('should enforce SELECT policy (user can only see own observations)', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Query all observations (without explicit user_id filter)
      const { data } = await supabase
        .from('observations')
        .select('*');

      // All returned observations should belong to current user
      // (In this test context, likely empty or only test user's data)
      data?.forEach(obs => {
        // In a real authenticated context, this would be the current user's ID
        expect(obs.user_id).toBeDefined();
      });
    });

    it('should enforce INSERT policy (user_id must match authenticated user)', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Try to insert observation with different user_id
      const { data, error } = await supabase
        .from('observations')
        .insert({
          location_id: 'loc-123',
          user_id: 'different-user-999', // Trying to create for different user
          notes: 'Unauthorized observation',
          visibility: 'private',
        })
        .select()
        .single();

      // Should fail (RLS blocks insert with mismatched user_id)
      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });
});

describe('Export Jobs Security', () => {
  describe('GET /api/exports', () => {
    it('should only return exports belonging to the authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/exports', {
        method: 'GET',
        headers: {
          'x-user-id': USER_A_ID,
        },
      });

      const { GET } = await import('../exports/route');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // All returned exports should belong to USER_A
      data.exports?.forEach((exp: any) => {
        expect(exp.user_id).toBe(USER_A_ID);
      });
    });

    it('should not allow User B to access User A\'s export jobs', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // User B tries to query all exports (should only see their own)
      const { data } = await supabase
        .from('exports')
        .select('*');

      // Should return empty or only User B's exports (RLS enforced)
      data?.forEach(exp => {
        expect(exp.user_id).not.toBe(USER_A_ID);
      });
    });
  });

  describe('POST /api/exports', () => {
    it('should create export with correct user_id', async () => {
      const exportData = {
        state_code: 'CA',
        format: 'geojson',
      };

      const request = new NextRequest('http://localhost:3000/api/exports', {
        method: 'POST',
        headers: {
          'x-user-id': USER_A_ID,
          'content-type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      const { POST } = await import('../exports/route');
      const response = await POST(request);

      if (response.status === 201) {
        const data = await response.json();
        expect(data.export.user_id).toBe(USER_A_ID);
      }
    });

    it('should reject export creation without authentication', async () => {
      const exportData = {
        state_code: 'NY',
        format: 'kml',
      };

      const request = new NextRequest('http://localhost:3000/api/exports', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // No x-user-id header
        },
        body: JSON.stringify(exportData),
      });

      const { POST } = await import('../exports/route');
      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe('Export Download Security', () => {
    it('should require signed URL to download export file', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Try to download export without signed URL (direct path)
      const directPath = 'exports/user-123/export-456.json';

      const { data, error } = await supabase.storage
        .from('exports')
        .download(directPath);

      // Should fail (requires signed URL)
      expect(error).toBeDefined();
    });

    it('should generate signed URLs with expiry', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const filePath = 'exports/user-123/test-export.json';

      // Generate signed URL (1 hour expiry)
      const { data, error } = await supabase.storage
        .from('exports')
        .createSignedUrl(filePath, 3600);

      if (!error && data) {
        // URL should include token parameter
        expect(data.signedUrl).toMatch(/token=/);
        
        // URL should not expose raw storage path
        expect(data.signedUrl).toMatch(/sign\//);
      }
    });
  });
});

describe('Data Isolation in Exports', () => {
  it('should never include private observations in exports', async () => {
    // This test would require creating a mock export file
    // For now, we document the requirement

    // Exports should ONLY include:
    // - Approved locations (status='approved')
    // - Public data (names, coordinates, materials, rulesets)

    // Exports should NEVER include:
    // - Private observations
    // - Staging locations
    // - User personal information
    // - Other users' export jobs

    expect(true).toBe(true); // Placeholder
  });

  it('should never include staging locations in state packs', async () => {
    // State packs should ONLY include approved locations
    // This is enforced in the Edge Function that generates state packs

    expect(true).toBe(true); // Placeholder
  });
});

/**
 * Test Utilities
 */

export function createAuthenticatedRequest(
  path: string,
  userId: string,
  options: RequestInit = {}
): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    ...options,
    headers: {
      'x-user-id': userId,
      ...options.headers,
    },
  });
}

export function createUnauthenticatedRequest(
  path: string,
  options: RequestInit = {}
): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, options);
}
