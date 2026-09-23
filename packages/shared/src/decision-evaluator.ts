/**
 * Decision Evaluator R1
 *
 * Produces a decision outcome from a valid Decision Snapshot and an exact
 * synthetic rule set. It does not query providers, mutate the snapshot, or
 * rewrite evidence, governance, or UGES records.
 *
 * Applicable rules are ordered by id, then version. Supersession and
 * specificity are explicit. Equal remaining effects that disagree stay
 * conflicted. Version order and restrictiveness are not precedence.
 */

import { z } from 'zod';

import {
  DecisionSnapshotSchema,
  validateDecisionSnapshot,
  type DecisionSnapshot,
} from './decision-snapshot';

export const DECISION_EVALUATOR_ID = 'rockhounding:decision-evaluator';
export const DECISION_EVALUATOR_VERSION = { major: 1, minor: 0, patch: 0 } as const;

const VersionSchema = z.object({
  major: z.number().int().nonnegative(),
  minor: z.number().int().nonnegative(),
  patch: z.number().int().nonnegative(),
});

const DecisionClassSchema = z.enum([
  'COLLECTION_PERMISSION',
  'SITE_ACCESS',
  'ROUTE_ACCESS',
  'CLOSURE_STATUS',
  'SAFETY_STATUS',
  'GEOLOGICAL_CONTEXT',
  'GEOLOGICAL_OPPORTUNITY',
  'MINING_CLAIM_STATUS',
  'LAND_OWNERSHIP_STATUS',
  'LAND_MANAGEMENT_STATUS',
  'SPECIMEN_IDENTIFICATION',
  'FIELD_VISIT_READINESS',
  'OTHER',
]);

const SupportedClassSchema = z.enum([
  'COLLECTION_PERMISSION',
  'SITE_ACCESS',
  'ROUTE_ACCESS',
  'CLOSURE_STATUS',
  'FIELD_VISIT_READINESS',
]);

export const DecisionRuleEffectSchema = z.enum([
  'PERMIT',
  'PERMIT_WITH_CONDITIONS',
  'PROHIBIT',
  'RESTRICT',
  'CLOSE',
  'OPEN',
  'WARN',
  'REQUIRE_REVALIDATION',
  'UNRESOLVED',
]);

export const DecisionOutcomeReasonCodeSchema = z.enum([
  'REQUIRED_EVIDENCE_INCOMPLETE',
  'BLOCKING_RULE_APPLIES',
  'PERMISSIVE_RULE_APPLIES',
  'CONDITIONS_APPLY',
  'CLOSURE_APPLIES',
  'ROUTE_RESTRICTION_APPLIES',
  'REVALIDATION_REQUIRED',
  'UNRESOLVED_RULE_CONFLICT',
  'UNRESOLVED_EVIDENCE_CONFLICT',
  'INSUFFICIENT_COVERAGE',
  'TEMPORAL_NOT_FIT',
  'APPLICABILITY_UNRESOLVED',
  'NO_APPLICABLE_RULE',
  'OTHER',
]);

export type DecisionOutcomeReasonCode = z.infer<typeof DecisionOutcomeReasonCodeSchema>;
export type DecisionRuleId = string;
export type DecisionRuleVersion = z.infer<typeof VersionSchema>;
export type DecisionEvaluatorVersion = typeof DECISION_EVALUATOR_VERSION;
export type DecisionEvaluationLimitation = string;

export const DecisionRuleSchema = z.object({
  id: z.string().min(1).max(128),
  version: VersionSchema,
  decisionClass: DecisionClassSchema,
  domain: z.string().min(1).max(64),
  effect: DecisionRuleEffectSchema,
  priority: z.number().int().nonnegative().optional(),
  specificity: z.number().int().nonnegative().optional(),
  supersedesRuleId: z.string().min(1).max(128).optional(),
  sourceRuleRef: z.string().min(1).max(256).optional(),
  conditions: z.array(z.string().min(1).max(128)).max(16).default([]),
  limitations: z.array(z.string().min(1).max(256)).max(16).default([]),
  coverage: z.enum(['COMPLETE', 'PARTIAL', 'NONE']).default('COMPLETE'),
});

export type DecisionRule = z.infer<typeof DecisionRuleSchema>;
export type DecisionRuleInput = z.input<typeof DecisionRuleSchema>;

export const DecisionRuleSetSchema = z.object({
  id: z.string().min(1).max(128),
  version: VersionSchema,
  decisionClass: DecisionClassSchema,
  rules: z.array(DecisionRuleSchema).max(64),
});

export type DecisionRuleSet = z.infer<typeof DecisionRuleSetSchema>;

export const DecisionEvaluationPolicySchema = z.object({
  permitLimitedEvaluation: z.boolean().default(true),
  conflictMode: z.enum(['STRICT', 'BOUNDED']).default('STRICT'),
});

export type DecisionEvaluationPolicy = z.infer<typeof DecisionEvaluationPolicySchema>;

export const DecisionRuleEvaluationSchema = z.object({
  ruleId: z.string().min(1).max(128),
  ruleVersion: VersionSchema,
  effect: DecisionRuleEffectSchema,
  status: z.enum(['APPLIED', 'SUPERSEDED', 'NOT_SELECTED', 'CONFLICTED', 'NOT_APPLICABLE']),
});

export type DecisionRuleEvaluation = z.infer<typeof DecisionRuleEvaluationSchema>;

export const DecisionOutcomeReasonSchema = z.object({
  code: DecisionOutcomeReasonCodeSchema,
  detail: z.string().min(1).max(500),
  ruleId: z.string().min(1).max(128).optional(),
  sourceRuleRef: z.string().min(1).max(256).optional(),
});

export type DecisionOutcomeReason = z.infer<typeof DecisionOutcomeReasonSchema>;

export const DecisionEvaluationOutcomeSchema = z.discriminatedUnion('decisionClass', [
  z.object({
    decisionClass: z.literal('COLLECTION_PERMISSION'),
    status: z.enum([
      'ALLOWED',
      'ALLOWED_WITH_CONDITIONS',
      'PROHIBITED',
      'UNRESOLVED',
      'REVALIDATION_REQUIRED',
      'CONFLICTED',
    ]),
  }),
  z.object({
    decisionClass: z.literal('SITE_ACCESS'),
    status: z.enum([
      'ACCESSIBLE',
      'ACCESSIBLE_WITH_CONDITIONS',
      'NOT_ACCESSIBLE',
      'UNRESOLVED',
      'REVALIDATION_REQUIRED',
      'CONFLICTED',
    ]),
  }),
  z.object({
    decisionClass: z.literal('ROUTE_ACCESS'),
    status: z.enum([
      'ROUTE_OPEN',
      'ROUTE_OPEN_WITH_CONDITIONS',
      'ROUTE_CLOSED',
      'ROUTE_STATUS_UNRESOLVED',
      'REVALIDATION_REQUIRED',
      'CONFLICTED',
    ]),
  }),
  z.object({
    decisionClass: z.literal('CLOSURE_STATUS'),
    status: z.enum([
      'OPEN',
      'CLOSED',
      'RESTRICTED',
      'UNKNOWN',
      'REVALIDATION_REQUIRED',
      'CONFLICTED',
    ]),
  }),
  z.object({
    decisionClass: z.literal('FIELD_VISIT_READINESS'),
    status: z.enum([
      'READY',
      'READY_WITH_LIMITATIONS',
      'NOT_READY',
      'REVALIDATION_REQUIRED',
      'UNRESOLVED',
      'CONFLICTED',
    ]),
  }),
]);

export type DecisionEvaluationOutcome = z.infer<typeof DecisionEvaluationOutcomeSchema>;
export type DecisionOutcomeStatus = DecisionEvaluationOutcome['status'];

export const DecisionEvaluationReceiptCandidateSchema = z.object({
  snapshotId: z.string().min(1).max(128),
  snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
  decisionClass: SupportedClassSchema,
  contractId: z.string().min(1).max(128),
  contractVersion: VersionSchema,
  ruleSetId: z.string().min(1).max(128),
  ruleSetVersion: VersionSchema,
  evaluatorId: z.literal(DECISION_EVALUATOR_ID),
  evaluatorVersion: VersionSchema,
  outcome: DecisionEvaluationOutcomeSchema,
  reasons: z.array(DecisionOutcomeReasonSchema).min(1).max(32),
  limitations: z.array(z.string().min(1).max(256)).max(32),
  evaluatedAt: z.string().datetime({ offset: true }),
  evidenceIds: z.array(z.string().min(1).max(128)).max(64),
  receiptIds: z.array(z.string().min(1).max(128)).max(64),
  provenanceActivityId: z.string().min(1).max(128).optional(),
});

export type DecisionEvaluationReceiptCandidate = z.infer<
  typeof DecisionEvaluationReceiptCandidateSchema
>;

export const DecisionEvaluationRequestSchema = z.object({
  evaluationId: z.string().min(1).max(128),
  snapshot: DecisionSnapshotSchema,
  ruleSet: DecisionRuleSetSchema,
  policy: DecisionEvaluationPolicySchema.optional(),
  provenanceActivityId: z.string().min(1).max(128).optional(),
  evaluatorVersion: VersionSchema.optional(),
  reanalysisOfEvaluationId: z.string().min(1).max(128).optional(),
});

export type DecisionEvaluationRequest = z.input<typeof DecisionEvaluationRequestSchema>;

export const DecisionEvaluationResultSchema = z.object({
  evaluationId: z.string().min(1).max(128),
  evaluatorId: z.literal(DECISION_EVALUATOR_ID),
  evaluatorVersion: VersionSchema,
  decisionClass: SupportedClassSchema,
  outcome: DecisionEvaluationOutcomeSchema,
  reasons: z.array(DecisionOutcomeReasonSchema).min(1).max(32),
  limitations: z.array(z.string().min(1).max(256)).max(32),
  ruleEvaluations: z.array(DecisionRuleEvaluationSchema).max(64),
  receipt: DecisionEvaluationReceiptCandidateSchema,
  provenanceActivityId: z.string().min(1).max(128).optional(),
  upstreamProvenanceIds: z.array(z.string()).max(0),
  reanalysisOfEvaluationId: z.string().min(1).max(128).optional(),
});

export type DecisionEvaluationResult = z.infer<typeof DecisionEvaluationResultSchema>;

const APPLICABLE_DOMAINS: Record<z.infer<typeof SupportedClassSchema>, ReadonlySet<string>> = {
  COLLECTION_PERMISSION: new Set([
    'COLLECTION_RULE',
    'LAND_MANAGEMENT',
    'CLOSURE',
    'MINING_CLAIM',
    'MINERAL_ESTATE',
    'LAND_OWNERSHIP',
  ]),
  SITE_ACCESS: new Set(['ROAD_TRAIL_ACCESS', 'CLOSURE', 'LAND_MANAGEMENT']),
  ROUTE_ACCESS: new Set(['ROAD_TRAIL_ACCESS', 'CLOSURE']),
  CLOSURE_STATUS: new Set(['CLOSURE']),
  FIELD_VISIT_READINESS: new Set([
    'ROAD_TRAIL_ACCESS',
    'CLOSURE',
    'SAFETY',
    'LAND_MANAGEMENT',
    'WEATHER',
    'FIRE',
  ]),
};

type SupportedClass = z.infer<typeof SupportedClassSchema>;
type GateKind =
  | 'GAP'
  | 'CONFLICT'
  | 'RULE_CONFLICT'
  | 'REVALIDATION'
  | 'NO_RULE'
  | 'COVERAGE'
  | 'OTHER';

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function sameVersion(left: DecisionRuleVersion, right: DecisionRuleVersion): boolean {
  return left.major === right.major && left.minor === right.minor && left.patch === right.patch;
}

function compareRules(left: DecisionRule, right: DecisionRule): number {
  const idOrder = left.id.localeCompare(right.id);
  if (idOrder !== 0) return idOrder;
  if (left.version.major !== right.version.major) return left.version.major - right.version.major;
  if (left.version.minor !== right.version.minor) return left.version.minor - right.version.minor;
  return left.version.patch - right.version.patch;
}

function withheldStatus(decisionClass: SupportedClass, kind: GateKind): DecisionOutcomeStatus {
  if (kind === 'REVALIDATION') return 'REVALIDATION_REQUIRED';
  if (kind === 'CONFLICT' || kind === 'RULE_CONFLICT') return 'CONFLICTED';
  if (decisionClass === 'ROUTE_ACCESS') return 'ROUTE_STATUS_UNRESOLVED';
  if (decisionClass === 'CLOSURE_STATUS') return 'UNKNOWN';
  return 'UNRESOLVED';
}

function reasonForGate(kind: GateKind): DecisionOutcomeReasonCode {
  if (kind === 'REVALIDATION') return 'REVALIDATION_REQUIRED';
  if (kind === 'RULE_CONFLICT') return 'UNRESOLVED_RULE_CONFLICT';
  if (kind === 'CONFLICT') return 'UNRESOLVED_EVIDENCE_CONFLICT';
  if (kind === 'NO_RULE') return 'NO_APPLICABLE_RULE';
  if (kind === 'COVERAGE') return 'INSUFFICIENT_COVERAGE';
  if (kind === 'OTHER') return 'OTHER';
  return 'REQUIRED_EVIDENCE_INCOMPLETE';
}

function hasLimits(snapshot: DecisionSnapshot, selected: readonly DecisionRule[]): boolean {
  if (snapshot.completeness.status === 'COMPLETE_WITH_LIMITATIONS') return true;
  if (snapshot.completeness.limitations.length > 0) return true;
  return selected.some((item) => item.conditions.length > 0 || item.limitations.length > 0);
}

function statusForEffect(
  decisionClass: SupportedClass,
  effect: DecisionRule['effect'],
  limited: boolean
): DecisionOutcomeStatus {
  if (effect === 'REQUIRE_REVALIDATION') return 'REVALIDATION_REQUIRED';
  if (decisionClass === 'COLLECTION_PERMISSION') {
    if (effect === 'PROHIBIT' || effect === 'CLOSE' || effect === 'RESTRICT') return 'PROHIBITED';
    if (effect === 'PERMIT_WITH_CONDITIONS' || effect === 'WARN' || limited) {
      return effect === 'UNRESOLVED' ? 'UNRESOLVED' : 'ALLOWED_WITH_CONDITIONS';
    }
    if (effect === 'PERMIT' || effect === 'OPEN') return 'ALLOWED';
    return 'UNRESOLVED';
  }
  if (decisionClass === 'SITE_ACCESS') {
    if (effect === 'PROHIBIT' || effect === 'CLOSE') return 'NOT_ACCESSIBLE';
    if (effect === 'UNRESOLVED') return 'UNRESOLVED';
    if (
      effect === 'PERMIT_WITH_CONDITIONS' ||
      effect === 'WARN' ||
      effect === 'RESTRICT' ||
      limited
    ) {
      return 'ACCESSIBLE_WITH_CONDITIONS';
    }
    return 'ACCESSIBLE';
  }
  if (decisionClass === 'ROUTE_ACCESS') {
    if (effect === 'PROHIBIT' || effect === 'CLOSE') return 'ROUTE_CLOSED';
    if (effect === 'UNRESOLVED') return 'ROUTE_STATUS_UNRESOLVED';
    if (
      effect === 'PERMIT_WITH_CONDITIONS' ||
      effect === 'WARN' ||
      effect === 'RESTRICT' ||
      limited
    ) {
      return 'ROUTE_OPEN_WITH_CONDITIONS';
    }
    return 'ROUTE_OPEN';
  }
  if (decisionClass === 'CLOSURE_STATUS') {
    if (effect === 'PROHIBIT' || effect === 'CLOSE') return 'CLOSED';
    if (effect === 'RESTRICT' || effect === 'PERMIT_WITH_CONDITIONS' || effect === 'WARN') {
      return 'RESTRICTED';
    }
    if (effect === 'UNRESOLVED') return 'UNKNOWN';
    return 'OPEN';
  }
  if (effect === 'PROHIBIT' || effect === 'CLOSE' || effect === 'RESTRICT') return 'NOT_READY';
  if (effect === 'UNRESOLVED') return 'UNRESOLVED';
  if (effect === 'PERMIT_WITH_CONDITIONS' || effect === 'WARN' || limited)
    return 'READY_WITH_LIMITATIONS';
  return 'READY';
}

function reasonForEffect(
  decisionClass: SupportedClass,
  effect: DecisionRule['effect']
): DecisionOutcomeReasonCode {
  if (effect === 'REQUIRE_REVALIDATION') return 'REVALIDATION_REQUIRED';
  if (effect === 'PROHIBIT') return 'BLOCKING_RULE_APPLIES';
  if (effect === 'CLOSE') return 'CLOSURE_APPLIES';
  if (effect === 'RESTRICT') {
    return decisionClass === 'ROUTE_ACCESS' ? 'ROUTE_RESTRICTION_APPLIES' : 'CLOSURE_APPLIES';
  }
  if (effect === 'PERMIT_WITH_CONDITIONS' || effect === 'WARN') return 'CONDITIONS_APPLY';
  if (effect === 'UNRESOLVED') return 'NO_APPLICABLE_RULE';
  return 'PERMISSIVE_RULE_APPLIES';
}

function selectRules(
  rules: readonly DecisionRule[],
  domains: ReadonlySet<string>
): {
  applied: DecisionRule[];
  conflict: boolean;
  superseded: Set<string>;
  applicable: Set<string>;
} {
  const applicableRules = rules.filter(
    (item) => domains.has(item.domain) && item.coverage !== 'NONE'
  );
  const applicable = new Set(applicableRules.map((item) => item.id));
  const superseded = new Set(
    applicableRules
      .map((item) => item.supersedesRuleId)
      .filter((id): id is string => id !== undefined && applicable.has(id))
  );
  const cycle = applicableRules.some(
    (item) =>
      item.supersedesRuleId !== undefined &&
      superseded.has(item.id) &&
      applicableRules.some(
        (other) => other.id === item.supersedesRuleId && other.supersedesRuleId === item.id
      )
  );
  if (cycle) return { applied: [], conflict: true, superseded, applicable };
  const active = applicableRules.filter((item) => !superseded.has(item.id));
  if (active.length === 0) return { applied: [], conflict: false, superseded, applicable };
  const maxSpecificity = Math.max(...active.map((item) => item.specificity ?? 0));
  const specific = active.filter((item) => (item.specificity ?? 0) === maxSpecificity);
  const effects = new Set(specific.map((item) => item.effect));
  if (effects.size === 1) return { applied: specific, conflict: false, superseded, applicable };
  const priorities = specific.map((item) => item.priority);
  if (priorities.every((priority) => priority !== undefined)) {
    const maxPriority = Math.max(...priorities);
    const preferred = specific.filter((item) => item.priority === maxPriority);
    if (
      new Set(preferred.map((item) => item.effect)).size === 1 &&
      preferred.length < specific.length
    ) {
      return { applied: preferred, conflict: false, superseded, applicable };
    }
  }
  return { applied: [], conflict: true, superseded, applicable };
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function decisionEvaluatorUsesLiveProvider(): false {
  return false;
}

export function decisionEvaluatorManufacturesUpstreamProvenance(): false {
  return false;
}

export function decisionEvaluatorMutatesUges(): false {
  return false;
}

export async function evaluateDecision(
  input: DecisionEvaluationRequest
): Promise<DecisionEvaluationResult> {
  const parsed = DecisionEvaluationRequestSchema.safeParse(input);
  if (!parsed.success) {
    const versionIssue = parsed.error.issues.some((issue) => issue.path.includes('version'));
    if (versionIssue) throw new Error('exact rule-set version is required');
    throw new Error('snapshot is required');
  }
  const request = parsed.data;
  if (request.ruleSet.decisionClass !== request.snapshot.decisionClass) {
    throw new Error('snapshot decision class must match the rule set');
  }
  const supported = SupportedClassSchema.safeParse(request.snapshot.decisionClass);
  if (!supported.success) {
    throw new Error('decision class is outside decision evaluator r1');
  }
  const decisionClass = supported.data;
  await validateDecisionSnapshot(request.snapshot);
  const evaluatorVersion = request.evaluatorVersion ?? DECISION_EVALUATOR_VERSION;
  const policy = request.policy ?? DecisionEvaluationPolicySchema.parse({});
  const rules = [...request.ruleSet.rules].sort(compareRules);
  const implemented = sameVersion(evaluatorVersion, DECISION_EVALUATOR_VERSION);
  const selection = implemented
    ? selectRules(rules, APPLICABLE_DOMAINS[decisionClass])
    : {
        applied: [],
        conflict: false,
        superseded: new Set<string>(),
        applicable: new Set<string>(),
      };

  let gate: GateKind | undefined;
  if (!implemented) gate = 'OTHER';
  else if (
    (request.snapshot.completeness.status === 'REVALIDATION_REQUIRED' ||
      request.snapshot.temporal.revalidationRequired) &&
    request.snapshot.context.revalidatedForTarget !== true
  ) {
    gate = 'REVALIDATION';
  } else if (
    request.snapshot.completeness.status === 'CONFLICTED' ||
    (request.snapshot.contradictions.length > 0 && policy.conflictMode === 'STRICT')
  ) {
    gate = 'CONFLICT';
  } else if (
    request.snapshot.completeness.status === 'INCOMPLETE' ||
    request.snapshot.completeness.status === 'UNRESOLVED' ||
    request.snapshot.completeness.status === 'NOT_APPLICABLE' ||
    request.snapshot.gaps.some((gap) => gap.blocking)
  ) {
    gate = 'GAP';
  } else if (
    request.snapshot.completeness.status === 'COMPLETE_WITH_LIMITATIONS' &&
    !policy.permitLimitedEvaluation
  ) {
    gate = 'GAP';
  } else if (selection.conflict) gate = 'RULE_CONFLICT';
  else if (selection.applied.length === 0) gate = 'NO_RULE';
  else if (selection.applied.some((item) => item.coverage === 'PARTIAL')) gate = 'COVERAGE';

  const limited = hasLimits(request.snapshot, selection.applied);
  const lead = [...selection.applied].sort(compareRules)[0];
  const status =
    gate === undefined && lead !== undefined
      ? statusForEffect(decisionClass, lead.effect, limited)
      : withheldStatus(decisionClass, gate ?? 'NO_RULE');
  const outcome = DecisionEvaluationOutcomeSchema.parse({ decisionClass, status });
  const reasons = uniqueReason([
    {
      code:
        gate === undefined && lead !== undefined
          ? reasonForEffect(decisionClass, lead.effect)
          : reasonForGate(gate ?? 'NO_RULE'),
      detail:
        gate === undefined && lead !== undefined
          ? `synthetic rule effect ${lead.effect} selected`
          : `evaluation withheld: ${gate ?? 'NO_RULE'}`,
      ruleId: gate === undefined ? lead?.id : undefined,
      sourceRuleRef: gate === undefined ? lead?.sourceRuleRef : undefined,
    },
  ]);
  const limitations = uniqueSorted([
    ...request.snapshot.completeness.limitations,
    ...(gate === undefined
      ? selection.applied.flatMap((item) => [...item.limitations, ...item.conditions])
      : []),
  ]);
  const appliedIds = new Set(selection.applied.map((item) => item.id));
  const ruleEvaluations = rules.map((item) => ({
    ruleId: item.id,
    ruleVersion: item.version,
    effect: item.effect,
    status: ruleStatus(item, selection, appliedIds, implemented),
  }));
  const receipt = {
    snapshotId: request.snapshot.id,
    snapshotHash: request.snapshot.hash.value,
    decisionClass,
    contractId: request.snapshot.contract.contractId,
    contractVersion: request.snapshot.contract.contractVersion,
    ruleSetId: request.ruleSet.id,
    ruleSetVersion: request.ruleSet.version,
    evaluatorId: DECISION_EVALUATOR_ID,
    evaluatorVersion,
    outcome,
    reasons,
    limitations,
    evaluatedAt: request.snapshot.context.evaluatedAt,
    evidenceIds: request.snapshot.evidence.map((item) => item.candidateId),
    receiptIds: request.snapshot.evidence.map((item) => item.admissionReceiptId),
    provenanceActivityId: request.provenanceActivityId,
  };
  return deepFreeze(
    DecisionEvaluationResultSchema.parse({
      evaluationId: request.evaluationId,
      evaluatorId: DECISION_EVALUATOR_ID,
      evaluatorVersion,
      decisionClass,
      outcome,
      reasons,
      limitations,
      ruleEvaluations,
      receipt,
      provenanceActivityId: request.provenanceActivityId,
      upstreamProvenanceIds: [],
      reanalysisOfEvaluationId: request.reanalysisOfEvaluationId,
    })
  );
}

function ruleStatus(
  item: DecisionRule,
  selection: { conflict: boolean; superseded: Set<string>; applicable: Set<string> },
  appliedIds: Set<string>,
  implemented: boolean
): DecisionRuleEvaluation['status'] {
  if (!implemented || !selection.applicable.has(item.id)) return 'NOT_APPLICABLE';
  if (selection.superseded.has(item.id)) return 'SUPERSEDED';
  if (appliedIds.has(item.id)) return 'APPLIED';
  if (selection.conflict) return 'CONFLICTED';
  return 'NOT_SELECTED';
}

function uniqueReason(reasons: DecisionOutcomeReason[]): DecisionOutcomeReason[] {
  return [...reasons].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code);
    if (codeOrder !== 0) return codeOrder;
    return left.detail.localeCompare(right.detail);
  });
}
