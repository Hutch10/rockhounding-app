export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ApiRouteSpec {
  method: HttpMethod;
  path: string;
  description: string;
  requestType?: string;
  responseType: string;
  errorType: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface Paginated<T> {
  items: T[];
  cursor?: string | null;
}

export interface ExportSummary {
  id: string;
  userId: string;
  createdAt: string;
  status: "pending" | "processing" | "complete" | "failed";
  type: "observations" | "collections" | "materials" | "full";
}

export interface ExportDetail extends ExportSummary {
  downloadUrl?: string;
  errorMessage?: string | null;
}

export type ExportType = ExportSummary["type"];
export type ExportStatus = ExportSummary["status"];

export interface CreateExportRequest {
  type: ExportSummary["type"];
  filters?: Record<string, unknown>;
}

export interface StatePackSummary {
  id: string;
  state: string;
  version: string;
  updatedAt: string;
}

export interface StatePackDetail extends StatePackSummary {
  dataUrl: string;
  checksum: string;
}

export interface Observation {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  locationId: string;
  title: string;
  notes?: string | null;
  tags: string[];
}

export interface CreateObservationRequest {
  locationId: string;
  title: string;
  notes?: string;
  tags?: string[];
}

export interface LocationDetail {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  state: string;
  county?: string | null;
  notes?: string | null;
}

export interface LocationPin {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  legalTag: string;
  accessModel: string;
  difficulty?: number | null;
  kidFriendly: boolean;
  status: string;
}

export interface LocationListQuery {
  bbox: string;
  legalTag?: string;
  accessModel?: string;
  materialId?: string;
  difficultyMax?: number;
  kidFriendly?: boolean;
}

export interface LocationPinList {
  items: LocationPin[];
  count: number;
  maxResults: number;
}

export interface ModerationReviewRequest {
  targetType: "observation" | "location" | "user";
  targetId: string;
  reason: string;
  notes?: string;
}

export interface ModerationReviewResult {
  id: string;
  targetType: ModerationReviewRequest["targetType"];
  targetId: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
}

export const apiRoutes: ApiRouteSpec[] = [
  { method: "GET", path: "/exports", description: "List exports", responseType: "Paginated<ExportSummary>", errorType: "ApiError" },
  { method: "POST", path: "/exports", description: "Create export", requestType: "CreateExportRequest", responseType: "ExportDetail", errorType: "ApiError" },
  { method: "GET", path: "/exports/:id", description: "Get export", responseType: "ExportDetail", errorType: "ApiError" },

  { method: "GET", path: "/state-packs", description: "List state packs", responseType: "StatePackSummary[]", errorType: "ApiError" },
  { method: "GET", path: "/state-packs/:state", description: "Get state pack", responseType: "StatePackDetail", errorType: "ApiError" },

  { method: "GET", path: "/observations", description: "List observations", responseType: "Paginated<Observation>", errorType: "ApiError" },
  { method: "POST", path: "/observations", description: "Create observation", requestType: "CreateObservationRequest", responseType: "Observation", errorType: "ApiError" },
  { method: "GET", path: "/observations/:id", description: "Get observation", responseType: "Observation", errorType: "ApiError" },

  { method: "GET", path: "/locations", description: "List locations (thin pins)", responseType: "LocationPinList", errorType: "ApiError" },
  { method: "GET", path: "/locations/:id", description: "Get location", responseType: "LocationDetail", errorType: "ApiError" },

  { method: "GET", path: "/moderation/pending", description: "List all pending moderation items", responseType: "ModerationReviewResult[]", errorType: "ApiError" },
  { method: "POST", path: "/moderation/review", description: "Submit moderation review", requestType: "ModerationReviewRequest", responseType: "ModerationReviewResult", errorType: "ApiError" }
];

export interface DurableObjectSpec {
  name: string;
  description: string;
  methods: { name: string; requestType?: string; responseType?: string; errorType: string }[];
}

export const durableObjects: DurableObjectSpec[] = [
  {
    name: "ExportCoordinatorDO",
    description: "Coordinates export jobs",
    methods: [
      { name: "createExport", requestType: "CreateExportRequest", responseType: "ExportDetail", errorType: "ApiError" },
      { name: "getExport", requestType: "string", responseType: "ExportDetail", errorType: "ApiError" }
    ]
  },
  {
    name: "StatePackRegistryDO",
    description: "Tracks state packs",
    methods: [
      { name: "listStatePacks", responseType: "StatePackSummary[]", errorType: "ApiError" },
      { name: "getStatePack", requestType: "string", responseType: "StatePackDetail", errorType: "ApiError" }
    ]
  }
];

export interface QueueSpec {
  name: string;
  description: string;
  payloadType: string;
}

export const queues: QueueSpec[] = [
  {
    name: "exports-queue",
    description: "Processes export jobs",
    payloadType: "CreateExportRequest & { exportId: string }"
  }
];
