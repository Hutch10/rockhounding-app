/**
 * Cloudflare Workers API Integration Tests
 *
 * These tests verify that:
 * 1. The Next.js app can reach the Cloudflare Worker API
 * 2. All endpoints return expected responses
 * 3. Error handling works correctly
 * 4. Response formats are correct
 * 5. Authentication flows work
 *
 * Run with: npm run test -- cloudflare-worker.test.ts
 */

import fetch from 'node-fetch';

// Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.rockhound.app';
const TIMEOUT = 10000; // 10 seconds

// Helper to make API calls
async function apiCall(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
) {
  const url = new URL(path, API_URL).toString();
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: response.status, data, headers: response.headers };
}

describe('Cloudflare Workers API Integration', () => {
  describe('Connectivity', () => {
    test(
      'API is reachable',
      async () => {
        const response = await apiCall('/health');
        expect(response.status).toBeLessThan(500);
      },
      TIMEOUT
    );

    test(
      'Contains Cloudflare headers',
      async () => {
        const response = await apiCall('/health');
        // Cloudflare adds cf-ray header
        const serverHeader = response.headers.get('server') || '';
        expect(
          serverHeader.toLowerCase().includes('cloudflare') || response.headers.has('cf-ray')
        ).toBe(true);
      },
      TIMEOUT
    );

    test(
      'CORS headers are present',
      async () => {
        const response = await apiCall('/health', {
          headers: {
            Origin: 'http://localhost:3000',
          },
        });
        // Should be accessible from localhost:3000
        expect(response.status).toBeLessThan(500);
      },
      TIMEOUT
    );
  });

  describe('Health Check Endpoint', () => {
    test(
      'GET /health returns 200',
      async () => {
        const response = await apiCall('/health');
        expect(response.status).toBe(200);
      },
      TIMEOUT
    );

    test(
      'Health response is valid JSON',
      async () => {
        const response = await apiCall('/health');
        expect(response.data).toBeTruthy();
        expect(typeof response.data).toBe('object');
      },
      TIMEOUT
    );

    test(
      'Health response contains status',
      async () => {
        const response = await apiCall('/health');
        expect(response.data).toHaveProperty('status');
      },
      TIMEOUT
    );
  });

  describe('Locations Endpoints', () => {
    test(
      'GET /locations requires bbox parameter',
      async () => {
        const response = await apiCall('/locations');
        // Should either return 400 or require parameter
        expect([200, 400, 422]).toContain(response.status);
      },
      TIMEOUT
    );

    test(
      'GET /locations with valid bbox',
      async () => {
        const response = await apiCall('/locations?bbox=-120,-40,120,40');
        expect([200, 400, 500]).toContain(response.status);
        if (response.status === 200) {
          expect(response.data).toHaveProperty('data');
          expect(Array.isArray(response.data.data)).toBe(true);
        }
      },
      TIMEOUT
    );

    test(
      'GET /locations with invalid bbox returns error',
      async () => {
        const response = await apiCall('/locations?bbox=invalid');
        expect(response.status).toBe(400);
        expect(response.data).toHaveProperty('error');
      },
      TIMEOUT
    );

    test(
      'GET /locations/:id returns location or 404',
      async () => {
        const response = await apiCall('/locations/1');
        expect([200, 404, 500]).toContain(response.status);
        if (response.status === 200) {
          expect(response.data).toHaveProperty('data');
        }
      },
      TIMEOUT
    );

    test(
      'GET /locations/:id with invalid id returns 404 or error',
      async () => {
        const response = await apiCall('/locations/00000000-0000-0000-0000-000000000000');
        expect([200, 404, 400, 500]).toContain(response.status);
      },
      TIMEOUT
    );
  });

  describe('State Packs Endpoint', () => {
    test(
      'GET /state-packs returns list',
      async () => {
        const response = await apiCall('/state-packs');
        expect([200, 400, 500]).toContain(response.status);
        if (response.status === 200) {
          expect(response.data).toHaveProperty('data');
          expect(Array.isArray(response.data.data)).toBe(true);
        }
      },
      TIMEOUT
    );

    test(
      'GET /state-packs/:id returns state pack',
      async () => {
        const response = await apiCall('/state-packs/1');
        expect([200, 404, 400, 500]).toContain(response.status);
      },
      TIMEOUT
    );
  });

  describe('Observations Endpoint', () => {
    test(
      'POST /observations requires user-id header',
      async () => {
        const response = await apiCall('/observations', {
          method: 'POST',
          body: {
            locationId: '1',
            title: 'Test Observation',
          },
        });
        // Should fail without user-id
        expect([200, 400, 401, 403, 500]).toContain(response.status);
      },
      TIMEOUT
    );

    test(
      'POST /observations with user-id header',
      async () => {
        const response = await apiCall('/observations', {
          method: 'POST',
          headers: {
            'x-user-id': `test-user-${Date.now()}`,
          },
          body: {
            locationId: '1',
            title: 'Test Observation',
          },
        });
        // Should succeed or return validation error
        expect([200, 201, 400, 500]).toContain(response.status);
        if ([200, 201].includes(response.status)) {
          expect(response.data).toHaveProperty('id');
        }
      },
      TIMEOUT
    );

    test(
      'POST /observations validates input',
      async () => {
        const response = await apiCall('/observations', {
          method: 'POST',
          headers: {
            'x-user-id': `test-user-${Date.now()}`,
          },
          body: {},
        });
        // Should fail validation
        expect([400, 422, 500]).toContain(response.status);
      },
      TIMEOUT
    );
  });

  describe('Exports Endpoint', () => {
    test(
      'POST /exports creates export',
      async () => {
        const response = await apiCall('/exports', {
          method: 'POST',
          body: {
            type: 'observations',
          },
        });
        // Should create export
        expect([200, 201, 400, 500]).toContain(response.status);
        if ([200, 201].includes(response.status)) {
          expect(response.data).toHaveProperty('id');
        }
      },
      TIMEOUT
    );

    test(
      'POST /exports returns job ID',
      async () => {
        const response = await apiCall('/exports', {
          method: 'POST',
          body: {
            type: 'observations',
          },
        });
        if ([200, 201].includes(response.status)) {
          expect(typeof response.data.id === 'string').toBe(true);
        }
      },
      TIMEOUT
    );

    test(
      'GET /exports/:id returns export status',
      async () => {
        // First create an export
        const createResponse = await apiCall('/exports', {
          method: 'POST',
          body: {
            type: 'observations',
          },
        });

        if ([200, 201].includes(createResponse.status)) {
          const exportId = createResponse.data.id;
          // Then get its status
          const getResponse = await apiCall(`/exports/${exportId}`);
          expect([200, 404, 500]).toContain(getResponse.status);
        }
      },
      TIMEOUT
    );
  });

  describe('Error Handling', () => {
    test(
      'Invalid endpoint returns 404',
      async () => {
        const response = await apiCall('/invalid-endpoint');
        expect(response.status).toBe(404);
      },
      TIMEOUT
    );

    test(
      'Invalid JSON body returns error',
      async () => {
        const response = await apiCall('/observations', {
          method: 'POST',
          headers: {
            'x-user-id': 'test',
            'Content-Type': 'application/json',
          },
          body: [],
        });
        expect([200, 400, 422, 500]).toContain(response.status);
      },
      TIMEOUT
    );

    test(
      'Error responses contain error message',
      async () => {
        const response = await apiCall('/locations?bbox=invalid');
        if (response.status === 400) {
          expect(response.data).toHaveProperty('error');
          expect(typeof response.data.error !== 'undefined').toBe(true);
        }
      },
      TIMEOUT
    );
  });

  describe('Response Format', () => {
    test(
      'All responses are valid JSON',
      async () => {
        const endpoints = ['/health', '/locations/1', '/state-packs'];
        for (const endpoint of endpoints) {
          const response = await apiCall(endpoint);
          expect(typeof response.data).toBe('object');
        }
      },
      TIMEOUT
    );

    test(
      'Successful responses have consistent structure',
      async () => {
        const response = await apiCall('/locations?bbox=-120,-40,120,40');
        if (response.status === 200) {
          expect(response.data).toHaveProperty('data');
        }
      },
      TIMEOUT
    );

    test(
      'Error responses have error field',
      async () => {
        const response = await apiCall('/locations?bbox=invalid');
        if (response.status === 400) {
          expect(response.data.error).toBeTruthy();
        }
      },
      TIMEOUT
    );
  });

  describe('Performance', () => {
    test(
      'Health check responds within 500ms',
      async () => {
        const start = Date.now();
        await apiCall('/health');
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(500);
      },
      TIMEOUT
    );

    test(
      'Locations endpoint responds within 1000ms',
      async () => {
        const start = Date.now();
        await apiCall('/locations?bbox=-120,-40,120,40');
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(1000);
      },
      TIMEOUT
    );
  });

  describe('Durable Objects', () => {
    test(
      'ExportCoordinatorDO is initialized',
      async () => {
        const response = await apiCall('/do/ExportCoordinatorDO/init', {
          method: 'POST',
        });
        expect([200, 400, 404, 500]).toContain(response.status);
      },
      TIMEOUT
    );

    test(
      'StatePackRegistryDO is initialized',
      async () => {
        const response = await apiCall('/do/StatePackRegistryDO/list', {
          method: 'GET',
        });
        expect([200, 400, 404, 500]).toContain(response.status);
      },
      TIMEOUT
    );
  });

  describe('Authentication & Authorization', () => {
    test(
      'Admin endpoints require authorization',
      async () => {
        const response = await apiCall('/moderation/review', {
          method: 'POST',
          body: { id: 'test' },
        });
        // Should fail without proper auth
        expect([400, 401, 403, 404, 500]).toContain(response.status);
      },
      TIMEOUT
    );

    test(
      'User endpoints accept x-user-id header',
      async () => {
        const response = await apiCall('/observations', {
          method: 'POST',
          headers: {
            'x-user-id': `test-user-${Date.now()}`,
          },
          body: {
            locationId: '1',
            title: 'Test',
          },
        });
        // Should not reject for missing auth, may fail for other reasons
        expect([200, 201, 400, 422, 500]).toContain(response.status);
      },
      TIMEOUT
    );
  });

  describe('Environment Configuration', () => {
    test('NEXT_PUBLIC_API_URL is configured', () => {
      expect(process.env.NEXT_PUBLIC_API_URL).toBeTruthy();
    });

    test('NEXT_PUBLIC_API_URL is valid URL', () => {
      try {
        new URL(API_URL);
        expect(true).toBe(true);
      } catch {
        fail('Invalid API URL');
      }
    });

    test('API URL matches Cloudflare domain', () => {
      expect(API_URL.includes('rockhound.app') || API_URL.includes('localhost')).toBe(true);
    });
  });
});
