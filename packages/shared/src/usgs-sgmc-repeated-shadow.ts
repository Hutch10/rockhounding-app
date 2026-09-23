/**
 * Bounded repeated SGMC shadow campaign policy.
 *
 * This module does not contact the provider. The one-shot campaign script
 * is the only caller that may use a live transport.
 */

import { DisclosureClassification, DisclosurePurpose } from './disclosure-governance';
import { EvidenceDomain, EvidencePurpose } from './evidence-admission';
import { evaluateSourceOperationAuthorization } from './source-operation-authorization';
import {
  USGS_SGMC_KNOWN_GENERALIZED_LITH,
  admitSgmcForGeologicalContext,
  projectSgmcDisclosure,
  sgmcAuthorizationRequest,
  sgmcProviderRecordKey,
} from './usgs-sgmc-provider';
import {
  USGS_SGMC_REPEATED_SHADOW_MAX_SPAN_DEGREES,
  USGS_SGMC_REPEATED_SHADOW_PROFILE,
  replaySgmcCapturedShadowResponse,
} from './usgs-sgmc-shadow-certification';
import {
  USGS_SGMC_SHADOW_OUT_FIELDS,
  USGS_SGMC_SHADOW_RESULT_LIMIT,
  authorizedSgmcGet,
  buildSgmcBoundedQueryUrl,
  hashSgmcResponseBytes,
  interpretSgmcShadowResponse,
  rejectSgmcOutsideGeology,
  shadowMaterializationAllowed,
  translateSgmcShadowFeature,
  type SgmcShadowBbox,
  type SgmcShadowTransport,
} from './usgs-sgmc-shadow-read';

export const USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY = {
  provider: 'USGS_SGMC',
  mode: 'SHADOW_ONLY',
  adapterVersion: '1.0.0',
  operation: 'AUTOMATED_QUERY',
  layer: 'SGMC_Geology',
  layerId: 3,
  maxCampaignQueries: 4,
  maxBBoxWidthDegrees: USGS_SGMC_REPEATED_SHADOW_MAX_SPAN_DEGREES,
  maxBBoxHeightDegrees: USGS_SGMC_REPEATED_SHADOW_MAX_SPAN_DEGREES,
  maxFeatures: USGS_SGMC_SHADOW_RESULT_LIMIT,
  parallelism: 1,
  automaticRetry: false,
  automaticPagination: false,
  backgroundPolling: false,
  publicMaterialization: false,
  productionAuthority: 'NONE',
  governanceCheckPerRequest: true,
  disclosureCheckPerMaterialization: true,
  admissionCheckPerCandidate: true,
  quarantineOnDrift: true,
  offSwitch: 'governance suspension',
  pauseMs: 5000,
  requestTimeoutMs: 60000,
} as const;

export const USGS_SGMC_REPEATED_SHADOW_READS = [
  {
    readId: 'READ_A',
    purpose: 'ORDINARY_URBAN_ALLUVIAL_PLAIN',
    placeLabel: 'Downtown Omaha, Nebraska',
    bbox: { xmin: -95.94, ymin: 41.256, xmax: -95.928, ymax: 41.264, inSR: 4326 },
  },
  {
    readId: 'READ_B',
    purpose: 'ORDINARY_URBAN_PIEDMONT',
    placeLabel: 'Downtown Atlanta, Georgia',
    bbox: { xmin: -84.392, ymin: 33.753, xmax: -84.38, ymax: 33.761, inSR: 4326 },
  },
  {
    readId: 'READ_C',
    purpose: 'ORDINARY_URBAN_DIFFERENT_STATE_LINEAGE',
    placeLabel: 'Downtown Austin, Texas',
    bbox: { xmin: -97.748, ymin: 30.266, xmax: -97.736, ymax: 30.274, inSR: 4326 },
  },
  {
    readId: 'READ_D',
    purpose: 'ORDINARY_URBAN_STATE_LINE_ADJACENT',
    placeLabel: 'Downtown Kansas City, Missouri',
    bbox: { xmin: -94.59, ymin: 39.098, xmax: -94.578, ymax: 39.106, inSR: 4326 },
  },
] as const;

export type SgmcRepeatedShadowReadPlan = (typeof USGS_SGMC_REPEATED_SHADOW_READS)[number];

export function acceptSgmcRepeatedShadowCampaign(input: {
  queryCount: number;
  parallelism: number;
  automaticRetry: boolean;
  automaticPagination: boolean;
  backgroundPolling: boolean;
  publicMaterialization: boolean;
  envelopes: readonly { bbox: SgmcShadowBbox; resultRecordCount: number }[];
}): { status: 'ALLOWED' | 'BLOCKED'; reasons: string[] } {
  const reasons: string[] = [];
  const policy = USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY;
  if (
    input.queryCount > policy.maxCampaignQueries ||
    input.envelopes.length > policy.maxCampaignQueries
  ) {
    reasons.push('QUERY_COUNT');
  }
  if (input.parallelism !== policy.parallelism) reasons.push('PARALLELISM');
  if (input.automaticRetry) reasons.push('AUTOMATIC_RETRY');
  if (input.automaticPagination) reasons.push('AUTOMATIC_PAGINATION');
  if (input.backgroundPolling) reasons.push('BACKGROUND_POLLING');
  if (input.publicMaterialization) reasons.push('PUBLIC_MATERIALIZATION');
  for (const envelope of input.envelopes) {
    const width = envelope.bbox.xmax - envelope.bbox.xmin;
    const height = envelope.bbox.ymax - envelope.bbox.ymin;
    if (
      width <= 0 ||
      height <= 0 ||
      width > policy.maxBBoxWidthDegrees ||
      height > policy.maxBBoxHeightDegrees
    ) {
      reasons.push('EXTENT');
    }
    if (envelope.resultRecordCount > policy.maxFeatures) reasons.push('FEATURE_LIMIT');
  }
  return { status: reasons.length === 0 ? 'ALLOWED' : 'BLOCKED', reasons };
}

export function sgmcShadowProductionConsumerAccepts(): false {
  return false;
}

export async function assessSgmcRepeatedShadowBody(
  rawBody: Uint8Array,
  retrievedAt: string,
  httpStatus: number
): Promise<{
  contentHash: string;
  featureCount: number;
  pagination: 'COMPLETE' | 'PARTIAL' | 'UNKNOWN';
  geologicalAbsence: false;
  failure?: string;
  materialDrift: boolean;
  replayMatches: boolean;
  provenanceActivityIds: string[];
  adapterStatuses: string[];
  quarantineCount: number;
  admissionStatuses: string[];
  disclosureStatuses: string[];
  lithologyClasses: Array<'KNOWN' | 'UNKNOWN' | 'ABSENT'>;
  ageRepresentations: Array<'TEXT' | 'DRIFT'>;
  identityAmbiguousCount: number;
  duplicateScopedKeyCount: number;
  geometryMark?: string;
  spatialMark?: string;
  outsideGeologyRejected: boolean;
  localDetail: {
    lithology: string[];
    ageMin: string[];
    ageMax: string[];
    states: string[];
    serviceObjectIds: Array<number | null>;
  };
}> {
  const live = await interpretSgmcShadowResponse({
    rawBody,
    httpStatus,
    contentType: 'application/json',
    retrievedAt,
    semanticHeaders: {},
    maxRecordCount: 2000,
    provenanceMode: 'CAPTURE',
  });
  const replay =
    httpStatus === 200
      ? await replaySgmcCapturedShadowResponse({
          rawBody,
          recordedRetrievedAt: retrievedAt,
          recordedRetrievalActivityId: live.provenanceGraph?.activities[0]?.id ?? 'unrecorded',
          recordedResponseHash: live.contentHash,
        })
      : undefined;
  const sameStatusReplay =
    httpStatus === 200
      ? undefined
      : await interpretSgmcShadowResponse({
          rawBody,
          httpStatus,
          contentType: 'application/json',
          retrievedAt,
          semanticHeaders: {},
          maxRecordCount: 2000,
          provenanceMode: 'REPLAY',
        });
  const liveFields = live.result?.normalized?.normalizedFields;
  const replayFields = replay?.interpretation.result?.normalized?.normalizedFields;
  const parsed = parseBody(rawBody);
  const features = Array.isArray(parsed?.['features']) ? parsed['features'] : [];
  const spatialReference = parsed?.['spatialReference'];
  const pagination = live.pagination;
  const details = features.map((feature) => {
    const record = asRecord(feature);
    const attributes = asRecord(record?.['attributes']) ?? {};
    const first = translateSgmcShadowFeature({
      attributes,
      geometry: record?.['geometry'],
      spatialReference,
      retrievedAt,
      featureCount: features.length,
      pagination,
    });
    const second = translateSgmcShadowFeature({
      attributes,
      geometry: record?.['geometry'],
      spatialReference,
      retrievedAt,
      featureCount: features.length,
      pagination,
    });
    const lithology = attributes['GENERALIZED_LITH'];
    const lithologyClass: 'KNOWN' | 'UNKNOWN' | 'ABSENT' =
      typeof lithology !== 'string'
        ? 'ABSENT'
        : USGS_SGMC_KNOWN_GENERALIZED_LITH.some((item) => item === lithology)
          ? 'KNOWN'
          : 'UNKNOWN';
    const agesAreText =
      typeof attributes['AGE_MIN'] === 'string' && typeof attributes['AGE_MAX'] === 'string';
    const identity = sgmcProviderRecordKey(attributes);
    const promotable = first.status === 'SUCCESS' || first.status === 'PARTIAL_SUCCESS';
    const disclosure = promotable
      ? projectSgmcDisclosure(DisclosureClassification.PUBLIC, DisclosurePurpose.SHADOW_DISPLAY)
      : undefined;
    const disclosureStatus =
      disclosure === undefined
        ? 'NOT_MATERIALIZED'
        : shadowMaterializationAllowed(disclosure)
          ? disclosure.decision.status
          : 'WITHHELD';
    const outsideRejected =
      promotable &&
      [
        rejectSgmcOutsideGeology(
          first,
          EvidencePurpose.COLLECTION_PERMISSION,
          EvidenceDomain.COLLECTION_RULE
        ),
        rejectSgmcOutsideGeology(
          first,
          EvidencePurpose.SITE_ACCESS,
          EvidenceDomain.ROAD_TRAIL_ACCESS
        ),
        rejectSgmcOutsideGeology(
          first,
          EvidencePurpose.ROUTE_DECISION,
          EvidenceDomain.ROAD_TRAIL_ACCESS
        ),
        rejectSgmcOutsideGeology(first, EvidencePurpose.OTHER, EvidenceDomain.CLOSURE),
        rejectSgmcOutsideGeology(first, EvidencePurpose.OTHER, EvidenceDomain.MINING_CLAIM),
        rejectSgmcOutsideGeology(first, EvidencePurpose.SITE_ACCESS, EvidenceDomain.LAND_OWNERSHIP),
        rejectSgmcOutsideGeology(first, EvidencePurpose.OTHER, EvidenceDomain.LAND_MANAGEMENT),
      ].every((status) => status === 'REJECTED');
    return {
      matches:
        JSON.stringify(first.normalized?.normalizedFields) ===
        JSON.stringify(second.normalized?.normalizedFields),
      status: first.status,
      lithologyClass,
      ageRepresentation: agesAreText ? ('TEXT' as const) : ('DRIFT' as const),
      ambiguous: identity.ambiguous,
      key: identity.key,
      admission: promotable ? admitSgmcForGeologicalContext(first).status : 'NOT_ADMITTED',
      disclosure: disclosureStatus,
      outsideRejected: promotable ? outsideRejected : true,
      lithology: typeof lithology === 'string' ? lithology : '',
      ageMin: typeof attributes['AGE_MIN'] === 'string' ? attributes['AGE_MIN'] : '',
      ageMax: typeof attributes['AGE_MAX'] === 'string' ? attributes['AGE_MAX'] : '',
      state: typeof attributes['STATE'] === 'string' ? attributes['STATE'] : '',
      serviceObjectId: identity.serviceObjectId ?? null,
    };
  });
  const keys = details.flatMap((item) => (item.key === undefined ? [] : [item.key]));
  const duplicateScopedKeyCount = keys.length - new Set(keys).size;
  const envelopeMatch =
    httpStatus === 200
      ? JSON.stringify(liveFields ?? null) === JSON.stringify(replayFields ?? null) &&
        live.failure === replay?.interpretation.failure &&
        replay?.fabricatedSourceRetrieval === false
      : live.failure === sameStatusReplay?.failure &&
        sameStatusReplay?.provenanceGraph === undefined;
  return {
    contentHash: hashSgmcResponseBytes(rawBody),
    featureCount: live.featureCount,
    pagination: live.pagination,
    geologicalAbsence: false,
    ...(live.failure === undefined ? {} : { failure: live.failure }),
    materialDrift: live.materialDrift,
    replayMatches: envelopeMatch && details.every((item) => item.matches),
    provenanceActivityIds: (live.provenanceGraph?.activities ?? []).map((activity) => activity.id),
    adapterStatuses: details.map((item) => item.status),
    quarantineCount: details.filter((item) => item.status === 'QUARANTINED').length,
    admissionStatuses: details.map((item) => item.admission),
    disclosureStatuses: details.map((item) => item.disclosure),
    lithologyClasses: details.map((item) => item.lithologyClass),
    ageRepresentations: details.map((item) => item.ageRepresentation),
    identityAmbiguousCount: details.filter((item) => item.ambiguous).length,
    duplicateScopedKeyCount,
    ...(live.comparison['GEOMETRY_TYPE'] === undefined
      ? {}
      : { geometryMark: live.comparison['GEOMETRY_TYPE'] }),
    ...(live.comparison['SPATIAL_REFERENCE'] === undefined
      ? {}
      : { spatialMark: live.comparison['SPATIAL_REFERENCE'] }),
    outsideGeologyRejected: details.every((item) => item.outsideRejected),
    localDetail: {
      lithology: details.map((item) => item.lithology),
      ageMin: details.map((item) => item.ageMin),
      ageMax: details.map((item) => item.ageMax),
      states: details.map((item) => item.state),
      serviceObjectIds: details.map((item) => item.serviceObjectId),
    },
  };
}

export async function executeSequentialSgmcShadowReads(input: {
  featureServerRoot: string;
  reads: readonly SgmcRepeatedShadowReadPlan[];
  transport: SgmcShadowTransport;
  timeoutMs?: number;
  authorizationRequest?: () => ReturnType<typeof sgmcAuthorizationRequest>;
}): Promise<{
  transportCalls: number;
  authorizationChecks: number;
  reads: Array<{
    readId: string;
    blocked: boolean;
    failure?: string;
    httpStatus?: number;
  }>;
}> {
  const accepted = acceptSgmcRepeatedShadowCampaign({
    queryCount: input.reads.length,
    parallelism: USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY.parallelism,
    automaticRetry: false,
    automaticPagination: false,
    backgroundPolling: false,
    publicMaterialization: false,
    envelopes: input.reads.map((read) => ({
      bbox: read.bbox,
      resultRecordCount: USGS_SGMC_SHADOW_RESULT_LIMIT,
    })),
  });
  if (accepted.status === 'BLOCKED') {
    return {
      transportCalls: 0,
      authorizationChecks: 0,
      reads: input.reads.map((read) => ({
        readId: read.readId,
        blocked: true,
        failure: accepted.reasons.join(','),
      })),
    };
  }
  const reads: Array<{ readId: string; blocked: boolean; failure?: string; httpStatus?: number }> =
    [];
  let transportCalls = 0;
  let authorizationChecks = 0;
  const countingTransport: SgmcShadowTransport = {
    async get(url, init) {
      transportCalls += 1;
      return input.transport.get(url, init);
    },
  };
  for (const read of input.reads) {
    authorizationChecks += 1;
    const request = (input.authorizationRequest ?? sgmcAuthorizationRequest)();
    const decision = evaluateSourceOperationAuthorization(request);
    if (
      decision.status !== 'ALLOWED_WITH_CONSTRAINTS' ||
      request.requestedOperation !== USGS_SGMC_REPEATED_SHADOW_PROFILE.operation
    ) {
      reads.push({ readId: read.readId, blocked: true, failure: 'AUTHORIZATION_BLOCKED' });
      continue;
    }
    const url = buildSgmcBoundedQueryUrl(input.featureServerRoot, read.bbox);
    const fields = encodeURIComponent(USGS_SGMC_SHADOW_OUT_FIELDS.join(','));
    if (!url.includes('/3/query?') || !url.includes(fields)) {
      reads.push({ readId: read.readId, blocked: true, failure: 'QUERY_SHAPE' });
      continue;
    }
    const response = await authorizedSgmcGet({
      url,
      transport: countingTransport,
      authorization: request,
      timeoutMs: input.timeoutMs ?? USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY.requestTimeoutMs,
    });
    if (response.blocked) {
      reads.push({ readId: read.readId, blocked: true, failure: response.failure });
      continue;
    }
    reads.push({ readId: read.readId, blocked: false, httpStatus: response.response.status });
  }
  return { transportCalls, authorizationChecks, reads };
}

function parseBody(rawBody: Uint8Array): Record<string, unknown> | undefined {
  try {
    return asRecord(JSON.parse(new TextDecoder().decode(rawBody)));
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}
