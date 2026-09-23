/**
 * SGMC shadow certification tests.
 *
 * Replay uses the committed integrity record and, when present, the local raw
 * artifact. These tests do not contact the provider.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DisclosureClassification, DisclosurePurpose } from './disclosure-governance';
import { EvidenceDomain, EvidencePurpose } from './evidence-admission';
import { ProvenanceActivityType } from './provenance-activity-kernel';
import { evaluateSourceOperationAuthorization } from './source-operation-authorization';
import {
  USGS_SGMC_ADAPTER_ID,
  USGS_SGMC_KNOWN_GENERALIZED_LITH,
  interpretSgmcPolygonCount,
  projectSgmcDisclosure,
  sgmcAuthorizationRequest,
  sgmcGovernanceRecord,
  suspendSgmcGovernance,
} from './usgs-sgmc-provider';
import {
  USGS_SGMC_CAPTURED_RESPONSE_SHA256,
  USGS_SGMC_REPEATED_SHADOW_PROFILE,
  USGS_SGMC_SHADOW_READ_BASELINE,
  capturedSgmcResponseMayReviseAdapterSchema,
  certifySgmcRepeatedShadowEnvelope,
  reanalyzeSgmcShadowCandidate,
  repeatedShadowDeniesUngrantedOperation,
  replaySgmcCapturedShadowResponse,
  sgmcPaginationMayBeTreatedAsComplete,
  sgmcRepeatedShadowContactsProvider,
  sgmcShadowMayMaterializeOn,
} from './usgs-sgmc-shadow-certification';
import {
  USGS_SGMC_SHADOW_BBOX,
  USGS_SGMC_SHADOW_OUT_FIELDS,
  authorizedSgmcGet,
  hashSgmcResponseBytes,
  interpretSgmcShadowResponse,
  rejectSgmcOutsideGeology,
  shadowMaterializationAllowed,
  SgmcShadowTransportError,
} from './usgs-sgmc-shadow-read';

const WHEN = '2026-09-23T21:42:11.147Z';
const RETRIEVAL_ID = 'act:recorded-shadow:a-retrieval';

function syntheticBody(exceeded = false): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify({
      spatialReference: { wkid: 102100, latestWkid: 3857 },
      exceededTransferLimit: exceeded,
      features: [
        {
          attributes: {
            STATE: 'SYN',
            SGMC_LABEL: 'Qal',
            UNIT_LINK: 'SYNTHETIC-UNIT-LINK-001',
            UNIT_NAME: 'Alluvium',
            AGE_MIN: 'Holocene',
            AGE_MAX: 'Quaternary',
            GENERALIZED_LITH: 'Unconsolidated, undifferentiated',
            NGMDB1: 'NGMDB-SYNTHETIC-1',
            OBJECTID: 1001,
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
    })
  );
}

function allowedEnvelope(
  overrides: Partial<Parameters<typeof certifySgmcRepeatedShadowEnvelope>[0]> = {}
) {
  return {
    layerId: 3,
    layerName: 'SGMC_Geology',
    operation: 'AUTOMATED_QUERY',
    authorizationStatus: 'ALLOWED_WITH_CONSTRAINTS',
    bbox: { ...USGS_SGMC_SHADOW_BBOX },
    resultRecordCount: 5,
    outFields: USGS_SGMC_SHADOW_OUT_FIELDS,
    surface: 'QA_SCOPE',
    ...overrides,
  };
}

describe('USGS SGMC shadow certification', () => {
  it('replays a captured record without fabricating retrieval or revising the schema', async () => {
    const summary = JSON.parse(
      readFileSync(
        resolve(
          __dirname,
          '../../../qa-artifacts/rockhounding-first-provider-shadow-read-r1/campaign-summary.json'
        ),
        'utf8'
      )
    ) as {
      featureQuery: { contentHash: string; materialDrift: boolean; retrievedAt: string };
    };
    expect(summary.featureQuery.contentHash).toBe(USGS_SGMC_CAPTURED_RESPONSE_SHA256);
    expect(summary.featureQuery.materialDrift).toBe(false);
    expect(USGS_SGMC_SHADOW_READ_BASELINE).toBe('df09267b2b386a8a8b960e97b90c1a9e5b12738c');

    const rawBody = syntheticBody();
    const first = await replaySgmcCapturedShadowResponse({
      rawBody,
      recordedRetrievedAt: WHEN,
      recordedRetrievalActivityId: RETRIEVAL_ID,
      recordedResponseHash: hashSgmcResponseBytes(rawBody),
    });
    const second = await replaySgmcCapturedShadowResponse({
      rawBody,
      recordedRetrievedAt: WHEN,
      recordedRetrievalActivityId: RETRIEVAL_ID,
      recordedResponseHash: hashSgmcResponseBytes(rawBody),
    });
    expect(first.hashMatchesRecord).toBe(true);
    expect(first.fabricatedSourceRetrieval).toBe(false);
    expect(first.recordedRetrievalActivityId).toBe(RETRIEVAL_ID);
    expect(first.interpretation.provenanceGraph).toBeUndefined();
    expect(['SUCCESS', 'PARTIAL_SUCCESS']).toContain(first.interpretation.result?.status);
    expect(first.interpretation.result?.provenance?.adapterId).toBe(USGS_SGMC_ADAPTER_ID);
    expect(first.interpretation.result?.provenance?.adapterVersion).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
    });
    expect(first.interpretation.result?.raw?.rawFields['EXTRA_NOTE']).toBe('kept raw');
    expect(first.interpretation.result?.raw?.rawFields['OBJECTID']).toBe(1001);
    expect(first.interpretation.result?.normalized?.normalizedFields['providerRecordKey']).not.toBe(
      '1001'
    );
    expect(first.interpretation.result?.truthClockCandidate?.retrievedAt).toBe(WHEN);
    expect(first.interpretation.result?.truthClockCandidate).not.toHaveProperty('sourceUpdatedAt');
    expect(first.interpretation.result?.truthClockCandidate).not.toHaveProperty('phenomenonTime');
    expect(second.interpretation.result?.normalized?.normalizedFields).toEqual(
      first.interpretation.result?.normalized?.normalizedFields
    );
    expect(capturedSgmcResponseMayReviseAdapterSchema()).toBe(false);
    expect(USGS_SGMC_KNOWN_GENERALIZED_LITH).toContain('Unconsolidated, undifferentiated');

    const prior = first.interpretation.result;
    expect(prior).toBeDefined();
    if (prior === undefined) return;
    const priorSnapshot = JSON.stringify(prior);
    const reanalyzed = reanalyzeSgmcShadowCandidate(prior, WHEN, 'EPSG:3857');
    expect(JSON.stringify(prior)).toBe(priorSnapshot);
    expect(reanalyzed.raw?.id).toBe(`${prior.raw?.id ?? ''}:reanalysis`);
    expect(reanalyzed.provenance?.adapterId).toBe(USGS_SGMC_ADAPTER_ID);
    expect(reanalyzed.provenance?.adapterVersion).toEqual({ major: 1, minor: 0, patch: 0 });

    const capturedPath = resolve(
      __dirname,
      '../../../qa-artifacts/rockhounding-first-provider-shadow-read-r1/04-raw-response/response.json'
    );
    if (existsSync(capturedPath)) {
      const captured = new Uint8Array(readFileSync(capturedPath));
      const live = await replaySgmcCapturedShadowResponse({
        rawBody: captured,
        recordedRetrievedAt: summary.featureQuery.retrievedAt,
        recordedRetrievalActivityId: RETRIEVAL_ID,
        recordedResponseHash: USGS_SGMC_CAPTURED_RESPONSE_SHA256,
      });
      expect(live.hashMatchesRecord).toBe(true);
      expect(live.fabricatedSourceRetrieval).toBe(false);
      expect(live.interpretation.provenanceGraph).toBeUndefined();
      expect(live.interpretation.materialDrift).toBe(false);
      expect(live.interpretation.result?.status).toBe('SUCCESS');
      expect(live.interpretation.featureCount).toBe(1);
      expect(live.interpretation.geologicalAbsence).toBe(false);
    }
  });

  it('keeps authorization, disclosure, quarantine boundaries, and a bounded envelope', async () => {
    const transport = {
      get(): Promise<never> {
        throw new SgmcShadowTransportError('NETWORK_ERROR', 'certification transport must not run');
      },
    };
    const suspended = await authorizedSgmcGet({
      url: 'https://services.example.test/3/query',
      transport,
      authorization: sgmcAuthorizationRequest({
        governanceStatus: 'SUSPENDED',
        reviewState: 'REVIEWED',
      }),
    });
    expect(suspended.blocked).toBe(true);
    const off = suspendSgmcGovernance(sgmcGovernanceRecord());
    const switched = await authorizedSgmcGet({
      url: 'https://services.example.test/3/query',
      transport,
      authorization: sgmcAuthorizationRequest({
        governanceStatus: off.status,
      }),
    });
    expect(switched.blocked).toBe(true);
    const readOnly = evaluateSourceOperationAuthorization(
      sgmcAuthorizationRequest({
        requestedOperation: 'READ',
        explicitGrants: ['READ'],
        governanceReceipt: {
          receiptId: 'gov-receipt-read-only',
          resourceId: 'res-usgs-sgmc-geology',
          decision: 'ALLOWED',
          allowedOperations: ['READ'],
        },
      })
    );
    expect(
      certifySgmcRepeatedShadowEnvelope(
        allowedEnvelope({ authorizationStatus: readOnly.status, operation: 'READ' })
      ).status
    ).toBe('BLOCKED');
    expect(certifySgmcRepeatedShadowEnvelope(allowedEnvelope()).status).toBe('ALLOWED');
    expect(
      certifySgmcRepeatedShadowEnvelope(
        allowedEnvelope({
          bbox: { xmin: -120, ymin: 35, xmax: -70, ymax: 45 },
        })
      ).reasons
    ).toContain('EXTENT');
    expect(
      certifySgmcRepeatedShadowEnvelope(allowedEnvelope({ layerId: 0, resultRecordCount: 2000 }))
        .reasons
    ).toEqual(expect.arrayContaining(['LAYER', 'FEATURE_LIMIT']));
    expect(
      certifySgmcRepeatedShadowEnvelope(allowedEnvelope({ surface: 'PUBLIC_MAP' })).reasons
    ).toContain('SURFACE');
    for (const surface of ['EXPLORE', 'SITE_DETAIL', 'FIELD_MODE', 'PUBLIC_MAP', 'PUBLIC_API']) {
      expect(sgmcShadowMayMaterializeOn(surface)).toBe(false);
    }
    expect(sgmcShadowMayMaterializeOn('QA_SCOPE')).toBe(true);

    const empty = interpretSgmcPolygonCount(0);
    expect(empty.meaning).toBe('NO_SGMC_POLYGON_RETURNED');
    expect(empty.geologicalAbsence).toBe(false);
    const partial = await interpretSgmcShadowResponse({
      rawBody: syntheticBody(true),
      httpStatus: 200,
      contentType: 'application/json',
      retrievedAt: WHEN,
      semanticHeaders: {},
      maxRecordCount: 2000,
    });
    expect(partial.pagination).toBe('PARTIAL');
    expect(sgmcPaginationMayBeTreatedAsComplete(partial.pagination)).toBe(false);
    expect(partial.provenanceGraph?.activities.map((activity) => activity.activityType)).toEqual([
      ProvenanceActivityType.SOURCE_RETRIEVAL,
      ProvenanceActivityType.IMPORT,
    ]);

    const replay = await replaySgmcCapturedShadowResponse({
      rawBody: syntheticBody(),
      recordedRetrievedAt: WHEN,
      recordedRetrievalActivityId: RETRIEVAL_ID,
      recordedResponseHash: hashSgmcResponseBytes(syntheticBody()),
    });
    const result = replay.interpretation.result;
    expect(result).toBeDefined();
    if (result === undefined || replay.interpretation.disclosure === undefined) return;
    expect(replay.interpretation.admissionStatus).toBe('ADMITTED');
    expect(replay.interpretation.disclosure.decision.status).toBe('ALLOWED');
    expect(shadowMaterializationAllowed(replay.interpretation.disclosure)).toBe(true);
    expect(
      rejectSgmcOutsideGeology(
        result,
        EvidencePurpose.COLLECTION_PERMISSION,
        EvidenceDomain.COLLECTION_RULE
      )
    ).toBe('REJECTED');
    const withheld = projectSgmcDisclosure(
      DisclosureClassification.UNKNOWN,
      DisclosurePurpose.SHADOW_DISPLAY
    );
    expect(shadowMaterializationAllowed(withheld)).toBe(false);
    expect(repeatedShadowDeniesUngrantedOperation('BULK_DOWNLOAD')).toBe(true);
    expect(repeatedShadowDeniesUngrantedOperation('READ')).toBe(true);
    expect(USGS_SGMC_REPEATED_SHADOW_PROFILE.backgroundPolling).toBe(false);
    expect(USGS_SGMC_REPEATED_SHADOW_PROFILE.automaticRetry).toBe(false);
    expect(USGS_SGMC_REPEATED_SHADOW_PROFILE.maxRequestsPerOperatorAction).toBe(1);
    expect(USGS_SGMC_REPEATED_SHADOW_PROFILE.productionAuthority).toBe('NONE');
    expect(USGS_SGMC_REPEATED_SHADOW_PROFILE.rateLimit).toBe('UNKNOWN_OPERATIONAL_LIMIT');
    expect(USGS_SGMC_REPEATED_SHADOW_PROFILE.secretsRequired).toBe(false);
    expect(sgmcRepeatedShadowContactsProvider()).toBe(false);
    const source = readFileSync(resolve(__dirname, './usgs-sgmc-shadow-certification.ts'), 'utf8');
    expect(source.includes('fetch(')).toBe(false);
  });
});
