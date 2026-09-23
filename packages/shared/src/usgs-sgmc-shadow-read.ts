/**
 * USGS SGMC first shadow read.
 *
 * Transport is read-only and separate from adapter interpretation.
 * Automated tests inject a transport. They do not call the provider.
 */

import { createHash } from 'node:crypto';

import { SOURCE_ADAPTER_CONTRACT_BLOCK_ID } from './building-block-registry';
import {
  DisclosureClassification,
  DisclosurePurpose,
  materializeDisclosureRelease,
  type DisclosureProjection,
} from './disclosure-governance';
import { EvidenceDomain, EvidencePurpose, evaluateEvidenceAdmission } from './evidence-admission';
import {
  PROVENANCE_SCHEMA_VERSION,
  ProvenanceActivityType,
  ProvenanceAgentRole,
  ProvenanceAgentType,
  ProvenanceEntityType,
  ProvenanceLineageClass,
  hashProvenanceActivity,
  validateProvenanceActivity,
  validateProvenanceGraph,
  type ProvenanceGraph,
} from './provenance-activity-kernel';
import {
  SourceAdapterFailureCode,
  SourceAdapterResultStatus,
  SourceRequestedUseOperation,
  type SourceAdapterResult,
} from './source-adapter-contract';
import {
  guardFirstLiveAdapterExecution,
  type SourceOperationAuthorizationRequest,
} from './source-operation-authorization';
import {
  USGS_SGMC_ADAPTER_ID,
  USGS_SGMC_GEMS_DOI,
  USGS_SGMC_KNOWN_GENERALIZED_LITH,
  USGS_SGMC_LAYER_ID,
  USGS_SGMC_LAYER_NAME,
  USGS_SGMC_MAX_RECORD_COUNT,
  USGS_SGMC_PINNED_DOI,
  USGS_SGMC_PUBLICATION_VERSION,
  USGS_SGMC_RESOURCE_ID,
  USGS_SGMC_SCIENCEBASE_ITEM,
  admitSgmcForGeologicalContext,
  interpretSgmcPolygonCount,
  projectSgmcDisclosure,
  sgmcAdapterDefinition,
  sgmcAdmissionCandidate,
  sgmcAuthorizationRequest,
  sgmcGeologicalContextPolicy,
  sgmcProviderRecordKey,
  translateSgmcObservedRecord,
  type SgmcObservedRecord,
} from './usgs-sgmc-provider';

export const USGS_SGMC_SCIENCEBASE_ITEM_URL =
  'https://www.sciencebase.gov/catalog/item/5888bf4fe4b05ccb964bab9d?format=json';

export const USGS_SGMC_SHADOW_USER_AGENT =
  'RockhoundingFieldPlatform/sgmc-shadow-read-r1 (read-only; non-production)';

export const USGS_SGMC_SHADOW_TIMEOUT_MS = 20000;

export const USGS_SGMC_SHADOW_RESULT_LIMIT = 5;

export const USGS_SGMC_SHADOW_OUT_FIELDS = [
  'STATE',
  'SGMC_LABEL',
  'UNIT_LINK',
  'UNIT_NAME',
  'AGE_MIN',
  'AGE_MAX',
  'GENERALIZED_LITH',
  'NGMDB1',
  'NGMDB2',
  'NGMDB3',
  'OBJECTID',
] as const;

export const USGS_SGMC_SHADOW_BBOX = {
  label: 'National Mall, Washington, District of Columbia',
  purpose: 'SCHEMA_TRANSPORT_VALIDATION',
  xmin: -77.0365,
  ymin: 38.889,
  xmax: -77.03,
  ymax: 38.8915,
  inSR: 4326,
} as const;

export const SgmcShadowFailure = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  HTTP_ERROR: 'HTTP_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  SCHEMA_DRIFT: 'SCHEMA_DRIFT',
  SOURCE_IDENTITY_DRIFT: 'SOURCE_IDENTITY_DRIFT',
  UNSUPPORTED_SOURCE_VERSION: 'UNSUPPORTED_SOURCE_VERSION',
  PARTIAL_RESPONSE: 'PARTIAL_RESPONSE',
  EMPTY_RESPONSE: 'EMPTY_RESPONSE',
  AUTHORIZATION_BLOCKED: 'AUTHORIZATION_BLOCKED',
  DISCLOSURE_BLOCKED: 'DISCLOSURE_BLOCKED',
} as const;

export type SgmcShadowFailure = (typeof SgmcShadowFailure)[keyof typeof SgmcShadowFailure];

export type ShadowComparisonMark = 'MATCH' | 'COMPATIBLE_EXTENSION' | 'DRIFT' | 'UNKNOWN';

export type SgmcShadowTransportResponse = {
  status: number;
  contentType: string | null;
  headers: Record<string, string>;
  body: Uint8Array;
};

export type SgmcShadowTransport = {
  get(
    url: string,
    init: { timeoutMs: number; headers: Record<string, string> }
  ): Promise<SgmcShadowTransportResponse>;
};

export class SgmcShadowTransportError extends Error {
  readonly failure: 'TIMEOUT' | 'NETWORK_ERROR';

  constructor(failure: 'TIMEOUT' | 'NETWORK_ERROR', message: string) {
    super(message);
    this.name = 'SgmcShadowTransportError';
    this.failure = failure;
  }
}

const HEADER_ALLOWLIST = new Set([
  'content-type',
  'retry-after',
  'etag',
  'cache-control',
  'x-ratelimit-limit',
  'x-ratelimit-remaining',
  'x-ratelimit-reset',
]);

const CORE_FIELDS = [
  'STATE',
  'SGMC_LABEL',
  'UNIT_LINK',
  'UNIT_NAME',
  'AGE_MIN',
  'AGE_MAX',
  'GENERALIZED_LITH',
  'NGMDB1',
  'NGMDB2',
  'NGMDB3',
] as const;

export function sgmcShadowRequestHeaders(): Record<string, string> {
  return {
    accept: 'application/json',
    'user-agent': USGS_SGMC_SHADOW_USER_AGENT,
  };
}

export function hashSgmcResponseBytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function resolveSgmcFeatureServerUrl(catalog: unknown): string | undefined {
  const text = JSON.stringify(catalog);
  if (!text.includes(USGS_SGMC_PINNED_DOI) || !text.includes(USGS_SGMC_SCIENCEBASE_ITEM)) {
    return undefined;
  }
  const match = text.match(
    /https:\/\/services\.arcgis\.com\/[^"\\\s]+5888bf4fe4b05ccb964bab9d[^"\\\s]*FeatureServer/
  );
  return match?.[0];
}

export function buildSgmcShadowQueryUrl(featureServerRoot: string): string {
  const root = featureServerRoot.endsWith('/') ? featureServerRoot : `${featureServerRoot}/`;
  const query = new URL(`${USGS_SGMC_LAYER_ID}/query`, root);
  query.searchParams.set(
    'geometry',
    `${USGS_SGMC_SHADOW_BBOX.xmin},${USGS_SGMC_SHADOW_BBOX.ymin},${USGS_SGMC_SHADOW_BBOX.xmax},${USGS_SGMC_SHADOW_BBOX.ymax}`
  );
  query.searchParams.set('geometryType', 'esriGeometryEnvelope');
  query.searchParams.set('inSR', String(USGS_SGMC_SHADOW_BBOX.inSR));
  query.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
  query.searchParams.set('outFields', USGS_SGMC_SHADOW_OUT_FIELDS.join(','));
  query.searchParams.set('returnGeometry', 'true');
  query.searchParams.set('outSR', '102100');
  query.searchParams.set('resultRecordCount', String(USGS_SGMC_SHADOW_RESULT_LIMIT));
  query.searchParams.set('where', '1=1');
  query.searchParams.set('f', 'json');
  return query.toString();
}

export function gateSgmcServiceMetadata(input: {
  featureServerUrl: string;
  service: unknown;
  layer: unknown;
}):
  | { ok: true; maxRecordCount: number | undefined }
  | { ok: false; failure: SgmcShadowFailure; detail: string } {
  if (
    !input.featureServerUrl.includes(USGS_SGMC_SCIENCEBASE_ITEM) ||
    input.featureServerUrl.includes(USGS_SGMC_GEMS_DOI)
  ) {
    return {
      ok: false,
      failure: SgmcShadowFailure.SOURCE_IDENTITY_DRIFT,
      detail: 'Feature service URL does not belong to the pinned ScienceBase item',
    };
  }
  const serviceText = JSON.stringify(input.service);
  const layerText = JSON.stringify(input.layer);
  if (serviceText.includes(USGS_SGMC_GEMS_DOI) || layerText.includes(USGS_SGMC_GEMS_DOI)) {
    return {
      ok: false,
      failure: SgmcShadowFailure.UNSUPPORTED_SOURCE_VERSION,
      detail: 'Service metadata identifies the 2026 GeMS product',
    };
  }
  const layer = asRecord(input.layer);
  const layerId = layer?.['id'];
  const layerName = layer?.['name'];
  if (layerId !== USGS_SGMC_LAYER_ID || layerName !== USGS_SGMC_LAYER_NAME) {
    return {
      ok: false,
      failure: SgmcShadowFailure.SCHEMA_DRIFT,
      detail: 'Selected layer id or name differs from SGMC_Geology layer 3',
    };
  }
  if (layer?.['geometryType'] !== 'esriGeometryPolygon') {
    return {
      ok: false,
      failure: SgmcShadowFailure.SCHEMA_DRIFT,
      detail: 'Layer geometry type is not polygon',
    };
  }
  const fields = layerFields(layer['fields']);
  const missing = CORE_FIELDS.filter((name) => !fields.some((field) => field.name === name));
  if (missing.length > 0) {
    return {
      ok: false,
      failure: SgmcShadowFailure.SCHEMA_DRIFT,
      detail: `Core fields missing: ${missing.join(',')}`,
    };
  }
  const capabilities = typeof layer['capabilities'] === 'string' ? layer['capabilities'] : '';
  if (!capabilities.includes('Query')) {
    return {
      ok: false,
      failure: SgmcShadowFailure.SCHEMA_DRIFT,
      detail: 'Layer does not advertise Query',
    };
  }
  const maxRecordCount = layer['maxRecordCount'];
  return {
    ok: true,
    maxRecordCount: typeof maxRecordCount === 'number' ? maxRecordCount : undefined,
  };
}

export async function authorizedSgmcGet(input: {
  url: string;
  transport: SgmcShadowTransport;
  authorization?: SourceOperationAuthorizationRequest;
  definition?: ReturnType<typeof sgmcAdapterDefinition>;
  timeoutMs?: number;
}): Promise<
  | { blocked: false; response: SgmcShadowTransportResponse }
  | { blocked: true; failure: SgmcShadowFailure; detail: string }
> {
  try {
    guardFirstLiveAdapterExecution(
      {
        authorizationRequest: input.authorization ?? sgmcAuthorizationRequest(),
        definition: input.definition ?? sgmcAdapterDefinition(),
        adapterOperation: SourceRequestedUseOperation.AUTOMATED_QUERY,
        resourceId: USGS_SGMC_RESOURCE_ID,
      },
      () => undefined
    );
  } catch (error) {
    return {
      blocked: true,
      failure: SgmcShadowFailure.AUTHORIZATION_BLOCKED,
      detail: error instanceof Error ? error.message : 'authorization blocked',
    };
  }
  try {
    const response = await input.transport.get(input.url, {
      timeoutMs: input.timeoutMs ?? USGS_SGMC_SHADOW_TIMEOUT_MS,
      headers: sgmcShadowRequestHeaders(),
    });
    return { blocked: false, response };
  } catch (error) {
    if (error instanceof SgmcShadowTransportError) {
      return { blocked: true, failure: error.failure, detail: error.message };
    }
    return {
      blocked: true,
      failure: SgmcShadowFailure.NETWORK_ERROR,
      detail: error instanceof Error ? error.message : 'network error',
    };
  }
}

export function classifySgmcHttpStatus(status: number): SgmcShadowFailure | undefined {
  if (status === 429) return SgmcShadowFailure.RATE_LIMITED;
  if (status >= 400) return SgmcShadowFailure.HTTP_ERROR;
  return undefined;
}

export function createSgmcHttpTransport(): SgmcShadowTransport {
  return {
    async get(url, init) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), init.timeoutMs);
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: init.headers,
          signal: controller.signal,
          redirect: 'follow',
        });
        const body = new Uint8Array(await response.arrayBuffer());
        return {
          status: response.status,
          contentType: response.headers.get('content-type'),
          headers: retainedHeaders(response.headers),
          body,
        };
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new SgmcShadowTransportError('TIMEOUT', 'SGMC shadow request timed out');
        }
        throw new SgmcShadowTransportError(
          'NETWORK_ERROR',
          error instanceof Error ? error.message : 'SGMC shadow request failed'
        );
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export type SgmcShadowInterpretation = {
  failure?: SgmcShadowFailure;
  featureCount: number;
  geologicalAbsence: false;
  polygonMeaning: 'NO_SGMC_POLYGON_RETURNED' | 'SGMC_POLYGONS_RETURNED';
  pagination: 'COMPLETE' | 'PARTIAL' | 'UNKNOWN';
  contentHash: string;
  retrievedAt?: string;
  comparison: Record<string, ShadowComparisonMark>;
  materialDrift: boolean;
  result?: SourceAdapterResult;
  provenanceGraph?: ProvenanceGraph;
  disclosure?: DisclosureProjection;
  admissionStatus?: string;
  rateLimitHeaders: Record<string, string>;
};

export async function interpretSgmcShadowResponse(input: {
  rawBody: Uint8Array;
  httpStatus: number;
  contentType: string | null;
  retrievedAt: string;
  semanticHeaders: Record<string, string>;
  maxRecordCount: number | undefined;
  provenanceMode?: 'CAPTURE' | 'REPLAY';
}): Promise<SgmcShadowInterpretation> {
  const contentHash = hashSgmcResponseBytes(input.rawBody);
  const rateLimitHeaders = rateHeaders(input.semanticHeaders);
  const httpFailure = classifySgmcHttpStatus(input.httpStatus);
  if (httpFailure !== undefined) {
    return baseInterpretation(contentHash, rateLimitHeaders, httpFailure);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(input.rawBody));
  } catch {
    return baseInterpretation(contentHash, rateLimitHeaders, SgmcShadowFailure.INVALID_RESPONSE);
  }
  const body = asRecord(parsed);
  if (body === undefined) {
    return baseInterpretation(contentHash, rateLimitHeaders, SgmcShadowFailure.INVALID_RESPONSE);
  }
  if (body['error'] !== undefined) {
    return baseInterpretation(contentHash, rateLimitHeaders, SgmcShadowFailure.PROVIDER_ERROR);
  }
  const features = Array.isArray(body['features']) ? body['features'] : undefined;
  if (features === undefined) {
    return baseInterpretation(contentHash, rateLimitHeaders, SgmcShadowFailure.INVALID_RESPONSE);
  }
  const exceeded = body['exceededTransferLimit'] === true;
  const pagination = exceeded
    ? 'PARTIAL'
    : features.length < USGS_SGMC_SHADOW_RESULT_LIMIT
      ? 'COMPLETE'
      : 'UNKNOWN';
  const count = interpretSgmcPolygonCount(features.length);
  if (features.length === 0) {
    return {
      ...baseInterpretation(contentHash, rateLimitHeaders, SgmcShadowFailure.EMPTY_RESPONSE),
      featureCount: 0,
      polygonMeaning: count.meaning,
      pagination,
      retrievedAt: input.retrievedAt,
      comparison: { COVERAGE_SEMANTICS: 'UNKNOWN', PAGINATION_SIGNAL: paginationMark(pagination) },
    };
  }
  const feature = asRecord(features[0]);
  const attributes = asRecord(feature?.['attributes']);
  const geometry = feature?.['geometry'];
  if (feature === undefined || attributes === undefined) {
    return baseInterpretation(contentHash, rateLimitHeaders, SgmcShadowFailure.INVALID_RESPONSE);
  }
  const spatial = spatialReferenceToken(body['spatialReference']);
  const geojson = esriPolygonToGeoJson(geometry);
  const comparison = compareFeature(attributes, spatial, input.maxRecordCount, pagination);
  const materialDrift = Object.values(comparison).includes('DRIFT');
  const observed = observedRecord(attributes, geojson, spatial, features.length, pagination);
  const translated = translateSgmcObservedRecord(observed, sgmcAdapterDefinition(), {
    retrievedAt: input.retrievedAt,
  });
  if (translated.coverage !== undefined) {
    translated.coverage = {
      ...translated.coverage,
      state: pagination === 'COMPLETE' ? 'UNKNOWN' : 'UNRESOLVED',
      reason: {
        code: 'SHADOW_QUERY',
        detail: 'One bounded SGMC shadow query. This is not comprehensive geological coverage.',
      },
      recordCoverage: pagination === 'PARTIAL' ? 'PARTIAL' : translated.coverage.recordCoverage,
      resultCount: features.length,
    };
  }
  const provenanceGraph =
    input.provenanceMode === 'REPLAY'
      ? undefined
      : await shadowProvenance(translated, contentHash, input.retrievedAt);
  const promotable =
    translated.status === SourceAdapterResultStatus.SUCCESS ||
    translated.status === SourceAdapterResultStatus.PARTIAL_SUCCESS;
  const disclosure = promotable
    ? projectSgmcDisclosure(DisclosureClassification.PUBLIC, DisclosurePurpose.SHADOW_DISPLAY)
    : undefined;
  const admission = promotable ? admitSgmcForGeologicalContext(translated) : undefined;
  return {
    featureCount: features.length,
    geologicalAbsence: false,
    polygonMeaning: count.meaning,
    pagination,
    contentHash,
    retrievedAt: input.retrievedAt,
    comparison,
    materialDrift,
    result: translated,
    ...(provenanceGraph === undefined ? {} : { provenanceGraph }),
    ...(disclosure === undefined ? {} : { disclosure }),
    ...(admission === undefined ? {} : { admissionStatus: admission.status }),
    rateLimitHeaders,
    ...(translated.status === SourceAdapterResultStatus.QUARANTINED
      ? { failure: failureFromAdapter(translated.failureCode) }
      : {}),
  };
}

export function shadowMaterializationAllowed(projection: DisclosureProjection): boolean {
  if (
    projection.decision.status === 'WITHHELD' ||
    projection.decision.status === 'UNKNOWN_FAIL_CLOSED'
  ) {
    return false;
  }
  materializeDisclosureRelease(projection, projection.inputs.purpose);
  return true;
}

export function rejectSgmcOutsideGeology(
  result: SourceAdapterResult,
  purpose: (typeof EvidencePurpose)[keyof typeof EvidencePurpose],
  domain: (typeof EvidenceDomain)[keyof typeof EvidenceDomain]
): string {
  const candidate = sgmcAdmissionCandidate(result);
  const policy = sgmcGeologicalContextPolicy();
  return evaluateEvidenceAdmission({
    id: `shadow-reject-${domain}`,
    evaluatedAt: '2026-09-23T00:00:00.000Z',
    candidate,
    policy: { ...policy, id: `policy-${domain}`, purpose, domain },
  }).status;
}

function observedRecord(
  attributes: Record<string, unknown>,
  geometry: { type: 'Polygon'; coordinates: unknown[] } | undefined,
  spatial: string | undefined,
  featureCount: number,
  pagination: 'COMPLETE' | 'PARTIAL' | 'UNKNOWN'
): SgmcObservedRecord {
  const feature: SgmcObservedRecord['feature'] = {
    ...attributes,
    geometry: geometry ?? attributes['geometry'],
  };
  return {
    recordId: `live:${hashSgmcResponseBytes(new TextEncoder().encode(JSON.stringify(attributes))).slice(0, 32)}`,
    productDoi: USGS_SGMC_PINNED_DOI,
    publicationVersion: USGS_SGMC_PUBLICATION_VERSION,
    layerName: USGS_SGMC_LAYER_NAME,
    layerId: USGS_SGMC_LAYER_ID,
    scienceBaseItem: USGS_SGMC_SCIENCEBASE_ITEM,
    spatialReference: spatial ?? 'UNKNOWN',
    pagination: {
      returnedCount: featureCount,
      maxRecordCount: USGS_SGMC_MAX_RECORD_COUNT,
      completion: pagination === 'COMPLETE' ? 'COMPLETE' : 'UNKNOWN',
    },
    feature,
    sourceEncoding: 'application/json',
    inputKind: 'RAW_FEATURE',
  };
}

function compareFeature(
  attributes: Record<string, unknown>,
  spatial: string | undefined,
  maxRecordCount: number | undefined,
  pagination: 'COMPLETE' | 'PARTIAL' | 'UNKNOWN'
): Record<string, ShadowComparisonMark> {
  const identity = sgmcProviderRecordKey(attributes);
  const lithology = attributes['GENERALIZED_LITH'];
  const knownLithology =
    typeof lithology === 'string' &&
    USGS_SGMC_KNOWN_GENERALIZED_LITH.some((item) => item === lithology);
  const agesAreText =
    typeof attributes['AGE_MIN'] === 'string' && typeof attributes['AGE_MAX'] === 'string';
  const extra = Object.keys(attributes).filter(
    (key) => !USGS_SGMC_SHADOW_OUT_FIELDS.some((field) => field === key)
  );
  return {
    SOURCE_IDENTITY: 'MATCH',
    LAYER: 'MATCH',
    GEOMETRY_TYPE: 'MATCH',
    SPATIAL_REFERENCE: spatial === 'ESRI:102100' || spatial === 'EPSG:3857' ? 'MATCH' : 'DRIFT',
    CORE_FIELDS: [
      'STATE',
      'SGMC_LABEL',
      'UNIT_LINK',
      'UNIT_NAME',
      'AGE_MIN',
      'AGE_MAX',
      'GENERALIZED_LITH',
    ].every((field) => attributes[field] !== undefined)
      ? 'MATCH'
      : 'DRIFT',
    FIELD_TYPES: agesAreText ? 'MATCH' : 'DRIFT',
    UNKNOWN_FIELDS: extra.length === 0 ? 'MATCH' : 'COMPATIBLE_EXTENSION',
    LITHOLOGY_ENUM: knownLithology ? 'MATCH' : 'DRIFT',
    AGE_REPRESENTATION: agesAreText ? 'MATCH' : 'DRIFT',
    IDENTITY_COMPONENTS: identity.ambiguous ? 'DRIFT' : 'MATCH',
    IDENTITY_SCOPE: 'MATCH',
    PAGINATION_SIGNAL: paginationMark(pagination),
    COVERAGE_SEMANTICS: 'UNKNOWN',
    MAX_RECORD_COUNT:
      maxRecordCount === undefined
        ? 'UNKNOWN'
        : maxRecordCount === USGS_SGMC_MAX_RECORD_COUNT
          ? 'MATCH'
          : 'DRIFT',
  };
}

function paginationMark(pagination: 'COMPLETE' | 'PARTIAL' | 'UNKNOWN'): ShadowComparisonMark {
  if (pagination === 'COMPLETE') return 'MATCH';
  return 'UNKNOWN';
}

async function shadowProvenance(
  result: SourceAdapterResult,
  contentHash: string,
  retrievedAt: string
): Promise<ProvenanceGraph> {
  const rawEntity = {
    entityId: result.raw?.id ?? 'live:usgs-sgmc',
    entityType: ProvenanceEntityType.DOCUMENT,
  };
  const resourceEntity = {
    entityId: USGS_SGMC_RESOURCE_ID,
    entityType: ProvenanceEntityType.RESOURCE_RECORD,
  };
  const generated =
    result.normalized === undefined
      ? [rawEntity]
      : [{ entityId: result.normalized.id, entityType: ProvenanceEntityType.GEOLOGICAL_LAYER }];
  const retrieval = validateProvenanceActivity({
    id: `act:${result.raw?.id ?? 'usgs-sgmc'}:a-retrieval`,
    schemaVersion: PROVENANCE_SCHEMA_VERSION,
    activityType: ProvenanceActivityType.SOURCE_RETRIEVAL,
    lineageClass: ProvenanceLineageClass.SOURCE,
    used: [resourceEntity],
    generated: [rawEntity],
    associatedAgents: [
      {
        agentId: 'usgs-sgmc-shadow-transport',
        agentType: ProvenanceAgentType.SOFTWARE,
        role: ProvenanceAgentRole.SOFTWARE_EXECUTOR,
      },
    ],
    process: {
      processId: USGS_SGMC_ADAPTER_ID,
      processVersion: '1.0.0',
      implementationRef: 'packages/shared/src/usgs-sgmc-shadow-read.ts',
      buildingBlockId: SOURCE_ADAPTER_CONTRACT_BLOCK_ID,
      buildingBlockVersion: { major: 1, minor: 0, patch: 0 },
    },
    startedAt: retrievedAt,
    endedAt: retrievedAt,
    parameters: [
      { name: 'requestedOperation', type: 'STRING', value: 'AUTOMATED_QUERY' },
      { name: 'responseHash', type: 'STRING', value: contentHash },
      { name: 'layer', type: 'STRING', value: `${USGS_SGMC_LAYER_NAME}:${USGS_SGMC_LAYER_ID}` },
    ],
    status: 'COMPLETED',
  });
  const adaptation = validateProvenanceActivity({
    id: `act:${result.raw?.id ?? 'usgs-sgmc'}:b-import`,
    schemaVersion: PROVENANCE_SCHEMA_VERSION,
    activityType: ProvenanceActivityType.IMPORT,
    lineageClass: ProvenanceLineageClass.PROCESS,
    used: [resourceEntity, rawEntity],
    generated,
    associatedAgents: [
      {
        agentId: 'usgs-sgmc-offline-adapter',
        agentType: ProvenanceAgentType.SOFTWARE,
        role: ProvenanceAgentRole.SOFTWARE_EXECUTOR,
      },
    ],
    process: {
      processId: USGS_SGMC_ADAPTER_ID,
      processVersion: '1.0.0',
      implementationRef: 'packages/shared/src/usgs-sgmc-provider.ts',
      buildingBlockId: SOURCE_ADAPTER_CONTRACT_BLOCK_ID,
      buildingBlockVersion: { major: 1, minor: 0, patch: 0 },
    },
    startedAt: retrievedAt,
    endedAt: retrievedAt,
    parameters: [{ name: 'adapterVersion', type: 'STRING', value: '1.0.0' }],
    status: result.status === SourceAdapterResultStatus.SUCCESS ? 'COMPLETED' : 'FAILED',
  });
  const retrievalHash = await hashProvenanceActivity(retrieval);
  const adaptationHash = await hashProvenanceActivity(adaptation);
  return validateProvenanceGraph({
    schemaVersion: PROVENANCE_SCHEMA_VERSION,
    activities: [
      { ...retrieval, activityHash: retrievalHash },
      { ...adaptation, activityHash: adaptationHash },
    ],
    derivations: [],
  });
}

function failureFromAdapter(code: SourceAdapterResult['failureCode']): SgmcShadowFailure {
  if (code === SourceAdapterFailureCode.UNSUPPORTED_SOURCE_VERSION) {
    return SgmcShadowFailure.UNSUPPORTED_SOURCE_VERSION;
  }
  if (code === SourceAdapterFailureCode.SOURCE_SCHEMA_MISMATCH)
    return SgmcShadowFailure.SCHEMA_DRIFT;
  if (code === SourceAdapterFailureCode.COVERAGE_METADATA_INVALID) {
    return SgmcShadowFailure.PARTIAL_RESPONSE;
  }
  return SgmcShadowFailure.SCHEMA_DRIFT;
}

function baseInterpretation(
  contentHash: string,
  rateLimitHeaders: Record<string, string>,
  failure: SgmcShadowFailure
): SgmcShadowInterpretation {
  return {
    failure,
    featureCount: 0,
    geologicalAbsence: false,
    polygonMeaning: 'NO_SGMC_POLYGON_RETURNED',
    pagination: 'UNKNOWN',
    contentHash,
    comparison: {},
    materialDrift: failure === SgmcShadowFailure.SCHEMA_DRIFT,
    rateLimitHeaders,
  };
}

function spatialReferenceToken(value: unknown): string | undefined {
  const spatial = asRecord(value);
  const wkid = spatial?.['latestWkid'] ?? spatial?.['wkid'];
  if (wkid === 102100) return 'ESRI:102100';
  if (wkid === 3857) return 'EPSG:3857';
  if (wkid === 4326) return 'EPSG:4326';
  return undefined;
}

function esriPolygonToGeoJson(
  value: unknown
): { type: 'Polygon'; coordinates: unknown[] } | undefined {
  const geometry = asRecord(value);
  const rings = geometry?.['rings'];
  if (!Array.isArray(rings) || !Array.isArray(rings[0]) || rings[0].length < 4) return undefined;
  const ring = rings[0] as unknown[];
  if (JSON.stringify(ring[0]) !== JSON.stringify(ring[ring.length - 1])) return undefined;
  return { type: 'Polygon', coordinates: rings };
}

function layerFields(value: unknown): Array<{ name: string; type: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const field = asRecord(item);
    if (typeof field?.['name'] !== 'string') return [];
    return [{ name: field['name'], type: typeof field['type'] === 'string' ? field['type'] : '' }];
  });
}

function rateHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).filter(
      ([name]) => name.toLowerCase().includes('ratelimit') || name.toLowerCase() === 'retry-after'
    )
  );
}

function retainedHeaders(headers: Headers): Record<string, string> {
  const kept: Record<string, string> = {};
  headers.forEach((value, name) => {
    if (HEADER_ALLOWLIST.has(name.toLowerCase())) kept[name.toLowerCase()] = value;
  });
  return kept;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}
