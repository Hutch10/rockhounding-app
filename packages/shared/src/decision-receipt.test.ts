import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BuildingBlockLifecycleStatus,
  BUILTIN_BUILDING_BLOCK_DEFINITIONS,
  DECISION_EVALUATOR_BLOCK_ID,
  DECISION_RECEIPT_BLOCK_ID,
  DECISION_SNAPSHOT_BLOCK_ID,
  UGES_BLOCK_ID,
  getLatestStableBuildingBlock,
  listBuildingBlocksByCategory,
  validateBuildingBlockRegistry,
} from './building-block-registry';
import { createDecisionSnapshot } from './decision-snapshot';
import type { DecisionClass, DecisionEvidenceEvaluation } from './decision-evidence-contracts';
import type { DecisionEvidenceBundle } from './decision-evidence-contracts';
import { evaluateDecision, type DecisionRule } from './decision-evaluator';
import type {
  EvidenceAdmissionReceipt,
  EvidenceDomain,
  EvidencePurpose,
} from './evidence-admission';
import {
  DECISION_RECEIPT_HASH_SCOPE,
  createDecisionReceipt,
  decisionReceiptHashIsSignature,
  decisionReceiptManufacturesUpstreamProvenance,
  decisionReceiptReevaluates,
  validateDecisionReceipt,
} from './decision-receipt';

const WHEN = '2026-09-22T18:00:00.000Z';
const CREATED = '2026-09-22T18:05:00.000Z';
const RECEIPT_AT = '2026-09-22T18:10:00.000Z';
const VERSION = { major: 1, minor: 0, patch: 0 };
const LATER = { major: 2, minor: 0, patch: 0 };

function bundle(domain: EvidenceDomain, purpose: EvidencePurpose): DecisionEvidenceBundle {
  const id = `${domain}-1`;
  const policyId = `policy-${domain}`;
  const candidate: DecisionEvidenceBundle['candidate'] = {
    id,
    kind: 'record',
    role: 'AUTHORITATIVE_DECISION',
    supportedPurposes: [purpose],
    authority: [{ domain, authorityClass: 'PRIMARY_AUTHORITY' }],
    temporal: { fitness: 'FIT', freshness: 'CURRENT' },
    coverage: { record: 'COMPLETE', geometry: 'COMPLETE', temporal: 'COMPLETE', resultCount: 1 },
    quarantine: { state: 'NONE', disposition: 'NONE' },
    provenance: { state: 'SOURCE_TRACEABLE' },
    governance: { decision: 'ALLOWED' },
    independence: { upstreamLineageIds: [`lineage-${id}`] },
    contradiction: { state: 'NONE' },
    availability: 'AVAILABLE',
  };
  const receipt: EvidenceAdmissionReceipt = {
    requestId: `receipt-${id}`,
    candidateId: id,
    policyId,
    policyVersion: VERSION,
    decision: 'ADMITTED',
    reasons: [{ code: 'ADMITTED' }],
    evaluatedAt: WHEN,
    domain,
    purpose,
    evidenceRole: 'AUTHORITATIVE_DECISION',
    inputReferences: { candidateId: id, policyId },
    temporalFitness: 'FIT',
    coverageState: 'COMPLETE',
    provenanceState: 'SOURCE_TRACEABLE',
    authorityState: 'PRIMARY_AUTHORITY',
    independenceState: 'INDEPENDENT',
    contradictionState: 'NONE',
    limitations: [],
    purposeFitness: 'FIT',
  };
  return { candidate, receipt, policy: { policyId, version: VERSION } };
}

function evaluation(
  decisionClass: DecisionClass,
  completeness: DecisionEvidenceEvaluation['completeness'],
  limitations: string[] = []
): DecisionEvidenceEvaluation {
  return {
    contractId: `rockhounding:decision-evidence:${decisionClass}`,
    contractVersion: VERSION,
    decisionClass,
    completeness,
    requirements: [{ requirementId: 'primary', status: 'SATISFIED', gaps: [] }],
    gaps:
      completeness === 'INCOMPLETE'
        ? [{ requirementId: 'primary', reason: 'MISSING_REQUIRED_DOMAIN', blocking: true }]
        : [],
    limitations,
  };
}

async function evaluated(input: {
  decisionClass: DecisionClass;
  rules: DecisionRule[];
  completeness?: DecisionEvidenceEvaluation['completeness'];
  limitations?: string[];
  domain?: EvidenceDomain;
  purpose?: EvidencePurpose;
  ruleSetVersion?: DecisionRule['version'];
  evaluatorVersion?: DecisionRule['version'];
  provenanceActivityId?: string;
  snapshotId?: string;
}) {
  const decisionClass = input.decisionClass;
  const snapshot = await createDecisionSnapshot({
    id: input.snapshotId ?? `snapshot-${decisionClass}-${input.completeness ?? 'COMPLETE'}`,
    createdAt: CREATED,
    decisionClass,
    evaluation: evaluation(
      decisionClass,
      input.completeness ?? 'COMPLETE',
      input.limitations ?? []
    ),
    bundles: [bundle(input.domain ?? 'COLLECTION_RULE', input.purpose ?? 'COLLECTION_PERMISSION')],
    context: { evaluatedAt: WHEN, applicability: {} },
    provenanceActivityId: 'activity-snapshot',
  });
  const result = await evaluateDecision({
    evaluationId: `evaluation-${decisionClass}`,
    snapshot,
    ruleSet: {
      id: `rules-${decisionClass}`,
      version: input.ruleSetVersion ?? VERSION,
      decisionClass,
      rules: input.rules,
    },
    provenanceActivityId: input.provenanceActivityId ?? 'activity-evaluation',
    evaluatorVersion: input.evaluatorVersion,
  });
  return { snapshot, result };
}

function rule(
  decisionClass: DecisionClass,
  effect: DecisionRule['effect'],
  overrides: Partial<DecisionRule> = {}
): DecisionRule {
  return {
    id: overrides.id ?? `${decisionClass}-${effect}`,
    version: overrides.version ?? VERSION,
    decisionClass,
    domain: overrides.domain ?? 'COLLECTION_RULE',
    effect,
    conditions: overrides.conditions ?? [],
    limitations: overrides.limitations ?? [],
    coverage: overrides.coverage ?? 'COMPLETE',
    sourceRuleRef: overrides.sourceRuleRef,
    specificity: overrides.specificity,
    supersedesRuleId: overrides.supersedesRuleId,
  };
}

async function receiptFor(
  input: Parameters<typeof evaluated>[0],
  overrides: { id?: string; createdAt?: string } = {}
) {
  const produced = await evaluated(input);
  const receipt = await createDecisionReceipt({
    id: overrides.id ?? `receipt-${input.decisionClass}`,
    createdAt: overrides.createdAt ?? RECEIPT_AT,
    evaluation: produced.result,
    snapshot: produced.snapshot,
    receiptCreationProvenanceActivityId: 'activity-receipt',
  });
  return { ...produced, receipt };
}

describe('decision receipt', () => {
  it('pins the snapshot, contract, rule set, and evaluator', async () => {
    const { snapshot, result, receipt } = await receiptFor({
      decisionClass: 'COLLECTION_PERMISSION',
      rules: [rule('COLLECTION_PERMISSION', 'PERMIT', { sourceRuleRef: 'synthetic:permit' })],
    });
    expect(receipt.id).toBe('receipt-COLLECTION_PERMISSION');
    expect(receipt.schemaVersion).toBe(1);
    expect(receipt.snapshot.id).toBe(snapshot.id);
    expect(receipt.snapshot.hash).toBe(snapshot.hash.value);
    expect(receipt.contract.contractVersion).toEqual(VERSION);
    expect(receipt.ruleSet.ruleSetVersion).toEqual(VERSION);
    expect(receipt.evaluator.evaluatorVersion).toEqual(VERSION);
    expect(receipt.outcome).toEqual(result.outcome);
    expect(receipt.evaluatedAt).toBe(WHEN);
    expect(receipt.createdAt).toBe(RECEIPT_AT);
    expect(receipt.createdAt).not.toBe(receipt.evaluatedAt);
    expect(receipt.hash.scope).toBe(DECISION_RECEIPT_HASH_SCOPE);
    expect(receipt.replay.kind).toBe('REPLAY');
    expect(receipt.replay.snapshotHash).toBe(snapshot.hash.value);
    expect(receipt.replay.ruleSetVersion).toEqual(VERSION);
    expect(receipt.replay.evaluatorVersion).toEqual(VERSION);
    expect(receipt.reasons.some((item) => item.sourceRuleRef === 'synthetic:permit')).toBe(true);
    expect(receipt.appliedRules.some((item) => item.ruleVersion.major === 1)).toBe(true);
    expect(receipt.provenance.evaluationProvenanceActivityId).toBe('activity-evaluation');
    expect(receipt.provenance.receiptCreationProvenanceActivityId).toBe('activity-receipt');
    expect(receipt.provenance.upstreamProvenanceIds).toEqual([]);
    expect(receipt.completenessStatus).toBe(snapshot.completeness.status);
    expect('receiptId' in snapshot).toBe(false);

    const latest = structuredClone(result);
    latest.receipt = { ...latest.receipt, ruleSetVersion: 'latest' as never };
    await expect(
      createDecisionReceipt({
        id: 'latest',
        createdAt: RECEIPT_AT,
        evaluation: latest,
        snapshot,
      })
    ).rejects.toThrow();
  });

  it('rejects snapshot, class, outcome, and candidate mismatches', async () => {
    const { snapshot, result } = await receiptFor({
      decisionClass: 'COLLECTION_PERMISSION',
      rules: [rule('COLLECTION_PERMISSION', 'PERMIT')],
    });
    const wrongId = structuredClone(result);
    wrongId.receipt = { ...wrongId.receipt, snapshotId: 'other-snapshot' };
    await expect(
      createDecisionReceipt({
        id: 'bad-id',
        createdAt: RECEIPT_AT,
        evaluation: wrongId,
        snapshot,
      })
    ).rejects.toThrow(/snapshot/i);

    const wrongHash = structuredClone(result);
    wrongHash.receipt = { ...wrongHash.receipt, snapshotHash: '0'.repeat(64) };
    await expect(
      createDecisionReceipt({
        id: 'bad-hash',
        createdAt: RECEIPT_AT,
        evaluation: wrongHash,
        snapshot,
      })
    ).rejects.toThrow(/hash/i);

    const wrongClass = structuredClone(snapshot);
    wrongClass.decisionClass = 'SITE_ACCESS';
    await expect(
      createDecisionReceipt({
        id: 'bad-class',
        createdAt: RECEIPT_AT,
        evaluation: result,
        snapshot: wrongClass,
      })
    ).rejects.toThrow(/decision class/i);

    const wrongOutcome = structuredClone(result);
    wrongOutcome.outcome = {
      decisionClass: 'COLLECTION_PERMISSION',
      status: 'ROUTE_OPEN' as never,
    };
    wrongOutcome.receipt = { ...wrongOutcome.receipt, outcome: wrongOutcome.outcome };
    await expect(
      createDecisionReceipt({
        id: 'bad-outcome',
        createdAt: RECEIPT_AT,
        evaluation: wrongOutcome,
        snapshot,
      })
    ).rejects.toThrow(/outcome/i);

    const candidate = structuredClone(result);
    candidate.receipt = {
      ...candidate.receipt,
      outcome: { decisionClass: 'COLLECTION_PERMISSION', status: 'PROHIBITED' },
    };
    await expect(
      createDecisionReceipt({
        id: 'bad-candidate',
        createdAt: RECEIPT_AT,
        evaluation: candidate,
        snapshot,
      })
    ).rejects.toThrow(/candidate/i);

    const limitedEvaluation = await evaluated({
      decisionClass: 'COLLECTION_PERMISSION',
      rules: [rule('COLLECTION_PERMISSION', 'PERMIT')],
      limitations: ['hand tools only'],
    });
    await expect(
      createDecisionReceipt({
        id: 'omitted-limits',
        createdAt: RECEIPT_AT,
        evaluation: limitedEvaluation.result,
        snapshot: limitedEvaluation.snapshot,
        limitations: [],
      })
    ).rejects.toThrow(/limitation/i);
  });

  it('freezes synthetic outcomes without dropping limitations', async () => {
    expect(
      (
        await receiptFor({
          decisionClass: 'COLLECTION_PERMISSION',
          rules: [rule('COLLECTION_PERMISSION', 'PERMIT')],
        })
      ).receipt.outcome.status
    ).toBe('ALLOWED');
    expect(
      (
        await receiptFor({
          decisionClass: 'COLLECTION_PERMISSION',
          rules: [rule('COLLECTION_PERMISSION', 'PROHIBIT')],
        })
      ).receipt.outcome.status
    ).toBe('PROHIBITED');
    expect(
      (
        await receiptFor({
          decisionClass: 'COLLECTION_PERMISSION',
          rules: [rule('COLLECTION_PERMISSION', 'PERMIT')],
          completeness: 'REVALIDATION_REQUIRED',
        })
      ).receipt.outcome.status
    ).toBe('REVALIDATION_REQUIRED');
    expect(
      (
        await receiptFor({
          decisionClass: 'ROUTE_ACCESS',
          rules: [rule('ROUTE_ACCESS', 'CLOSE', { domain: 'CLOSURE' })],
          domain: 'CLOSURE',
          purpose: 'ROUTE_DECISION',
        })
      ).receipt.outcome.status
    ).toBe('ROUTE_CLOSED');
    expect(
      (
        await receiptFor({
          decisionClass: 'CLOSURE_STATUS',
          rules: [rule('CLOSURE_STATUS', 'OPEN', { domain: 'CLOSURE' })],
          completeness: 'INCOMPLETE',
          domain: 'CLOSURE',
          purpose: 'SITE_ACCESS',
        })
      ).receipt.outcome.status
    ).toBe('UNKNOWN');
    const limited = await receiptFor({
      decisionClass: 'FIELD_VISIT_READINESS',
      rules: [rule('FIELD_VISIT_READINESS', 'OPEN', { domain: 'ROAD_TRAIL_ACCESS' })],
      completeness: 'COMPLETE_WITH_LIMITATIONS',
      limitations: ['daylight only', 'seasonal road'],
      domain: 'ROAD_TRAIL_ACCESS',
      purpose: 'FIELD_NAVIGATION',
    });
    expect(limited.receipt.outcome.status).toBe('READY_WITH_LIMITATIONS');
    expect(limited.receipt.limitations).toEqual(['daylight only', 'seasonal road']);
    expect(
      (
        await receiptFor({
          decisionClass: 'COLLECTION_PERMISSION',
          rules: [
            rule('COLLECTION_PERMISSION', 'PERMIT', { id: 'permit' }),
            rule('COLLECTION_PERMISSION', 'PROHIBIT', { id: 'prohibit' }),
          ],
        })
      ).receipt.outcome.status
    ).toBe('CONFLICTED');
    const unresolved = await receiptFor({ decisionClass: 'COLLECTION_PERMISSION', rules: [] });
    expect(unresolved.receipt.outcome.status).toBe('UNRESOLVED');
    expect(unresolved.receipt.reasons.length).toBeGreaterThan(0);
    expect(JSON.stringify(limited.receipt)).not.toContain('REDISTRIBUTE');
  });

  it('canonicalizes hash material and leaves history immutable', async () => {
    const produced = await evaluated({
      decisionClass: 'COLLECTION_PERMISSION',
      rules: [
        rule('COLLECTION_PERMISSION', 'PERMIT_WITH_CONDITIONS', {
          id: 'permit',
          sourceRuleRef: 'synthetic:permit',
          conditions: ['hand tools only'],
        }),
      ],
      limitations: ['claim map is partial'],
    });
    const beforeSnapshot = structuredClone(produced.snapshot);
    const left = await createDecisionReceipt({
      id: 'receipt-a',
      createdAt: RECEIPT_AT,
      evaluation: produced.result,
      snapshot: produced.snapshot,
    });
    const reordered = structuredClone(produced.result);
    reordered.reasons = [...reordered.reasons].reverse();
    reordered.limitations = [...reordered.limitations].reverse();
    reordered.receipt = {
      ...reordered.receipt,
      reasons: [...reordered.receipt.reasons].reverse(),
      limitations: [...reordered.receipt.limitations].reverse(),
    };
    const right = await createDecisionReceipt({
      id: 'receipt-b',
      createdAt: '2026-09-22T19:00:00.000Z',
      evaluation: reordered,
      snapshot: produced.snapshot,
    });
    expect(left.hash.value).toBe(right.hash.value);
    expect(produced.snapshot).toEqual(beforeSnapshot);
    expect(Object.isFrozen(left)).toBe(true);
    expect(() => {
      (left.outcome as { status: string }).status = 'PROHIBITED';
    }).toThrow();
    expect(() => {
      (left.ruleSet.ruleSetVersion as { major: number }).major = 9;
    }).toThrow();
    expect(() => {
      left.reasons.push({ code: 'OTHER', detail: 'added' });
    }).toThrow();
    expect(() => {
      left.limitations.push('added');
    }).toThrow();

    const changedOutcome = structuredClone(produced.result);
    changedOutcome.outcome = { decisionClass: 'COLLECTION_PERMISSION', status: 'PROHIBITED' };
    changedOutcome.receipt = { ...changedOutcome.receipt, outcome: changedOutcome.outcome };
    const prohibited = await createDecisionReceipt({
      id: 'receipt-prohibited',
      createdAt: RECEIPT_AT,
      evaluation: changedOutcome,
      snapshot: produced.snapshot,
    });
    expect(prohibited.hash.value).not.toBe(left.hash.value);

    const otherSnapshot = await evaluated({
      decisionClass: 'COLLECTION_PERMISSION',
      rules: [rule('COLLECTION_PERMISSION', 'PERMIT', { id: 'other-permit' })],
    });
    const otherReceipt = await createDecisionReceipt({
      id: 'receipt-other-snapshot',
      createdAt: RECEIPT_AT,
      evaluation: otherSnapshot.result,
      snapshot: otherSnapshot.snapshot,
    });
    expect(otherReceipt.hash.value).not.toBe(left.hash.value);

    const laterRules = await evaluated({
      decisionClass: 'COLLECTION_PERMISSION',
      rules: [rule('COLLECTION_PERMISSION', 'PROHIBIT', { id: 'later-prohibit' })],
      ruleSetVersion: LATER,
    });
    const laterRuleReceipt = await createDecisionReceipt({
      id: 'receipt-rules-2',
      createdAt: RECEIPT_AT,
      evaluation: laterRules.result,
      snapshot: laterRules.snapshot,
    });
    expect(laterRuleReceipt.ruleSet.ruleSetVersion).toEqual(LATER);
    expect(laterRuleReceipt.hash.value).not.toBe(left.hash.value);
    expect(left.ruleSet.ruleSetVersion).toEqual(VERSION);

    const laterEvaluator = await evaluated({
      decisionClass: 'COLLECTION_PERMISSION',
      rules: [rule('COLLECTION_PERMISSION', 'PERMIT')],
      evaluatorVersion: LATER,
    });
    const laterEvaluatorReceipt = await createDecisionReceipt({
      id: 'receipt-evaluator-2',
      createdAt: RECEIPT_AT,
      evaluation: laterEvaluator.result,
      snapshot: laterEvaluator.snapshot,
      reanalysisOfReceiptId: left.id,
    });
    expect(laterEvaluatorReceipt.evaluator.evaluatorVersion).toEqual(LATER);
    expect(laterEvaluatorReceipt.hash.value).not.toBe(left.hash.value);
    expect(left.evaluator.evaluatorVersion).toEqual(VERSION);
    expect(laterEvaluatorReceipt.reanalysis?.kind).toBe('REANALYSIS_OF');
    expect(laterEvaluatorReceipt.reanalysis?.receiptId).toBe(left.id);

    const changedReason = structuredClone(produced.result);
    changedReason.reasons = [{ ...changedReason.reasons[0], detail: 'different material reason' }];
    changedReason.receipt = { ...changedReason.receipt, reasons: changedReason.reasons };
    const reasonReceipt = await createDecisionReceipt({
      id: 'receipt-reason',
      createdAt: RECEIPT_AT,
      evaluation: changedReason,
      snapshot: produced.snapshot,
    });
    expect(reasonReceipt.hash.value).not.toBe(left.hash.value);
    expect(decisionReceiptHashIsSignature()).toBe(false);

    const tampered = structuredClone(left);
    tampered.hash = { ...tampered.hash, value: '0'.repeat(64) };
    await expect(validateDecisionReceipt(tampered)).rejects.toThrow(/hash/i);
  });

  it('records supersession and reanalysis without rewriting the original', async () => {
    const original = await receiptFor({
      decisionClass: 'COLLECTION_PERMISSION',
      rules: [rule('COLLECTION_PERMISSION', 'PERMIT')],
    });
    const before = structuredClone(original.receipt);
    const successor = await createDecisionReceipt({
      id: 'receipt-successor',
      createdAt: '2026-09-23T18:10:00.000Z',
      evaluation: original.result,
      snapshot: original.snapshot,
      supersession: {
        supersedesReceiptId: original.receipt.id,
        reason: 'rule set replaced',
        createdAt: '2026-09-23T18:10:00.000Z',
      },
    });
    expect(successor.supersession?.supersedesReceiptId).toBe(original.receipt.id);
    expect(successor.supersession?.reason).toBe('rule set replaced');
    expect(original.receipt).toEqual(before);

    const nextSnapshot = await evaluated({
      decisionClass: 'COLLECTION_PERMISSION',
      rules: [rule('COLLECTION_PERMISSION', 'PROHIBIT', { id: 'replacement' })],
      snapshotId: 'snapshot-reanalysis',
    });
    const reanalysis = await createDecisionReceipt({
      id: 'receipt-reanalysis',
      createdAt: '2026-09-24T18:10:00.000Z',
      evaluation: nextSnapshot.result,
      snapshot: nextSnapshot.snapshot,
      reanalysisOfReceiptId: original.receipt.id,
    });
    expect(reanalysis.reanalysis?.receiptId).toBe(original.receipt.id);
    expect(reanalysis.snapshot.id).not.toBe(original.receipt.snapshot.id);
    expect(original.receipt).toEqual(before);

    await expect(
      createDecisionReceipt({
        id: 'receipt-self',
        createdAt: RECEIPT_AT,
        evaluation: original.result,
        snapshot: original.snapshot,
        supersession: {
          supersedesReceiptId: 'receipt-self',
          reason: 'loop',
          createdAt: RECEIPT_AT,
        },
      })
    ).rejects.toThrow(/itself/i);
  });

  it('does not re-evaluate, call governance, or read a live provider', () => {
    const source = readFileSync(resolve(__dirname, 'decision-receipt.ts'), 'utf8');
    expect(source).not.toMatch(/\bDate\.now\s*\(/);
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/\baxios\b/);
    expect(source).not.toMatch(/\bevaluateDecision\b/);
    expect(source).not.toMatch(/source-governance/);
    expect(source).not.toMatch(/\bSAFE\b/);
    expect(decisionReceiptReevaluates()).toBe(false);
    expect(decisionReceiptManufacturesUpstreamProvenance()).toBe(false);
    expect(decisionReceiptHashIsSignature()).toBe(false);
  });

  it('registers the receipt and points the coordinator at the live-provider gate', () => {
    const registry = validateBuildingBlockRegistry(BUILTIN_BUILDING_BLOCK_DEFINITIONS);
    const block = getLatestStableBuildingBlock(registry, DECISION_RECEIPT_BLOCK_ID);
    expect(block?.lifecycleStatus).toBe(BuildingBlockLifecycleStatus.STABLE);
    expect(block?.version).toEqual(VERSION);
    expect(getLatestStableBuildingBlock(registry, DECISION_EVALUATOR_BLOCK_ID)?.version).toEqual(
      VERSION
    );
    expect(getLatestStableBuildingBlock(registry, DECISION_SNAPSHOT_BLOCK_ID)?.version).toEqual(
      VERSION
    );
    expect(getLatestStableBuildingBlock(registry, UGES_BLOCK_ID)?.version).toEqual({
      major: 1,
      minor: 1,
      patch: 0,
    });
    expect(
      listBuildingBlocksByCategory(registry, 'AVAILABILITY_MODEL').every(
        (item) => item.lifecycleStatus !== BuildingBlockLifecycleStatus.STABLE
      )
    ).toBe(true);
    const doc = readFileSync(
      resolve(__dirname, '../../../docs/FIELD_PLATFORM_COORDINATOR.md'),
      'utf8'
    );
    expect(doc).toContain('ROCKHOUNDING_DECISION_EVALUATOR_R1');
    expect(doc).toContain('CLOSED');
    expect(doc).toContain('ROCKHOUNDING_DECISION_RECEIPT_R1');
    expect(doc).toContain('ROCKHOUNDING_FIRST_LIVE_PROVIDER_READINESS_GATE');
    expect(doc).toContain('Live ingestion stays closed');
    expect(doc).toContain('.cursor/');
    expect(doc).toContain('ROCKHOUNDING_DECISION_SNAPSHOT_R1');
    expect(doc).toContain('ROCKHOUNDING_OFFLINE_FIXTURE_ADAPTERS_R1');
    expect(doc).toContain('ROCKHOUNDING_EVIDENCE_QUARANTINE_R1');
  });
});
