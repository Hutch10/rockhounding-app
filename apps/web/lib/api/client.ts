import type {
  ApiError,
  CreateExportRequest,
  CreateObservationRequest,
  ExportDetail,
  ExportSummary,
  LocationDetail,
  LocationListQuery,
  LocationPinList,
  ModerationReviewRequest,
  ModerationReviewResult,
  Observation,
  Paginated,
  StatePackDetail,
  StatePackSummary,
} from './backend-spec';

const DEFAULT_LOCAL_URL = 'http://localhost:8787';
const DEFAULT_STAGING_URL = 'https://staging-api.rockhound.app';
const DEFAULT_PROD_URL = 'https://api.rockhound.app';

/** Maximum retry attempts for transient errors (5xx, 429, network). */
const MAX_RETRIES = 3;
/** Base delay for exponential back-off (ms). Doubles each attempt. */
const BASE_DELAY_MS = 300;
/** HTTP status codes that indicate a transient server-side problem. */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

type FetchLike = typeof fetch;

export interface ApiClientOptions {
  baseUrl?: string;
  headers?: HeadersInit;
  fetchImpl?: FetchLike;
  /** Maximum retry attempts. Defaults to MAX_RETRIES (3). */
  retries?: number;
  /** AbortSignal for cancelling in-flight requests. */
  signal?: AbortSignal;
}

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function resolveBaseUrl(): string {
  // NEXT_PUBLIC_API_URL is baked into the browser bundle at build time.
  const pub = process.env.NEXT_PUBLIC_API_URL;
  if (pub != null && pub.trim().length > 0) {
    const trimmed = pub.trim();
    if (!isValidUrl(trimmed)) {
      throw new Error(
        `Invalid NEXT_PUBLIC_API_URL: "${trimmed}". ` +
        'Must be a valid absolute URL (e.g., https://api.example.com)'
      );
    }
    return trimmed;
  }

  if (process.env.NODE_ENV === 'development') return DEFAULT_LOCAL_URL;

  // Support for Vercel preview deployments as staging
  if (process.env.VERCEL_ENV === 'preview') return DEFAULT_STAGING_URL;

  return DEFAULT_PROD_URL;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPath(path: string, params?: Record<string, string>): string {
  if (!params) return path;
  return Object.entries(params).reduce((acc, [key, value]) => {
    return acc.replace(`:${key}`, encodeURIComponent(value));
  }, path);
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(
  method: string,
  path: string,
  options: ApiClientOptions,
  body?: unknown
): Promise<T> {
  const baseUrl = options.baseUrl ?? resolveBaseUrl();
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxRetries = options.retries ?? MAX_RETRIES;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const init: RequestInit = {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options.signal,
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential back-off: 300 ms → 600 ms → 1 200 ms
      await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
    }

    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, init);
    } catch (err) {
      // Network error (no connection, DNS failure, CORS, etc.)
      if (attempt < maxRetries) continue;
      const msg = err instanceof Error ? err.message : String(err);
      throw new ApiClientError(`Network error: ${msg}`, 0, 'NETWORK_ERROR');
    }

    // Transient server error → retry if we have attempts left
    if (RETRYABLE_STATUSES.has(response.status) && attempt < maxRetries) continue;

    if (!response.ok) {
      const payload = (await parseJsonSafe(response)) as ApiError | null;
      const message = payload?.message ?? `Request failed with status ${response.status}`;
      throw new ApiClientError(message, response.status, payload?.code, payload?.details);
    }

    if (response.status === 204) return undefined as T;

    return (await parseJsonSafe(response)) as T;
  }

  throw new ApiClientError('Request failed after retries', 0, 'SERVER_ERROR');
}

export function createApiClient(options: ApiClientOptions = {}) {
  return {
    listExports(cursor?: string): Promise<Paginated<ExportSummary>> {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      return request('GET', `/exports${query}`, options);
    },
    createExport(input: CreateExportRequest): Promise<ExportDetail> {
      return request('POST', '/exports', options, input);
    },
    getExport(id: string): Promise<ExportDetail> {
      return request('GET', buildPath('/exports/:id', { id }), options);
    },
    listStatePacks(): Promise<StatePackSummary[]> {
      return request('GET', '/state-packs', options);
    },
    getStatePack(state: string): Promise<StatePackDetail> {
      return request('GET', buildPath('/state-packs/:state', { state }), options);
    },
    listObservations(cursor?: string): Promise<Paginated<Observation>> {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      return request('GET', `/observations${query}`, options);
    },
    createObservation(input: CreateObservationRequest): Promise<Observation> {
      return request('POST', '/observations', options, input);
    },
    getObservation(id: string): Promise<Observation> {
      return request('GET', buildPath('/observations/:id', { id }), options);
    },
    listLocations(query: LocationListQuery): Promise<LocationPinList> {
      const params = new URLSearchParams();
      params.set('bbox', query.bbox);
      if (query.legalTag) params.set('legal_tag', query.legalTag);
      if (query.accessModel) params.set('access_model', query.accessModel);
      if (query.materialId) params.set('material_id', query.materialId);
      if (query.difficultyMax != null) params.set('difficulty_max', String(query.difficultyMax));
      if (query.kidFriendly != null) params.set('kid_friendly', query.kidFriendly ? 'true' : 'false');
      return request('GET', `/locations?${params.toString()}`, options);
    },
    getLocation(id: string): Promise<LocationDetail> {
      return request('GET', buildPath('/locations/:id', { id }), options);
    },
    listModerationPending(): Promise<ModerationReviewResult[]> {
      return request('GET', '/moderation/pending', options);
    },
    submitModerationReview(input: ModerationReviewRequest): Promise<ModerationReviewResult> {
      return request('POST', '/moderation/review', options, input);
    },
    // Durable Object endpoints (assumes /do/:name/:method)
    doExportCoordinatorCreateExport(input: CreateExportRequest): Promise<ExportDetail> {
      return request('POST', '/do/ExportCoordinatorDO/createExport', options, input);
    },
    doExportCoordinatorGetExport(id: string): Promise<ExportDetail> {
      return request('POST', '/do/ExportCoordinatorDO/getExport', options, id);
    },
    doStatePackRegistryList(): Promise<StatePackSummary[]> {
      return request('POST', '/do/StatePackRegistryDO/listStatePacks', options);
    },
    doStatePackRegistryGet(state: string): Promise<StatePackDetail> {
      return request('POST', '/do/StatePackRegistryDO/getStatePack', options, state);
    },
    // Queue-triggered operations (assumes /queues/:name)
    enqueueExportJob(payload: CreateExportRequest & { exportId: string }): Promise<{ accepted: boolean }>
    {
      return request('POST', '/queues/exports-queue', options, payload);
    },
  };
}
