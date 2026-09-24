import { describe, expect, it } from 'vitest';

import { DisclosureClassification, DisclosurePurpose } from './disclosure-governance';
import { EvidenceDomain, EvidencePurpose } from './evidence-admission';
import { SourceAdapterResultStatus } from './source-adapter-contract';
import {
  USGS_SGMC_PINNED_DOI,
  projectSgmcDisclosure,
  sgmcAdapterDefinition,
  sgmcAuthorizationRequest,
  sgmcPublicDisplayAppliesToDoi,
  sgmcPublicDisplayAuthorizationRequest,
} from './usgs-sgmc-provider';
import {
  USGS_SGMC_PRODUCTION_FEATURE_SERVER,
  USGS_SGMC_PRODUCTION_PROFILE,
  getProductionGeologicalContext,
} from './usgs-sgmc-production-context';
import {
  SgmcShadowFailure,
  SgmcShadowTransportError,
  rejectSgmcOutsideGeology,
  translateSgmcShadowFeature,
  type SgmcShadowTransport,
} from './usgs-sgmc-shadow-read';

const BBOX = { xmin: -95.94, ymin: 41.256, xmax: -95.928, ymax: 41.264 };
const WHEN = '2026-09-24T00:00:00.000Z';

function polygonBody(overrides?: {
  exceeded?: boolean;
  features?: unknown[];
  lithology?: string;
}): Uint8Array {
  const body = {
    spatialReference: { wkid: 102100, latestWkid: 3857 },
    exceededTransferLimit: overrides?.exceeded ?? false,
    features: overrides?.features ?? [
      {
        attributes: {
          STATE: 'NE',
          SGMC_LABEL: 'Qa',
          UNIT_LINK: 'NE-QA',
          UNIT_NAME: 'Alluvium',
          AGE_MIN: 'Holocene',
          AGE_MAX: 'Quaternary',
          GENERALIZED_LITH: overrides?.lithology ?? 'Unconsolidated, undifferentiated',
          NGMDB1: 'synthetic',
          OBJECTID: 42,
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

function transportOf(
  body: Uint8Array,
  status = 200
): { transport: SgmcShadowTransport; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    transport: {
      async get(url) {
        calls.push(url);
        return { status, contentType: 'application/json', headers: {}, body };
      },
    },
  };
}

describe('SGMC production geological context', () => {
  it('re-checks governance and blocks suspended, unreviewed, wrong resource, and READ', async () => {
    const { transport, calls } = transportOf(polygonBody());
    const ok = await getProductionGeologicalContext({ bbox: BBOX, transport, retrievedAt: WHEN });
    expect(ok.state).toBe('SUCCESS');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('/3/query');
    expect(calls[0]?.startsWith(USGS_SGMC_PRODUCTION_FEATURE_SERVER)).toBe(true);
    expect(sgmcAdapterDefinition().version).toEqual({ major: 1, minor: 0, patch: 0 });

    for (const queryAuthorization of [
      () => sgmcAuthorizationRequest({ governanceStatus: 'SUSPENDED' }),
      () => sgmcAuthorizationRequest({ reviewState: 'NEEDS_REVIEW' }),
      () => sgmcAuthorizationRequest({ resourceId: 'res-other' }),
      () => sgmcAuthorizationRequest({ requestedOperation: 'READ', explicitGrants: ['READ'] }),
    ]) {
      const blocked = transportOf(polygonBody());
      const result = await getProductionGeologicalContext({
        bbox: BBOX,
        transport: blocked.transport,
        retrievedAt: WHEN,
        queryAuthorization,
      });
      expect(result.state).toBe('PROVIDER_UNAVAILABLE');
      expect(result.transportCalls).toBe(0);
      expect(blocked.calls).toHaveLength(0);
    }
  });

  it('rejects oversized bounds and never accepts a caller endpoint', async () => {
    const wide = transportOf(polygonBody());
    const width = await getProductionGeologicalContext({
      bbox: { xmin: -95.94, ymin: 41.256, xmax: -95.91, ymax: 41.264 },
      transport: wide.transport,
      retrievedAt: WHEN,
    });
    expect(width.state).toBe('BOUNDS_REJECTED');
    expect(wide.calls).toHaveLength(0);
    const tall = await getProductionGeologicalContext({
      bbox: { xmin: -95.94, ymin: 41.25, xmax: -95.928, ymax: 41.28 },
      transport: wide.transport,
      retrievedAt: WHEN,
    });
    expect(tall.state).toBe('BOUNDS_REJECTED');
    expect(USGS_SGMC_PRODUCTION_PROFILE.maxFeatures).toBe(5);
    expect(USGS_SGMC_PRODUCTION_PROFILE.automaticRetry).toBe(false);
    expect(USGS_SGMC_PRODUCTION_PROFILE.automaticPagination).toBe(false);
    expect(USGS_SGMC_PRODUCTION_PROFILE.durableRawCache).toBe(false);
    expect(USGS_SGMC_PRODUCTION_PROFILE.publicAPI).toBe(false);
    expect(USGS_SGMC_PRODUCTION_PROFILE.offlinePackage).toBe(false);
  });

  it('maps HTTP failure and timeout to unavailable without treating them as zero geology', async () => {
    const http = transportOf(new Uint8Array(), 504);
    const down = await getProductionGeologicalContext({
      bbox: BBOX,
      transport: http.transport,
      retrievedAt: WHEN,
    });
    expect(down.state).toBe('PROVIDER_UNAVAILABLE');
    expect(down.geologicalAbsence).toBe(false);
    expect(down.confirmedAbsence).toBe(false);
    expect(down.observation.failureClass).toBe('HTTP_ERROR');
    expect(http.calls).toHaveLength(1);

    const calls: string[] = [];
    const timingOut: SgmcShadowTransport = {
      async get(url) {
        calls.push(url);
        throw new SgmcShadowTransportError(SgmcShadowFailure.TIMEOUT, 'timed out');
      },
    };
    const timed = await getProductionGeologicalContext({
      bbox: BBOX,
      transport: timingOut,
      retrievedAt: WHEN,
    });
    expect(timed.state).toBe('PROVIDER_UNAVAILABLE');
    expect(timed.observation.failureClass).toBe('TIMEOUT');
    expect(calls).toHaveLength(1);
  });

  it('keeps a zero feature page distinct from absence and skips Alaska and Hawaii', async () => {
    const empty = transportOf(polygonBody({ features: [] }));
    const none = await getProductionGeologicalContext({
      bbox: BBOX,
      transport: empty.transport,
      retrievedAt: WHEN,
    });
    expect(none.state).toBe('NO_SGMC_POLYGON_RETURNED');
    expect(none.geologicalAbsence).toBe(false);
    expect(none.confirmedAbsence).toBe(false);
    const alaska = transportOf(polygonBody());
    const outside = await getProductionGeologicalContext({
      bbox: { xmin: -150.01, ymin: 64, xmax: -150, ymax: 64.01 },
      transport: alaska.transport,
      retrievedAt: WHEN,
    });
    expect(outside.state).toBe('OUTSIDE_PROVIDER_COVERAGE');
    expect(alaska.calls).toHaveLength(0);
    const hawaii = transportOf(polygonBody());
    const islands = await getProductionGeologicalContext({
      bbox: { xmin: -157.01, ymin: 21.3, xmax: -157, ymax: 21.31 },
      transport: hawaii.transport,
      retrievedAt: WHEN,
    });
    expect(islands.state).toBe('OUTSIDE_PROVIDER_COVERAGE');
    expect(hawaii.calls).toHaveLength(0);
  });

  it('withholds partial pages and quarantines unsupported schema', async () => {
    const partial = transportOf(polygonBody({ exceeded: true }));
    const unsafe = await getProductionGeologicalContext({
      bbox: BBOX,
      transport: partial.transport,
      retrievedAt: WHEN,
    });
    expect(unsafe.state).toBe('PARTIAL_UNSAFE');
    expect(unsafe.units).toEqual([]);
    expect(partial.calls).toHaveLength(1);

    const drifted = transportOf(polygonBody({ lithology: 'Not a known lithology class' }));
    const quarantined = await getProductionGeologicalContext({
      bbox: BBOX,
      transport: drifted.transport,
      retrievedAt: WHEN,
    });
    expect(quarantined.state).toBe('PROVIDER_UNAVAILABLE');
    expect(quarantined.observation.outcome).toBe('schema_drift');
    expect(quarantined.observation.quarantined).toBe(1);
    expect(JSON.stringify(quarantined.observation)).not.toContain('Alluvium');
  });

  it('requires admission, disclosure, and a separate public-display grant', async () => {
    const { transport } = transportOf(polygonBody());
    const shown = await getProductionGeologicalContext({
      bbox: BBOX,
      transport,
      retrievedAt: WHEN,
    });
    expect(shown.attribution?.source).toBe('U.S. Geological Survey');
    expect(shown.attribution?.product).toBe('State Geologic Map Compilation');
    expect(shown.attribution?.doi).toBe(USGS_SGMC_PINNED_DOI);
    expect(shown.attribution?.endorsementDisclaimerRequired).toBe(true);
    expect(shown.attribution?.usgsIdentifierPermitted).toBe(false);
    expect(shown.compilationYear).toBe(2017);
    expect(shown.sourceUpdatedAt).toBeNull();
    expect(shown.retrievedAt).toBe(WHEN);
    expect(shown.units[0]?.ageMin).toBe('Holocene');
    expect(shown.units[0]?.ageMax).toBe('Quaternary');

    const queryOnly = await getProductionGeologicalContext({
      bbox: BBOX,
      transport,
      retrievedAt: WHEN,
      displayAuthorization: () => sgmcAuthorizationRequest(),
    });
    expect(queryOnly.state).toBe('PROVIDER_UNAVAILABLE');
    expect(queryOnly.units).toEqual([]);
    expect(queryOnly.observation.displayBlocked).toBe(true);

    const wrong = await getProductionGeologicalContext({
      bbox: BBOX,
      transport,
      retrievedAt: WHEN,
      displayAuthorization: () =>
        sgmcPublicDisplayAuthorizationRequest({ resourceId: 'res-other' }),
    });
    expect(wrong.state).toBe('PROVIDER_UNAVAILABLE');
    expect(sgmcPublicDisplayAppliesToDoi('10.5066/P1A3DQZK')).toBe(false);

    const disclosure = projectSgmcDisclosure(
      DisclosureClassification.UNKNOWN,
      DisclosurePurpose.PUBLIC_MAP
    );
    expect(disclosure.decision.status).not.toBe('ALLOWED');
  });

  it('rejects legal and access purposes and keeps OBJECTID off the user projection', async () => {
    const translated = translateSgmcShadowFeature({
      attributes: {
        STATE: 'NE',
        SGMC_LABEL: 'Qa',
        UNIT_LINK: 'NE-QA',
        UNIT_NAME: 'Alluvium',
        AGE_MIN: 'Holocene',
        AGE_MAX: 'Quaternary',
        GENERALIZED_LITH: 'Unconsolidated, undifferentiated',
        OBJECTID: 42,
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
      spatialReference: { wkid: 102100, latestWkid: 3857 },
      retrievedAt: WHEN,
      featureCount: 1,
      pagination: 'COMPLETE',
    });
    expect(translated.status).toBe(SourceAdapterResultStatus.SUCCESS);
    expect(translated.normalized?.normalizedFields['serviceObjectId']).toBe(42);
    for (const [purpose, domain] of [
      [EvidencePurpose.COLLECTION_PERMISSION, EvidenceDomain.COLLECTION_RULE],
      [EvidencePurpose.SITE_ACCESS, EvidenceDomain.ROAD_TRAIL_ACCESS],
      [EvidencePurpose.ROUTE_DECISION, EvidenceDomain.ROAD_TRAIL_ACCESS],
      [EvidencePurpose.GEOLOGICAL_CONTEXT, EvidenceDomain.CLOSURE],
      [EvidencePurpose.GEOLOGICAL_CONTEXT, EvidenceDomain.MINING_CLAIM],
      [EvidencePurpose.GEOLOGICAL_CONTEXT, EvidenceDomain.LAND_OWNERSHIP],
      [EvidencePurpose.GEOLOGICAL_CONTEXT, EvidenceDomain.LAND_MANAGEMENT],
    ] as const) {
      expect(rejectSgmcOutsideGeology(translated, purpose, domain)).toBe('REJECTED');
    }
    const { transport } = transportOf(polygonBody());
    const shown = await getProductionGeologicalContext({
      bbox: BBOX,
      transport,
      retrievedAt: WHEN,
    });
    expect(JSON.stringify(shown.units)).not.toContain('42');
    expect(shown.observation.outcome).toBe('success');
  });
});
