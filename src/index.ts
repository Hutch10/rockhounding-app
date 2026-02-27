/**
 * Rockhounding API Worker
 * 
 * Cloudflare Workers Polly (handler) for the Rockhounding API backend
 * Handles all API routes defined in the specification
 */

import type { ExportObject, ExportStatus, Location, Observation, StatePack, ModerationItem } from '@rockhounding/shared/types';

interface Env {
  // Durable Objects
  EXPORT_COORDINATOR: DurableObjectNamespace;
  STATE_PACK_REGISTRY: DurableObjectNamespace;
  
  // Queues
  EXPORTS_QUEUE: Queue;
  
  // R2 Buckets
  EXPORTS_BUCKET: R2Bucket;
  STATE_PACKS_BUCKET: R2Bucket;
  
  // KV Namespaces
  CACHE: KVNamespace;
  TOKENS: KVNamespace;
  
  // Database
  DB: D1Database;
  
  // Service Bindings
  SUPABASE_PROXY: Fetcher;
  
  // Environment
  ENVIRONMENT: string;
  LOG_LEVEL: string;
  SUPABASE_URL: string;
  SUPABASE_API_KEY: string;
}

/**
 * Mock data for development testing
 */
const MOCK_LOCATIONS: Location[] = [
  {
    id: '1',
    name: 'Crystal Cave',
    description: 'Famous crystal formations',
    latitude: 40.7128,
    longitude: -74.0060,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Quartz Ridge',
    description: 'Quartz deposits on ridge',
    latitude: 35.6762,
    longitude: -139.6503,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const MOCK_STATE_PACKS: StatePack[] = [
  {
    id: '1',
    name: 'Mineral Identification Guide',
    description: 'Complete guide to identifying minerals',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const MOCK_OBSERVATIONS: Observation[] = [];
const MOCK_EXPORTS: ExportObject[] = [];
const MOCK_MODERATION: ModerationItem[] = [];

/**
 * Main request handler
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-user-id, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      // Health check endpoints
      if (path === '/health' && method === 'GET') {
        return handleHealth(env);
      }

      if (path === '/health/detailed' && method === 'GET') {
        return handleHealthDetailed(env);
      }

      if (path === '/ready' && method === 'GET') {
        return handleReady(env);
      }

      if (path === '/metrics' && method === 'GET') {
        return handleMetrics(env);
      }

      // Locations endpoints
      if (path.startsWith('/locations')) {
        if (path === '/locations' && method === 'GET') {
          return handleGetLocations(url);
        }
        
        const match = path.match(/^\/locations\/(.+)$/);
        if (match && method === 'GET') {
          const id = match[1];
          return handleGetLocation(id);
        }
      }

      // State Packs endpoints
      if (path === '/state-packs' && method === 'GET') {
        return handleListStatePacks();
      }

      const statePackMatch = path.match(/^\/state-packs\/(.+)$/);
      if (statePackMatch && method === 'GET') {
        const id = statePackMatch[1];
        return handleGetStatePack(id);
      }

      // Observations endpoints
      if (path === '/observations' && method === 'GET') {
        return handleListObservations();
      }

      if (path === '/observations' && method === 'POST') {
        return handleCreateObservation(request);
      }

      // Exports endpoints
      if (path === '/exports' && method === 'GET') {
        return handleListExports();
      }

      if (path === '/exports' && method === 'POST') {
        return handleCreateExport(request);
      }

      const exportMatch = path.match(/^\/exports\/(.+)$/);
      if (exportMatch && method === 'GET') {
        const id = exportMatch[1];
        return handleGetExport(id);
      }

      // Moderation endpoints  
      if (path === '/moderation/pending' && method === 'GET') {
        return handleListModerationPending();
      }

      if (path === '/moderation/review' && method === 'POST') {
        return handleModerationReview(request);
      }

      // 404
      return apiError('Not Found', 404);
    } catch (error) {
      console.error('Worker error:', error);
      return apiError('Internal Server Error', 500);
    }
  },
};

/**
 * API Response Helpers
 */
function apiSuccess<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ data, status }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
}

function apiError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message, status }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
}

/**
 * Health Check Handlers
 */
async function handleHealth(env: Env): Promise<Response> {
  return apiSuccess({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: 3600,
    version: '1.0.0',
    region: 'development',
    components: {
      database: 'healthy',
      storage: 'healthy',
      cache: 'healthy',
    },
  });
}

async function handleHealthDetailed(env: Env): Promise<Response> {
  return apiSuccess({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: 3600,
    version: '1.0.0',
    region: 'development',
    components: {
      database: 'healthy',
      storage: 'healthy',
      cache: 'healthy',
    },
    requests: {
      total: 100,
      last_hour: 50,
      last_minute: 2,
      error_rate: 0.001,
    },
    performance: {
      avg_response_time_ms: 125,
      p95_response_time_ms: 350,
      p99_response_time_ms: 800,
    },
  });
}

async function handleReady(env: Env): Promise<Response> {
  return apiSuccess({
    ready: true,
    uptime_seconds: 3600,
    request_count: 100,
  });
}

async function handleMetrics(env: Env): Promise<Response> {
  const metrics = `# HELP rockhounding_api_requests_total Total number of API requests
# TYPE rockhounding_api_requests_total counter
rockhounding_api_requests_total 100

# HELP rockhounding_api_uptime_seconds API uptime in seconds
# TYPE rockhounding_api_uptime_seconds gauge
rockhounding_api_uptime_seconds 3600

# HELP rockhounding_api_health Overall API health (1 = up, 0 = down)
# TYPE rockhounding_api_health gauge
rockhounding_api_health 1
`;

  return new Response(metrics, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
}

/**
 * Location Handlers
 */
function handleGetLocations(url: URL): Response {
  const bbox = url.searchParams.get('bbox');

  if (!bbox) {
    return apiError('bbox parameter is required', 400);
  }

  // Validate bbox format
  const bboxParts = bbox.split(',');
  if (bboxParts.length !== 4 || !bboxParts.every((p) => !isNaN(parseFloat(p)))) {
    return apiError('Invalid bbox format. Expected: minLon,minLat,maxLon,maxLat', 400);
  }

  return apiSuccess(MOCK_LOCATIONS);
}

function handleGetLocation(id: string): Response {
  const location = MOCK_LOCATIONS.find((l) => l.id === id);
  if (!location) {
    return apiError('Location not found', 404);
  }
  return apiSuccess(location);
}

/**
 * State Pack Handlers
 */
function handleListStatePacks(): Response {
  return apiSuccess(MOCK_STATE_PACKS);
}

function handleGetStatePack(id: string): Response {
  const pack = MOCK_STATE_PACKS.find((p) => p.id === id);
  if (!pack) {
    return apiError('State pack not found', 404);
  }
  return apiSuccess(pack);
}

/**
 * Observation Handlers
 */
function handleListObservations(): Response {
  return apiSuccess(MOCK_OBSERVATIONS);
}

async function handleCreateObservation(request: Request): Promise<Response> {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return apiError('x-user-id header is required', 400);
  }

  try {
    const body = (await request.json()) as {
      locationId?: string;
      title?: string;
      description?: string;
    };

    if (!body.locationId || !body.title) {
      return apiError('locationId and title are required', 400);
    }

    const observation: Observation = {
      id: Math.random().toString(36).substring(7),
      locationId: body.locationId,
      userId,
      title: body.title,
      description: body.description || '',
      photos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    MOCK_OBSERVATIONS.push(observation);
    return apiSuccess(observation, 201);
  } catch (error) {
    return apiError('Invalid request body', 400);
  }
}

/**
 * Export Handlers
 */
function handleListExports(): Response {
  return apiSuccess(MOCK_EXPORTS);
}

async function handleCreateExport(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { type?: string };

    if (!body.type) {
      return apiError('type is required', 400);
    }

    const exportObj: ExportObject = {
      id: Math.random().toString(36).substring(7),
      type: body.type,
      status: 'pending' as ExportStatus,
      createdAt: new Date().toISOString(),
      completedAt: undefined,
      url: undefined,
      fileSize: undefined,
    };

    MOCK_EXPORTS.push(exportObj);
    return apiSuccess(exportObj, 201);
  } catch (error) {
    return apiError('Invalid request body', 400);
  }
}

function handleGetExport(id: string): Response {
  const exportObj = MOCK_EXPORTS.find((e) => e.id === id);
  if (!exportObj) {
    return apiError('Export not found', 404);
  }
  return apiSuccess(exportObj);
}

/**
 * Moderation Handlers
 */
function handleListModerationPending(): Response {
  return apiSuccess(MOCK_MODERATION);
}

async function handleModerationReview(request: Request): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return apiError('Unauthorized', 401);
  }

  try {
    const body = (await request.json()) as { id?: string; status?: string };

    if (!body.id || !body.status) {
      return apiError('id and status are required', 400);
    }

    return apiSuccess({ success: true, id: body.id, status: body.status });
  } catch (error) {
    return apiError('Invalid request body', 400);
  }
}
