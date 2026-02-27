/**
 * Tests for POST /api/admin/moderate - Moderation Endpoint
 * Build Document: Comprehensive validation of moderation workflow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { POST } from './route';
import type { ModerateResponse, ModerateErrorResponse } from './types';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Mock environment variables
beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';
  process.env.ADMIN_API_KEY = 'test-admin-key';
  vi.clearAllMocks();
});

describe('POST /api/admin/moderate', () => {
  describe('Admin Authentication', () => {
    it('should reject request without admin key', async () => {
      const request = new NextRequest('http://localhost/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 1,
          action: 'APPROVE',
        }),
      });

      const response = await POST(request);
      const json = (await response.json()) as ModerateErrorResponse;

      expect(response.status).toBe(403);
      expect(json.error).toContain('Forbidden');
    });

    it('should accept request with valid admin key', async () => {
      // Mock staging record
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 1,
                name: 'Test Location',
                moderation_status: 'PENDING',
                geom: 'POINT(-105.5 39.7)',
              },
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 100 },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: {},
            error: null,
          }),
        }),
      });

      const request = new NextRequest('http://localhost/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'test-admin-key',
        },
        body: JSON.stringify({
          id: 1,
          action: 'APPROVE',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should reject request with invalid admin key', async () => {
      const request = new NextRequest('http://localhost/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'wrong-key',
        },
        body: JSON.stringify({
          id: 1,
          action: 'APPROVE',
        }),
      });

      const response = await POST(request);
      const json = (await response.json()) as ModerateErrorResponse;

      expect(response.status).toBe(403);
      expect(json.error).toContain('Forbidden');
    });
  });

  describe('Request Validation', () => {
    it('should reject missing id', async () => {
      const request = new NextRequest('http://localhost/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'test-admin-key',
        },
        body: JSON.stringify({
          action: 'APPROVE',
        }),
      });

      const response = await POST(request);
      const json = (await response.json()) as ModerateErrorResponse;

      expect(response.status).toBe(400);
      expect(json.error).toContain('Invalid request body');
    });

    it('should reject negative id', async () => {
      const request = new NextRequest('http://localhost/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'test-admin-key',
        },
        body: JSON.stringify({
          id: -1,
          action: 'APPROVE',
        }),
      });

      const response = await POST(request);
      const json = (await response.json()) as ModerateErrorResponse;

      expect(response.status).toBe(400);
      expect(json.error).toContain('Invalid request body');
    });

    it('should reject invalid action', async () => {
      const request = new NextRequest('http://localhost/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'test-admin-key',
        },
        body: JSON.stringify({
          id: 1,
          action: 'DELETE',
        }),
      });

      const response = await POST(request);
      const json = (await response.json()) as ModerateErrorResponse;

      expect(response.status).toBe(400);
      expect(json.error).toContain('Invalid request body');
    });

    it('should reject REJECT action without reason', async () => {
      const request = new NextRequest('http://localhost/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'test-admin-key',
        },
        body: JSON.stringify({
          id: 1,
          action: 'REJECT',
        }),
      });

      const response = await POST(request);
      const json = (await response.json()) as ModerateErrorResponse;

      expect(response.status).toBe(400);
      expect(json.error).toContain('Invalid request body');
    });

    it('should reject REJECT action with short reason', async () => {
      const request = new NextRequest('http://localhost/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'test-admin-key',
        },
        body: JSON.stringify({
          id: 1,
          action: 'REJECT',
          reason: 'Bad',
        }),
      });

      const response = await POST(request);
      const json = (await response.json()) as ModerateErrorResponse;

      expect(response.status).toBe(400);
      expect(json.details).toContain('at least 10 characters');
    });
  });

  describe('APPROVE Workflow', () => {
    it('should approve and promote staging location to public', async () => {
      // Mock staging record fetch
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'locations_staging') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 1,
                    name: 'Test Location',
                    description: 'A test location',
                    geom: 'POINT(-105.5 39.7)',
                    legal_tag: 'LEGAL_PUBLIC',
                    legal_confidence: 90,
                    primary_ruleset_id: 1,
                    source_tier: 'COMMUNITY_CONTRIBUTED',
                    verification_date: null,
                    status: 'ACTIVE',
                    access_model: 'Walk-in',
                    difficulty: 2,
                    kid_friendly: true,
                    moderation_status: 'PENDING',
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: {},
                error: null,
              }),
            }),
          };
        } else if (table === 'locations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 100 },
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const request = new NextRequest('http://localhost/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'test-admin-key',
        },
        body: JSON.stringify({
          id: 1,
          action: 'APPROVE',
        }),
      });

      const response = await POST(request);
      const json = (await response.json()) as ModerateResponse;

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.moderation_status).toBe('APPROVED');
      expect(json.location_id).toBe(100);
      expect(json.message).toContain('approved');
    });

    it('should return 404 for non-existent staging record', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      const request = new NextRequest('http://localhost/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'test-admin-key',
        },
        body: JSON.stringify({
          id: 9999,
          action: 'APPROVE',
        }),
      });

      const response = await POST(request);
      const json = (await response.json()) as ModerateErrorResponse;

      expect(response.status).toBe(404);
      expect(json.error).toContain('not found');
    });

    it('should reject already-moderated record', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 1,
                moderation_status: 'APPROVED',
              },
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest('http://localhost/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'test-admin-key',
        },
        body: JSON.stringify({
          id: 1,
          action: 'APPROVE',
        }),
      });

      const response = await POST(request);
      const json = (await response.json()) as ModerateErrorResponse;

      expect(response.status).toBe(400);
      expect(json.error).toContain('already moderated');
    });
  });

  describe('REJECT Workflow', () => {
    it('should reject staging location with reason', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 1,
                name: 'Test Location',
                moderation_status: 'PENDING',
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: {},
            error: null,
          }),
        }),
      });

      const request = new NextRequest('http://localhost/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'test-admin-key',
        },
        body: JSON.stringify({
          id: 1,
          action: 'REJECT',
          reason: 'Location coordinates are inaccurate and cannot be verified',
        }),
      });

      const response = await POST(request);
      const json = (await response.json()) as ModerateResponse;

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.moderation_status).toBe('REJECTED');
      expect(json.message).toContain('rejected');
      expect(json.location_id).toBeUndefined();
    });
  });

  describe('Audit Trail', () => {
    it('should record moderated_by and moderated_at on approval', async () => {
      let capturedUpdate: any;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'locations_staging') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 1,
                    moderation_status: 'PENDING',
                    geom: 'POINT(-105.5 39.7)',
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockImplementation((data: any) => {
              capturedUpdate = data;
              return {
                eq: vi.fn().mockResolvedValue({
                  data: {},
                  error: null,
                }),
              };
            }),
          };
        } else if (table === 'locations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 100 },
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const request = new NextRequest('http://localhost/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'test-admin-key',
          'x-user-id': 'admin-123',
        },
        body: JSON.stringify({
          id: 1,
          action: 'APPROVE',
        }),
      });

      await POST(request);

      expect(capturedUpdate).toBeDefined();
      expect(capturedUpdate.moderated_by).toBe('admin-123');
      expect(capturedUpdate.moderated_at).toBeDefined();
      expect(capturedUpdate.moderation_status).toBe('APPROVED');
    });

    it('should record rejection_reason on rejection', async () => {
      let capturedUpdate: any;

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 1,
                moderation_status: 'PENDING',
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockImplementation((data: any) => {
          capturedUpdate = data;
          return {
            eq: vi.fn().mockResolvedValue({
              data: {},
              error: null,
            }),
          };
        }),
      });

      const rejectionReason = 'Duplicate location already exists';

      const request = new NextRequest('http://localhost/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'test-admin-key',
        },
        body: JSON.stringify({
          id: 1,
          action: 'REJECT',
          reason: rejectionReason,
        }),
      });

      await POST(request);

      expect(capturedUpdate).toBeDefined();
      expect(capturedUpdate.rejection_reason).toBe(rejectionReason);
      expect(capturedUpdate.moderation_status).toBe('REJECTED');
    });
  });
});
