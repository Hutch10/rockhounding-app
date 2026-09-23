/**
 * Certified execution profile for a future bounded SGMC shadow read.
 *
 * This module does not contact the provider and does not revise the adapter.
 */

import type { SourceAdapterResult } from './source-adapter-contract';
import {
  USGS_SGMC_ADAPTER_ID,
  USGS_SGMC_IDENTITY_SCOPE,
  USGS_SGMC_LAYER_ID,
  USGS_SGMC_LAYER_NAME,
  USGS_SGMC_MAX_RECORD_COUNT,
  USGS_SGMC_PINNED_DOI,
  USGS_SGMC_PUBLICATION_VERSION,
  USGS_SGMC_RESOURCE_ID,
  USGS_SGMC_SCIENCEBASE_ITEM,
  USGS_SGMC_UNGRANTED_OPERATIONS,
  sgmcAdapterDefinition,
  translateSgmcObservedRecord,
  type SgmcObservedRecord,
} from './usgs-sgmc-provider';
import {
  USGS_SGMC_SHADOW_OUT_FIELDS,
  USGS_SGMC_SHADOW_RESULT_LIMIT,
  interpretSgmcShadowResponse,
  type SgmcShadowInterpretation,
} from './usgs-sgmc-shadow-read';

export const USGS_SGMC_SHADOW_READ_BASELINE = 'df09267b2b386a8a8b960e97b90c1a9e5b12738c';

export const USGS_SGMC_CAPTURED_RESPONSE_SHA256 =
  'da2d6575b8dafa38a43383304e1ec196013cabb559cdfa5f622ddbea26d8c329';

export const USGS_SGMC_REPEATED_SHADOW_MAX_SPAN_DEGREES = 0.02;

export const USGS_SGMC_REPEATED_SHADOW_CONUS_WINDOW = {
  minLongitude: -125,
  maxLongitude: -66,
  minLatitude: 24,
  maxLatitude: 50,
} as const;

export const USGS_SGMC_REPEATED_SHADOW_PROFILE = {
  mode: 'SHADOW_ONLY',
  provider: 'USGS_SGMC',
  productDoi: USGS_SGMC_PINNED_DOI,
  publicationVersion: USGS_SGMC_PUBLICATION_VERSION,
  resourceId: USGS_SGMC_RESOURCE_ID,
  adapterId: USGS_SGMC_ADAPTER_ID,
  adapterVersion: '1.0.0',
  operation: 'AUTOMATED_QUERY',
  layerName: USGS_SGMC_LAYER_NAME,
  layerId: USGS_SGMC_LAYER_ID,
  maxFeatureCount: USGS_SGMC_SHADOW_RESULT_LIMIT,
  maxSpanDegrees: USGS_SGMC_REPEATED_SHADOW_MAX_SPAN_DEGREES,
  serviceMaxRecordCount: USGS_SGMC_MAX_RECORD_COUNT,
  frequency: 'MANUAL_OPERATOR_TRIGGERED',
  maxRequestsPerOperatorAction: 1,
  backgroundPolling: false,
  parallelFanOut: false,
  automaticRetry: false,
  pagination: 'SINGLE_BOUNDED_PAGE',
  productionAuthority: 'NONE',
  storage: 'LOCAL_QA_ONLY',
  redistribution: 'UNKNOWN',
  offlineCaching: 'UNKNOWN',
  rateLimit: 'UNKNOWN_OPERATIONAL_LIMIT',
  secretsRequired: false,
  identityScope: USGS_SGMC_IDENTITY_SCOPE,
} as const;

export type SgmcRepeatedShadowEnvelope = {
  layerId: number;
  layerName: string;
  operation: string;
  authorizationStatus: string;
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number };
  resultRecordCount: number;
  outFields: readonly string[];
  surface: string;
};

export function certifySgmcRepeatedShadowEnvelope(request: SgmcRepeatedShadowEnvelope): {
  status: 'ALLOWED' | 'BLOCKED';
  reasons: string[];
} {
  const reasons: string[] = [];
  if (request.operation !== USGS_SGMC_REPEATED_SHADOW_PROFILE.operation) {
    reasons.push('OPERATION');
  }
  if (request.authorizationStatus !== 'ALLOWED_WITH_CONSTRAINTS') {
    reasons.push('AUTHORIZATION');
  }
  if (request.layerId !== USGS_SGMC_LAYER_ID || request.layerName !== USGS_SGMC_LAYER_NAME) {
    reasons.push('LAYER');
  }
  if (request.resultRecordCount < 1 || request.resultRecordCount > USGS_SGMC_SHADOW_RESULT_LIMIT) {
    reasons.push('FEATURE_LIMIT');
  }
  if (request.outFields.join(',') !== USGS_SGMC_SHADOW_OUT_FIELDS.join(',')) {
    reasons.push('FIELDS');
  }
  if (!boundedConusExtent(request.bbox)) {
    reasons.push('EXTENT');
  }
  if (request.surface !== 'QA_SCOPE') {
    reasons.push('SURFACE');
  }
  return { status: reasons.length === 0 ? 'ALLOWED' : 'BLOCKED', reasons };
}

export function sgmcShadowMayMaterializeOn(surface: string): boolean {
  return surface === 'QA_SCOPE';
}

export function sgmcPaginationMayBeTreatedAsComplete(
  pagination: 'COMPLETE' | 'PARTIAL' | 'UNKNOWN'
): boolean {
  return pagination === 'COMPLETE';
}

export function capturedSgmcResponseMayReviseAdapterSchema(): false {
  return false;
}

export function sgmcRepeatedShadowContactsProvider(): false {
  return false;
}

export async function replaySgmcCapturedShadowResponse(input: {
  rawBody: Uint8Array;
  recordedRetrievedAt: string;
  recordedRetrievalActivityId: string;
  recordedResponseHash: string;
}): Promise<{
  interpretation: SgmcShadowInterpretation;
  recordedRetrievalActivityId: string;
  fabricatedSourceRetrieval: false;
  hashMatchesRecord: boolean;
}> {
  const interpretation = await interpretSgmcShadowResponse({
    rawBody: input.rawBody,
    httpStatus: 200,
    contentType: 'application/json',
    retrievedAt: input.recordedRetrievedAt,
    semanticHeaders: {},
    maxRecordCount: USGS_SGMC_MAX_RECORD_COUNT,
    provenanceMode: 'REPLAY',
  });
  return {
    interpretation,
    recordedRetrievalActivityId: input.recordedRetrievalActivityId,
    fabricatedSourceRetrieval: false,
    hashMatchesRecord: interpretation.contentHash === input.recordedResponseHash,
  };
}

export function reanalyzeSgmcShadowCandidate(
  prior: SourceAdapterResult,
  recordedRetrievedAt: string,
  spatialReference: string
): SourceAdapterResult {
  const raw = prior.raw;
  if (raw === undefined) {
    throw new Error('SGMC reanalysis requires the preserved raw record');
  }
  const observed: SgmcObservedRecord = {
    recordId: `${raw.id}:reanalysis`,
    productDoi: USGS_SGMC_PINNED_DOI,
    publicationVersion: USGS_SGMC_PUBLICATION_VERSION,
    layerName: USGS_SGMC_LAYER_NAME,
    layerId: USGS_SGMC_LAYER_ID,
    scienceBaseItem: USGS_SGMC_SCIENCEBASE_ITEM,
    spatialReference,
    pagination: {
      returnedCount: 1,
      maxRecordCount: USGS_SGMC_MAX_RECORD_COUNT,
      completion: 'COMPLETE',
    },
    feature: { ...raw.rawFields },
    sourceEncoding: 'application/json',
    inputKind: 'RAW_FEATURE',
  };
  return translateSgmcObservedRecord(observed, sgmcAdapterDefinition(), {
    retrievedAt: recordedRetrievedAt,
  });
}

export function repeatedShadowDeniesUngrantedOperation(operation: string): boolean {
  return USGS_SGMC_UNGRANTED_OPERATIONS.some((item) => item === operation) || operation === 'READ';
}

function boundedConusExtent(bbox: SgmcRepeatedShadowEnvelope['bbox']): boolean {
  const width = bbox.xmax - bbox.xmin;
  const height = bbox.ymax - bbox.ymin;
  const window = USGS_SGMC_REPEATED_SHADOW_CONUS_WINDOW;
  return (
    width > 0 &&
    height > 0 &&
    width <= USGS_SGMC_REPEATED_SHADOW_MAX_SPAN_DEGREES &&
    height <= USGS_SGMC_REPEATED_SHADOW_MAX_SPAN_DEGREES &&
    bbox.xmin >= window.minLongitude &&
    bbox.xmax <= window.maxLongitude &&
    bbox.ymin >= window.minLatitude &&
    bbox.ymax <= window.maxLatitude
  );
}
