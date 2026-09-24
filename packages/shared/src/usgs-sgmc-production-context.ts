/**
 * Bounded production read-only SGMC geological context.
 *
 * The browser does not call this provider. Raw bodies stay in the request.
 */

import { DisclosureClassification, DisclosurePurpose } from './disclosure-governance';
import { EvidenceDomain, EvidencePurpose } from './evidence-admission';
import { SourceAdapterResultStatus } from './source-adapter-contract';
import {
  evaluateSourceOperationAuthorization,
  type SourceOperationAuthorizationRequest,
} from './source-operation-authorization';
import {
  USGS_SGMC_ADAPTER_ID,
  USGS_SGMC_PINNED_DOI,
  USGS_SGMC_PUBLIC_DISPLAY_ATTRIBUTION,
  admitSgmcForGeologicalContext,
  projectSgmcDisclosure,
  sgmcAdapterDefinition,
  sgmcAuthorizationRequest,
  sgmcPublicDisplayAppliesToDoi,
  sgmcPublicDisplayAuthorizationRequest,
} from './usgs-sgmc-provider';
import { USGS_SGMC_REPEATED_SHADOW_CONUS_WINDOW } from './usgs-sgmc-shadow-certification';
import {
  USGS_SGMC_SHADOW_RESULT_LIMIT,
  authorizedSgmcGet,
  buildSgmcBoundedQueryUrl,
  interpretSgmcShadowResponse,
  rejectSgmcOutsideGeology as shadowRejectOutside,
  shadowMaterializationAllowed,
  createSgmcHttpTransport,
  translateSgmcShadowFeature,
  type SgmcShadowTransport,
} from './usgs-sgmc-shadow-read';

export const USGS_SGMC_PRODUCTION_FEATURE_SERVER =
  'https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/SB_5888bf4fe4b05ccb964bab9d_USGS_SGMC_feature/FeatureServer';

export const USGS_SGMC_PRODUCTION_CONTEXT_ENABLED = true;

export const USGS_SGMC_PRODUCTION_PROFILE = {
  mode: 'PRODUCTION_READ_ONLY_GEOLOGICAL_CONTEXT',
  provider: 'USGS_SGMC',
  resourceId: 'res-usgs-sgmc-geology',
  adapterId: USGS_SGMC_ADAPTER_ID,
  adapterVersion: '1.0.0',
  queryOperation: 'AUTOMATED_QUERY',
  displayOperation: 'PUBLIC_DISPLAY',
  purpose: 'GEOLOGICAL_CONTEXT',
  maxBBoxDegrees: 0.02,
  maxFeatures: USGS_SGMC_SHADOW_RESULT_LIMIT,
  automaticRetry: false,
  automaticPagination: false,
  backgroundPolling: false,
  durableRawCache: false,
  publicAPI: false,
  offlinePackage: false,
  redistribution: false,
  compilationYear: 2017,
} as const;

export type SgmcProductionUserState =
  | 'SUCCESS'
  | 'PROVIDER_UNAVAILABLE'
  | 'NO_SGMC_POLYGON_RETURNED'
  | 'OUTSIDE_PROVIDER_COVERAGE'
  | 'PARTIAL_UNSAFE'
  | 'DISCLOSURE_WITHHELD'
  | 'BOUNDS_REJECTED';

export type SgmcProductionContext = {
  state: SgmcProductionUserState;
  units: Array<{ unitName: string; lithology: string; ageMin: string; ageMax: string }>;
  attribution: typeof USGS_SGMC_PUBLIC_DISPLAY_ATTRIBUTION | null;
  compilationYear: 2017;
  retrievedAt: string | null;
  sourceUpdatedAt: null;
  geologicalAbsence: false;
  confirmedAbsence: false;
  transportCalls: number;
  observation: {
    outcome: string;
    failureClass?: string;
    featureCount: number;
    latencyMs: number;
    quarantined: number;
    admissionFailures: number;
    disclosureBlocked: boolean;
    displayBlocked: boolean;
  };
};

export function sgmcProductionContextEnabled(): boolean {
  return USGS_SGMC_PRODUCTION_CONTEXT_ENABLED;
}

export async function loadSiteGeologicalContext(point: {
  latitude: number;
  longitude: number;
  retrievedAt: string;
}): Promise<SgmcProductionContext | null> {
  if (!USGS_SGMC_PRODUCTION_CONTEXT_ENABLED) return null;
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return null;
  try {
    return await getProductionGeologicalContext({
      bbox: {
        xmin: point.longitude - 0.006,
        ymin: point.latitude - 0.004,
        xmax: point.longitude + 0.006,
        ymax: point.latitude + 0.004,
      },
      transport: createSgmcHttpTransport(),
      retrievedAt: point.retrievedAt,
    });
  } catch {
    return unavailable('PROVIDER_UNAVAILABLE', point.retrievedAt, 0, 'transport_blocked', {
      failureClass: 'NETWORK_ERROR',
    });
  }
}

function unavailable(
  state: SgmcProductionUserState,
  retrievedAt: string | null,
  transportCalls: number,
  outcome: string,
  extra?: Partial<SgmcProductionContext['observation']>
): SgmcProductionContext {
  return {
    state,
    units: [],
    attribution: null,
    compilationYear: 2017,
    retrievedAt,
    sourceUpdatedAt: null,
    geologicalAbsence: false,
    confirmedAbsence: false,
    transportCalls,
    observation: {
      outcome,
      featureCount: 0,
      latencyMs: extra?.latencyMs ?? 0,
      quarantined: extra?.quarantined ?? 0,
      admissionFailures: extra?.admissionFailures ?? 0,
      disclosureBlocked: extra?.disclosureBlocked ?? false,
      displayBlocked: extra?.displayBlocked ?? false,
      ...(extra?.failureClass === undefined ? {} : { failureClass: extra.failureClass }),
    },
  };
}

function bboxSpan(bbox: { xmin: number; ymin: number; xmax: number; ymax: number }): {
  width: number;
  height: number;
} | null {
  if (![bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax].every((value) => Number.isFinite(value))) {
    return null;
  }
  return { width: bbox.xmax - bbox.xmin, height: bbox.ymax - bbox.ymin };
}

function outsideCoverage(bbox: {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}): boolean {
  const window = USGS_SGMC_REPEATED_SHADOW_CONUS_WINDOW;
  return (
    bbox.xmin < window.minLongitude ||
    bbox.xmax > window.maxLongitude ||
    bbox.ymin < window.minLatitude ||
    bbox.ymax > window.maxLatitude
  );
}

export async function getProductionGeologicalContext(input: {
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number };
  transport: SgmcShadowTransport;
  retrievedAt: string;
  queryAuthorization?: () => SourceOperationAuthorizationRequest;
  displayAuthorization?: () => SourceOperationAuthorizationRequest;
}): Promise<SgmcProductionContext> {
  const started = Date.now();
  const span = bboxSpan(input.bbox);
  if (
    span === null ||
    span.width <= 0 ||
    span.height <= 0 ||
    span.width > USGS_SGMC_PRODUCTION_PROFILE.maxBBoxDegrees ||
    span.height > USGS_SGMC_PRODUCTION_PROFILE.maxBBoxDegrees
  ) {
    return unavailable('BOUNDS_REJECTED', null, 0, 'bounds_rejected');
  }
  if (outsideCoverage(input.bbox)) {
    return unavailable('OUTSIDE_PROVIDER_COVERAGE', null, 0, 'outside_coverage');
  }
  const queryAuthorization = (input.queryAuthorization ?? sgmcAuthorizationRequest)();
  let queryDecision: ReturnType<typeof evaluateSourceOperationAuthorization>;
  try {
    queryDecision = evaluateSourceOperationAuthorization(queryAuthorization);
  } catch {
    return unavailable('PROVIDER_UNAVAILABLE', null, 0, 'governance_blocked', {
      failureClass: 'AUTHORIZATION_BLOCKED',
    });
  }
  if (
    queryDecision.status !== 'ALLOWED_WITH_CONSTRAINTS' ||
    queryDecision.requestedOperation !== 'AUTOMATED_QUERY'
  ) {
    return unavailable('PROVIDER_UNAVAILABLE', null, 0, 'governance_blocked', {
      failureClass: 'AUTHORIZATION_BLOCKED',
    });
  }
  const response = await authorizedSgmcGet({
    url: buildSgmcBoundedQueryUrl(USGS_SGMC_PRODUCTION_FEATURE_SERVER, input.bbox),
    transport: input.transport,
    authorization: queryAuthorization,
    definition: sgmcAdapterDefinition(),
    timeoutMs: 60000,
  });
  const latencyMs = Date.now() - started;
  if (response.blocked) {
    return unavailable(
      'PROVIDER_UNAVAILABLE',
      input.retrievedAt,
      response.failure === 'AUTHORIZATION_BLOCKED' ? 0 : 1,
      'transport_blocked',
      { failureClass: response.failure, latencyMs }
    );
  }
  const live = await interpretSgmcShadowResponse({
    rawBody: response.response.body,
    httpStatus: response.response.status,
    contentType: response.response.contentType,
    retrievedAt: input.retrievedAt,
    semanticHeaders: response.response.headers,
    maxRecordCount: 2000,
    provenanceMode: 'CAPTURE',
  });
  if (
    response.response.status >= 400 ||
    live.failure === 'TIMEOUT' ||
    live.failure === 'HTTP_ERROR'
  ) {
    return unavailable('PROVIDER_UNAVAILABLE', input.retrievedAt, 1, 'provider_http', {
      failureClass: live.failure ?? 'HTTP_ERROR',
      latencyMs,
      featureCount: live.featureCount,
    });
  }
  if (live.pagination === 'PARTIAL' || live.pagination === 'UNKNOWN') {
    return unavailable('PARTIAL_UNSAFE', input.retrievedAt, 1, 'partial', {
      failureClass: 'PARTIAL_RESPONSE',
      latencyMs,
      featureCount: live.featureCount,
    });
  }
  if (live.featureCount === 0) {
    return {
      ...unavailable('NO_SGMC_POLYGON_RETURNED', input.retrievedAt, 1, 'zero_features', {
        latencyMs,
      }),
      attribution: USGS_SGMC_PUBLIC_DISPLAY_ATTRIBUTION,
    };
  }
  const parsed = JSON.parse(new TextDecoder().decode(response.response.body)) as {
    features?: unknown[];
    spatialReference?: unknown;
  };
  const features = parsed.features ?? [];
  let quarantined = 0;
  let admissionFailures = 0;
  const units: SgmcProductionContext['units'] = [];
  for (const feature of features) {
    const record = feature as { attributes?: Record<string, unknown>; geometry?: unknown };
    const attributes = record.attributes ?? {};
    const translated = translateSgmcShadowFeature({
      attributes,
      geometry: record.geometry,
      spatialReference: parsed.spatialReference,
      retrievedAt: input.retrievedAt,
      featureCount: features.length,
      pagination: live.pagination,
    });
    if (translated.status === SourceAdapterResultStatus.QUARANTINED) {
      quarantined += 1;
      continue;
    }
    if (sgmcAdapterDefinition().id !== USGS_SGMC_ADAPTER_ID) {
      quarantined += 1;
      continue;
    }
    const admission = admitSgmcForGeologicalContext(translated);
    if (admission.status !== 'ADMITTED') {
      admissionFailures += 1;
      continue;
    }
    const isolated = [
      EvidencePurpose.COLLECTION_PERMISSION,
      EvidencePurpose.SITE_ACCESS,
      EvidencePurpose.ROUTE_DECISION,
    ].every(
      (purpose) =>
        shadowRejectOutside(
          translated,
          purpose,
          purpose === EvidencePurpose.COLLECTION_PERMISSION
            ? EvidenceDomain.COLLECTION_RULE
            : EvidenceDomain.ROAD_TRAIL_ACCESS
        ) === 'REJECTED'
    );
    if (!isolated) {
      admissionFailures += 1;
      continue;
    }
    const name = translated.normalized?.normalizedFields['unitName'];
    const lithology = translated.normalized?.normalizedFields['generalizedLithology'];
    const ageMin = translated.normalized?.normalizedFields['geologicAgeMin'];
    const ageMax = translated.normalized?.normalizedFields['geologicAgeMax'];
    if (
      typeof name !== 'string' ||
      typeof lithology !== 'string' ||
      typeof ageMin !== 'string' ||
      typeof ageMax !== 'string'
    ) {
      quarantined += 1;
      continue;
    }
    units.push({ unitName: name, lithology, ageMin, ageMax });
  }
  if (quarantined > 0 && units.length === 0) {
    return unavailable('PROVIDER_UNAVAILABLE', input.retrievedAt, 1, 'schema_drift', {
      failureClass: 'SCHEMA_DRIFT',
      latencyMs,
      quarantined,
      admissionFailures,
    });
  }
  const disclosure = projectSgmcDisclosure(
    DisclosureClassification.PUBLIC,
    DisclosurePurpose.PUBLIC_MAP
  );
  if (!shadowMaterializationAllowed(disclosure)) {
    return unavailable('DISCLOSURE_WITHHELD', input.retrievedAt, 1, 'disclosure_blocked', {
      latencyMs,
      disclosureBlocked: true,
      quarantined,
      admissionFailures,
    });
  }
  let display: ReturnType<typeof evaluateSourceOperationAuthorization>;
  try {
    display = evaluateSourceOperationAuthorization(
      (input.displayAuthorization ?? sgmcPublicDisplayAuthorizationRequest)()
    );
  } catch {
    return unavailable('PROVIDER_UNAVAILABLE', input.retrievedAt, 1, 'display_blocked', {
      failureClass: 'DISPLAY_BLOCKED',
      latencyMs,
      displayBlocked: true,
      quarantined,
      admissionFailures,
    });
  }
  if (
    display.requestedOperation !== 'PUBLIC_DISPLAY' ||
    display.status !== 'ALLOWED_WITH_CONSTRAINTS' ||
    !display.constraints.some((constraint) => constraint.code === 'ATTRIBUTION_REQUIRED') ||
    !sgmcPublicDisplayAppliesToDoi(USGS_SGMC_PINNED_DOI)
  ) {
    return unavailable('PROVIDER_UNAVAILABLE', input.retrievedAt, 1, 'display_blocked', {
      failureClass: 'DISPLAY_BLOCKED',
      latencyMs,
      displayBlocked: true,
      quarantined,
      admissionFailures,
    });
  }
  return {
    state: 'SUCCESS',
    units,
    attribution: USGS_SGMC_PUBLIC_DISPLAY_ATTRIBUTION,
    compilationYear: 2017,
    retrievedAt: input.retrievedAt,
    sourceUpdatedAt: null,
    geologicalAbsence: false,
    confirmedAbsence: false,
    transportCalls: 1,
    observation: {
      outcome: 'success',
      featureCount: live.featureCount,
      latencyMs,
      quarantined,
      admissionFailures,
      disclosureBlocked: false,
      displayBlocked: false,
    },
  };
}
