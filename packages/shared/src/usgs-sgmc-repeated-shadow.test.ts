/**
 * Bounded repeated SGMC shadow policy tests.
 *
 * These tests use a mock transport. They do not contact the provider.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  sgmcAuthorizationRequest,
  sgmcGovernanceRecord,
  suspendSgmcGovernance,
} from './usgs-sgmc-provider';
import {
  USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY,
  USGS_SGMC_REPEATED_SHADOW_READS,
  acceptSgmcRepeatedShadowCampaign,
  assessSgmcRepeatedShadowBody,
  executeSequentialSgmcShadowReads,
  sgmcShadowProductionConsumerAccepts,
} from './usgs-sgmc-repeated-shadow';
import { sgmcShadowMayMaterializeOn } from './usgs-sgmc-shadow-certification';
import { hashSgmcResponseBytes, type SgmcShadowTransport } from './usgs-sgmc-shadow-read';

const WHEN = '2026-09-23T22:30:00.000Z';
const ROOT = 'https://services.example.test/arcgis/rest/services/SGMC/FeatureServer';

function polygonBody(overrides?: {
  lithology?: string;
  state?: string;
  exceeded?: boolean;
  features?: unknown[];
}): Uint8Array {
  const feature = {
    attributes: {
      STATE: overrides?.state ?? 'SYN',
      SGMC_LABEL: 'Qal',
      UNIT_LINK: 'SYNTHETIC-UNIT-LINK-001',
      UNIT_NAME: 'Alluvium',
      AGE_MIN: 'Holocene',
      AGE_MAX: 'Quaternary',
      GENERALIZED_LITH: overrides?.lithology ?? 'Unconsolidated, undifferentiated',
      OBJECTID: 1001,
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
  };
  return new TextEncoder().encode(
    JSON.stringify({
      spatialReference: { wkid: 102100, latestWkid: 3857 },
      exceededTransferLimit: overrides?.exceeded ?? false,
      features: overrides?.features ?? [feature],
    })
  );
}

function allowedCampaign(
  overrides?: Partial<Parameters<typeof acceptSgmcRepeatedShadowCampaign>[0]>
) {
  return {
    queryCount: USGS_SGMC_REPEATED_SHADOW_READS.length,
    parallelism: 1,
    automaticRetry: false,
    automaticPagination: false,
    backgroundPolling: false,
    publicMaterialization: false,
    envelopes: USGS_SGMC_REPEATED_SHADOW_READS.map((read) => ({
      bbox: read.bbox,
      resultRecordCount: 5,
    })),
    ...overrides,
  };
}

describe('USGS SGMC bounded repeated shadow', () => {
  it('rejects an unbounded campaign before any transport', async () => {
    expect(acceptSgmcRepeatedShadowCampaign(allowedCampaign()).status).toBe('ALLOWED');
    expect(USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY.maxCampaignQueries).toBe(4);
    expect(USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY.automaticRetry).toBe(false);
    expect(USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY.automaticPagination).toBe(false);
    expect(USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY.backgroundPolling).toBe(false);
    expect(USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY.parallelism).toBe(1);
    expect(acceptSgmcRepeatedShadowCampaign(allowedCampaign({ queryCount: 5 })).reasons).toContain(
      'QUERY_COUNT'
    );
    expect(acceptSgmcRepeatedShadowCampaign(allowedCampaign({ parallelism: 2 })).reasons).toContain(
      'PARALLELISM'
    );
    expect(
      acceptSgmcRepeatedShadowCampaign(allowedCampaign({ automaticRetry: true })).reasons
    ).toContain('AUTOMATIC_RETRY');
    expect(
      acceptSgmcRepeatedShadowCampaign(allowedCampaign({ automaticPagination: true })).reasons
    ).toContain('AUTOMATIC_PAGINATION');
    expect(
      acceptSgmcRepeatedShadowCampaign(allowedCampaign({ backgroundPolling: true })).reasons
    ).toContain('BACKGROUND_POLLING');
    expect(
      acceptSgmcRepeatedShadowCampaign(allowedCampaign({ publicMaterialization: true })).reasons
    ).toContain('PUBLIC_MATERIALIZATION');
    expect(
      acceptSgmcRepeatedShadowCampaign(
        allowedCampaign({
          envelopes: [
            { bbox: { xmin: -100, ymin: 40, xmax: -99, ymax: 40.01 }, resultRecordCount: 5 },
          ],
        })
      ).reasons
    ).toContain('EXTENT');
    expect(
      acceptSgmcRepeatedShadowCampaign(
        allowedCampaign({
          envelopes: [{ bbox: USGS_SGMC_REPEATED_SHADOW_READS[0].bbox, resultRecordCount: 6 }],
        })
      ).reasons
    ).toContain('FEATURE_LIMIT');
    const calls: string[] = [];
    const transport: SgmcShadowTransport = {
      async get(url) {
        calls.push(url);
        return { status: 200, contentType: 'application/json', headers: {}, body: polygonBody() };
      },
    };
    const tooMany = await executeSequentialSgmcShadowReads({
      featureServerRoot: ROOT,
      reads: [...USGS_SGMC_REPEATED_SHADOW_READS, USGS_SGMC_REPEATED_SHADOW_READS[0]],
      transport,
    });
    expect(tooMany.transportCalls).toBe(0);
    expect(calls).toHaveLength(0);
    expect(sgmcShadowProductionConsumerAccepts()).toBe(false);
    expect(sgmcShadowMayMaterializeOn('PUBLIC_MAP')).toBe(false);
    expect(sgmcShadowMayMaterializeOn('EXPLORE')).toBe(false);
    const source = readFileSync(resolve(__dirname, './usgs-sgmc-repeated-shadow.ts'), 'utf8');
    expect(source.includes('fetch(')).toBe(false);
    expect(source.includes('setInterval')).toBe(false);
    expect(source.includes('apiKey')).toBe(false);
  });

  it('gates every read, replays without a new retrieval, and keeps failure classes distinct', async () => {
    let authorizations = 0;
    const calls: string[] = [];
    const transport: SgmcShadowTransport = {
      async get(url) {
        calls.push(url);
        return { status: 200, contentType: 'application/json', headers: {}, body: polygonBody() };
      },
    };
    const sequential = await executeSequentialSgmcShadowReads({
      featureServerRoot: ROOT,
      reads: USGS_SGMC_REPEATED_SHADOW_READS.slice(0, 2),
      transport,
      authorizationRequest() {
        authorizations += 1;
        if (authorizations === 2) {
          return sgmcAuthorizationRequest({
            governanceStatus: suspendSgmcGovernance(sgmcGovernanceRecord()).status,
          });
        }
        return sgmcAuthorizationRequest();
      },
    });
    expect(sequential.authorizationChecks).toBe(2);
    expect(sequential.transportCalls).toBe(1);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('/3/query?');
    expect(sequential.reads[1]?.failure).toBe('AUTHORIZATION_BLOCKED');

    const rawBody = polygonBody();
    const first = await assessSgmcRepeatedShadowBody(rawBody, WHEN, 200);
    const second = await assessSgmcRepeatedShadowBody(rawBody, WHEN, 200);
    expect(first.contentHash).toBe(hashSgmcResponseBytes(rawBody));
    expect(second.contentHash).toBe(first.contentHash);
    expect(first.replayMatches).toBe(true);
    expect(first.provenanceActivityIds.some((id) => id.includes('a-retrieval'))).toBe(true);
    expect(first.admissionStatuses).toEqual(['ADMITTED']);
    expect(first.disclosureStatuses).toEqual(['ALLOWED']);
    expect(first.outsideGeologyRejected).toBe(true);
    expect(first.geologicalAbsence).toBe(false);
    expect(first.lithologyClasses).toEqual(['KNOWN']);
    expect(first.ageRepresentations).toEqual(['TEXT']);

    const partial = await assessSgmcRepeatedShadowBody(polygonBody({ exceeded: true }), WHEN, 200);
    expect(partial.pagination).toBe('PARTIAL');
    const empty = await assessSgmcRepeatedShadowBody(
      new TextEncoder().encode('{"features":[]}'),
      WHEN,
      200
    );
    expect(empty.failure).toBe('EMPTY_RESPONSE');
    expect(empty.geologicalAbsence).toBe(false);
    const unknown = await assessSgmcRepeatedShadowBody(
      polygonBody({ lithology: 'Collected specimen quartz' }),
      WHEN,
      200
    );
    expect(unknown.adapterStatuses).toEqual(['QUARANTINED']);
    expect(unknown.lithologyClasses).toEqual(['UNKNOWN']);
    expect(unknown.localDetail.lithology).toEqual(['Collected specimen quartz']);
    const ambiguous = await assessSgmcRepeatedShadowBody(polygonBody({ state: '' }), WHEN, 200);
    expect(ambiguous.identityAmbiguousCount).toBe(1);
    expect(ambiguous.quarantineCount).toBe(1);
  });
});
