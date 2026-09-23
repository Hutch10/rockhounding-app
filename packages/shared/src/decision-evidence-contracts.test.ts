import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BuildingBlockLifecycleStatus,
  BUILTIN_BUILDING_BLOCK_DEFINITIONS,
  DECISION_EVIDENCE_CONTRACT_BLOCK_ID,
  EVIDENCE_ADMISSION_BLOCK_ID,
  GEOLOGICAL_LAYER_REGISTRY_BLOCK_ID,
  OBSERVATION_BLOCK_ID,
  PROVENANCE_ACTIVITY_BLOCK_ID,
  RESOURCE_CATALOG_BLOCK_ID,
  SAMPLE_BLOCK_ID,
  SAMPLING_EVENT_BLOCK_ID,
  SOURCE_ADAPTER_CONTRACT_BLOCK_ID,
  SOURCE_GOVERNANCE_BLOCK_ID,
  TRUTH_CLOCK_BLOCK_ID,
  UGES_BLOCK_ID,
  EVIDENCE_QUARANTINE_BLOCK_ID,
  getLatestStableBuildingBlock,
  listBuildingBlocksByCategory,
  validateBuildingBlockRegistry,
} from './building-block-registry';
import {
  type DecisionEvidenceBundle,
  type DecisionEvidenceContext,
  type DecisionEvidenceContract,
  type DecisionEvidenceRequirement,
  DecisionEvidenceContractSchema,
  builtinDecisionEvidenceContract,
  decisionEvidenceContractEmitsOutcome,
  evaluateDecisionEvidenceContract,
  selectDecisionEvidenceContract,
} from './decision-evidence-contracts';
import type { EvidenceAdmissionReceipt } from './evidence-admission';
import type { EvidenceDomain, EvidencePurpose } from './evidence-admission';

const WHEN = '2026-09-22T18:00:00.000Z';
const VERSION = { major: 1, minor: 0, patch: 0 };

function context(
  applicability: DecisionEvidenceContext['applicability'] = {}
): DecisionEvidenceContext {
  return { evaluatedAt: WHEN, applicability };
}

function requirement(
  overrides: Partial<DecisionEvidenceRequirement> &
    Pick<DecisionEvidenceRequirement, 'id' | 'domain' | 'purpose'>
): DecisionEvidenceRequirement {
  return {
    allowedEvidenceRoles: ['DECISION', 'AUTHORITATIVE_DECISION'],
    minimumAuthority: 'SECONDARY_AUTHORITY',
    temporalRequirement: 'CURRENT_REQUIRED',
    coverageRequirement: {
      record: 'COMPLETE_REQUIRED',
      geometry: 'NOT_APPLICABLE',
      temporal: 'NOT_APPLICABLE',
    },
    provenanceRequirement: 'SOURCE_TRACEABLE',
    contradictionPolicy: 'REQUIRE_NO_UNRESOLVED_CONFLICT',
    optional: false,
    allowLimitations: true,
    requiredCount: 1,
    requiresNegativeAdmission: false,
    limitations: [],
    applicability: { mode: 'ALWAYS' },
    ...overrides,
  };
}

function contractFrom(
  requirements: DecisionEvidenceRequirement[],
  groups: DecisionEvidenceContract['groups'],
  overrides: Partial<DecisionEvidenceContract> = {}
): DecisionEvidenceContract {
  return DecisionEvidenceContractSchema.parse({
    id: 'rockhounding:decision-evidence:test',
    version: VERSION,
    decisionClass: 'OTHER',
    schemaVersion: 1,
    requirements,
    groups,
    ...overrides,
  });
}

function bundle(input: {
  id?: string;
  domain: EvidenceDomain;
  purpose: EvidencePurpose;
  role?: DecisionEvidenceBundle['receipt']['evidenceRole'];
  decision?: EvidenceAdmissionReceipt['decision'];
  authority?: EvidenceAdmissionReceipt['authorityState'];
  fitness?: DecisionEvidenceBundle['candidate']['temporal']['fitness'];
  freshness?: NonNullable<DecisionEvidenceBundle['candidate']['temporal']['freshness']>;
  coverage?: Partial<DecisionEvidenceBundle['candidate']['coverage']>;
  provenance?: DecisionEvidenceBundle['candidate']['provenance']['state'];
  lineage?: string[];
  contradiction?: DecisionEvidenceBundle['candidate']['contradiction']['state'];
  kind?: string;
  limitations?: string[];
  adapterStatus?: DecisionEvidenceBundle['candidate']['adapterStatus'];
  policyId?: string;
  negative?: DecisionEvidenceBundle['candidate']['negative'];
  effectiveAtDecisionTime?: boolean | 'UNKNOWN';
}): DecisionEvidenceBundle {
  const id = input.id ?? `${input.domain}-${input.purpose}`;
  const role = input.role ?? 'AUTHORITATIVE_DECISION';
  const authority = input.authority ?? 'PRIMARY_AUTHORITY';
  const policyId = input.policyId ?? 'policy-1';
  const candidate: DecisionEvidenceBundle['candidate'] = {
    id,
    kind: input.kind ?? 'record',
    role,
    supportedPurposes: [input.purpose],
    authority: [{ domain: input.domain, authorityClass: authority as 'PRIMARY_AUTHORITY' }],
    temporal: {
      fitness: input.fitness ?? 'FIT',
      freshness: input.freshness ?? 'CURRENT',
      effectiveAtDecisionTime: input.effectiveAtDecisionTime,
    },
    coverage: {
      record: 'COMPLETE',
      geometry: 'COMPLETE',
      temporal: 'COMPLETE',
      resultCount: 1,
      ...input.coverage,
    },
    quarantine: { state: 'NONE', disposition: 'NONE' },
    provenance: { state: input.provenance ?? 'SOURCE_TRACEABLE' },
    governance: { decision: 'ALLOWED' },
    independence: { upstreamLineageIds: input.lineage ?? [`lineage-${id}`] },
    contradiction: { state: input.contradiction ?? 'NONE' },
    availability: 'AVAILABLE',
    negative: input.negative,
    adapterStatus: input.adapterStatus,
  };
  const receipt: EvidenceAdmissionReceipt = {
    requestId: `request-${id}`,
    candidateId: id,
    policyId,
    policyVersion: VERSION,
    decision: input.decision ?? 'ADMITTED',
    reasons: [{ code: input.decision ?? 'ADMITTED' }],
    evaluatedAt: WHEN,
    domain: input.domain,
    purpose: input.purpose,
    evidenceRole: role,
    inputReferences: { candidateId: id, policyId },
    temporalFitness: candidate.temporal.fitness,
    coverageState: candidate.coverage.record,
    provenanceState: candidate.provenance.state,
    authorityState: authority,
    independenceState: 'INDEPENDENT',
    contradictionState: candidate.contradiction.state,
    limitations: input.limitations ?? [],
    purposeFitness: 'FIT',
  };
  return {
    candidate,
    receipt,
    policy: { policyId, version: VERSION },
  };
}

function legalBundles(includeClaim = false): DecisionEvidenceBundle[] {
  const core: Array<[EvidenceDomain, string]> = [
    ['LAND_MANAGEMENT', 'land-management'],
    ['COLLECTION_RULE', 'collection-rule'],
    ['CLOSURE', 'closure'],
  ];
  const rows = core.map(([domain, id]) => bundle({ id, domain, purpose: 'COLLECTION_PERMISSION' }));
  if (includeClaim) {
    rows.push(
      bundle({ id: 'claim', domain: 'MINING_CLAIM', purpose: 'COLLECTION_PERMISSION' }),
      bundle({ id: 'estate', domain: 'MINERAL_ESTATE', purpose: 'COLLECTION_PERMISSION' })
    );
  }
  return rows;
}

describe('decision evidence contracts', () => {
  it('accepts a versioned contract and evaluates it deterministically', () => {
    const rule = requirement({
      id: 'rule',
      domain: 'COLLECTION_RULE',
      purpose: 'COLLECTION_PERMISSION',
    });
    const first = contractFrom(
      [rule],
      [{ id: 'all', cardinality: 'ALL_OF', requirementIds: ['rule'] }]
    );
    const second = contractFrom(
      [rule],
      [{ id: 'all', cardinality: 'ALL_OF', requirementIds: ['rule'] }],
      { version: { major: 1, minor: 1, patch: 0 } }
    );
    expect(first.id).toBe(second.id);
    expect(first.version).toEqual(VERSION);
    expect(selectDecisionEvidenceContract([first, second], first.id, VERSION)?.version).toEqual(
      VERSION
    );
    expect(
      selectDecisionEvidenceContract([first, second], first.id, { major: 1, minor: 1, patch: 0 })
        ?.version.minor
    ).toBe(1);
    expect(() =>
      DecisionEvidenceContractSchema.parse({
        ...first,
        requirements: [{ ...rule, allowedEvidenceRoles: [] }],
      })
    ).toThrow();
    const evidence = [bundle({ domain: 'COLLECTION_RULE', purpose: 'COLLECTION_PERMISSION' })];
    const before = structuredClone(evidence);
    const once = evaluateDecisionEvidenceContract(first, evidence, context());
    const twice = evaluateDecisionEvidenceContract(first, evidence, context());
    expect(once).toEqual(twice);
    expect(evidence).toEqual(before);
    expect(Object.isFrozen(once)).toBe(true);
    expect(() => {
      (once as { completeness: string }).completeness = 'INCOMPLETE';
    }).toThrow();
  });

  it('keeps completeness distinct from a decision outcome', () => {
    const permission = builtinDecisionEvidenceContract('COLLECTION_PERMISSION');
    const result = evaluateDecisionEvidenceContract(
      permission,
      legalBundles(false),
      context({ miningClaim: 'NOT_APPLICABLE', mineralEstate: 'NOT_APPLICABLE' })
    );
    expect(result.completeness).toBe('COMPLETE');
    expect(decisionEvidenceContractEmitsOutcome()).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(
      /"ALLOWED"|"PROHIBITED"|"SAFE"|"UNSAFE"|"OPEN"|"CLOSED"/
    );
    const source = readFileSync(
      new URL('./decision-evidence-contracts.ts', import.meta.url),
      'utf8'
    );
    expect(source).not.toMatch(/\b(ALLOWED|PROHIBITED|SAFE|UNSAFE)\b/);
    expect(source).not.toMatch(/completenessScore|Date\.now\(/);
  });

  it('reports incomplete, limited, unresolved, conflicted, and revalidation states', () => {
    const permission = builtinDecisionEvidenceContract('COLLECTION_PERMISSION');
    const applicable = context({ miningClaim: 'NOT_APPLICABLE', mineralEstate: 'NOT_APPLICABLE' });
    const missingRule = legalBundles(false).filter(
      (item) => item.receipt.domain !== 'COLLECTION_RULE'
    );
    expect(evaluateDecisionEvidenceContract(permission, missingRule, applicable).completeness).toBe(
      'INCOMPLETE'
    );
    const limited = legalBundles(false).map((item) =>
      item.receipt.domain === 'CLOSURE'
        ? bundle({
            id: item.candidate.id,
            domain: 'CLOSURE',
            purpose: 'COLLECTION_PERMISSION',
            decision: 'ADMITTED_WITH_LIMITATIONS',
            limitations: ['closure notice is provisional'],
          })
        : item
    );
    expect(evaluateDecisionEvidenceContract(permission, limited, applicable).completeness).toBe(
      'COMPLETE_WITH_LIMITATIONS'
    );
    expect(
      evaluateDecisionEvidenceContract(
        permission,
        legalBundles(false),
        context({ miningClaim: 'UNRESOLVED', mineralEstate: 'NOT_APPLICABLE' })
      ).completeness
    ).toBe('UNRESOLVED');
    const conflicted = legalBundles(false).map((item) =>
      item.receipt.domain === 'COLLECTION_RULE'
        ? bundle({
            id: 'collection-rule',
            domain: 'COLLECTION_RULE',
            purpose: 'COLLECTION_PERMISSION',
            contradiction: 'UNRESOLVED',
          })
        : item
    );
    expect(evaluateDecisionEvidenceContract(permission, conflicted, applicable).completeness).toBe(
      'CONFLICTED'
    );
    const stale = legalBundles(false).map((item) =>
      item.receipt.domain === 'CLOSURE'
        ? bundle({
            id: 'closure',
            domain: 'CLOSURE',
            purpose: 'COLLECTION_PERMISSION',
            fitness: 'NOT_FIT',
            freshness: 'STALE',
          })
        : item
    );
    expect(evaluateDecisionEvidenceContract(permission, stale, applicable).completeness).toBe(
      'REVALIDATION_REQUIRED'
    );
  });

  it('blocks domain leakage', () => {
    const permission = builtinDecisionEvidenceContract('COLLECTION_PERMISSION');
    const geology = [
      bundle({ id: 'geo', domain: 'GEOLOGY', purpose: 'GEOLOGICAL_CONTEXT' }),
      ...legalBundles(false).filter((item) => item.receipt.domain !== 'COLLECTION_RULE'),
    ];
    const leaked = evaluateDecisionEvidenceContract(
      permission,
      geology,
      context({ miningClaim: 'NOT_APPLICABLE', mineralEstate: 'NOT_APPLICABLE' })
    );
    expect(leaked.completeness).toBe('INCOMPLETE');
    expect(
      leaked.gaps.some((gap) => gap.reason === 'MISSING_REQUIRED_DOMAIN' && gap.blocking)
    ).toBe(true);
    const estate = contractFrom(
      [requirement({ id: 'estate', domain: 'MINERAL_ESTATE', purpose: 'OTHER' })],
      [{ id: 'all', cardinality: 'ALL_OF', requirementIds: ['estate'] }]
    );
    expect(
      evaluateDecisionEvidenceContract(
        estate,
        [bundle({ domain: 'LAND_OWNERSHIP', purpose: 'OTHER' })],
        context()
      ).completeness
    ).toBe('INCOMPLETE');
    const geologyNeed = contractFrom(
      [requirement({ id: 'geology', domain: 'GEOLOGY', purpose: 'GEOLOGICAL_CONTEXT' })],
      [{ id: 'all', cardinality: 'ALL_OF', requirementIds: ['geology'] }]
    );
    expect(
      evaluateDecisionEvidenceContract(
        geologyNeed,
        [bundle({ domain: 'ROAD_TRAIL_ACCESS', purpose: 'ROUTE_DECISION' })],
        context()
      ).completeness
    ).toBe('INCOMPLETE');
    expect(
      evaluateDecisionEvidenceContract(
        permission,
        [
          bundle({
            id: 'sample',
            domain: 'PROVENANCE',
            purpose: 'SCIENTIFIC_ANALYSIS',
            kind: 'sample',
          }),
        ],
        context({ miningClaim: 'NOT_APPLICABLE', mineralEstate: 'NOT_APPLICABLE' })
      ).completeness
    ).toBe('INCOMPLETE');
  });

  it('defines collection permission as evidence completeness only', () => {
    const permission = builtinDecisionEvidenceContract('COLLECTION_PERMISSION');
    const waived = context({ miningClaim: 'NOT_APPLICABLE', mineralEstate: 'NOT_APPLICABLE' });
    expect(
      evaluateDecisionEvidenceContract(
        permission,
        legalBundles(false).filter((item) => item.receipt.domain !== 'CLOSURE'),
        waived
      ).completeness
    ).toBe('INCOMPLETE');
    const withClaims = evaluateDecisionEvidenceContract(
      permission,
      legalBundles(true),
      context({ miningClaim: 'APPLICABLE', mineralEstate: 'APPLICABLE' })
    );
    expect(withClaims.completeness).toBe('COMPLETE');
    expect(JSON.stringify(withClaims)).not.toMatch(/"ALLOWED"|"PROHIBITED"/);
    const activeClaims = evaluateDecisionEvidenceContract(
      permission,
      legalBundles(false),
      context({ miningClaim: 'APPLICABLE', mineralEstate: 'NOT_APPLICABLE' })
    );
    expect(activeClaims.completeness).toBe('INCOMPLETE');
    expect(activeClaims.gaps.some((gap) => gap.requirementId === 'mining-claim')).toBe(true);
  });

  it('separates site access, route access, and closure evidence', () => {
    const site = builtinDecisionEvidenceContract('SITE_ACCESS');
    const siteEvidence = [
      bundle({ id: 'owner', domain: 'LAND_OWNERSHIP', purpose: 'SITE_ACCESS' }),
      bundle({ id: 'road', domain: 'ROAD_TRAIL_ACCESS', purpose: 'SITE_ACCESS' }),
      bundle({ id: 'closure', domain: 'CLOSURE', purpose: 'SITE_ACCESS' }),
    ];
    expect(evaluateDecisionEvidenceContract(site, siteEvidence, context()).completeness).toBe(
      'COMPLETE'
    );
    expect(
      evaluateDecisionEvidenceContract(
        site,
        [bundle({ id: 'road', domain: 'ROAD_TRAIL_ACCESS', purpose: 'SITE_ACCESS' })],
        context()
      ).completeness
    ).toBe('INCOMPLETE');
    const staleClosure = siteEvidence.map((item) =>
      item.candidate.id === 'closure'
        ? bundle({
            id: 'closure',
            domain: 'CLOSURE',
            purpose: 'SITE_ACCESS',
            fitness: 'REVALIDATION_REQUIRED',
            freshness: 'REVALIDATION_REQUIRED',
          })
        : item
    );
    expect(evaluateDecisionEvidenceContract(site, staleClosure, context()).completeness).toBe(
      'REVALIDATION_REQUIRED'
    );

    const route = builtinDecisionEvidenceContract('ROUTE_ACCESS');
    expect(
      evaluateDecisionEvidenceContract(
        route,
        [
          bundle({ id: 'road', domain: 'ROAD_TRAIL_ACCESS', purpose: 'ROUTE_DECISION' }),
          bundle({ id: 'closure', domain: 'CLOSURE', purpose: 'ROUTE_DECISION' }),
          bundle({ id: 'manager', domain: 'LAND_MANAGEMENT', purpose: 'ROUTE_DECISION' }),
        ],
        context()
      ).completeness
    ).toBe('COMPLETE');
    expect(
      evaluateDecisionEvidenceContract(
        route,
        [
          bundle({
            id: 'road',
            domain: 'ROAD_TRAIL_ACCESS',
            purpose: 'ROUTE_DECISION',
            coverage: { geometry: 'PARTIAL' },
          }),
          bundle({ id: 'closure', domain: 'CLOSURE', purpose: 'ROUTE_DECISION' }),
          bundle({ id: 'manager', domain: 'LAND_MANAGEMENT', purpose: 'ROUTE_DECISION' }),
        ],
        context()
      ).completeness
    ).toBe('INCOMPLETE');
    expect(
      evaluateDecisionEvidenceContract(
        route,
        [bundle({ id: 'geo', domain: 'GEOLOGY', purpose: 'GEOLOGICAL_CONTEXT' })],
        context()
      ).completeness
    ).toBe('INCOMPLETE');

    const closure = builtinDecisionEvidenceContract('CLOSURE_STATUS');
    expect(
      evaluateDecisionEvidenceContract(
        closure,
        [bundle({ domain: 'CLOSURE', purpose: 'OTHER' })],
        context()
      ).completeness
    ).toBe('COMPLETE');
    const noOpen = evaluateDecisionEvidenceContract(
      closure,
      [
        bundle({
          domain: 'CLOSURE',
          purpose: 'OTHER',
          coverage: { record: 'PARTIAL', resultCount: 0 },
        }),
      ],
      context()
    );
    expect(noOpen.completeness).toBe('INCOMPLETE');
    expect(JSON.stringify(noOpen)).not.toMatch(/"OPEN"|"CLOSED"/);
    expect(
      evaluateDecisionEvidenceContract(
        closure,
        [bundle({ domain: 'CLOSURE', purpose: 'OTHER', fitness: 'NOT_FIT', freshness: 'STALE' })],
        context()
      ).completeness
    ).toBe('REVALIDATION_REQUIRED');
  });

  it('keeps safety, geology, opportunity, claims, ownership, and specimens in their domains', () => {
    const safety = builtinDecisionEvidenceContract('SAFETY_STATUS');
    expect(
      evaluateDecisionEvidenceContract(
        safety,
        [
          bundle({
            domain: 'SAFETY',
            purpose: 'SAFETY_DECISION',
            authority: 'SECONDARY_AUTHORITY',
          }),
        ],
        context()
      ).completeness
    ).toBe('COMPLETE');
    const geology = builtinDecisionEvidenceContract('GEOLOGICAL_CONTEXT');
    expect(
      evaluateDecisionEvidenceContract(
        geology,
        [
          bundle({
            domain: 'GEOLOGY',
            purpose: 'GEOLOGICAL_CONTEXT',
            fitness: 'NOT_FIT',
            freshness: 'STALE',
          }),
        ],
        context()
      ).completeness
    ).toBe('COMPLETE');
    expect(
      evaluateDecisionEvidenceContract(
        geology,
        [bundle({ domain: 'COLLECTION_RULE', purpose: 'COLLECTION_PERMISSION' })],
        context()
      ).completeness
    ).toBe('INCOMPLETE');
    const opportunity = builtinDecisionEvidenceContract('GEOLOGICAL_OPPORTUNITY');
    expect(
      evaluateDecisionEvidenceContract(
        opportunity,
        [
          bundle({
            domain: 'MINERAL_OCCURRENCE',
            purpose: 'DISCOVERY_SEARCH',
            role: 'DISCOVERY',
            authority: 'SECONDARY_AUTHORITY',
          }),
        ],
        context()
      ).completeness
    ).toBe('COMPLETE');
    expect(
      JSON.stringify(evaluateDecisionEvidenceContract(opportunity, [], context()))
    ).not.toMatch(/opportunityScore/);

    const claims = builtinDecisionEvidenceContract('MINING_CLAIM_STATUS');
    expect(
      evaluateDecisionEvidenceContract(
        claims,
        [
          bundle({
            domain: 'MINING_CLAIM',
            purpose: 'OTHER',
            coverage: { record: 'PARTIAL', resultCount: 0 },
          }),
        ],
        context({ claimAbsence: 'NOT_APPLICABLE' })
      ).completeness
    ).toBe('INCOMPLETE');
    const absence = evaluateDecisionEvidenceContract(
      claims,
      [
        bundle({
          domain: 'MINING_CLAIM',
          purpose: 'ABSENCE_INFERENCE',
          role: 'DISCOVERY',
          coverage: { record: 'PARTIAL', resultCount: 0 },
          adapterStatus: 'SUCCESS',
        }),
      ],
      context({ claimAbsence: 'APPLICABLE' })
    );
    expect(absence.completeness).toBe('INCOMPLETE');
    expect(
      evaluateDecisionEvidenceContract(
        claims,
        [bundle({ domain: 'MINING_CLAIM', purpose: 'OTHER' })],
        context({ claimAbsence: 'NOT_APPLICABLE' })
      ).completeness
    ).toBe('COMPLETE');

    expect(
      evaluateDecisionEvidenceContract(
        builtinDecisionEvidenceContract('LAND_OWNERSHIP_STATUS'),
        [bundle({ domain: 'LAND_MANAGEMENT', purpose: 'OTHER' })],
        context()
      ).completeness
    ).toBe('INCOMPLETE');
    expect(
      evaluateDecisionEvidenceContract(
        builtinDecisionEvidenceContract('LAND_MANAGEMENT_STATUS'),
        [bundle({ domain: 'LAND_OWNERSHIP', purpose: 'OTHER' })],
        context()
      ).completeness
    ).toBe('INCOMPLETE');

    const specimen = builtinDecisionEvidenceContract('SPECIMEN_IDENTIFICATION');
    expect(
      evaluateDecisionEvidenceContract(
        specimen,
        [
          bundle({
            domain: 'FIELD_OBSERVATION',
            purpose: 'SPECIMEN_IDENTIFICATION',
            role: 'CORROBORATING',
            authority: 'USER_OBSERVATION',
            provenance: 'BASIC',
          }),
        ],
        context()
      ).completeness
    ).toBe('COMPLETE');
    expect(
      evaluateDecisionEvidenceContract(
        builtinDecisionEvidenceContract('COLLECTION_PERMISSION'),
        [
          bundle({
            id: 'sample',
            domain: 'SPECIMEN_IDENTIFICATION',
            purpose: 'SPECIMEN_IDENTIFICATION',
            provenance: 'FULL',
            kind: 'sample',
          }),
        ],
        context({ miningClaim: 'NOT_APPLICABLE', mineralEstate: 'NOT_APPLICABLE' })
      ).completeness
    ).toBe('INCOMPLETE');
  });

  it('uses admission receipts, groups, applicability, independence, and future target time', () => {
    const one = requirement({
      id: 'rule',
      domain: 'COLLECTION_RULE',
      purpose: 'COLLECTION_PERMISSION',
    });
    const grouped = contractFrom(
      [one],
      [{ id: 'all', cardinality: 'ALL_OF', requirementIds: ['rule'] }]
    );
    expect(
      evaluateDecisionEvidenceContract(
        grouped,
        [
          bundle({
            domain: 'COLLECTION_RULE',
            purpose: 'COLLECTION_PERMISSION',
            decision: 'REJECTED',
          }),
        ],
        context()
      ).completeness
    ).toBe('INCOMPLETE');
    expect(
      evaluateDecisionEvidenceContract(
        grouped,
        [
          bundle({
            domain: 'COLLECTION_RULE',
            purpose: 'COLLECTION_PERMISSION',
            decision: 'QUARANTINED',
          }),
        ],
        context()
      ).requirements[0]?.status
    ).toBe('QUARANTINED');
    expect(
      evaluateDecisionEvidenceContract(
        grouped,
        [
          bundle({
            domain: 'COLLECTION_RULE',
            purpose: 'COLLECTION_PERMISSION',
            adapterStatus: 'SUCCESS',
            decision: 'REJECTED',
          }),
        ],
        context()
      ).completeness
    ).toBe('INCOMPLETE');
    expect(
      evaluateDecisionEvidenceContract(
        grouped,
        [
          bundle({
            domain: 'COLLECTION_RULE',
            purpose: 'GEOLOGICAL_CONTEXT',
            adapterStatus: 'SUCCESS',
          }),
        ],
        context()
      ).completeness
    ).toBe('INCOMPLETE');

    const left = requirement({
      id: 'left',
      domain: 'GEOLOGY',
      purpose: 'GEOLOGICAL_CONTEXT',
      temporalRequirement: 'HISTORICAL_ACCEPTABLE',
    });
    const right = requirement({
      id: 'right',
      domain: 'MINERAL_OCCURRENCE',
      purpose: 'GEOLOGICAL_CONTEXT',
      temporalRequirement: 'HISTORICAL_ACCEPTABLE',
    });
    const anyOf = contractFrom(
      [left, right],
      [{ id: 'either', cardinality: 'ANY_OF', requirementIds: ['left', 'right'] }]
    );
    expect(
      evaluateDecisionEvidenceContract(
        anyOf,
        [bundle({ domain: 'GEOLOGY', purpose: 'GEOLOGICAL_CONTEXT', fitness: 'NOT_FIT' })],
        context()
      ).completeness
    ).toBe('COMPLETE');
    const three = [
      requirement({
        id: 'a',
        domain: 'GEOLOGY',
        purpose: 'GEOLOGICAL_CONTEXT',
        temporalRequirement: 'HISTORICAL_ACCEPTABLE',
      }),
      requirement({
        id: 'b',
        domain: 'MINERAL_OCCURRENCE',
        purpose: 'GEOLOGICAL_CONTEXT',
        temporalRequirement: 'HISTORICAL_ACCEPTABLE',
      }),
      requirement({
        id: 'c',
        domain: 'FIELD_OBSERVATION',
        purpose: 'GEOLOGICAL_CONTEXT',
        temporalRequirement: 'HISTORICAL_ACCEPTABLE',
        minimumAuthority: 'USER_OBSERVATION',
        allowedEvidenceRoles: ['CORROBORATING', 'DECISION', 'AUTHORITATIVE_DECISION'],
      }),
    ];
    const atLeast = contractFrom(three, [
      { id: 'n', cardinality: 'AT_LEAST_N_OF', minimumCount: 2, requirementIds: ['a', 'b', 'c'] },
    ]);
    expect(
      evaluateDecisionEvidenceContract(
        atLeast,
        [bundle({ id: 'only-a', domain: 'GEOLOGY', purpose: 'GEOLOGICAL_CONTEXT' })],
        context()
      ).completeness
    ).toBe('INCOMPLETE');
    const optional = requirement({
      id: 'extra',
      domain: 'WEATHER',
      purpose: 'SAFETY_DECISION',
      optional: true,
      minimumAuthority: 'SECONDARY_AUTHORITY',
    });
    const withOptional = contractFrom(
      [left, optional],
      [{ id: 'all', cardinality: 'ALL_OF', requirementIds: ['left', 'extra'] }]
    );
    expect(
      evaluateDecisionEvidenceContract(
        withOptional,
        [bundle({ domain: 'GEOLOGY', purpose: 'GEOLOGICAL_CONTEXT', fitness: 'NOT_FIT' })],
        context()
      ).completeness
    ).toBe('COMPLETE');

    const conditional = requirement({
      id: 'claim',
      domain: 'MINING_CLAIM',
      purpose: 'OTHER',
      applicability: { mode: 'CONTEXT', key: 'miningClaim' },
    });
    const conditionalContract = contractFrom(
      [conditional],
      [{ id: 'all', cardinality: 'ALL_OF', requirementIds: ['claim'] }]
    );
    expect(
      evaluateDecisionEvidenceContract(
        conditionalContract,
        [],
        context({ miningClaim: 'NOT_APPLICABLE' })
      ).completeness
    ).toBe('NOT_APPLICABLE');
    expect(
      evaluateDecisionEvidenceContract(
        conditionalContract,
        [],
        context({ miningClaim: 'UNRESOLVED' })
      ).completeness
    ).toBe('UNRESOLVED');
    expect(evaluateDecisionEvidenceContract(conditionalContract, [], context()).completeness).toBe(
      'UNRESOLVED'
    );
    expect(
      evaluateDecisionEvidenceContract(
        conditionalContract,
        [bundle({ domain: 'MINING_CLAIM', purpose: 'OTHER' })],
        context({ miningClaim: 'APPLICABLE' })
      ).completeness
    ).toBe('COMPLETE');

    const independent = requirement({
      id: 'rule',
      domain: 'COLLECTION_RULE',
      purpose: 'COLLECTION_PERMISSION',
      independenceMinimum: 2,
      requiredCount: 1,
    });
    const independenceContract = contractFrom(
      [independent],
      [{ id: 'all', cardinality: 'ALL_OF', requirementIds: ['rule'] }]
    );
    expect(
      evaluateDecisionEvidenceContract(
        independenceContract,
        [
          bundle({
            id: 'a',
            domain: 'COLLECTION_RULE',
            purpose: 'COLLECTION_PERMISSION',
            lineage: ['gov-a'],
          }),
          bundle({
            id: 'b',
            domain: 'COLLECTION_RULE',
            purpose: 'COLLECTION_PERMISSION',
            lineage: ['gov-b'],
          }),
        ],
        context()
      ).completeness
    ).toBe('COMPLETE');
    const copies = evaluateDecisionEvidenceContract(
      independenceContract,
      ['article-1', 'article-2', 'article-3'].map((id) =>
        bundle({
          id,
          domain: 'COLLECTION_RULE',
          purpose: 'COLLECTION_PERMISSION',
          lineage: ['gov-report'],
        })
      ),
      context()
    );
    expect(copies.completeness).toBe('INCOMPLETE');
    expect(copies.gaps.some((gap) => gap.reason === 'INDEPENDENCE_INSUFFICIENT')).toBe(true);
    expect(
      evaluateDecisionEvidenceContract(
        independenceContract,
        [bundle({ domain: 'COLLECTION_RULE', purpose: 'COLLECTION_PERMISSION', lineage: [] })],
        context()
      ).gaps.some((gap) => gap.reason === 'INDEPENDENCE_INSUFFICIENT')
    ).toBe(true);

    const conflictContract = contractFrom(
      [
        requirement({
          id: 'rule',
          domain: 'COLLECTION_RULE',
          purpose: 'COLLECTION_PERMISSION',
          contradictionPolicy: 'ALLOW_CONFLICT',
        }),
      ],
      [{ id: 'all', cardinality: 'ALL_OF', requirementIds: ['rule'] }]
    );
    expect(
      evaluateDecisionEvidenceContract(
        conflictContract,
        [
          bundle({
            domain: 'COLLECTION_RULE',
            purpose: 'COLLECTION_PERMISSION',
            contradiction: 'UNRESOLVED',
          }),
        ],
        context()
      ).completeness
    ).toBe('COMPLETE_WITH_LIMITATIONS');

    const future = evaluateDecisionEvidenceContract(
      grouped,
      [bundle({ domain: 'COLLECTION_RULE', purpose: 'COLLECTION_PERMISSION' })],
      { ...context(), targetDecisionTime: '2026-09-26T15:00:00.000Z' }
    );
    expect(future.completeness).toBe('REVALIDATION_REQUIRED');
    const historical = contractFrom(
      [
        requirement({
          id: 'geology',
          domain: 'GEOLOGY',
          purpose: 'GEOLOGICAL_CONTEXT',
          temporalRequirement: 'HISTORICAL_ACCEPTABLE',
        }),
      ],
      [{ id: 'all', cardinality: 'ALL_OF', requirementIds: ['geology'] }]
    );
    expect(
      evaluateDecisionEvidenceContract(
        historical,
        [
          bundle({
            domain: 'GEOLOGY',
            purpose: 'GEOLOGICAL_CONTEXT',
            fitness: 'NOT_FIT',
            freshness: 'STALE',
          }),
        ],
        context()
      ).completeness
    ).toBe('COMPLETE');

    const gapResult = evaluateDecisionEvidenceContract(grouped, [], context());
    expect(gapResult.gaps).toEqual([
      expect.objectContaining({
        requirementId: 'rule',
        reason: 'MISSING_REQUIRED_DOMAIN',
        blocking: true,
      }),
    ]);
    const again = evaluateDecisionEvidenceContract(grouped, [], context());
    expect(again.gaps).toEqual(gapResult.gaps);
  });

  it('reports field-visit readiness as evidence completeness and keeps the registry stable', () => {
    const visit = builtinDecisionEvidenceContract('FIELD_VISIT_READINESS');
    expect(visit.decisionClass).toBe('FIELD_VISIT_READINESS');
    const ready = evaluateDecisionEvidenceContract(
      visit,
      [
        bundle({ domain: 'ROAD_TRAIL_ACCESS', purpose: 'SITE_ACCESS' }),
        bundle({ domain: 'CLOSURE', purpose: 'SITE_ACCESS' }),
        bundle({ domain: 'SAFETY', purpose: 'SAFETY_DECISION' }),
        bundle({
          domain: 'GEOLOGY',
          purpose: 'GEOLOGICAL_CONTEXT',
          fitness: 'NOT_FIT',
          freshness: 'STALE',
        }),
      ],
      context()
    );
    expect(ready.completeness).toBe('COMPLETE');
    expect(JSON.stringify(ready)).not.toMatch(/"GO"|"NO_GO"/);

    const registry = validateBuildingBlockRegistry(BUILTIN_BUILDING_BLOCK_DEFINITIONS);
    const block = getLatestStableBuildingBlock(registry, DECISION_EVIDENCE_CONTRACT_BLOCK_ID);
    expect(block?.lifecycleStatus).toBe(BuildingBlockLifecycleStatus.STABLE);
    expect(block?.version).toEqual(VERSION);
    expect(getLatestStableBuildingBlock(registry, EVIDENCE_ADMISSION_BLOCK_ID)?.version).toEqual(
      VERSION
    );
    expect(getLatestStableBuildingBlock(registry, UGES_BLOCK_ID)?.version).toEqual({
      major: 1,
      minor: 1,
      patch: 0,
    });
    for (const id of [
      GEOLOGICAL_LAYER_REGISTRY_BLOCK_ID,
      RESOURCE_CATALOG_BLOCK_ID,
      SOURCE_GOVERNANCE_BLOCK_ID,
      OBSERVATION_BLOCK_ID,
      SAMPLE_BLOCK_ID,
      SAMPLING_EVENT_BLOCK_ID,
      PROVENANCE_ACTIVITY_BLOCK_ID,
      TRUTH_CLOCK_BLOCK_ID,
      SOURCE_ADAPTER_CONTRACT_BLOCK_ID,
      EVIDENCE_QUARANTINE_BLOCK_ID,
    ]) {
      expect(getLatestStableBuildingBlock(registry, id)?.version).toEqual(VERSION);
    }
    expect(
      listBuildingBlocksByCategory(registry, 'DECISION_MODEL').every(
        (item) => item.lifecycleStatus !== BuildingBlockLifecycleStatus.STABLE
      )
    ).toBe(true);
    expect(
      registry
        .listBuildingBlocks()
        .some(
          (item) => item.id === 'rockhounding:decision-snapshot' && item.lifecycleStatus === 'DRAFT'
        )
    ).toBe(true);
    const doc = readFileSync(
      resolve(__dirname, '../../../docs/FIELD_PLATFORM_COORDINATOR.md'),
      'utf8'
    );
    expect(doc).toContain('ROCKHOUNDING_DECISION_EVIDENCE_CONTRACTS_R1');
    expect(doc).toContain('ROCKHOUNDING_DECISION_SNAPSHOT_R1');
    expect(doc).toContain('Live ingestion stays closed');
    expect(doc).toContain('.cursor/');
    expect(doc).toContain('ROCKHOUNDING_OFFLINE_FIXTURE_ADAPTERS_R1');
    expect(doc).toContain('ROCKHOUNDING_EVIDENCE_QUARANTINE_R1');
  });
});
