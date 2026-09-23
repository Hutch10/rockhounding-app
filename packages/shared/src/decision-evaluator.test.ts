import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BuildingBlockLifecycleStatus,
  BUILTIN_BUILDING_BLOCK_DEFINITIONS,
  DECISION_EVALUATOR_BLOCK_ID,
  DECISION_SNAPSHOT_BLOCK_ID,
  UGES_BLOCK_ID,
  getLatestStableBuildingBlock,
  listBuildingBlocksByCategory,
  validateBuildingBlockRegistry,
} from './building-block-registry';
import { createDecisionSnapshot } from './decision-snapshot';
import type { DecisionClass, DecisionEvidenceEvaluation } from './decision-evidence-contracts';
import type { DecisionEvidenceBundle } from './decision-evidence-contracts';
import type {
  EvidenceAdmissionReceipt,
  EvidenceDomain,
  EvidencePurpose,
} from './evidence-admission';
import {
  DECISION_EVALUATOR_ID,
  decisionEvaluatorManufacturesUpstreamProvenance,
  decisionEvaluatorMutatesUges,
  decisionEvaluatorUsesLiveProvider,
  evaluateDecision,
  type DecisionRule,
} from './decision-evaluator';

const WHEN = '2026-09-22T18:00:00.000Z';
const CREATED = '2026-09-22T18:05:00.000Z';
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

async function snapshotFor(
  decisionClass: DecisionClass,
  completeness: DecisionEvidenceEvaluation['completeness'] = 'COMPLETE',
  options: {
    id?: string;
    limitations?: string[];
    domain?: EvidenceDomain;
    purpose?: EvidencePurpose;
    revalidatedForTarget?: boolean;
    targetDecisionTime?: string;
    contextParameters?: Array<{ key: string; value: string }>;
  } = {}
) {
  return createDecisionSnapshot({
    id: options.id ?? `snapshot-${decisionClass}`,
    createdAt: CREATED,
    decisionClass,
    evaluation: evaluation(decisionClass, completeness, options.limitations ?? []),
    bundles: [
      bundle(options.domain ?? 'COLLECTION_RULE', options.purpose ?? 'COLLECTION_PERMISSION'),
    ],
    context: {
      evaluatedAt: WHEN,
      applicability: {},
      revalidatedForTarget: options.revalidatedForTarget,
      targetDecisionTime: options.targetDecisionTime,
      contextParameters: options.contextParameters ?? [],
    },
    provenanceActivityId: 'activity-snapshot',
  });
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
    priority: overrides.priority,
    specificity: overrides.specificity,
    supersedesRuleId: overrides.supersedesRuleId,
    sourceRuleRef: overrides.sourceRuleRef,
  };
}

function ruleSet(
  decisionClass: DecisionClass,
  rules: DecisionRule[],
  version: DecisionRule['version'] = VERSION
) {
  return { id: `rules-${decisionClass}`, version, decisionClass, rules };
}

async function run(
  decisionClass: DecisionClass,
  rules: DecisionRule[],
  options: Parameters<typeof snapshotFor>[2] & {
    completeness?: DecisionEvidenceEvaluation['completeness'];
    evaluationId?: string;
    ruleSetVersion?: DecisionRule['version'];
    provenanceActivityId?: string;
    evaluatorVersion?: DecisionRule['version'];
    reanalysisOfEvaluationId?: string;
  } = {}
) {
  const snapshot = await snapshotFor(decisionClass, options.completeness ?? 'COMPLETE', options);
  return evaluateDecision({
    evaluationId: options.evaluationId ?? `evaluation-${decisionClass}`,
    snapshot,
    ruleSet: ruleSet(decisionClass, rules, options.ruleSetVersion ?? VERSION),
    provenanceActivityId: options.provenanceActivityId,
    evaluatorVersion: options.evaluatorVersion,
    reanalysisOfEvaluationId: options.reanalysisOfEvaluationId,
  });
}

describe('decision evaluator', () => {
  it('evaluates only a valid snapshot and an exact rule-set version', async () => {
    const snapshot = await snapshotFor('COLLECTION_PERMISSION');
    const result = await evaluateDecision({
      evaluationId: 'evaluation-1',
      snapshot,
      ruleSet: ruleSet('COLLECTION_PERMISSION', [
        rule('COLLECTION_PERMISSION', 'PERMIT', { sourceRuleRef: 'synthetic:permit' }),
      ]),
      provenanceActivityId: 'activity-eval-1',
    });
    expect(result.outcome).toEqual({
      decisionClass: 'COLLECTION_PERMISSION',
      status: 'ALLOWED',
    });
    expect(result.evaluatorId).toBe(DECISION_EVALUATOR_ID);
    expect(result.evaluatorVersion).toEqual(VERSION);
    expect(result.receipt.snapshotId).toBe(snapshot.id);
    expect(result.receipt.snapshotHash).toBe(snapshot.hash.value);
    expect(result.receipt.contractVersion).toEqual(VERSION);
    expect(result.receipt.evidenceIds).toEqual(snapshot.evidence.map((item) => item.candidateId));
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons[0]?.sourceRuleRef).toBe('synthetic:permit');
    expect(result.provenanceActivityId).toBe('activity-eval-1');
    expect(result.upstreamProvenanceIds).toEqual([]);

    const tampered = structuredClone(snapshot);
    tampered.hash = { ...tampered.hash, value: '0'.repeat(64) };
    await expect(
      evaluateDecision({
        evaluationId: 'bad-hash',
        snapshot: tampered,
        ruleSet: ruleSet('COLLECTION_PERMISSION', [rule('COLLECTION_PERMISSION', 'PERMIT')]),
      })
    ).rejects.toThrow(/hash/i);

    await expect(
      evaluateDecision({
        evaluationId: 'wrong-class',
        snapshot,
        ruleSet: ruleSet('SITE_ACCESS', [
          rule('SITE_ACCESS', 'OPEN', { domain: 'ROAD_TRAIL_ACCESS' }),
        ]),
      })
    ).rejects.toThrow(/decision class/i);

    await expect(
      evaluateDecision({
        evaluationId: 'latest',
        snapshot,
        ruleSet: { ...ruleSet('COLLECTION_PERMISSION', []), version: 'latest' as never },
      })
    ).rejects.toThrow();

    await expect(
      evaluateDecision({
        evaluationId: 'raw',
        evidence: [{ id: 'raw' }],
      } as never)
    ).rejects.toThrow(/snapshot/i);

    await expect(
      evaluateDecision({
        evaluationId: 'receipt-only',
        receipt: { requestId: 'receipt-1' },
      } as never)
    ).rejects.toThrow(/snapshot/i);
  });

  it('keeps the completeness gate ahead of permissive rules', async () => {
    const limited = await run('COLLECTION_PERMISSION', [rule('COLLECTION_PERMISSION', 'PERMIT')], {
      completeness: 'COMPLETE_WITH_LIMITATIONS',
      limitations: ['claim map is partial'],
    });
    expect(limited.outcome.status).toBe('ALLOWED_WITH_CONDITIONS');
    expect(limited.limitations).toContain('claim map is partial');

    for (const completeness of ['INCOMPLETE', 'UNRESOLVED'] as const) {
      const blocked = await run(
        'COLLECTION_PERMISSION',
        [rule('COLLECTION_PERMISSION', 'PERMIT')],
        { completeness }
      );
      expect(blocked.outcome.status).toBe('UNRESOLVED');
    }

    const conflicted = await run(
      'COLLECTION_PERMISSION',
      [rule('COLLECTION_PERMISSION', 'PERMIT')],
      { completeness: 'CONFLICTED' }
    );
    expect(conflicted.outcome.status).toBe('CONFLICTED');

    const stale = await run('COLLECTION_PERMISSION', [rule('COLLECTION_PERMISSION', 'PERMIT')], {
      completeness: 'REVALIDATION_REQUIRED',
      targetDecisionTime: '2026-09-26T15:00:00.000Z',
    });
    expect(stale.outcome.status).toBe('REVALIDATION_REQUIRED');
  });

  it('evaluates collection permission from synthetic rules only', async () => {
    expect(
      (await run('COLLECTION_PERMISSION', [rule('COLLECTION_PERMISSION', 'PROHIBIT')])).outcome
        .status
    ).toBe('PROHIBITED');
    expect(
      (await run('COLLECTION_PERMISSION', [rule('COLLECTION_PERMISSION', 'PERMIT')])).outcome.status
    ).toBe('ALLOWED');
    expect(
      (
        await run('COLLECTION_PERMISSION', [
          rule('COLLECTION_PERMISSION', 'PERMIT_WITH_CONDITIONS', {
            conditions: ['hand tools only'],
          }),
        ])
      ).outcome.status
    ).toBe('ALLOWED_WITH_CONDITIONS');
    expect((await run('COLLECTION_PERMISSION', [])).outcome.status).toBe('UNRESOLVED');
    expect(
      (
        await run('COLLECTION_PERMISSION', [rule('COLLECTION_PERMISSION', 'PERMIT')], {
          completeness: 'INCOMPLETE',
        })
      ).outcome.status
    ).toBe('UNRESOLVED');
    expect(
      (
        await run('COLLECTION_PERMISSION', [rule('COLLECTION_PERMISSION', 'PERMIT')], {
          completeness: 'REVALIDATION_REQUIRED',
        })
      ).outcome.status
    ).toBe('REVALIDATION_REQUIRED');
    expect(
      (
        await run('COLLECTION_PERMISSION', [
          rule('COLLECTION_PERMISSION', 'PERMIT', { id: 'permit' }),
          rule('COLLECTION_PERMISSION', 'PROHIBIT', { id: 'prohibit' }),
        ])
      ).outcome.status
    ).toBe('CONFLICTED');
    expect(
      (
        await run(
          'COLLECTION_PERMISSION',
          [rule('COLLECTION_PERMISSION', 'PERMIT', { id: 'geology', domain: 'GEOLOGY' })],
          { domain: 'GEOLOGY', purpose: 'GEOLOGICAL_CONTEXT' }
        )
      ).outcome.status
    ).toBe('UNRESOLVED');
    const sourceUse = await run('COLLECTION_PERMISSION', [], {
      contextParameters: [{ key: 'sourceUse', value: 'ALLOWED' }],
    });
    expect(sourceUse.outcome.status).toBe('UNRESOLVED');
  });

  it('evaluates site, route, closure, and field-visit readiness', async () => {
    expect(
      (
        await run('SITE_ACCESS', [rule('SITE_ACCESS', 'OPEN', { domain: 'ROAD_TRAIL_ACCESS' })], {
          domain: 'ROAD_TRAIL_ACCESS',
          purpose: 'SITE_ACCESS',
        })
      ).outcome.status
    ).toBe('ACCESSIBLE');
    expect(
      (
        await run(
          'SITE_ACCESS',
          [rule('SITE_ACCESS', 'PERMIT_WITH_CONDITIONS', { domain: 'ROAD_TRAIL_ACCESS' })],
          { domain: 'ROAD_TRAIL_ACCESS', purpose: 'SITE_ACCESS' }
        )
      ).outcome.status
    ).toBe('ACCESSIBLE_WITH_CONDITIONS');
    expect(
      (
        await run('SITE_ACCESS', [rule('SITE_ACCESS', 'CLOSE', { domain: 'CLOSURE' })], {
          domain: 'CLOSURE',
          purpose: 'SITE_ACCESS',
        })
      ).outcome.status
    ).toBe('NOT_ACCESSIBLE');
    expect(
      (
        await run('SITE_ACCESS', [rule('SITE_ACCESS', 'OPEN', { domain: 'ROAD_TRAIL_ACCESS' })], {
          completeness: 'INCOMPLETE',
          domain: 'ROAD_TRAIL_ACCESS',
          purpose: 'SITE_ACCESS',
        })
      ).outcome.status
    ).toBe('UNRESOLVED');
    expect(
      (
        await run('SITE_ACCESS', [rule('SITE_ACCESS', 'OPEN', { domain: 'ROAD_TRAIL_ACCESS' })], {
          completeness: 'REVALIDATION_REQUIRED',
          domain: 'ROAD_TRAIL_ACCESS',
          purpose: 'SITE_ACCESS',
        })
      ).outcome.status
    ).toBe('REVALIDATION_REQUIRED');

    expect(
      (
        await run('ROUTE_ACCESS', [rule('ROUTE_ACCESS', 'OPEN', { domain: 'ROAD_TRAIL_ACCESS' })], {
          domain: 'ROAD_TRAIL_ACCESS',
          purpose: 'ROUTE_DECISION',
        })
      ).outcome.status
    ).toBe('ROUTE_OPEN');
    expect(
      (
        await run(
          'ROUTE_ACCESS',
          [rule('ROUTE_ACCESS', 'PERMIT_WITH_CONDITIONS', { domain: 'ROAD_TRAIL_ACCESS' })],
          { domain: 'ROAD_TRAIL_ACCESS', purpose: 'ROUTE_DECISION' }
        )
      ).outcome.status
    ).toBe('ROUTE_OPEN_WITH_CONDITIONS');
    expect(
      (
        await run('ROUTE_ACCESS', [rule('ROUTE_ACCESS', 'CLOSE', { domain: 'CLOSURE' })], {
          domain: 'CLOSURE',
          purpose: 'ROUTE_DECISION',
        })
      ).outcome.status
    ).toBe('ROUTE_CLOSED');
    expect(
      (
        await run('ROUTE_ACCESS', [rule('ROUTE_ACCESS', 'OPEN', { domain: 'ROAD_TRAIL_ACCESS' })], {
          completeness: 'INCOMPLETE',
          domain: 'ROAD_TRAIL_ACCESS',
          purpose: 'ROUTE_DECISION',
        })
      ).outcome.status
    ).toBe('ROUTE_STATUS_UNRESOLVED');

    expect(
      (
        await run('CLOSURE_STATUS', [rule('CLOSURE_STATUS', 'CLOSE', { domain: 'CLOSURE' })], {
          domain: 'CLOSURE',
          purpose: 'SITE_ACCESS',
        })
      ).outcome.status
    ).toBe('CLOSED');
    expect(
      (
        await run('CLOSURE_STATUS', [rule('CLOSURE_STATUS', 'RESTRICT', { domain: 'CLOSURE' })], {
          domain: 'CLOSURE',
          purpose: 'SITE_ACCESS',
        })
      ).outcome.status
    ).toBe('RESTRICTED');
    expect(
      (
        await run('CLOSURE_STATUS', [rule('CLOSURE_STATUS', 'OPEN', { domain: 'CLOSURE' })], {
          domain: 'CLOSURE',
          purpose: 'SITE_ACCESS',
        })
      ).outcome.status
    ).toBe('OPEN');
    expect(
      (
        await run('CLOSURE_STATUS', [rule('CLOSURE_STATUS', 'OPEN', { domain: 'CLOSURE' })], {
          completeness: 'INCOMPLETE',
          domain: 'CLOSURE',
          purpose: 'SITE_ACCESS',
        })
      ).outcome.status
    ).toBe('UNKNOWN');
    expect(
      (
        await run('CLOSURE_STATUS', [rule('CLOSURE_STATUS', 'OPEN', { domain: 'CLOSURE' })], {
          completeness: 'REVALIDATION_REQUIRED',
          domain: 'CLOSURE',
          purpose: 'SITE_ACCESS',
        })
      ).outcome.status
    ).toBe('REVALIDATION_REQUIRED');

    expect(
      (
        await run(
          'FIELD_VISIT_READINESS',
          [rule('FIELD_VISIT_READINESS', 'OPEN', { domain: 'ROAD_TRAIL_ACCESS' })],
          { domain: 'ROAD_TRAIL_ACCESS', purpose: 'FIELD_NAVIGATION' }
        )
      ).outcome.status
    ).toBe('READY');
    const limitedVisit = await run(
      'FIELD_VISIT_READINESS',
      [rule('FIELD_VISIT_READINESS', 'OPEN', { domain: 'ROAD_TRAIL_ACCESS' })],
      {
        completeness: 'COMPLETE_WITH_LIMITATIONS',
        limitations: ['daylight only'],
        domain: 'ROAD_TRAIL_ACCESS',
        purpose: 'FIELD_NAVIGATION',
      }
    );
    expect(limitedVisit.outcome.status).toBe('READY_WITH_LIMITATIONS');
    expect(limitedVisit.limitations).toContain('daylight only');
    expect(
      (
        await run(
          'FIELD_VISIT_READINESS',
          [rule('FIELD_VISIT_READINESS', 'CLOSE', { domain: 'CLOSURE' })],
          { domain: 'CLOSURE', purpose: 'SITE_ACCESS' }
        )
      ).outcome.status
    ).toBe('NOT_READY');
    expect(
      (
        await run(
          'FIELD_VISIT_READINESS',
          [rule('FIELD_VISIT_READINESS', 'OPEN', { domain: 'ROAD_TRAIL_ACCESS' })],
          {
            completeness: 'REVALIDATION_REQUIRED',
            domain: 'ROAD_TRAIL_ACCESS',
            purpose: 'FIELD_NAVIGATION',
          }
        )
      ).outcome.status
    ).toBe('REVALIDATION_REQUIRED');
    expect(
      (
        await run(
          'FIELD_VISIT_READINESS',
          [rule('FIELD_VISIT_READINESS', 'OPEN', { domain: 'ROAD_TRAIL_ACCESS' })],
          {
            completeness: 'INCOMPLETE',
            domain: 'ROAD_TRAIL_ACCESS',
            purpose: 'FIELD_NAVIGATION',
          }
        )
      ).outcome.status
    ).toBe('UNRESOLVED');
    expect(
      (
        await run(
          'FIELD_VISIT_READINESS',
          [rule('FIELD_VISIT_READINESS', 'OPEN', { domain: 'ROAD_TRAIL_ACCESS' })],
          { completeness: 'CONFLICTED', domain: 'ROAD_TRAIL_ACCESS', purpose: 'FIELD_NAVIGATION' }
        )
      ).outcome.status
    ).toBe('CONFLICTED');
  });

  it('resolves precedence without newest-wins or universal restriction', async () => {
    const superseded = await run('COLLECTION_PERMISSION', [
      rule('COLLECTION_PERMISSION', 'PROHIBIT', { id: 'old-prohibit' }),
      rule('COLLECTION_PERMISSION', 'PERMIT', {
        id: 'new-permit',
        supersedesRuleId: 'old-prohibit',
      }),
    ]);
    expect(superseded.outcome.status).toBe('ALLOWED');

    const specific = await run('COLLECTION_PERMISSION', [
      rule('COLLECTION_PERMISSION', 'PROHIBIT', { id: 'broad', specificity: 1 }),
      rule('COLLECTION_PERMISSION', 'PERMIT', { id: 'narrow', specificity: 2 }),
    ]);
    expect(specific.outcome.status).toBe('ALLOWED');

    const unresolved = await run('COLLECTION_PERMISSION', [
      rule('COLLECTION_PERMISSION', 'PERMIT', { id: 'a', specificity: 1, version: VERSION }),
      rule('COLLECTION_PERMISSION', 'PROHIBIT', { id: 'b', specificity: 1, version: LATER }),
    ]);
    expect(unresolved.outcome.status).toBe('CONFLICTED');

    const restrictive = await run('COLLECTION_PERMISSION', [
      rule('COLLECTION_PERMISSION', 'PERMIT', { id: 'allow' }),
      rule('COLLECTION_PERMISSION', 'PROHIBIT', { id: 'deny' }),
    ]);
    expect(restrictive.outcome.status).toBe('CONFLICTED');
  });

  it('stays deterministic, replayable, and leaves inputs unchanged', async () => {
    const snapshot = await snapshotFor('COLLECTION_PERMISSION');
    const rules = [
      rule('COLLECTION_PERMISSION', 'PERMIT', { id: 'b', sourceRuleRef: 'synthetic:b' }),
      rule('COLLECTION_PERMISSION', 'PERMIT', { id: 'a', sourceRuleRef: 'synthetic:a' }),
    ];
    const request = {
      evaluationId: 'same',
      snapshot,
      ruleSet: ruleSet('COLLECTION_PERMISSION', rules),
    };
    const beforeSnapshot = structuredClone(snapshot);
    const beforeRules = structuredClone(request.ruleSet);
    const left = await evaluateDecision(request);
    const right = await evaluateDecision({
      ...request,
      ruleSet: ruleSet('COLLECTION_PERMISSION', [...rules].reverse()),
    });
    expect(left).toEqual(right);
    expect(snapshot).toEqual(beforeSnapshot);
    expect(request.ruleSet).toEqual(beforeRules);
    expect(left.reasons.every((item) => item.code.length > 0)).toBe(true);

    const historical = await evaluateDecision(request);
    const revised = await evaluateDecision({
      ...request,
      evaluationId: 'revised',
      ruleSet: ruleSet(
        'COLLECTION_PERMISSION',
        [rule('COLLECTION_PERMISSION', 'PROHIBIT', { id: 'later-prohibit' })],
        LATER
      ),
    });
    expect(historical.receipt.ruleSetVersion).toEqual(VERSION);
    expect(historical.evaluatorVersion).toEqual(VERSION);
    expect(revised.outcome.status).toBe('PROHIBITED');
    expect(revised.receipt.ruleSetVersion).toEqual(LATER);
    expect(historical.outcome.status).toBe('ALLOWED');

    const revalidated = await run(
      'COLLECTION_PERMISSION',
      [rule('COLLECTION_PERMISSION', 'PERMIT')],
      {
        completeness: 'REVALIDATION_REQUIRED',
        revalidatedForTarget: true,
        targetDecisionTime: '2026-09-26T15:00:00.000Z',
      }
    );
    expect(revalidated.outcome.status).toBe('ALLOWED');

    const futureEvaluator = await evaluateDecision({
      ...request,
      evaluationId: 'future',
      evaluatorVersion: LATER,
      reanalysisOfEvaluationId: historical.evaluationId,
    });
    expect(futureEvaluator.evaluatorVersion).toEqual(LATER);
    expect(futureEvaluator.outcome.status).not.toBe('ALLOWED');
    expect(futureEvaluator.reanalysisOfEvaluationId).toBe(historical.evaluationId);
    const replay = await evaluateDecision(request);
    expect(replay).toEqual(historical);
  });

  it('does not cross source governance, UGES, or live-provider boundaries', () => {
    const source = readFileSync(resolve(__dirname, 'decision-evaluator.ts'), 'utf8');
    expect(source).not.toMatch(/\bDate\.now\s*\(/);
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/\baxios\b/);
    expect(source).not.toMatch(/source-governance/);
    expect(source).not.toMatch(/evaluateFreshness/);
    expect(source).not.toMatch(/\bSAFE\b/);
    expect(decisionEvaluatorUsesLiveProvider()).toBe(false);
    expect(decisionEvaluatorManufacturesUpstreamProvenance()).toBe(false);
    expect(decisionEvaluatorMutatesUges()).toBe(false);
  });

  it('registers the evaluator and points the coordinator at the receipt phase', () => {
    const registry = validateBuildingBlockRegistry(BUILTIN_BUILDING_BLOCK_DEFINITIONS);
    const block = getLatestStableBuildingBlock(registry, DECISION_EVALUATOR_BLOCK_ID);
    expect(block?.lifecycleStatus).toBe(BuildingBlockLifecycleStatus.STABLE);
    expect(block?.version).toEqual(VERSION);
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
    expect(doc).toContain('ROCKHOUNDING_DECISION_SNAPSHOT_R1');
    expect(doc).toContain('CLOSED');
    expect(doc).toContain('ROCKHOUNDING_DECISION_EVALUATOR_R1');
    expect(doc).toContain('ROCKHOUNDING_DECISION_RECEIPT_R1');
    expect(doc).toContain('Live ingestion stays closed');
    expect(doc).toContain('.cursor/');
    expect(doc).toContain('ROCKHOUNDING_OFFLINE_FIXTURE_ADAPTERS_R1');
    expect(doc).toContain('ROCKHOUNDING_EVIDENCE_QUARANTINE_R1');
  });
});
