/**
 * USGS SGMC shadow-read transport tests.
 *
 * These tests use a mock transport. They do not contact the provider.
 */

import { describe, expect, it } from 'vitest';

import { DisclosureClassification, DisclosurePurpose } from './disclosure-governance';
import { EvidenceDomain, EvidencePurpose } from './evidence-admission';
import { ProvenanceActivityType } from './provenance-activity-kernel';
import {
  projectSgmcDisclosure,
  sgmcAdapterDefinition,
  sgmcAuthorizationRequest,
  sgmcGovernanceRecord,
  suspendSgmcGovernance,
} from './usgs-sgmc-provider';
import {
  USGS_SGMC_SHADOW_BBOX,
  USGS_SGMC_SHADOW_OUT_FIELDS,
  USGS_SGMC_SHADOW_RESULT_LIMIT,
  authorizedSgmcGet,
  buildSgmcShadowQueryUrl,
  classifySgmcHttpStatus,
  gateSgmcServiceMetadata,
  hashSgmcResponseBytes,
  interpretSgmcShadowResponse,
  rejectSgmcOutsideGeology,
  resolveSgmcFeatureServerUrl,
  sgmcShadowRequestHeaders,
  SgmcShadowTransportError,
  shadowMaterializationAllowed,
  type SgmcShadowTransport,
} from './usgs-sgmc-shadow-read';

const WHEN = '2026-09-23T21:30:00.000Z';
const ROOT = 'https://services.example.test/arcgis/rest/services/SGMC/FeatureServer';

function polygonBody(overrides?: {
  lithology?: string;
  ageMin?: unknown;
  exceeded?: boolean;
}): Uint8Array {
  const body = {
    spatialReference: { wkid: 102100, latestWkid: 3857 },
    exceededTransferLimit: overrides?.exceeded ?? false,
    features: [
      {
        attributes: {
          STATE: 'DC',
          SGMC_LABEL: 'Qal',
          UNIT_LINK: 'DC-QAL',
          UNIT_NAME: 'Alluvium',
          AGE_MIN: overrides?.ageMin ?? 'Holocene',
          AGE_MAX: 'Quaternary',
          GENERALIZED_LITH: overrides?.lithology ?? 'Unconsolidated, undifferentiated',
          NGMDB1: 'synthetic-ngmdb',
          OBJECTID: 42,
          EXTRA_NOTE: 'kept raw',
        },
        geometry: {
          rings: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 0],
            ],
          ],
        },
      },
    ],
  };
  return new TextEncoder().encode(JSON.stringify(body));
}

function layerMetadata(id = 3, name = 'SGMC_Geology') {
  return {
    id,
    name,
    geometryType: 'esriGeometryPolygon',
    capabilities: 'Map,Query,Data',
    maxRecordCount: 2000,
    fields: [
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
    ].map((field) => ({ name: field, type: 'esriFieldTypeString' })),
  };
}

describe('USGS SGMC shadow authorization and query', () => {
  it('runs the guard before transport and blocks the unsafe cases', async () => {
    const calls: string[] = [];
    const transport: SgmcShadowTransport = {
      async get(url) {
        calls.push(url);
        return { status: 200, contentType: 'application/json', headers: {}, body: polygonBody() };
      },
    };
    const allowed = await authorizedSgmcGet({ url: `${ROOT}/3?f=pjson`, transport });
    expect(allowed.blocked).toBe(false);
    expect(calls).toEqual([`${ROOT}/3?f=pjson`]);

    const blockedCases = [
      sgmcAuthorizationRequest({
        requestedOperation: 'AUTOMATED_QUERY',
        governanceReceipt: {
          receiptId: 'gov-receipt-read-only',
          resourceId: 'res-usgs-sgmc-geology',
          decision: 'ALLOWED',
          allowedOperations: ['READ'],
        },
      }),
      sgmcAuthorizationRequest({
        governanceStatus: suspendSgmcGovernance(sgmcGovernanceRecord()).status,
      }),
    ];
    for (const authorization of blockedCases) {
      const blocked = await authorizedSgmcGet({ url: `${ROOT}/query`, transport, authorization });
      expect(blocked.blocked).toBe(true);
      if (blocked.blocked) expect(blocked.failure).toBe('AUTHORIZATION_BLOCKED');
    }
    const tolerant = sgmcAdapterDefinition();
    tolerant.tolerantUnsupportedVersion = true;
    const tolerantBlock = await authorizedSgmcGet({
      url: `${ROOT}/query`,
      transport,
      definition: tolerant,
    });
    expect(tolerantBlock.blocked).toBe(true);
    expect(calls).toEqual([`${ROOT}/3?f=pjson`]);
    const missing = sgmcAdapterDefinition();
    missing.requiredPreconditions = missing.requiredPreconditions.slice(0, 3);
    const missingBlock = await authorizedSgmcGet({
      url: `${ROOT}/query`,
      transport,
      definition: missing,
    });
    expect(missingBlock.blocked).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it('builds one deterministic layer-3 query with bounded fields', () => {
    const first = buildSgmcShadowQueryUrl(ROOT);
    const second = buildSgmcShadowQueryUrl(ROOT);
    expect(second).toBe(first);
    expect(first).toContain('/3/query?');
    expect(first).not.toContain('/0/query');
    expect(first).toContain(`resultRecordCount=${USGS_SGMC_SHADOW_RESULT_LIMIT}`);
    expect(first).toContain(encodeURIComponent(USGS_SGMC_SHADOW_OUT_FIELDS.join(',')));
    expect(first).toContain(String(USGS_SGMC_SHADOW_BBOX.xmin));
    expect(first).toContain('outSR=102100');
    expect(sgmcShadowRequestHeaders()).not.toHaveProperty('authorization');
    expect(sgmcShadowRequestHeaders()['user-agent']).not.toMatch(/@/);
  });

  it('keeps transport failures distinct from an empty geology reading', async () => {
    expect(classifySgmcHttpStatus(500)).toBe('HTTP_ERROR');
    expect(classifySgmcHttpStatus(429)).toBe('RATE_LIMITED');
    const httpError = await interpretSgmcShadowResponse({
      rawBody: new TextEncoder().encode('{"features":[]}'),
      httpStatus: 500,
      contentType: 'application/json',
      retrievedAt: WHEN,
      semanticHeaders: {},
      maxRecordCount: 2000,
    });
    expect(httpError.failure).toBe('HTTP_ERROR');
    expect(httpError.geologicalAbsence).toBe(false);
    const empty = await interpretSgmcShadowResponse({
      rawBody: new TextEncoder().encode('{"features":[]}'),
      httpStatus: 200,
      contentType: 'application/json',
      retrievedAt: WHEN,
      semanticHeaders: {},
      maxRecordCount: 2000,
    });
    expect(empty.failure).toBe('EMPTY_RESPONSE');
    expect(empty.polygonMeaning).toBe('NO_SGMC_POLYGON_RETURNED');
    expect(empty.geologicalAbsence).toBe(false);
    const timeout = await authorizedSgmcGet({
      url: `${ROOT}/3/query`,
      transport: {
        get() {
          return Promise.reject(
            new SgmcShadowTransportError('TIMEOUT', 'SGMC shadow request timed out')
          );
        },
      },
    });
    expect(timeout.blocked).toBe(true);
    if (timeout.blocked) expect(timeout.failure).toBe('TIMEOUT');
    const partial = await interpretSgmcShadowResponse({
      rawBody: polygonBody({ exceeded: true }),
      httpStatus: 200,
      contentType: 'application/json',
      retrievedAt: WHEN,
      semanticHeaders: { 'retry-after': '30' },
      maxRecordCount: 2000,
    });
    expect(partial.pagination).toBe('PARTIAL');
    expect(partial.rateLimitHeaders['retry-after']).toBe('30');
  });
});

describe('USGS SGMC shadow interpretation', () => {
  it('preserves the raw response and processes it with adapter 1.0.0', async () => {
    const rawBody = polygonBody();
    const first = await interpretSgmcShadowResponse({
      rawBody,
      httpStatus: 200,
      contentType: 'application/json',
      retrievedAt: WHEN,
      semanticHeaders: {},
      maxRecordCount: 2000,
    });
    const second = await interpretSgmcShadowResponse({
      rawBody,
      httpStatus: 200,
      contentType: 'application/json',
      retrievedAt: WHEN,
      semanticHeaders: {},
      maxRecordCount: 2000,
    });
    expect(first.contentHash).toBe(hashSgmcResponseBytes(rawBody));
    expect(second.result?.normalized?.normalizedFields).toEqual(
      first.result?.normalized?.normalizedFields
    );
    expect(first.retrievedAt).toBe(WHEN);
    expect(first.result?.truthClockCandidate?.retrievedAt).toBe(WHEN);
    expect(first.result?.truthClockCandidate).not.toHaveProperty('sourceUpdatedAt');
    expect(first.result?.truthClockCandidate).not.toHaveProperty('phenomenonTime');
    expect(first.result?.raw?.rawFields['AGE_MIN']).toBe('Holocene');
    expect(first.result?.raw?.rawFields['EXTRA_NOTE']).toBe('kept raw');
    expect(first.result?.normalized?.normalizedFields['serviceObjectId']).toBe(42);
    expect(first.result?.normalized?.normalizedFields['providerRecordKey']).not.toBe('42');
    expect(first.provenanceGraph?.activities.map((activity) => activity.activityType)).toEqual([
      ProvenanceActivityType.SOURCE_RETRIEVAL,
      ProvenanceActivityType.IMPORT,
    ]);
    expect(first.provenanceGraph?.activities[0]?.process?.processVersion).toBe('1.0.0');
    expect(first.comparison['SPATIAL_REFERENCE']).toBe('MATCH');
    expect(first.comparison['UNKNOWN_FIELDS']).toBe('COMPATIBLE_EXTENSION');
    expect(first.materialDrift).toBe(false);
    expect(first.admissionStatus).toBe('ADMITTED');
    expect(first.disclosure?.decision.status).toBe('ALLOWED');
    expect(first.disclosure && shadowMaterializationAllowed(first.disclosure)).toBe(true);
  });

  it('quarantines drift and unknown lithology without guessing', async () => {
    const gate = gateSgmcServiceMetadata({
      featureServerUrl: 'https://services.example.test/5888bf4fe4b05ccb964bab9d/FeatureServer',
      service: { serviceDescription: 'SGMC' },
      layer: layerMetadata(9, 'Other'),
    });
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.failure).toBe('SCHEMA_DRIFT');
    const gems = gateSgmcServiceMetadata({
      featureServerUrl: 'https://services.example.test/5888bf4fe4b05ccb964bab9d/FeatureServer',
      service: { serviceDescription: 'doi:10.5066/P1A3DQZK' },
      layer: layerMetadata(),
    });
    expect(gems.ok).toBe(false);
    const unknown = await interpretSgmcShadowResponse({
      rawBody: polygonBody({ lithology: 'Collected specimen quartz' }),
      httpStatus: 200,
      contentType: 'application/json',
      retrievedAt: WHEN,
      semanticHeaders: {},
      maxRecordCount: 2000,
    });
    expect(unknown.result?.status).toBe('QUARANTINED');
    expect(unknown.result?.raw?.rawFields['GENERALIZED_LITH']).toBe('Collected specimen quartz');
    expect(unknown.result?.normalized?.normalizedFields['generalizedLithology']).toBeUndefined();
    expect(unknown.geologicalAbsence).toBe(false);
    const driftedAge = await interpretSgmcShadowResponse({
      rawBody: polygonBody({ ageMin: 12 }),
      httpStatus: 200,
      contentType: 'application/json',
      retrievedAt: WHEN,
      semanticHeaders: {},
      maxRecordCount: 2000,
    });
    expect(driftedAge.result?.status).toBe('QUARANTINED');
    expect(driftedAge.result?.truthClockCandidate?.retrievedAt).toBe(WHEN);
    expect(driftedAge.comparison['AGE_REPRESENTATION']).toBe('DRIFT');
  });

  it('admits geology only and withholds unknown disclosure', async () => {
    const interpreted = await interpretSgmcShadowResponse({
      rawBody: polygonBody(),
      httpStatus: 200,
      contentType: 'application/json',
      retrievedAt: WHEN,
      semanticHeaders: {},
      maxRecordCount: 2000,
    });
    const result = interpreted.result;
    expect(result).toBeDefined();
    if (result === undefined) return;
    expect(
      rejectSgmcOutsideGeology(
        result,
        EvidencePurpose.COLLECTION_PERMISSION,
        EvidenceDomain.COLLECTION_RULE
      )
    ).toBe('REJECTED');
    expect(
      rejectSgmcOutsideGeology(
        result,
        EvidencePurpose.SITE_ACCESS,
        EvidenceDomain.ROAD_TRAIL_ACCESS
      )
    ).toBe('REJECTED');
    expect(
      rejectSgmcOutsideGeology(
        result,
        EvidencePurpose.ROUTE_DECISION,
        EvidenceDomain.ROAD_TRAIL_ACCESS
      )
    ).toBe('REJECTED');
    expect(rejectSgmcOutsideGeology(result, EvidencePurpose.OTHER, EvidenceDomain.CLOSURE)).toBe(
      'REJECTED'
    );
    expect(
      rejectSgmcOutsideGeology(result, EvidencePurpose.OTHER, EvidenceDomain.MINING_CLAIM)
    ).toBe('REJECTED');
    expect(
      rejectSgmcOutsideGeology(result, EvidencePurpose.SITE_ACCESS, EvidenceDomain.LAND_OWNERSHIP)
    ).toBe('REJECTED');
    expect(
      rejectSgmcOutsideGeology(result, EvidencePurpose.OTHER, EvidenceDomain.LAND_MANAGEMENT)
    ).toBe('REJECTED');
    const withheld = projectSgmcDisclosure(
      DisclosureClassification.UNKNOWN,
      DisclosurePurpose.SHADOW_DISPLAY
    );
    expect(shadowMaterializationAllowed(withheld)).toBe(false);
    const catalogHost = ['https://services', 'arcgis', 'com/example/'].join('.');
    expect(
      resolveSgmcFeatureServerUrl({
        identifiers: [{ key: 'doi:10.5066/F7WH2N65' }],
        id: '5888bf4fe4b05ccb964bab9d',
        files: [`${catalogHost}5888bf4fe4b05ccb964bab9d_USGS_SGMC_feature/FeatureServer`],
      })
    ).toContain('FeatureServer');
  });
});
