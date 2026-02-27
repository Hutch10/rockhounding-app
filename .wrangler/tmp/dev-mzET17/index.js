var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var MOCK_LOCATIONS = [
  {
    id: "1",
    name: "Crystal Cave",
    description: "Famous crystal formations",
    latitude: 40.7128,
    longitude: -74.006,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "2",
    name: "Quartz Ridge",
    description: "Quartz deposits on ridge",
    latitude: 35.6762,
    longitude: -139.6503,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
var MOCK_STATE_PACKS = [
  {
    id: "1",
    name: "Mineral Identification Guide",
    description: "Complete guide to identifying minerals",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
var MOCK_OBSERVATIONS = [];
var MOCK_EXPORTS = [];
var MOCK_MODERATION = [];
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-user-id, Authorization",
          "Access-Control-Max-Age": "86400"
        }
      });
    }
    try {
      if (path === "/health" && method === "GET") {
        return handleHealth(env);
      }
      if (path === "/health/detailed" && method === "GET") {
        return handleHealthDetailed(env);
      }
      if (path === "/ready" && method === "GET") {
        return handleReady(env);
      }
      if (path === "/metrics" && method === "GET") {
        return handleMetrics(env);
      }
      if (path.startsWith("/locations")) {
        if (path === "/locations" && method === "GET") {
          return handleGetLocations(url);
        }
        const match = path.match(/^\/locations\/(.+)$/);
        if (match && method === "GET") {
          const id = match[1];
          return handleGetLocation(id);
        }
      }
      if (path === "/state-packs" && method === "GET") {
        return handleListStatePacks();
      }
      const statePackMatch = path.match(/^\/state-packs\/(.+)$/);
      if (statePackMatch && method === "GET") {
        const id = statePackMatch[1];
        return handleGetStatePack(id);
      }
      if (path === "/observations" && method === "GET") {
        return handleListObservations();
      }
      if (path === "/observations" && method === "POST") {
        return handleCreateObservation(request);
      }
      if (path === "/exports" && method === "GET") {
        return handleListExports();
      }
      if (path === "/exports" && method === "POST") {
        return handleCreateExport(request);
      }
      const exportMatch = path.match(/^\/exports\/(.+)$/);
      if (exportMatch && method === "GET") {
        const id = exportMatch[1];
        return handleGetExport(id);
      }
      if (path === "/moderation/pending" && method === "GET") {
        return handleListModerationPending();
      }
      if (path === "/moderation/review" && method === "POST") {
        return handleModerationReview(request);
      }
      return apiError("Not Found", 404);
    } catch (error) {
      console.error("Worker error:", error);
      return apiError("Internal Server Error", 500);
    }
  }
};
function apiSuccess(data, status = 200) {
  return new Response(JSON.stringify({ data, status }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache"
    }
  });
}
__name(apiSuccess, "apiSuccess");
function apiError(message, status = 400) {
  return new Response(JSON.stringify({ error: message, status }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache"
    }
  });
}
__name(apiError, "apiError");
async function handleHealth(env) {
  return apiSuccess({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: 3600,
    version: "1.0.0",
    region: "development",
    components: {
      database: "healthy",
      storage: "healthy",
      cache: "healthy"
    }
  });
}
__name(handleHealth, "handleHealth");
async function handleHealthDetailed(env) {
  return apiSuccess({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: 3600,
    version: "1.0.0",
    region: "development",
    components: {
      database: "healthy",
      storage: "healthy",
      cache: "healthy"
    },
    requests: {
      total: 100,
      last_hour: 50,
      last_minute: 2,
      error_rate: 1e-3
    },
    performance: {
      avg_response_time_ms: 125,
      p95_response_time_ms: 350,
      p99_response_time_ms: 800
    }
  });
}
__name(handleHealthDetailed, "handleHealthDetailed");
async function handleReady(env) {
  return apiSuccess({
    ready: true,
    uptime_seconds: 3600,
    request_count: 100
  });
}
__name(handleReady, "handleReady");
async function handleMetrics(env) {
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
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache"
    }
  });
}
__name(handleMetrics, "handleMetrics");
function handleGetLocations(url) {
  const bbox = url.searchParams.get("bbox");
  if (!bbox) {
    return apiError("bbox parameter is required", 400);
  }
  const bboxParts = bbox.split(",");
  if (bboxParts.length !== 4 || !bboxParts.every((p) => !isNaN(parseFloat(p)))) {
    return apiError("Invalid bbox format. Expected: minLon,minLat,maxLon,maxLat", 400);
  }
  return apiSuccess(MOCK_LOCATIONS);
}
__name(handleGetLocations, "handleGetLocations");
function handleGetLocation(id) {
  const location = MOCK_LOCATIONS.find((l) => l.id === id);
  if (!location) {
    return apiError("Location not found", 404);
  }
  return apiSuccess(location);
}
__name(handleGetLocation, "handleGetLocation");
function handleListStatePacks() {
  return apiSuccess(MOCK_STATE_PACKS);
}
__name(handleListStatePacks, "handleListStatePacks");
function handleGetStatePack(id) {
  const pack = MOCK_STATE_PACKS.find((p) => p.id === id);
  if (!pack) {
    return apiError("State pack not found", 404);
  }
  return apiSuccess(pack);
}
__name(handleGetStatePack, "handleGetStatePack");
function handleListObservations() {
  return apiSuccess(MOCK_OBSERVATIONS);
}
__name(handleListObservations, "handleListObservations");
async function handleCreateObservation(request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return apiError("x-user-id header is required", 400);
  }
  try {
    const body = await request.json();
    if (!body.locationId || !body.title) {
      return apiError("locationId and title are required", 400);
    }
    const observation = {
      id: Math.random().toString(36).substring(7),
      locationId: body.locationId,
      userId,
      title: body.title,
      description: body.description || "",
      photos: [],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    MOCK_OBSERVATIONS.push(observation);
    return apiSuccess(observation, 201);
  } catch (error) {
    return apiError("Invalid request body", 400);
  }
}
__name(handleCreateObservation, "handleCreateObservation");
function handleListExports() {
  return apiSuccess(MOCK_EXPORTS);
}
__name(handleListExports, "handleListExports");
async function handleCreateExport(request) {
  try {
    const body = await request.json();
    if (!body.type) {
      return apiError("type is required", 400);
    }
    const exportObj = {
      id: Math.random().toString(36).substring(7),
      type: body.type,
      status: "pending",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      completedAt: void 0,
      url: void 0,
      fileSize: void 0
    };
    MOCK_EXPORTS.push(exportObj);
    return apiSuccess(exportObj, 201);
  } catch (error) {
    return apiError("Invalid request body", 400);
  }
}
__name(handleCreateExport, "handleCreateExport");
function handleGetExport(id) {
  const exportObj = MOCK_EXPORTS.find((e) => e.id === id);
  if (!exportObj) {
    return apiError("Export not found", 404);
  }
  return apiSuccess(exportObj);
}
__name(handleGetExport, "handleGetExport");
function handleListModerationPending() {
  return apiSuccess(MOCK_MODERATION);
}
__name(handleListModerationPending, "handleListModerationPending");
async function handleModerationReview(request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return apiError("Unauthorized", 401);
  }
  try {
    const body = await request.json();
    if (!body.id || !body.status) {
      return apiError("id and status are required", 400);
    }
    return apiSuccess({ success: true, id: body.id, status: body.status });
  } catch (error) {
    return apiError("Invalid request body", 400);
  }
}
__name(handleModerationReview, "handleModerationReview");

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-PaocRm/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-PaocRm/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
