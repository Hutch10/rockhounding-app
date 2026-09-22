/**
 * Source Governance Contract R1
 *
 * Production change that would fail these tests: treating admission as collection
 * permission, promoting community authority, generating UGES assertions from
 * governance records, or merging governance into Resource Catalog / GLR.
 */

import { describe, expect, it } from 'vitest';

import {
  BUILTIN_GEOLOGICAL_LAYER_DEFINITIONS,
  createGeologicalLayerRegistry,
} from './geological-layer-registry';
import {
  BUILTIN_RESOURCE_RECORDS,
  ResourceType,
  ResourceUsage,
  createResourceCatalog,
} from './resource-catalog';
import {
  BUILTIN_SOURCE_GOVERNANCE_RECORDS,
  SOURCE_GOVERNANCE_SCHEMA_VERSION,
  SourceAdmissionClass,
  SourceGovernanceStatus,
  SourceReviewState,
  SourceSubjectKind,
  createSourceGovernanceContract,
  evaluateSourceAdmission,
  governanceAuthorizesCollection,
  governanceCreatesUgesAssertion,
  governanceElevatesAuthority,
  governanceInterpretsLaw,
  listGovernanceByStatus,
  listGovernanceBySubject,
  listSourceGovernanceRecords,
  validateSourceGovernanceRecord,
  type SourceGovernanceRecord,
} from './source-governance-contract';

function validGovernance(
  overrides: Partial<SourceGovernanceRecord> & Pick<SourceGovernanceRecord, 'id'>
): SourceGovernanceRecord {
  return {
    schemaVersion: SOURCE_GOVERNANCE_SCHEMA_VERSION,
    subject: { kind: SourceSubjectKind.RESOURCE, id: 'res-usgs-ngmdb' },
    status: SourceGovernanceStatus.ADMITTED,
    reviewState: SourceReviewState.REVIEWED,
    admissionClass: SourceAdmissionClass.GOVERNED_METADATA,
    allowedUses: [ResourceUsage.DISCOVERY, ResourceUsage.GEOLOGICAL_CONTEXT],
    deniedUses: [ResourceUsage.COLLECTION_DECISION_INPUT],
    revalidationPolicy: 'ON_EXPIRY',
    constraints: {
      authorityPromotion: 'PROHIBITED',
      collectionAuthorization: 'PROHIBITED',
      legalInterpretation: 'PROHIBITED',
      assertionGeneration: 'PROHIBITED',
    },
    limitations: [{ code: 'UNVERIFIED_CURRENCY' }],
    ...overrides,
  };
}

describe('Source Governance Contract schema version', () => {
  it('pins schemaVersion to 1', () => {
    expect(SOURCE_GOVERNANCE_SCHEMA_VERSION).toBe(1);
    expect(validateSourceGovernanceRecord(validGovernance({ id: 'gov-min' })).schemaVersion).toBe(
      1
    );
  });
});

describe('valid governance record', () => {
  it('accepts a minimal valid record', () => {
    expect(validateSourceGovernanceRecord(validGovernance({ id: 'gov-ok' })).id).toBe('gov-ok');
  });

  it('rejects invalid status enum', () => {
    expect(() =>
      validateSourceGovernanceRecord({
        ...validGovernance({ id: 'gov-bad-status' }),
        status: 'NOT_A_STATUS',
      })
    ).toThrow();
  });

  it('rejects overlapping allowed and denied uses', () => {
    expect(() =>
      validateSourceGovernanceRecord(
        validGovernance({
          id: 'gov-overlap',
          allowedUses: [ResourceUsage.DISCOVERY],
          deniedUses: [ResourceUsage.DISCOVERY],
        })
      )
    ).toThrow();
  });
});

describe('contract construction', () => {
  it('rejects duplicate governance IDs', () => {
    expect(() =>
      createSourceGovernanceContract([
        validGovernance({ id: 'dup' }),
        validGovernance({ id: 'dup', subject: { kind: SourceSubjectKind.LAYER, id: 'lyr-x' } }),
      ])
    ).toThrow(/duplicate/i);
  });

  it('lists records in deterministic id order', () => {
    const contract = createSourceGovernanceContract([
      validGovernance({ id: 'z-gov' }),
      validGovernance({ id: 'a-gov' }),
      validGovernance({ id: 'm-gov' }),
    ]);
    expect(listSourceGovernanceRecords(contract).map((record) => record.id)).toEqual([
      'a-gov',
      'm-gov',
      'z-gov',
    ]);
  });
});

describe('community and authority promotion', () => {
  it('rejects community/user subjects that attempt authority promotion', () => {
    expect(() =>
      validateSourceGovernanceRecord(
        validGovernance({
          id: 'gov-promote',
          subject: { kind: SourceSubjectKind.RESOURCE, id: 'res-local-field-observations' },
          constraints: {
            authorityPromotion: 'ALLOWED',
            collectionAuthorization: 'PROHIBITED',
            legalInterpretation: 'PROHIBITED',
            assertionGeneration: 'PROHIBITED',
          },
        })
      )
    ).toThrow();
  });
});

describe('admission evaluation', () => {
  it('admits allowed uses and denies denied uses without authorizing collection', () => {
    const record = validateSourceGovernanceRecord(
      validGovernance({
        id: 'gov-eval',
        allowedUses: [ResourceUsage.DISCOVERY, ResourceUsage.COLLECTION_DECISION_INPUT],
        deniedUses: [ResourceUsage.SAFETY_DECISION_INPUT],
      })
    );
    expect(evaluateSourceAdmission(record, ResourceUsage.DISCOVERY).admitted).toBe(true);
    expect(evaluateSourceAdmission(record, ResourceUsage.SAFETY_DECISION_INPUT).admitted).toBe(
      false
    );
    expect(evaluateSourceAdmission(record, ResourceUsage.COLLECTION_DECISION_INPUT).admitted).toBe(
      true
    );
    expect(governanceAuthorizesCollection(record)).toBe(false);
  });

  it('does not admit REJECTED or SUSPENDED records', () => {
    const rejected = validateSourceGovernanceRecord(
      validGovernance({ id: 'gov-rej', status: SourceGovernanceStatus.REJECTED })
    );
    expect(evaluateSourceAdmission(rejected, ResourceUsage.DISCOVERY).admitted).toBe(false);
    const suspended = validateSourceGovernanceRecord(
      validGovernance({ id: 'gov-sus', status: SourceGovernanceStatus.SUSPENDED })
    );
    expect(evaluateSourceAdmission(suspended, ResourceUsage.DISCOVERY).admitted).toBe(false);
  });
});

describe('temporal governance window', () => {
  it('allows open-ended effective interval', () => {
    const parsed = validateSourceGovernanceRecord(
      validGovernance({
        id: 'gov-open',
        effectiveFrom: '2020-01-01T00:00:00.000Z',
      })
    );
    expect(parsed.effectiveTo).toBeUndefined();
  });

  it('rejects invalid effective interval ordering', () => {
    expect(() =>
      validateSourceGovernanceRecord(
        validGovernance({
          id: 'gov-bad-time',
          effectiveFrom: '2026-01-01T00:00:00.000Z',
          effectiveTo: '2020-01-01T00:00:00.000Z',
        })
      )
    ).toThrow();
  });
});

describe('boundary invariants', () => {
  it('cannot generate a UGES assertion, elevate authority, or interpret law', () => {
    const record = validateSourceGovernanceRecord(validGovernance({ id: 'gov-bounds' }));
    expect(governanceCreatesUgesAssertion(record)).toBe(false);
    expect(governanceElevatesAuthority(record)).toBe(false);
    expect(governanceInterpretsLaw(record)).toBe(false);
    expect(record).not.toHaveProperty('predicate');
    expect(record).not.toHaveProperty('certainty');
  });

  it('does not merge into Resource Catalog or Geological Layer Registry', () => {
    const catalog = createResourceCatalog();
    const registry = createGeologicalLayerRegistry(BUILTIN_GEOLOGICAL_LAYER_DEFINITIONS);
    const contract = createSourceGovernanceContract();
    expect(catalog.getResourceRecord('gov-usgs-ngmdb')).toBeUndefined();
    expect(registry.getLayerDefinition('gov-usgs-ngmdb')).toBeUndefined();
    expect(contract.getSourceGovernanceRecord('res-usgs-ngmdb')).toBeUndefined();
  });
});

describe('referential non-enforcement', () => {
  it('allows missing subject IDs in R1', () => {
    const contract = createSourceGovernanceContract([
      validGovernance({
        id: 'gov-missing-subject',
        subject: { kind: SourceSubjectKind.RESOURCE, id: 'does-not-exist' },
      }),
    ]);
    expect(createResourceCatalog().getResourceRecord('does-not-exist')).toBeUndefined();
    expect(
      listGovernanceBySubject(contract, SourceSubjectKind.RESOURCE, 'does-not-exist').map(
        (record) => record.id
      )
    ).toEqual(['gov-missing-subject']);
  });
});

describe('filtering and immutability', () => {
  it('filters by status and subject deterministically', () => {
    const contract = createSourceGovernanceContract([
      validGovernance({ id: 'gov-a', status: SourceGovernanceStatus.ADMITTED }),
      validGovernance({
        id: 'gov-r',
        status: SourceGovernanceStatus.RESTRICTED,
        subject: { kind: SourceSubjectKind.LAYER, id: 'usgs-ngmdb-geologic-maps' },
      }),
    ]);
    expect(
      listGovernanceByStatus(contract, SourceGovernanceStatus.RESTRICTED).map((r) => r.id)
    ).toEqual(['gov-r']);
    expect(
      listGovernanceBySubject(contract, SourceSubjectKind.LAYER, 'usgs-ngmdb-geologic-maps').map(
        (r) => r.id
      )
    ).toEqual(['gov-r']);
  });

  it('does not mutate built-in records via returned lists', () => {
    const contract = createSourceGovernanceContract(BUILTIN_SOURCE_GOVERNANCE_RECORDS);
    const listed = listSourceGovernanceRecords(contract);
    const originalId = listed[0]?.id;
    listed[0]!.status = SourceGovernanceStatus.REJECTED;
    listed[0]!.allowedUses.push(ResourceUsage.RESEARCH_ONLY);
    expect(contract.getSourceGovernanceRecord(originalId!)?.status).not.toBe(
      SourceGovernanceStatus.REJECTED
    );
    expect(BUILTIN_SOURCE_GOVERNANCE_RECORDS[0]?.status).not.toBe(SourceGovernanceStatus.REJECTED);
  });
});

describe('built-in governance', () => {
  it('validates representative built-ins against catalog families', () => {
    const contract = createSourceGovernanceContract();
    const ids = listSourceGovernanceRecords(contract).map((record) => record.id);
    expect(ids).toEqual([...ids].sort());
    expect(ids).toEqual(
      expect.arrayContaining([
        'gov-usgs-ngmdb',
        'gov-usgs-mrds',
        'gov-usgs-3dep',
        'gov-blm-mlrs',
        'gov-nws-alerts',
        'gov-nasa-firms',
        'gov-regulation-document-example',
        'gov-local-field-observations',
        'gov-derived-terrain-analysis',
      ])
    );
    const catalog = createResourceCatalog(BUILTIN_RESOURCE_RECORDS);
    for (const record of listSourceGovernanceRecords(contract)) {
      expect(validateSourceGovernanceRecord(record).id).toBe(record.id);
      expect(governanceAuthorizesCollection(record)).toBe(false);
      expect(governanceInterpretsLaw(record)).toBe(false);
      if (record.subject.kind === SourceSubjectKind.RESOURCE) {
        const resource = catalog.getResourceRecord(record.subject.id);
        if (resource !== undefined && resource.type === ResourceType.USER_GENERATED_DATASET) {
          expect(record.constraints.authorityPromotion).toBe('PROHIBITED');
        }
      }
    }
  });
});
