# Next.js to Cloudflare Workers Integration Guide

## Overview

This guide explains how to integrate the Next.js frontend with the Cloudflare Workers backend API so they can communicate over HTTP, while maintaining full type safety and error handling.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Frontend (Next.js 14)               │
│                    Running on Vercel or locally                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Environment: NEXT_PUBLIC_API_URL                          │  │
│  │ Points to: https://api.rockhound.app (production)        │  │
│  │         or http://localhost:8787 (local dev)             │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/CORS
                           │ JSON
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                Cloudflare Workers Backend API                    │
│                  TypeScript + Durable Objects                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Routes: /api/*, /health, /locations, /observations, etc.  │ │
│  │ Auth: x-user-id header + JWT tokens (optional)           │ │
│  │ Storage: D1 (SQL), R2 (objects), KV (cache)             │ │
│  │ Async: Queues for export processing                      │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Setup Steps

### Step 1: Local Development Environment

#### Prerequisites

- Node.js 18+ installed
- wrangler CLI: `npm install -g wrangler`
- Cloudflare account
- PNPM or npm for package management

#### Environment Variables

Create/update `.env.local` in `apps/web/`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional: API token if your API requires it
NEXT_PUBLIC_API_TOKEN=

# Optional: User ID for testing
NEXT_PUBLIC_TEST_USER_ID=test-user-local
```

#### Install Dependencies

```bash
# From workspace root
npm ci
npm install -g wrangler

# Verify installations
node --version        # Should be 18+
npm --version         # Should be 8+
wrangler --version    # Should be 3.8+
```

### Step 2: Start the Cloudflare Workers Server (Local)

In a separate terminal:

```bash
# From workspace root
wrangler dev --config wrangler.toml.dev

# Output should show:
# ▲ [wrangler] Listening on http://localhost:8787
# Available routes:
# GET http://localhost:8787/health
# POST http://localhost:8787/observations
# ...
```

**Important:** Keep this terminal open while developing. The worker will auto-reload when you modify `src/index.ts`.

### Step 3: Start the Next.js Frontend

In another terminal:

```bash
cd apps/web

# Install dependencies (if not already done)
npm ci

# Start dev server
npm run dev

# Output should show:
# ▲ Next.js 14.0.0
# - Local:        http://localhost:3000
# - Environments: .env.local

# In browser, go to http://localhost:3000
```

### Step 4: Verify Connectivity

Open browser DevTools (F12) and check:

1. **Console Tab:**
   - No errors about API connectivity
   - No CORS errors
   - No 404 errors

2. **Network Tab:**
   - Look for requests to `http://localhost:8787/`
   - Response status should be 200
   - Response should be valid JSON

3. **Test API Manually:**

```bash
# In new terminal, test the API
curl http://localhost:8787/health

# Should return:
# {"status":"ok","timestamp":"2024-01-15T10:30:00Z"}
```

---

## API Communication Patterns

### Pattern 1: Simple GET Request

```typescript
// apps/web/lib/api/locations.ts
export async function getLocations(bbox: string) {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/locations`);
  url.searchParams.set('bbox', bbox);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// Usage in component
import { getLocations } from '@/lib/api/locations';

export default async function LocationsPage() {
  const data = await getLocations('-120,-40,120,40');
  return <div>{/* render data */}</div>;
}
```

### Pattern 2: POST with User Context

```typescript
// apps/web/lib/api/observations.ts
export async function createObservation(data: {
  locationId: string;
  title: string;
  description?: string;
  photos?: File[];
}) {
  const userId = generateUserId(); // or get from auth

  const formData = new FormData();
  formData.append('locationId', data.locationId);
  formData.append('title', data.title);
  if (data.description) {
    formData.append('description', data.description);
  }
  if (data.photos) {
    for (const photo of data.photos) {
      formData.append('photos', photo);
    }
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/observations`, {
    method: 'POST',
    headers: {
      'x-user-id': userId,
      // Don't set Content-Type - browser will set it with boundary
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create observation');
  }

  return response.json();
}

// Usage
const observation = await createObservation({
  locationId: '123',
  title: 'Found quartz crystals',
  description: 'Clear crystals in granite',
  photos: [file1, file2],
});
```

### Pattern 3: Error Handling with Retry

```typescript
// apps/web/lib/api/client.ts
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        timeout: 10000,
      });

      // Retry on 5xx errors
      if (response.status >= 500 && i < retries - 1) {
        await delay(Math.pow(2, i) * 100); // exponential backoff
        continue;
      }

      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(Math.pow(2, i) * 100);
    }
  }

  throw new Error('Max retries exceeded');
}

// Usage
const response = await fetchWithRetry(`${process.env.NEXT_PUBLIC_API_URL}/observations`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': userId,
  },
  body: JSON.stringify(data),
});
```

### Pattern 4: Server Component with API Call

```typescript
// apps/web/app/locations/page.tsx
import { LocationsList } from '@/components/LocationsList';
import { getLocations } from '@/lib/api/locations';

// This runs on the server, can access private API keys
export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const bbox = searchParams.bbox || '-120,-40,120,40';

  try {
    const locations = await getLocations(bbox);

    return <LocationsList locations={locations.data} />;
  } catch (error) {
    return <div>Error loading locations: {String(error)}</div>;
  }
}
```

---

## Type Safety: Shared Types

### Setup Shared Types Package

The `packages/shared/` directory contains shared types used by both frontend and backend.

```typescript
// packages/shared/types/api.ts
export interface Location {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
}

export interface Observation {
  id: string;
  locationId: string;
  userId: string;
  title: string;
  description: string;
  photos: string[]; // R2 URLs
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}
```

### Use in Frontend

```typescript
// apps/web/lib/api/locations.ts
import type { Location, ApiResponse } from '@rockhounding/shared/types';

export async function getLocations(bbox: string): Promise<Location[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/locations?bbox=${bbox}`);
  const data: ApiResponse<Location[]> = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || 'Failed to fetch locations');
  }

  return data.data || [];
}
```

### Use in Worker Backend

```typescript
// src/api/locations.ts
import type { Location, ApiResponse } from '@rockhounding/shared/types';

export async function handleGetLocations(bbox: string): Promise<ApiResponse<Location[]>> {
  if (!isValidBbox(bbox)) {
    return {
      error: 'Invalid bbox format',
      status: 400,
    };
  }

  const locations = await db.query<Location>(
    `SELECT * FROM locations WHERE 
     latitude > $1 AND latitude < $2 AND
     longitude > $3 AND longitude < $4`,
    [minLat, maxLat, minLon, maxLon]
  );

  return {
    data: locations,
    status: 200,
  };
}
```

---

## Testing the Integration

### Unit Tests

```typescript
// apps/web/__tests__/api/locations.test.ts
import { getLocations } from '@/lib/api/locations';

describe('getLocations API', () => {
  beforeEach(() => {
    // Mock fetch to respond with stub data
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          data: [
            {
              id: '1',
              name: 'Crystal Cave',
              latitude: 40,
              longitude: -120,
            },
          ],
        }),
      })
    );
  });

  it('should fetch locations with bbox', async () => {
    const locations = await getLocations('-120,-40,120,40');
    expect(locations).toHaveLength(1);
    expect(locations[0].name).toBe('Crystal Cave');
  });

  it('should handle API errors', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: async () => ({ error: 'API error' }),
      })
    );

    await expect(getLocations('-120,-40,120,40')).rejects.toThrow('Failed to fetch');
  });
});
```

### Integration Tests

Run the provided integration test suite:

```bash
cd apps/web

# Set API URL for test environment
NEXT_PUBLIC_API_URL=http://localhost:8787 npm run test -- cloudflare-worker.test.ts

# Output:
# ✓ Cloudflare Workers API Integration (45 tests)
# ✓ All tests passed!
```

### Manual E2E Testing

1. Start wrangler server: `wrangler dev --config wrangler.toml.dev`
2. Start Next.js: `npm run dev`
3. Open http://localhost:3000 in browser
4. Test user flows:
   - [ ] View locations on map
   - [ ] Search and filter locations
   - [ ] Create new observation
   - [ ] Upload photos
   - [ ] Export data
5. Check browser DevTools for errors/warnings

---

## Deployment: Connecting Staging/Production

### Staging: Vercel + Cloudflare Workers

1. **Deploy Frontend to Vercel:**

```bash
# .vercelignore already configured to skip unnecessary files
# Vercel automatically detects Next.js and builds

# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_API_URL: https://api-staging.rockhound.app
```

2. **Deploy Backend to Cloudflare:**

```bash
# Ensure wrangler.toml has staging config
wrangler deploy --config wrangler.toml --env staging

# Validate it's working
curl https://api-staging.rockhound.app/health
```

3. **Test Integration:**

```bash
# From workspace root
NEXT_PUBLIC_API_URL=https://api-staging.rockhound.app \
npm run test -- cloudflare-worker.test.ts
```

### Production: Vercel + Cloudflare Workers

1. **Setup Custom Domain:**
   - Cloudflare dashboard → Workers → api.rockhound.app
   - Configure DNS to point to Cloudflare
   - Enable SSL/TLS

2. **Deploy Frontend:**

```bash
# Set production environment variables in Vercel:
# - NEXT_PUBLIC_API_URL: https://api.rockhound.app
# - NEXT_PUBLIC_SITE_URL: https://rockhound.app

# Vercel auto-deploys from main branch
git push origin main
```

3. **Deploy Backend:**

```bash
# Ensure all migrations applied
wrangler migrations apply --env production

# Deploy worker
wrangler deploy --config wrangler.toml --env production

# Verify
curl https://api.rockhound.app/health
```

4. **Run Validation Suite:**

```bash
./scripts/validate-cloudflare-deployment.sh https://api.rockhound.app
```

---

## Monitoring & Debugging

### View Worker Logs

```bash
# Local logs (appears in wrangler dev terminal)
console.log('Message') // appears in real-time

# Production logs
wrangler tail
wrangler tail --env production
```

### Monitor API Performance

1. **Cloudflare Dashboard:**
   - Workers → api.rockhound.app
   - View requests, errors, latency
   - Check rate limiting status

2. **Analytics Engine:**

```typescript
// In worker code, send metrics
await env.ANALYTICS_ENGINE_BINDING.writeDataPoint({
  indexes: ['location-search'],
  blobs: ['search-query'],
  doubles: [response_time_ms],
});

// Query in dashboard
SELECT COUNT(*) FROM analytics WHERE index = 'location-search'
```

### Debug Frontend API Calls

1. **Network Tab in DevTools:**
   - Shows request/response
   - Headers, payload, response body
   - Timing breakdown

2. **Console Logging:**

```typescript
// lib/api/client.ts
export async function apiCall(path: string, options: RequestInit = {}) {
  const url = `${process.env.NEXT_PUBLIC_API_URL}${path}`;

  console.log('[API] Request:', { method: options.method || 'GET', url });

  const response = await fetch(url, options);
  const data = await response.json();

  console.log('[API] Response:', { status: response.status, data });

  return { response, data };
}
```

3. **API Error Handling:**

```typescript
if (!response.ok) {
  console.error('[API] Error:', {
    status: response.status,
    statusText: response.statusText,
    error: data.error,
  });
  throw new Error(data.error);
}
```

---

## Common Integration Issues

### Issue: 404 on API Endpoints

**Symptom:** All API requests return 404

**Check:**

1. wrangler is running: `wrangler dev --config wrangler.toml.dev`
2. NEXT_PUBLIC_API_URL is correct: `http://localhost:8787`
3. Endpoint path matches worker routes

**Solution:**

```bash
# Restart wrangler
# Kill and rerun: wrangler dev --config wrangler.toml.dev
```

### Issue: CORS Errors

**Symptom:** Browser console shows "CORS policy" error

**Check:**

1. Worker has CORS headers:
   ```typescript
   response.headers.set('Access-Control-Allow-Origin', '*');
   response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
   ```
2. Frontend origin is allowed

**Solution:**

```typescript
// In worker src/index.ts
if (request.method === 'OPTIONS') {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
    },
  });
}
```

### Issue: Type Errors Between Frontend and Backend

**Symptom:** TS error: "Type 'X' is not assignable to type 'Y'"

**Solution:**

1. Update shared types in `packages/shared/types/`
2. Ensure both frontend and backend import from shared package
3. Run type check: `npm run type-check`

### Issue: Timeout Errors

**Symptom:** Requests timeout after 10 seconds

**Check:**

1. Is worker actually running?
2. Is database/R2 accessible?
3. Is query taking too long?

**Solution:**

```typescript
// Increase timeout in fetch
fetch(url, {
  timeout: 30000, // 30 seconds
});
```

---

## Best Practices

1. **Always Set NEXT_PUBLIC_API_URL**
   - Local dev: `http://localhost:8787`
   - Staging: `https://api-staging.rockhound.app`
   - Production: `https://api.rockhound.app`

2. **Use Shared Types**
   - Define in `packages/shared/types/`
   - Import in both frontend and backend
   - Run `npm run type-check` before deployment

3. **Handle Errors Gracefully**
   - Return proper HTTP status codes (200, 400, 404, 500)
   - Include error message in response
   - Log errors for debugging

4. **Test Locally First**
   - Always test API integration locally before deploying
   - Use provided test scripts and test suite
   - Check browser DevTools Network/Console tabs

5. **Monitor in Production**
   - Set up Cloudflare Analytics Engine
   - Configure alerts for errors/slowdowns
   - Check logs regularly with `wrangler tail`

6. **Security**
   - Use x-user-id header for user context
   - Never hardcode API keys/secrets
   - Validate all user input
   - Use HTTPS in production

---

## Next Steps

1. **Local Development:** Follow "Setup Steps" above
2. **Run Tests:** Execute integration test suite
3. **Deploy Staging:** Follow "Deployment: Staging" section
4. **Validate:** Run validation checklist from `CLOUDFLARE_VALIDATION_CHECKLIST.md`
5. **Deploy Production:** Follow "Deployment: Production" section
6. **Monitor:** Use "Monitoring & Debugging" section for ongoing support

---

## References

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Next.js Deployment Guide](https://nextjs.org/docs/app/building-your-application/deploying)
- [Project Structure Documentation](../README.md)
- [API Specification](./API_SPECIFICATION.md)
