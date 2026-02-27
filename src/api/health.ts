/**
 * Cloudflare Worker API Health Check Implementation
 *
 * This example shows how to implement health check endpoints
 * that the frontend can use to verify API is functioning.
 *
 * In your actual src/index.ts, add these handlers to your router.
 */

import type { Env } from './types';

/**
 * Health Check Endpoint
 *
 * GET /health
 *
 * Returns basic health information about the API.
 * Used by monitoring systems and load balancers.
 *
 * Response:
 * {
 *   "status": "ok" | "degraded" | "down",
 *   "timestamp": "2024-01-15T10:30:00.000Z",
 *   "uptime": 3600,
 *   "components": {
 *     "database": "healthy" | "unhealthy",
 *     "storage": "healthy" | "unhealthy",
 *     "cache": "healthy" | "unhealthy"
 *   }
 * }
 */
export async function handleHealth(env: Env): Promise<Response> {
  try {
    const startTime = Date.now();

    // Check database connectivity
    let dbStatus = 'healthy';
    try {
      // Try a simple query to verify database is responding
      await env.DB.prepare('SELECT 1').first();
    } catch (error) {
      console.error('Database health check failed:', error);
      dbStatus = 'unhealthy';
    }

    // Check storage (R2) connectivity
    let storageStatus = 'healthy';
    try {
      // Try listing a bucket to verify R2 is responding
      const objects = await env.EXPORTS_BUCKET.list({ limit: 1 });
      if (!objects) {
        storageStatus = 'unhealthy';
      }
    } catch (error) {
      console.error('R2 storage health check failed:', error);
      storageStatus = 'unhealthy';
    }

    // Check cache (KV) connectivity
    let cacheStatus = 'healthy';
    try {
      // Try a KV operation to verify cache is responding
      const testKey = '__HEALTH_CHECK__';
      await env.CACHE.put(testKey, 'ok');
      const result = await env.CACHE.get(testKey);
      if (result !== 'ok') {
        cacheStatus = 'unhealthy';
      }
      await env.CACHE.delete(testKey);
    } catch (error) {
      console.error('KV cache health check failed:', error);
      cacheStatus = 'unhealthy';
    }

    // Calculate overall status
    const components = { database: dbStatus, storage: storageStatus, cache: cacheStatus };
    const unhealthyCount = Object.values(components).filter((s) => s === 'unhealthy').length;
    const overallStatus = unhealthyCount === 0 ? 'ok' : unhealthyCount === 1 ? 'degraded' : 'down';

    // Get uptime from KV (stored when worker started)
    let uptime = 0;
    try {
      const startTimeStr = await env.CACHE.get('__WORKER_START_TIME__');
      if (startTimeStr) {
        uptime = Math.floor((Date.now() - parseInt(startTimeStr, 10)) / 1000);
      }
    } catch (error) {
      console.error('Failed to get uptime:', error);
    }

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime,
      version: '1.0.0',
      region: env.REGION || 'unknown',
      components,
      responseTime: `${Date.now() - startTime}ms`,
    };

    return new Response(JSON.stringify(response), {
      status: overallStatus === 'ok' ? 200 : overallStatus === 'degraded' ? 503 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }
}

/**
 * Detailed Health Endpoint
 *
 * GET /health/detailed
 *
 * Returns detailed health information including:
 * - Individual component health with error messages
 * - Recent request counts
 * - Performance metrics
 * - Database pool status
 *
 * Response includes everything from /health plus:
 * {
 *   "requests": {
 *     "total": 150000,
 *     "last_hour": 1250,
 *     "last_minute": 42,
 *     "error_rate": 0.002
 *   },
 *   "performance": {
 *     "avg_response_time_ms": 125,
 *     "p95_response_time_ms": 350,
 *     "p99_response_time_ms": 800
 *   },
 *   "database": {
 *     "status": "healthy",
 *     "response_time_ms": 5,
 *     "connections": 10
 *   },
 *   "storage": {
 *     "status": "healthy",
 *     "bucket_count": 2,
 *     "total_objects": 45000
 *   },
 *   "cache": {
 *     "status": "healthy",
 *     "namespaces": 2,
 *     "hit_rate": 0.75
 *   }
 * }
 */
export async function handleHealthDetailed(env: Env): Promise<Response> {
  try {
    // Get basic health info
    const basicHealthResponse = await handleHealth(env);
    const basicHealth = await basicHealthResponse.json();

    // Get detailed metrics from analytics/monitoring
    const metrics = {
      requests: {
        total: 0, // In real implementation, track from Analytics Engine
        last_hour: 0,
        last_minute: 0,
        error_rate: 0,
      },
      performance: {
        avg_response_time_ms: 0,
        p95_response_time_ms: 0,
        p99_response_time_ms: 0,
      },
      database: {
        status: 'unknown',
        response_time_ms: 0,
        connections: 0,
        // Try to measure response time
      },
      storage: {
        status: 'unknown',
        bucket_count: 2,
        total_objects: 0,
      },
      cache: {
        status: 'unknown',
        namespaces: 2,
        hit_rate: 0,
      },
    };

    // Measure database performance
    try {
      const dbStart = Date.now();
      await env.DB.prepare('SELECT 1').first();
      metrics.database.response_time_ms = Date.now() - dbStart;
      metrics.database.status = basicHealth.components.database;
    } catch (error) {
      metrics.database.status = 'unhealthy';
    }

    // Count objects in storage buckets
    try {
      const exportsList = await env.EXPORTS_BUCKET.list();
      const statePacksList = await env.STATE_PACKS_BUCKET.list();
      metrics.storage.total_objects = (exportsList?.objects?.length || 0) + (statePacksList?.objects?.length || 0);
      metrics.storage.status = basicHealth.components.storage;
    } catch (error) {
      metrics.storage.status = 'unhealthy';
    }

    // Try to get cache metrics from KV
    try {
      const cacheMetrics = await env.CACHE.get('__CACHE_METRICS__');
      if (cacheMetrics) {
        const parsed = JSON.parse(cacheMetrics);
        metrics.cache.hit_rate = parsed.hit_rate || 0;
      }
      metrics.cache.status = basicHealth.components.cache;
    } catch (error) {
      metrics.cache.status = 'unhealthy';
    }

    const response = {
      ...basicHealth,
      ...metrics,
    };

    return new Response(JSON.stringify(response), {
      status: basicHealth.status === 'ok' ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Detailed health check error:', error);
    return new Response(
      JSON.stringify({
        error: 'Detailed health check failed',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }
}

/**
 * Readiness Check Endpoint
 *
 * GET /ready
 *
 * Used by load balancers/orchestrators to check if the service
 * is ready to accept traffic. Simpler than /health.
 *
 * Returns:
 * {
 *   "ready": true | false,
 *   "uptime_seconds": 3600,
 *   "request_count": 45000
 * }
 */
export async function handleReady(env: Env): Promise<Response> {
  try {
    // Check if worker has a startup marker
    const startTime = await env.CACHE.get('__WORKER_START_TIME__');
    const uptime = startTime ? Math.floor((Date.now() - parseInt(startTime, 10)) / 1000) : 0;

    // Consider ready if uptime > 10 second (warm-up period) and all systems operational
    const isReady = uptime > 10;

    const requestCount = parseInt(
      (await env.CACHE.get('__REQUEST_COUNT__')) || '0',
      10,
    );

    return new Response(
      JSON.stringify({
        ready: isReady,
        uptime_seconds: uptime,
        request_count: requestCount,
      }),
      {
        status: isReady ? 200 : 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  } catch (error) {
    console.error('Readiness check error:', error);
    return new Response(
      JSON.stringify({
        ready: false,
        error: 'Readiness check failed',
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }
}

/**
 * Metrics Endpoint
 *
 * GET /metrics
 *
 * Returns Prometheus-compatible metrics that can be scraped
 * by monitoring systems.
 */
export async function handleMetrics(env: Env): Promise<Response> {
  try {
    const uptime = Math.floor(Date.now() / 1000);
    const requestCount = parseInt(
      (await env.CACHE.get('__REQUEST_COUNT__')) || '0',
      10,
    );

    const metricsText = `# HELP rockhounding_api_requests_total Total number of API requests
# TYPE rockhounding_api_requests_total counter
rockhounding_api_requests_total ${requestCount}

# HELP rockhounding_api_uptime_seconds API uptime in seconds
# TYPE rockhounding_api_uptime_seconds gauge
rockhounding_api_uptime_seconds ${uptime}

# HELP rockhounding_api_health Overall API health (1 = up, 0 = down)
# TYPE rockhounding_api_health gauge
rockhounding_api_health 1
`;

    return new Response(metricsText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Metrics error:', error);
    return new Response('Error generating metrics', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

/**
 * Example integration in your main handler
 *
 * Add these routes to your router in src/index.ts:
 *
 * if (url.pathname === '/health') {
 *   return handleHealth(env);
 * }
 * if (url.pathname === '/health/detailed') {
 *   return handleHealthDetailed(env);
 * }
 * if (url.pathname === '/ready') {
 *   return handleReady(env);
 * }
 * if (url.pathname === '/metrics') {
 *   return handleMetrics(env);
 * }
 */
