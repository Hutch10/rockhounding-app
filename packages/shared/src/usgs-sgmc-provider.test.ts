/**
 * USGS SGMC offline provider contract.
 *
 * A valid fixture stays geological context. It does not become collection
 * permission, access, closure, or claim status, and it does not call a service.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  builtinDecisionEvidenceContract,
  evaluateDecisionEvidenceContract,
  type DecisionEvidenceBundle,
} from './decision-evidence-contracts';
import {
  DisclosureClassification,
  DisclosurePurpose,
  materializeDisclosureRelease,
} from './disclosure-governance';
import {
  EvidenceDomain,
  EvidencePurpose,
  evaluateEvidenceAdmission,
  type EvidenceAdmissionCandidate,
} from './evidence-admission';
import { ProvenanceActivityType } from './provenance-activity-kernel';
import { createResourceCatalog } from './resource-catalog';
import { SourceAdapterPrecondition } from './source-adapter-contract';
import {
  SourceGovernanceStatus,
  createSourceGovernanceContract,
  governanceAuthorizesCollection,
} from './source-governance-contract';
import { EvidenceAuthorityClass } from './universal-geological-evidence-schema';
import {
  USGS_SGMC_ADAPTER_ID,
  USGS_SGMC_CONTRACT_INSTANT,
  USGS_SGMC_FIXTURE_KIND,
  USGS_SGMC_GEMS_DOI,
  USGS_SGMC_IDENTITY_SCOPE,
  USGS_SGMC_LAYER_ID,
  USGS_SGMC_LAYER_NAME,
  USGS_SGMC_PINNED_DOI,
  USGS_SGMC_RESOURCE_ID,
  USGS_SGMC_UNGRANTED_OPERATIONS,
  admitSgmcForGeologicalContext,
  interpretSgmcPolygonCount,
  loadSgmcFixture,
  projectSgmcDisclosure,
  runSgmcOfflineFixture,
  sgmcAdapterDefinition,
  sgmcAdmissionCandidate,
  sgmcAuthorizationRequest,
  sgmcConfirmsGeologicalAbsence,
  sgmcContactsNetwork,
  sgmcGeologicalContextPolicy,
  sgmcGovernanceRecord,
  sgmcOperationIsGranted,
  sgmcProductCoversAlaska,
  sgmcProductCoversHawaii,
  sgmcProviderRecordKey,
  sgmcResourceRecord,
  suspendSgmcGovernance,
} from './usgs-sgmc-provider';

const WHEN = USGS_SGMC_CONTRACT_INSTANT;

async function run(fileName: string) {
  return runSgmcOfflineFixture(loadSgmcFixture(fileName));
}

describe('USGS SGMC resource and governance', () => {
  it('pins the selected product, layer, and geology-only authority', () => {
    const resource = sgmcResourceRecord();
    expect(resource.id).toBe(USGS_SGMC_RESOURCE_ID);
    expect(resource.identifiers?.doi).toBe(USGS_SGMC_PINNED_DOI);
    expect(resource.identifiers?.doi).not.toBe(USGS_SGMC_GEMS_DOI);
    expect(resource.identifiers?.providerRecordId).toBe(
      `${USGS_SGMC_LAYER_NAME}:${USGS_SGMC_LAYER_ID}`
    );
    expect(resource.version.versionId).toBe('ds1052-v1.1');
    expect(resource.authority.sourceAuthorityClass).toBe(EvidenceAuthorityClass.PRIMARY_AUTHORITY);
    expect(resource.usage.intendedUses).toEqual(['GEOLOGICAL_CONTEXT']);
    expect(resource.spatial?.coverageDescription).toContain('Alaska');
    expect(resource.spatial?.coverageDescription).toContain('Hawaii');
    expect(sgmcProductCoversAlaska()).toBe(false);
    expect(sgmcProductCoversHawaii()).toBe(false);
    expect(createResourceCatalog().getResourceRecord(USGS_SGMC_RESOURCE_ID)?.id).toBe(resource.id);
  });

  it('reviews AUTOMATED_QUERY and leaves the other operations ungranted', async () => {
    const governance = sgmcGovernanceRecord();
    expect(governance.reviewState).toBe('REVIEWED');
    expect(governance.status).toBe('ADMITTED');
    expect(governance.allowedUses).toEqual(['GEOLOGICAL_CONTEXT']);
    expect(governanceAuthorizesCollection(governance)).toBe(false);
    expect(sgmcOperationIsGranted('AUTOMATED_QUERY')).toBe(true);
    for (const operation of USGS_SGMC_UNGRANTED_OPERATIONS) {
      expect(sgmcOperationIsGranted(operation)).toBe(false);
    }
    const readReceipt = sgmcAuthorizationRequest({
      requestedOperation: 'AUTOMATED_QUERY',
      governanceReceipt: {
        receiptId: 'gov-receipt-read-only',
        resourceId: USGS_SGMC_RESOURCE_ID,
        decision: 'ALLOWED',
        allowedOperations: ['READ'],
      },
    });
    await expect(
      runSgmcOfflineFixture(loadSgmcFixture('sgmc-valid-geology.fixture.json'), {
        authorization: readReceipt,
      })
    ).rejects.toThrow(/operation authorization/);
    expect(
      createSourceGovernanceContract().getSourceGovernanceRecord('gov-usgs-sgmc-geology')
        ?.reviewState
    ).toBe('REVIEWED');
  });
});

describe('USGS SGMC adapter and valid fixture', () => {
  it('translates a documentation-derived polygon without calling a service', async () => {
    const fixture = loadSgmcFixture('sgmc-valid-geology.fixture.json');
    const before = structuredClone(fixture);
    expect(fixture.fixtureKind).toBe(USGS_SGMC_FIXTURE_KIND);
    expect(fixture.operationallyRetrieved).toBe(false);
    const definition = sgmcAdapterDefinition();
    expect(definition.id).toBe(USGS_SGMC_ADAPTER_ID);
    expect(definition.version).toEqual({ major: 1, minor: 0, patch: 0 });
    expect(definition.tolerantUnsupportedVersion).toBe(false);
    expect(definition.requiredPreconditions).toEqual(Object.values(SourceAdapterPrecondition));
    const first = await run('sgmc-valid-geology.fixture.json');
    const second = await run('sgmc-valid-geology.fixture.json');
    expect(first.result.status).toBe('SUCCESS');
    expect(second.result).toEqual(first.result);
    expect(fixture).toEqual(before);
    expect(first.result.raw?.rawFields['SGMC_LABEL']).toBe('Qal');
    expect(first.result.raw?.rawFields['UNIT_NAME']).toBe('Alluvium');
    expect(first.result.raw?.rawFields['GENERALIZED_LITH']).toBe(
      'Unconsolidated, undifferentiated'
    );
    expect(first.result.raw?.rawFields['geometry']).toMatchObject({ type: 'Polygon' });
    expect(first.result.normalized?.normalizedFields['geologicAgeMin']).toBe('Holocene');
    expect(first.result.normalized?.normalizedFields['geologicAgeMax']).toBe('Quaternary');
    expect(first.result.truthClockCandidate ?? {}).not.toHaveProperty('retrievedAt');
    expect(first.result.truthClockCandidate ?? {}).not.toHaveProperty('sourceUpdatedAt');
    expect(first.result.truthClockCandidate ?? {}).not.toHaveProperty('phenomenonTime');
    const key = sgmcProviderRecordKey(first.result.raw?.rawFields ?? {});
    expect(key.ambiguous).toBe(false);
    expect(key.scope).toBe(USGS_SGMC_IDENTITY_SCOPE);
    expect(key.key).toBe('SYN\u001fQal\u001fSYNTHETIC-UNIT-LINK-001');
    expect(key.key).not.toBe(String(key.serviceObjectId));
    expect(first.result.normalized?.normalizedFields['providerRecordKey']).toBe(key.key);
    expect(first.result.normalized?.normalizedFields['serviceObjectId']).toBe(1001);
    expect(first.result.confirmedAbsence).toBe(false);
    expect(first.result.coverage?.knownMissingClasses).toEqual(['Alaska', 'Hawaii']);
    expect(first.result.coverage?.reason?.code).toBe('OFFLINE_FIXTURE');
    expect(interpretSgmcPolygonCount(0)).toEqual({
      polygonsReturned: 0,
      geologicalAbsence: false,
      meaning: 'NO_SGMC_POLYGON_RETURNED',
    });
    expect(sgmcConfirmsGeologicalAbsence()).toBe(false);
    expect(first.provenanceGraph.activities.map((activity) => activity.activityType)).toEqual([
      ProvenanceActivityType.IMPORT,
    ]);
    expect(first.provenanceGraph.activities.map((activity) => activity.activityType)).not.toContain(
      ProvenanceActivityType.SOURCE_RETRIEVAL
    );
    expect(first.provenanceGraph.activities[0]?.process?.processVersion).toBe('1.0.0');
    expect(first.result.provenance?.sourceResourceId).toBe(USGS_SGMC_RESOURCE_ID);
    expect(sgmcContactsNetwork()).toBe(false);
  });

  it('shows an adapter version change and rejects the 2026 GeMS product', async () => {
    const bumped = await runSgmcOfflineFixture(loadSgmcFixture('sgmc-valid-geology.fixture.json'), {
      definition: sgmcAdapterDefinition({ major: 1, minor: 1, patch: 0 }),
    });
    expect(bumped.provenanceGraph.activities[0]?.process?.processVersion).toBe('1.1.0');
    const gems = await run('sgmc-newer-gems-product.fixture.json');
    const version = await run('sgmc-unsupported-version.fixture.json');
    expect(gems.result.failureCode).toBe('UNSUPPORTED_SOURCE_VERSION');
    expect(version.result.failureCode).toBe('UNSUPPORTED_SOURCE_VERSION');
    expect(gems.result.raw?.sourceVersionRef).toBe(USGS_SGMC_GEMS_DOI);
  });
});

describe('USGS SGMC quarantine', () => {
  it('keeps raw input for malformed, partial, and ambiguous fixtures', async () => {
    const cases = [
      ['sgmc-unknown-lithology.fixture.json', 'QUARANTINED'],
      ['sgmc-missing-state.fixture.json', 'QUARANTINED'],
      ['sgmc-missing-unit-name.fixture.json', 'QUARANTINED'],
      ['sgmc-non-polygon.fixture.json', 'QUARANTINED'],
      ['sgmc-unsupported-spatial-reference.fixture.json', 'QUARANTINED'],
      ['sgmc-pagination-ambiguous.fixture.json', 'QUARANTINED'],
      ['sgmc-malformed-age.fixture.json', 'QUARANTINED'],
      ['sgmc-ambiguous-identity.fixture.json', 'QUARANTINED'],
    ] as const;
    for (const [fileName] of cases) {
      const fixture = loadSgmcFixture(fileName);
      const outcome = await run(fileName);
      expect(outcome.result.status).toBe('QUARANTINED');
      expect(outcome.result.raw?.rawFields).toBeDefined();
      expect(outcome.result.confirmedAbsence).toBe(false);
      expect(fixture.operationallyRetrieved).toBe(false);
    }
    const lithology = await run('sgmc-unknown-lithology.fixture.json');
    expect(lithology.result.raw?.rawFields['GENERALIZED_LITH']).toBe('Collected specimen quartz');
    expect(lithology.result.normalized?.normalizedFields['generalizedLithology']).toBeUndefined();
    const page = await run('sgmc-pagination-ambiguous.fixture.json');
    expect(page.result.coverage?.state).toBe('UNRESOLVED');
    expect(page.result.coverage?.recordCoverage).toBe('PARTIAL');
    const identity = await run('sgmc-ambiguous-identity.fixture.json');
    expect(sgmcProviderRecordKey(identity.result.raw?.rawFields ?? {}).ambiguous).toBe(true);
    expect(identity.result.normalized?.normalizedFields['providerRecordKey']).toBeUndefined();
    const age = await run('sgmc-malformed-age.fixture.json');
    expect(age.result.truthClockCandidate?.retrievedAt).toBeUndefined();
    expect(age.result.raw?.rawFields['AGE_MIN']).toBe(12);
  });
});

describe('USGS SGMC admission, disclosure, and decisions', () => {
  it('admits geological context and withholds unknown sensitivity', async () => {
    const runResult = await run('sgmc-valid-geology.fixture.json');
    const admitted = admitSgmcForGeologicalContext(runResult.result);
    expect(admitted.status).toBe('ADMITTED');
    expect(admitted.receipt.domain).toBe(EvidenceDomain.GEOLOGY);
    expect(admitted.receipt.purpose).toBe(EvidencePurpose.GEOLOGICAL_CONTEXT);
    const candidate = sgmcAdmissionCandidate(runResult.result);
    expect(
      rejectOutsideGeology(
        candidate,
        EvidencePurpose.COLLECTION_PERMISSION,
        EvidenceDomain.COLLECTION_RULE
      ).status
    ).toBe('REJECTED');
    expect(
      rejectOutsideGeology(candidate, EvidencePurpose.SITE_ACCESS, EvidenceDomain.ROAD_TRAIL_ACCESS)
        .status
    ).toBe('REJECTED');
    expect(
      rejectOutsideGeology(candidate, EvidencePurpose.OTHER, EvidenceDomain.CLOSURE).status
    ).toBe('REJECTED');
    expect(
      rejectOutsideGeology(candidate, EvidencePurpose.OTHER, EvidenceDomain.MINING_CLAIM).status
    ).toBe('REJECTED');
    expect(
      rejectOutsideGeology(
        candidate,
        EvidencePurpose.ROUTE_DECISION,
        EvidenceDomain.ROAD_TRAIL_ACCESS
      ).status
    ).toBe('REJECTED');
    expect(
      rejectOutsideGeology(candidate, EvidencePurpose.SITE_ACCESS, EvidenceDomain.LAND_OWNERSHIP)
        .status
    ).toBe('REJECTED');
    expect(
      rejectOutsideGeology(candidate, EvidencePurpose.OTHER, EvidenceDomain.LAND_MANAGEMENT).status
    ).toBe('REJECTED');

    const bundle = decisionBundle(admitted.receipt, candidate);
    const geology = evaluateDecisionEvidenceContract(
      builtinDecisionEvidenceContract('GEOLOGICAL_CONTEXT'),
      [bundle],
      { evaluatedAt: WHEN }
    );
    expect(geology.requirements.find((item) => item.requirementId === 'geology')?.status).toBe(
      'SATISFIED_WITH_LIMITATIONS'
    );
    const visit = evaluateDecisionEvidenceContract(
      builtinDecisionEvidenceContract('FIELD_VISIT_READINESS'),
      [bundle],
      { evaluatedAt: WHEN }
    );
    expect(visit.requirements.find((item) => item.requirementId === 'geology')?.status).toBe(
      'SATISFIED_WITH_LIMITATIONS'
    );
    expect(visit.requirements.find((item) => item.requirementId === 'road')?.status).toBe(
      'MISSING'
    );
    const collection = evaluateDecisionEvidenceContract(
      builtinDecisionEvidenceContract('COLLECTION_PERMISSION'),
      [bundle],
      { evaluatedAt: WHEN }
    );
    expect(collection.completeness).not.toBe('COMPLETE');
    expect(
      collection.requirements.some(
        (item) => item.status === 'SATISFIED' || item.status === 'SATISFIED_WITH_LIMITATIONS'
      )
    ).toBe(false);
    expect(
      collection.requirements.find((item) => item.requirementId === 'collection-rule')?.status
    ).toBe('MISSING');
    for (const decisionClass of [
      'ROUTE_ACCESS',
      'CLOSURE_STATUS',
      'MINING_CLAIM_STATUS',
      'LAND_OWNERSHIP_STATUS',
      'LAND_MANAGEMENT_STATUS',
      'SITE_ACCESS',
    ] as const) {
      const outside = evaluateDecisionEvidenceContract(
        builtinDecisionEvidenceContract(decisionClass),
        [bundle],
        { evaluatedAt: WHEN }
      );
      expect(
        outside.requirements.some(
          (item) => item.status === 'SATISFIED' || item.status === 'SATISFIED_WITH_LIMITATIONS'
        )
      ).toBe(false);
    }

    const shadow = projectSgmcDisclosure(
      DisclosureClassification.PUBLIC,
      DisclosurePurpose.SHADOW_DISPLAY
    );
    const map = projectSgmcDisclosure(
      DisclosureClassification.PUBLIC,
      DisclosurePurpose.PUBLIC_MAP
    );
    expect(shadow.decision.status).toBe('ALLOWED');
    expect(map.decision.status).toBe('ALLOWED');
    expect(shadow.sourceGeometry.geometryRef).toBe('sgmc-fixture-polygon');
    const unknown = projectSgmcDisclosure(
      DisclosureClassification.UNKNOWN,
      DisclosurePurpose.SHADOW_DISPLAY
    );
    expect(unknown.decision.status).toBe('UNKNOWN_FAIL_CLOSED');
    expect(unknown.mode).toBe('WITHHELD');
    expect(() => materializeDisclosureRelease(unknown, DisclosurePurpose.SHADOW_DISPLAY)).toThrow(
      /withheld/
    );
    expect(() =>
      materializeDisclosureRelease(
        { geometry: shadow.sourceGeometry },
        DisclosurePurpose.SHADOW_DISPLAY
      )
    ).toThrow(/projection/);
  });
});

describe('USGS SGMC off-switch and network prohibition', () => {
  it('blocks a suspended profile and leaves the historical fixture unchanged', async () => {
    const fixture = loadSgmcFixture('sgmc-valid-geology.fixture.json');
    const before = structuredClone(fixture);
    const original = sgmcGovernanceRecord();
    const suspended = suspendSgmcGovernance(original);
    expect(original.status).toBe(SourceGovernanceStatus.ADMITTED);
    expect(suspended.status).toBe(SourceGovernanceStatus.SUSPENDED);
    await expect(
      runSgmcOfflineFixture(fixture, {
        authorization: sgmcAuthorizationRequest({ governanceStatus: 'SUSPENDED' }),
      })
    ).rejects.toThrow(/operation authorization/);
    expect(fixture).toEqual(before);
    expect(original.status).toBe(SourceGovernanceStatus.ADMITTED);
    await expect(
      runSgmcOfflineFixture(fixture, {
        authorization: sgmcAuthorizationRequest({ reviewState: 'UNKNOWN' }),
      })
    ).rejects.toThrow(/operation authorization/);
    await expect(
      runSgmcOfflineFixture(fixture, {
        authorization: sgmcAuthorizationRequest({ reviewState: 'SUPERSEDED' }),
      })
    ).rejects.toThrow(/operation authorization/);
    await expect(
      runSgmcOfflineFixture(fixture, {
        authorization: sgmcAuthorizationRequest({ resourceId: 'res-other' }),
      })
    ).rejects.toThrow(/resource id/);
    const tolerant = sgmcAdapterDefinition();
    tolerant.tolerantUnsupportedVersion = true;
    await expect(runSgmcOfflineFixture(fixture, { definition: tolerant })).rejects.toThrow(
      /tolerant/
    );
    const missing = sgmcAdapterDefinition();
    missing.requiredPreconditions = missing.requiredPreconditions.slice(0, 3);
    await expect(runSgmcOfflineFixture(fixture, { definition: missing })).rejects.toThrow(
      /precondition/
    );
    const source = readFileSync(resolve(__dirname, 'usgs-sgmc-provider.ts'), 'utf8');
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('axios');
    expect(source).not.toContain('XMLHttpRequest');
    expect(source).not.toContain('FeatureServer/query');
  });
});

function rejectOutsideGeology(
  candidate: EvidenceAdmissionCandidate,
  purpose: EvidenceAdmissionCandidate['supportedPurposes'][number],
  domain: EvidenceAdmissionCandidate['authority'][number]['domain']
) {
  const policy = sgmcGeologicalContextPolicy();
  return evaluateEvidenceAdmission({
    id: `reject-${domain}`,
    evaluatedAt: WHEN,
    candidate,
    policy: { ...policy, id: `policy-${domain}`, purpose, domain },
  });
}

function decisionBundle(
  receipt: DecisionEvidenceBundle['receipt'],
  candidate: DecisionEvidenceBundle['candidate']
): DecisionEvidenceBundle {
  return {
    candidate,
    receipt,
    policy: { policyId: receipt.policyId, version: receipt.policyVersion },
  };
}
