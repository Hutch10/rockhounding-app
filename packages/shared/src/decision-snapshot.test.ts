import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BuildingBlockLifecycleStatus,
  BUILTIN_BUILDING_BLOCK_DEFINITIONS,
  DECISION_EVIDENCE_CONTRACT_BLOCK_ID,
  DECISION_SNAPSHOT_BLOCK_ID,
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
  listBuildingBlocksByLifecycle,
  validateBuildingBlockRegistry,
} from './building-block-registry';
import {
  builtinDecisionEvidenceContract,
  evaluateDecisionEvidenceContract,
  type DecisionEvidenceBundle,
  type DecisionEvidenceContext,
  type DecisionEvidenceEvaluation,
} from './decision-evidence-contracts';
import {
  DECISION_SNAPSHOT_HASH_SCOPE,
  createDecisionSnapshot,
  decisionSnapshotEmitsOutcome,
  decisionSnapshotHashIsSignature,
  decisionSnapshotManufacturesUpstreamProvenance,
  describeDecisionReanalysis,
  validateDecisionSnapshot,
} from './decision-snapshot';
import type { EvidenceAdmissionReceipt } from './evidence-admission';
import type { EvidenceDomain, EvidencePurpose } from './evidence-admission';

const WHEN = '2026-09-22T18:00:00.000Z';
const CREATED = '2026-09-22T18:05:00.000Z';
const VERSION = { major: 1, minor: 0, patch: 0 };

function bundle(input: {
  id?: string;
  domain: EvidenceDomain;
  purpose: EvidencePurpose;
  role?: EvidenceAdmissionReceipt['evidenceRole'];
  decision?: EvidenceAdmissionReceipt['decision'];
  fitness?: DecisionEvidenceBundle['candidate']['temporal']['fitness'];
  contradiction?: DecisionEvidenceBundle['candidate']['contradiction']['state'];
  limitations?: string[];
}): DecisionEvidenceBundle {
  const id = input.id ?? `${input.domain}-1`;
  const role = input.role ?? 'AUTHORITATIVE_DECISION';
  const policyId = `policy-${input.domain}`;
  const candidate: DecisionEvidenceBundle['candidate'] = {
    id,
    kind: 'record',
    role,
    supportedPurposes: [input.purpose],
    authority: [{ domain: input.domain, authorityClass: 'PRIMARY_AUTHORITY' }],
    temporal: { fitness: input.fitness ?? 'FIT', freshness: 'CURRENT' },
    coverage: { record: 'COMPLETE', geometry: 'COMPLETE', temporal: 'COMPLETE', resultCount: 1 },
    quarantine: { state: 'NONE', disposition: 'NONE' },
    provenance: { state: 'SOURCE_TRACEABLE' },
    governance: { decision: 'ALLOWED' },
    independence: { upstreamLineageIds: [`lineage-${id}`] },
    contradiction: { state: input.contradiction ?? 'NONE' },
    availability: 'AVAILABLE',
  };
  const receipt: EvidenceAdmissionReceipt = {
    requestId: `receipt-${id}`,
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
    authorityState: 'PRIMARY_AUTHORITY',
    independenceState: 'INDEPENDENT',
    contradictionState: candidate.contradiction.state,
    limitations: input.limitations ?? [],
    purposeFitness: 'FIT',
  };
  return { candidate, receipt, policy: { policyId, version: VERSION } };
}

function evaluation(
  overrides: Partial<DecisionEvidenceEvaluation> = {}
): DecisionEvidenceEvaluation {
  return {
    contractId: 'rockhounding:decision-evidence:test',
    contractVersion: VERSION,
    decisionClass: 'OTHER',
    completeness: 'COMPLETE',
    requirements: [{ requirementId: 'rule', status: 'SATISFIED', gaps: [] }],
    gaps: [],
    limitations: [],
    ...overrides,
  };
}

function context(
  overrides: Partial<DecisionEvidenceContext> & {
    targetLocationRef?: string;
    targetRouteRef?: string;
    targetSampleRef?: string;
    decisionPurpose?: string;
    contextParameters?: Array<{ key: string; value: string }>;
  } = {}
): DecisionEvidenceContext & {
  targetLocationRef?: string;
  targetRouteRef?: string;
  targetSampleRef?: string;
  decisionPurpose?: string;
  contextParameters?: Array<{ key: string; value: string }>;
} {
  return { evaluatedAt: WHEN, applicability: {}, ...overrides };
}

async function snap(
  overrides: {
    id?: string;
    evaluation?: DecisionEvidenceEvaluation;
    bundles?: DecisionEvidenceBundle[];
    context?: ReturnType<typeof context>;
    createdAt?: string;
    softwareVersion?: string;
    supersession?: { supersedesSnapshotId: string; reason: string; createdAt: string };
    reanalysisOfSnapshotId?: string;
    provenanceActivityId?: string;
  } = {}
) {
  const nextEvaluation = overrides.evaluation ?? evaluation();
  return createDecisionSnapshot({
    id: overrides.id ?? 'snapshot-1',
    createdAt: overrides.createdAt ?? CREATED,
    decisionClass: nextEvaluation.decisionClass,
    evaluation: nextEvaluation,
    bundles: overrides.bundles ?? [bundle({ domain: 'COLLECTION_RULE', purpose: 'OTHER' })],
    context: overrides.context ?? context(),
    provenanceActivityId: overrides.provenanceActivityId ?? 'activity-snapshot-1',
    softwareVersion: overrides.softwareVersion,
    supersession: overrides.supersession,
    reanalysisOfSnapshotId: overrides.reanalysisOfSnapshotId,
  });
}

describe('decision snapshot', () => {
  it('freezes an exact contract version and rejects a latest alias', async () => {
    const bundles = [bundle({ domain: 'COLLECTION_RULE', purpose: 'OTHER' })];
    const before = structuredClone(bundles);
    const created = await snap({ bundles });
    expect(created.id).toBe('snapshot-1');
    expect(created.schemaVersion).toBe(1);
    expect(created.contract.contractVersion).toEqual(VERSION);
    expect(created.contract.decisionClass).toBe('OTHER');
    expect(bundles).toEqual(before);
    expect(Object.isFrozen(created)).toBe(true);
    expect(() => {
      (created.contract.contractVersion as { major: number }).major = 2;
    }).toThrow();
    await expect(
      createDecisionSnapshot({
        id: 'bad',
        createdAt: CREATED,
        evaluation: evaluation({ contractVersion: 'latest' as unknown as typeof VERSION }),
        bundles,
        context: context(),
        provenanceActivityId: 'activity-bad',
      })
    ).rejects.toThrow();
    await expect(
      createDecisionSnapshot({
        id: 'mismatch',
        createdAt: CREATED,
        decisionClass: 'OTHER',
        evaluation: evaluation({ decisionClass: 'SITE_ACCESS' }),
        bundles: [bundle({ domain: 'COLLECTION_RULE', purpose: 'OTHER' })],
        context: context(),
        provenanceActivityId: 'activity-mismatch',
      })
    ).rejects.toThrow(/decision class/);
  });

  it('preserves context, evidence refs, completeness, gaps, and contradictions', async () => {
    const created = await snap({
      context: context({
        targetLocationRef: 'site-ref-1',
        targetRouteRef: 'route-ref-1',
        targetSampleRef: 'sample-ref-1',
        targetDecisionTime: '2026-09-26T15:00:00.000Z',
        decisionPurpose: 'FIELD_VISIT_READINESS',
        applicability: { miningClaim: 'NOT_APPLICABLE' },
      }),
      evaluation: evaluation({
        completeness: 'INCOMPLETE',
        gaps: [
          { requirementId: 'closure', reason: 'TEMPORAL_NOT_FIT', blocking: false },
          { requirementId: 'rule', reason: 'MISSING_REQUIRED_DOMAIN', blocking: true },
        ],
        limitations: ['provisional notice'],
        requirements: [
          { requirementId: 'rule', status: 'MISSING', gaps: ['MISSING_REQUIRED_DOMAIN'] },
        ],
      }),
      bundles: [
        bundle({ id: 'b', domain: 'CLOSURE', purpose: 'OTHER', contradiction: 'UNRESOLVED' }),
        bundle({ id: 'a', domain: 'COLLECTION_RULE', purpose: 'OTHER' }),
      ],
    });
    expect(created.context.targetLocationRef).toBe('site-ref-1');
    expect(created.context.targetRouteRef).toBe('route-ref-1');
    expect(created.context.targetSampleRef).toBe('sample-ref-1');
    expect(created.context.targetDecisionTime).toBe('2026-09-26T15:00:00.000Z');
    expect(created.temporal.evaluatedAt).toBe(WHEN);
    expect(created.temporal.targetDecisionTime).toBe('2026-09-26T15:00:00.000Z');
    expect(created.context.applicability.miningClaim).toBe('NOT_APPLICABLE');
    expect(created.evidence.map((item) => item.candidateId)).toEqual(['a', 'b']);
    expect(created.evidence[0]?.admissionReceiptId).toBe('receipt-a');
    expect(created.evidence[0]?.admissionPolicyId).toBe('policy-COLLECTION_RULE');
    expect(created.evidence[0]?.admissionPolicyVersion).toEqual(VERSION);
    expect(created.completeness.status).toBe('INCOMPLETE');
    expect(created.completeness.limitations).toEqual(['provisional notice']);
    expect(created.gaps.map((gap) => gap.reason)).toEqual([
      'TEMPORAL_NOT_FIT',
      'MISSING_REQUIRED_DOMAIN',
    ]);
    expect(
      created.gaps.some((gap) => gap.blocking && gap.reason === 'MISSING_REQUIRED_DOMAIN')
    ).toBe(true);
    expect(created.contradictions).toHaveLength(1);
    expect(created.contradictions[0]?.resolutionState).toBe('UNRESOLVED');
    expect(JSON.stringify(created.contradictions)).not.toMatch(/preferredSource|winner/);
    expect(() => {
      created.evidence.push(created.evidence[0]!);
    }).toThrow();
    expect(() => {
      created.gaps.push(created.gaps[0]!);
    }).toThrow();
  });

  it('keeps completeness states and historical time without an outcome', async () => {
    for (const status of [
      'COMPLETE',
      'COMPLETE_WITH_LIMITATIONS',
      'CONFLICTED',
      'REVALIDATION_REQUIRED',
    ] as const) {
      const created = await snap({
        id: `snap-${status}`,
        evaluation: evaluation({ completeness: status }),
      });
      expect(created.completeness.status).toBe(status);
    }
    const historical = await snap({
      bundles: [bundle({ domain: 'GEOLOGY', purpose: 'GEOLOGICAL_CONTEXT', fitness: 'NOT_FIT' })],
      evaluation: evaluation({
        decisionClass: 'GEOLOGICAL_CONTEXT',
        contractId: 'rockhounding:decision-evidence:geological-context',
      }),
    });
    const later = await snap({
      id: 'later',
      createdAt: '2026-10-01T12:00:00.000Z',
      context: context(),
      bundles: [bundle({ domain: 'GEOLOGY', purpose: 'GEOLOGICAL_CONTEXT', fitness: 'FIT' })],
      evaluation: evaluation({
        decisionClass: 'GEOLOGICAL_CONTEXT',
        contractId: 'rockhounding:decision-evidence:geological-context',
      }),
    });
    expect(historical.temporal.evidenceTemporal[0]?.fitness).toBe('NOT_FIT');
    expect(historical.temporal.evidenceTemporal[0]?.fitness).not.toBe(
      later.temporal.evidenceTemporal[0]?.fitness
    );
    expect(decisionSnapshotEmitsOutcome()).toBe(false);
    expect(JSON.stringify(historical)).not.toMatch(
      /"ALLOWED"|"PROHIBITED"|"SAFE"|"UNSAFE"|"OPEN"|"CLOSED"|"GO"|"NO_GO"/
    );
    const source = readFileSync(new URL('./decision-snapshot.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/\b(ALLOWED|PROHIBITED|SAFE|UNSAFE|NO_GO)\b/);
    expect(source).not.toMatch(/\bevaluateFreshness\b|\bDate\.now\(/);
  });

  it('supports supersession, replay, and reanalysis without rewriting history', async () => {
    const original = await snap();
    const before = structuredClone(original);
    const next = await snap({
      id: 'snapshot-2',
      provenanceActivityId: 'activity-snapshot-2',
      supersession: {
        supersedesSnapshotId: original.id,
        reason: 'closure evidence was refreshed',
        createdAt: '2026-09-23T12:00:00.000Z',
      },
    });
    expect(next.supersession?.supersedesSnapshotId).toBe(original.id);
    expect(next.supersession?.reason).toBe('closure evidence was refreshed');
    expect(original).toEqual(before);
    await expect(
      snap({
        supersession: {
          supersedesSnapshotId: 'snapshot-1',
          reason: 'self',
          createdAt: CREATED,
        },
      })
    ).rejects.toThrow(/itself/);
    expect(next.replay.kind).toBe('REPLAY');
    expect(next.replay.contractVersion).toEqual(VERSION);
    expect(next.replay.admissionPolicies[0]?.version).toEqual(VERSION);
    expect(next.replay.evidenceIds).toEqual(['COLLECTION_RULE-1']);
    expect(next.replay.receiptIds).toEqual(['receipt-COLLECTION_RULE-1']);
    expect(next.replay.schemaVersion).toBe(1);
    expect(next.replay.provenanceActivityId).toBe('activity-snapshot-2');
    const again = await snap();
    expect(again.replay).toEqual(original.replay);
    const reanalysis = describeDecisionReanalysis(original.id);
    expect(reanalysis.kind).toBe('REANALYSIS');
    expect(reanalysis.priorSnapshotId).toBe(original.id);
    expect(reanalysis.kind).not.toBe(original.replay.kind);
    expect(original).toEqual(before);
    expect(original.provenance.activityId).toBe('activity-snapshot-1');
    expect(decisionSnapshotManufacturesUpstreamProvenance()).toBe(false);
    expect(original.provenance.upstreamProvenanceIds).toEqual([]);
  });

  it('hashes canonical content and ignores presentation order', async () => {
    const firstBundles = [
      bundle({ id: 'a', domain: 'COLLECTION_RULE', purpose: 'OTHER' }),
      bundle({ id: 'b', domain: 'CLOSURE', purpose: 'OTHER' }),
    ];
    const secondBundles = [...firstBundles].reverse();
    const left = await snap({
      id: 'hash-a',
      bundles: firstBundles,
      provenanceActivityId: 'activity-hash',
    });
    const right = await snap({
      id: 'hash-b',
      bundles: secondBundles,
      provenanceActivityId: 'activity-hash',
    });
    expect(left.hash.scope).toBe(DECISION_SNAPSHOT_HASH_SCOPE);
    expect(left.hash.algorithm).toBe('SHA-256');
    expect(left.hash.value).toBe(right.hash.value);
    expect(decisionSnapshotHashIsSignature()).toBe(false);
    const changedVersion = await snap({
      id: 'hash-c',
      bundles: firstBundles,
      provenanceActivityId: 'activity-hash',
      evaluation: evaluation({ contractVersion: { major: 1, minor: 1, patch: 0 } }),
    });
    expect(changedVersion.hash.value).not.toBe(left.hash.value);
    expect(changedVersion.contract.contractVersion).toEqual({ major: 1, minor: 1, patch: 0 });
    expect(left.contract.contractVersion).toEqual(VERSION);
    const changedEvidence = await snap({
      id: 'hash-d',
      provenanceActivityId: 'activity-hash',
      bundles: [bundle({ id: 'c', domain: 'COLLECTION_RULE', purpose: 'OTHER' })],
    });
    expect(changedEvidence.hash.value).not.toBe(left.hash.value);
    const changedGap = await snap({
      id: 'hash-e',
      bundles: firstBundles,
      provenanceActivityId: 'activity-hash',
      evaluation: evaluation({
        completeness: 'INCOMPLETE',
        gaps: [{ requirementId: 'rule', reason: 'MISSING_REQUIRED_DOMAIN', blocking: true }],
      }),
    });
    expect(changedGap.hash.value).not.toBe(left.hash.value);
    const newerSoftware = await snap({
      id: 'hash-f',
      bundles: firstBundles,
      provenanceActivityId: 'activity-hash',
      softwareVersion: '2.0.0',
    });
    expect(newerSoftware.hash.value).toBe(left.hash.value);
    expect(newerSoftware.replay.softwareVersion).toBe('2.0.0');
    expect(left.replay.softwareVersion).toBeUndefined();
    const tampered = structuredClone(left);
    tampered.hash = { ...tampered.hash, value: '0'.repeat(64) };
    await expect(validateDecisionSnapshot(tampered)).rejects.toThrow(/hash/);
  });

  it('snapshots collection permission, field visit, and geological context from contract evaluations', async () => {
    const permission = builtinDecisionEvidenceContract('COLLECTION_PERMISSION');
    const permissionBundles = [
      bundle({ id: 'land', domain: 'LAND_MANAGEMENT', purpose: 'COLLECTION_PERMISSION' }),
      bundle({ id: 'rule', domain: 'COLLECTION_RULE', purpose: 'COLLECTION_PERMISSION' }),
      bundle({ id: 'closure', domain: 'CLOSURE', purpose: 'COLLECTION_PERMISSION' }),
    ];
    const permissionContext = {
      evaluatedAt: WHEN,
      applicability: {
        miningClaim: 'NOT_APPLICABLE' as const,
        mineralEstate: 'NOT_APPLICABLE' as const,
      },
      targetDecisionTime: '2026-09-26T15:00:00.000Z',
    };
    const permissionEval = evaluateDecisionEvidenceContract(
      permission,
      permissionBundles,
      permissionContext
    );
    const permissionSnap = await createDecisionSnapshot({
      id: 'collection-snap',
      createdAt: CREATED,
      decisionClass: permissionEval.decisionClass,
      evaluation: permissionEval,
      bundles: permissionBundles,
      context: permissionContext,
      provenanceActivityId: 'activity-collection',
    });
    expect(permissionSnap.completeness.status).toBe('REVALIDATION_REQUIRED');
    expect(permissionSnap.context.applicability.miningClaim).toBe('NOT_APPLICABLE');
    expect(JSON.stringify(permissionSnap)).not.toMatch(/"ALLOWED"|"PROHIBITED"/);

    const missing = evaluateDecisionEvidenceContract(
      permission,
      permissionBundles.filter((item) => item.candidate.id !== 'rule'),
      {
        evaluatedAt: WHEN,
        applicability: { miningClaim: 'NOT_APPLICABLE', mineralEstate: 'NOT_APPLICABLE' },
      }
    );
    const missingSnap = await createDecisionSnapshot({
      id: 'collection-gap',
      createdAt: CREATED,
      decisionClass: missing.decisionClass,
      evaluation: missing,
      bundles: permissionBundles.filter((item) => item.candidate.id !== 'rule'),
      context: context({
        applicability: { miningClaim: 'NOT_APPLICABLE', mineralEstate: 'NOT_APPLICABLE' },
      }),
      provenanceActivityId: 'activity-collection-gap',
    });
    expect(missingSnap.completeness.status).toBe('INCOMPLETE');
    expect(missingSnap.gaps.some((gap) => gap.reason === 'MISSING_REQUIRED_DOMAIN')).toBe(true);

    const visit = builtinDecisionEvidenceContract('FIELD_VISIT_READINESS');
    const visitBundles = [
      bundle({ id: 'road', domain: 'ROAD_TRAIL_ACCESS', purpose: 'SITE_ACCESS' }),
      bundle({ id: 'closure', domain: 'CLOSURE', purpose: 'SITE_ACCESS' }),
      bundle({ id: 'safety', domain: 'SAFETY', purpose: 'SAFETY_DECISION' }),
      bundle({
        id: 'geology',
        domain: 'GEOLOGY',
        purpose: 'GEOLOGICAL_CONTEXT',
        fitness: 'NOT_FIT',
      }),
    ];
    const visitEval = evaluateDecisionEvidenceContract(visit, visitBundles, {
      evaluatedAt: WHEN,
      applicability: {},
    });
    const visitSnap = await createDecisionSnapshot({
      id: 'visit-snap',
      createdAt: CREATED,
      decisionClass: visitEval.decisionClass,
      evaluation: visitEval,
      bundles: visitBundles,
      context: context(),
      provenanceActivityId: 'activity-visit',
    });
    expect(visitSnap.completeness.status).toBe('COMPLETE');
    expect(JSON.stringify(visitSnap)).not.toMatch(/"GO"|"NO_GO"/);

    const geology = builtinDecisionEvidenceContract('GEOLOGICAL_CONTEXT');
    const oldMap = [
      bundle({ id: 'map', domain: 'GEOLOGY', purpose: 'GEOLOGICAL_CONTEXT', fitness: 'NOT_FIT' }),
    ];
    const geologyEval = evaluateDecisionEvidenceContract(geology, oldMap, {
      evaluatedAt: WHEN,
      applicability: {},
    });
    const geologySnap = await createDecisionSnapshot({
      id: 'geology-snap',
      createdAt: CREATED,
      decisionClass: geologyEval.decisionClass,
      evaluation: geologyEval,
      bundles: oldMap,
      context: context(),
      provenanceActivityId: 'activity-geology',
    });
    const frozenFitness = geologySnap.temporal.evidenceTemporal[0]?.fitness;
    const laterEvaluation = evaluateDecisionEvidenceContract(
      geology,
      [bundle({ id: 'map-2', domain: 'GEOLOGY', purpose: 'GEOLOGICAL_CONTEXT', fitness: 'FIT' })],
      { evaluatedAt: '2026-10-01T12:00:00.000Z', applicability: {} }
    );
    const newer = await createDecisionSnapshot({
      id: 'geology-later',
      createdAt: '2026-10-01T12:00:00.000Z',
      decisionClass: laterEvaluation.decisionClass,
      evaluation: laterEvaluation,
      bundles: [
        bundle({ id: 'map-2', domain: 'GEOLOGY', purpose: 'GEOLOGICAL_CONTEXT', fitness: 'FIT' }),
      ],
      context: { evaluatedAt: '2026-10-01T12:00:00.000Z', applicability: {} },
      provenanceActivityId: 'activity-geology-later',
    });
    expect(geologySnap.completeness.status).toBe('COMPLETE');
    expect(geologySnap.temporal.evidenceTemporal[0]?.fitness).toBe(frozenFitness);
    expect(newer.id).not.toBe(geologySnap.id);
  });

  it('promotes the snapshot block without moving other contracts', async () => {
    const registry = validateBuildingBlockRegistry(BUILTIN_BUILDING_BLOCK_DEFINITIONS);
    const block = getLatestStableBuildingBlock(registry, DECISION_SNAPSHOT_BLOCK_ID);
    expect(block?.lifecycleStatus).toBe(BuildingBlockLifecycleStatus.STABLE);
    expect(block?.version).toEqual(VERSION);
    expect(
      listBuildingBlocksByLifecycle(registry, BuildingBlockLifecycleStatus.DRAFT).some(
        (item) =>
          item.id === DECISION_SNAPSHOT_BLOCK_ID &&
          item.version.patch === 0 &&
          item.version.major === 0
      )
    ).toBe(true);
    expect(
      getLatestStableBuildingBlock(registry, DECISION_EVIDENCE_CONTRACT_BLOCK_ID)?.version
    ).toEqual(VERSION);
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
      listBuildingBlocksByCategory(registry, 'AVAILABILITY_MODEL').every(
        (item) => item.lifecycleStatus !== BuildingBlockLifecycleStatus.STABLE
      )
    ).toBe(true);
    const doc = readFileSync(
      resolve(__dirname, '../../../docs/FIELD_PLATFORM_COORDINATOR.md'),
      'utf8'
    );
    expect(doc).toContain('ROCKHOUNDING_DECISION_EVIDENCE_CONTRACTS_R1');
    expect(doc).toContain('CLOSED');
    expect(doc).toContain('ROCKHOUNDING_DECISION_SNAPSHOT_R1');
    expect(doc).toContain('ROCKHOUNDING_DECISION_EVALUATOR_R1');
    expect(doc).toContain('Live ingestion stays closed');
    expect(doc).toContain('.cursor/');
    expect(doc).toContain('ROCKHOUNDING_OFFLINE_FIXTURE_ADAPTERS_R1');
    expect(doc).toContain('ROCKHOUNDING_EVIDENCE_QUARANTINE_R1');
  });
});
