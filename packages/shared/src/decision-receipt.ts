/**
 * Decision Receipt R1
 *
 * Freezes the outcome an evaluator already produced. It does not evaluate,
 * query providers, or rewrite the snapshot.
 *
 * Canonical order, used for storage and the integrity hash:
 * reasons by code, then rule id, then detail;
 * limitations lexicographically;
 * applied rules by rule id, then version;
 * evidence ids lexicographically.
 *
 * The hash covers that outcome content. Receipt id, creation time,
 * supersession, and reanalysis links stay outside the hash so a second
 * freeze of the same evaluation matches. The hash is content equivalence,
 * not a signature or a claim of truth.
 */

import { z } from 'zod';

import {
  DecisionEvaluationOutcomeSchema,
  DecisionEvaluationResultSchema,
  DecisionOutcomeReasonCodeSchema,
  type DecisionEvaluationResult,
  type DecisionOutcomeReason,
} from './decision-evaluator';
import {
  DecisionSnapshotSchema,
  validateDecisionSnapshot,
  type DecisionSnapshot,
} from './decision-snapshot';

export const DECISION_RECEIPT_SCHEMA_VERSION = 1;
export const DECISION_RECEIPT_HASH_SCOPE = 'canonical-decision-receipt-v1';
export const DECISION_RECEIPT_BLOCK_ID = 'rockhounding:decision-receipt';

const VersionSchema = z.object({
  major: z.number().int().nonnegative(),
  minor: z.number().int().nonnegative(),
  patch: z.number().int().nonnegative(),
});

const SupportedClassSchema = z.enum([
  'COLLECTION_PERMISSION',
  'SITE_ACCESS',
  'ROUTE_ACCESS',
  'CLOSURE_STATUS',
  'FIELD_VISIT_READINESS',
]);

export type DecisionReceiptId = string;
export type DecisionReceiptVersion = typeof DECISION_RECEIPT_SCHEMA_VERSION;
export type DecisionReceiptOutcome = z.infer<typeof DecisionEvaluationOutcomeSchema>;
export type DecisionReceiptLimitation = string;

export const DecisionReceiptReasonSchema = z.object({
  code: DecisionOutcomeReasonCodeSchema,
  detail: z.string().min(1).max(500),
  ruleId: z.string().min(1).max(128).optional(),
  ruleVersion: VersionSchema.optional(),
  sourceRuleRef: z.string().min(1).max(256).optional(),
});

export type DecisionReceiptReason = z.infer<typeof DecisionReceiptReasonSchema>;

export const DecisionReceiptSnapshotReferenceSchema = z.object({
  id: z.string().min(1).max(128),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  schemaVersion: z.number().int().positive(),
  decisionClass: SupportedClassSchema,
});

export type DecisionReceiptSnapshotReference = z.infer<
  typeof DecisionReceiptSnapshotReferenceSchema
>;

export const DecisionReceiptContractReferenceSchema = z.object({
  contractId: z.string().min(1).max(128),
  contractVersion: VersionSchema,
});

export type DecisionReceiptContractReference = z.infer<
  typeof DecisionReceiptContractReferenceSchema
>;

export const DecisionReceiptRuleSetReferenceSchema = z.object({
  ruleSetId: z.string().min(1).max(128),
  ruleSetVersion: VersionSchema,
});

export type DecisionReceiptRuleSetReference = z.infer<typeof DecisionReceiptRuleSetReferenceSchema>;

export const DecisionReceiptEvaluatorReferenceSchema = z.object({
  evaluatorId: z.string().min(1).max(128),
  evaluatorVersion: VersionSchema,
});

export type DecisionReceiptEvaluatorReference = z.infer<
  typeof DecisionReceiptEvaluatorReferenceSchema
>;

export const DecisionReceiptAppliedRuleSchema = z.object({
  ruleId: z.string().min(1).max(128),
  ruleVersion: VersionSchema,
});

export const DecisionReceiptProvenanceReferenceSchema = z.object({
  evaluationProvenanceActivityId: z.string().min(1).max(128).optional(),
  receiptCreationProvenanceActivityId: z.string().min(1).max(128).optional(),
  upstreamProvenanceIds: z.array(z.string()).max(0),
});

export type DecisionReceiptProvenanceReference = z.infer<
  typeof DecisionReceiptProvenanceReferenceSchema
>;

export const DecisionReceiptHashDescriptorSchema = z.object({
  algorithm: z.literal('SHA-256'),
  value: z.string().regex(/^[a-f0-9]{64}$/),
  scope: z.literal(DECISION_RECEIPT_HASH_SCOPE),
});

export type DecisionReceiptHashDescriptor = z.infer<typeof DecisionReceiptHashDescriptorSchema>;

export const DecisionReceiptSupersessionSchema = z.object({
  supersedesReceiptId: z.string().min(1).max(128),
  supersededByReceiptId: z.string().min(1).max(128).optional(),
  reason: z.string().min(1).max(500),
  createdAt: z.string().datetime({ offset: true }),
});

export type DecisionReceiptSupersession = z.infer<typeof DecisionReceiptSupersessionSchema>;

export const DecisionReceiptReanalysisReferenceSchema = z.object({
  kind: z.literal('REANALYSIS_OF'),
  receiptId: z.string().min(1).max(128),
});

export type DecisionReceiptReanalysisReference = z.infer<
  typeof DecisionReceiptReanalysisReferenceSchema
>;

export const DecisionReceiptReplayMetadataSchema = z.object({
  kind: z.literal('REPLAY'),
  snapshotId: z.string().min(1).max(128),
  snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
  contractId: z.string().min(1).max(128),
  contractVersion: VersionSchema,
  ruleSetId: z.string().min(1).max(128),
  ruleSetVersion: VersionSchema,
  evaluatorId: z.string().min(1).max(128),
  evaluatorVersion: VersionSchema,
  integrityHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export type DecisionReceiptReplayMetadata = z.infer<typeof DecisionReceiptReplayMetadataSchema>;

export const DecisionReceiptSchema = z.object({
  id: z.string().min(1).max(128),
  schemaVersion: z.literal(DECISION_RECEIPT_SCHEMA_VERSION),
  createdAt: z.string().datetime({ offset: true }),
  evaluatedAt: z.string().datetime({ offset: true }),
  decisionClass: SupportedClassSchema,
  snapshot: DecisionReceiptSnapshotReferenceSchema,
  contract: DecisionReceiptContractReferenceSchema,
  ruleSet: DecisionReceiptRuleSetReferenceSchema,
  evaluator: DecisionReceiptEvaluatorReferenceSchema,
  outcome: DecisionEvaluationOutcomeSchema,
  reasons: z.array(DecisionReceiptReasonSchema).min(1).max(32),
  limitations: z.array(z.string().min(1).max(256)).max(32),
  appliedRules: z.array(DecisionReceiptAppliedRuleSchema).max(64),
  evidenceIds: z.array(z.string().min(1).max(128)).max(64),
  completenessStatus: z.string().min(1).max(64),
  provenance: DecisionReceiptProvenanceReferenceSchema,
  hash: DecisionReceiptHashDescriptorSchema,
  replay: DecisionReceiptReplayMetadataSchema,
  supersession: DecisionReceiptSupersessionSchema.optional(),
  reanalysis: DecisionReceiptReanalysisReferenceSchema.optional(),
});

export type DecisionReceipt = z.infer<typeof DecisionReceiptSchema>;

export const DecisionReceiptCreateInputSchema = z.object({
  id: z.string().min(1).max(128),
  createdAt: z.string().datetime({ offset: true }),
  evaluation: DecisionEvaluationResultSchema,
  snapshot: DecisionSnapshotSchema,
  limitations: z.array(z.string().min(1).max(256)).max(32).optional(),
  receiptCreationProvenanceActivityId: z.string().min(1).max(128).optional(),
  supersession: DecisionReceiptSupersessionSchema.omit({ supersededByReceiptId: true }).optional(),
  reanalysisOfReceiptId: z.string().min(1).max(128).optional(),
});

export type DecisionReceiptCreateInput = z.input<typeof DecisionReceiptCreateInputSchema>;

type Version = z.infer<typeof VersionSchema>;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item)).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function sameVersion(left: Version, right: Version): boolean {
  return left.major === right.major && left.minor === right.minor && left.patch === right.patch;
}

function compareVersions(left: Version, right: Version): number {
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

function compareReasons(left: DecisionReceiptReason, right: DecisionReceiptReason): number {
  const codeOrder = left.code.localeCompare(right.code);
  if (codeOrder !== 0) return codeOrder;
  const ruleOrder = (left.ruleId ?? '').localeCompare(right.ruleId ?? '');
  if (ruleOrder !== 0) return ruleOrder;
  return left.detail.localeCompare(right.detail);
}

function reasonIdentity(reason: DecisionOutcomeReason | DecisionReceiptReason): string {
  return `${reason.code}\u0000${reason.ruleId ?? ''}\u0000${reason.detail}\u0000${reason.sourceRuleRef ?? ''}`;
}

function sameReasonSet(
  left: readonly DecisionOutcomeReason[],
  right: readonly DecisionOutcomeReason[]
): boolean {
  const sortedLeft = [...left].map(reasonIdentity).sort((a, b) => a.localeCompare(b));
  const sortedRight = [...right].map(reasonIdentity).sort((a, b) => a.localeCompare(b));
  return canonicalize(sortedLeft) === canonicalize(sortedRight);
}

function sameTextSet(left: readonly string[], right: readonly string[]): boolean {
  const sortedLeft = [...left].sort((a, b) => a.localeCompare(b));
  const sortedRight = [...right].sort((a, b) => a.localeCompare(b));
  return canonicalize(sortedLeft) === canonicalize(sortedRight);
}

async function digest(material: unknown): Promise<DecisionReceiptHashDescriptor> {
  const hashed = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalize(material))
  );
  const value = [...new Uint8Array(hashed)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return { algorithm: 'SHA-256', value, scope: DECISION_RECEIPT_HASH_SCOPE };
}

function hashMaterial(receipt: {
  decisionClass: DecisionReceipt['decisionClass'];
  snapshot: DecisionReceiptSnapshotReference;
  contract: DecisionReceiptContractReference;
  ruleSet: DecisionReceiptRuleSetReference;
  evaluator: DecisionReceiptEvaluatorReference;
  outcome: DecisionReceiptOutcome;
  reasons: DecisionReceiptReason[];
  limitations: string[];
  appliedRules: Array<{ ruleId: string; ruleVersion: Version }>;
  evidenceIds: string[];
  completenessStatus: string;
  evaluatedAt: string;
  evaluationProvenanceActivityId?: string;
}): Record<string, unknown> {
  return {
    schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION,
    decisionClass: receipt.decisionClass,
    snapshot: receipt.snapshot,
    contract: receipt.contract,
    ruleSet: receipt.ruleSet,
    evaluator: receipt.evaluator,
    outcome: receipt.outcome,
    reasons: receipt.reasons,
    limitations: receipt.limitations,
    appliedRules: receipt.appliedRules,
    evidenceIds: receipt.evidenceIds,
    completenessStatus: receipt.completenessStatus,
    evaluatedAt: receipt.evaluatedAt,
    evaluationProvenanceActivityId: receipt.evaluationProvenanceActivityId,
  };
}

export function decisionReceiptHashIsSignature(): false {
  return false;
}

export function decisionReceiptManufacturesUpstreamProvenance(): false {
  return false;
}

export function decisionReceiptReevaluates(): false {
  return false;
}

export async function createDecisionReceipt(
  input: DecisionReceiptCreateInput
): Promise<DecisionReceipt> {
  const parsed = DecisionReceiptCreateInputSchema.safeParse(input);
  if (!parsed.success) {
    const outcomeIssue = parsed.error.issues.some(
      (issue) => issue.path.includes('outcome') || issue.path.includes('status')
    );
    if (outcomeIssue) throw new Error('outcome is not valid for the decision class');
    const versionIssue = parsed.error.issues.some((issue) => issue.path.includes('version'));
    if (versionIssue) throw new Error('exact version is required');
    throw new Error('evaluation result is required');
  }
  const request = parsed.data;
  if (
    request.snapshot.decisionClass !== request.evaluation.decisionClass ||
    request.evaluation.outcome.decisionClass !== request.evaluation.decisionClass ||
    request.evaluation.receipt.decisionClass !== request.evaluation.decisionClass
  ) {
    throw new Error('snapshot decision class must match the evaluation');
  }
  if (request.snapshot.id !== request.evaluation.receipt.snapshotId) {
    throw new Error('snapshot id does not match the evaluation');
  }
  if (request.snapshot.hash.value !== request.evaluation.receipt.snapshotHash) {
    throw new Error('snapshot hash does not match the evaluation');
  }
  assertCandidate(request.evaluation);
  if (
    request.limitations !== undefined &&
    !sameTextSet(request.limitations, request.evaluation.limitations)
  ) {
    throw new Error('limitations do not match the evaluation');
  }
  if (request.supersession?.supersedesReceiptId === request.id) {
    throw new Error('a receipt cannot supersede itself');
  }
  if (request.reanalysisOfReceiptId === request.id) {
    throw new Error('a receipt cannot reanalyze itself');
  }
  if (Date.parse(request.createdAt) < Date.parse(request.evaluation.receipt.evaluatedAt)) {
    throw new Error('receipt time precedes evaluation time');
  }
  await validateDecisionSnapshot(request.snapshot);
  return deepFreeze(await assembleReceipt(request));
}

function assertCandidate(evaluation: DecisionEvaluationResult): void {
  const candidate = evaluation.receipt;
  if (
    candidate.outcome.decisionClass !== evaluation.outcome.decisionClass ||
    candidate.outcome.status !== evaluation.outcome.status ||
    !sameVersion(candidate.evaluatorVersion, evaluation.evaluatorVersion) ||
    !sameReasonSet(candidate.reasons, evaluation.reasons) ||
    !sameTextSet(candidate.limitations, evaluation.limitations) ||
    candidate.contractId.length === 0
  ) {
    throw new Error('evaluation candidate does not match the evaluation');
  }
}

async function assembleReceipt(
  request: z.infer<typeof DecisionReceiptCreateInputSchema>
): Promise<DecisionReceipt> {
  const evaluation = request.evaluation;
  const snapshot: DecisionSnapshot = request.snapshot;
  const versions = new Map(
    evaluation.ruleEvaluations.map((item) => [item.ruleId, item.ruleVersion] as const)
  );
  const reasons = evaluation.reasons
    .map((reason) => {
      const ruleVersion = reason.ruleId === undefined ? undefined : versions.get(reason.ruleId);
      return {
        code: reason.code,
        detail: reason.detail,
        ruleId: reason.ruleId,
        ruleVersion,
        sourceRuleRef: reason.sourceRuleRef,
      };
    })
    .sort(compareReasons);
  const duplicate = reasons.some(
    (reason, index) =>
      index > 0 && reasonIdentity(reason) === reasonIdentity(reasons[index - 1] ?? reason)
  );
  if (duplicate) throw new Error('duplicate reason');
  const limitations = [...evaluation.limitations].sort((left, right) => left.localeCompare(right));
  const appliedRules = evaluation.ruleEvaluations
    .filter((item) => item.status === 'APPLIED')
    .map((item) => ({ ruleId: item.ruleId, ruleVersion: item.ruleVersion }))
    .sort((left, right) => {
      const idOrder = left.ruleId.localeCompare(right.ruleId);
      if (idOrder !== 0) return idOrder;
      return compareVersions(left.ruleVersion, right.ruleVersion);
    });
  const evidenceIds = [...evaluation.receipt.evidenceIds].sort((left, right) =>
    left.localeCompare(right)
  );
  const snapshotReference = {
    id: snapshot.id,
    hash: snapshot.hash.value,
    schemaVersion: snapshot.schemaVersion,
    decisionClass: request.evaluation.decisionClass,
  };
  const contract = {
    contractId: evaluation.receipt.contractId,
    contractVersion: evaluation.receipt.contractVersion,
  };
  const ruleSet = {
    ruleSetId: evaluation.receipt.ruleSetId,
    ruleSetVersion: evaluation.receipt.ruleSetVersion,
  };
  const evaluator = {
    evaluatorId: evaluation.evaluatorId,
    evaluatorVersion: evaluation.evaluatorVersion,
  };
  const provenance = {
    evaluationProvenanceActivityId: evaluation.provenanceActivityId,
    receiptCreationProvenanceActivityId: request.receiptCreationProvenanceActivityId,
    upstreamProvenanceIds: [] as string[],
  };
  const hash = await digest(
    hashMaterial({
      decisionClass: evaluation.decisionClass,
      snapshot: snapshotReference,
      contract,
      ruleSet,
      evaluator,
      outcome: evaluation.outcome,
      reasons,
      limitations,
      appliedRules,
      evidenceIds,
      completenessStatus: snapshot.completeness.status,
      evaluatedAt: evaluation.receipt.evaluatedAt,
      evaluationProvenanceActivityId: provenance.evaluationProvenanceActivityId,
    })
  );
  const replay = {
    kind: 'REPLAY' as const,
    snapshotId: snapshotReference.id,
    snapshotHash: snapshotReference.hash,
    contractId: contract.contractId,
    contractVersion: contract.contractVersion,
    ruleSetId: ruleSet.ruleSetId,
    ruleSetVersion: ruleSet.ruleSetVersion,
    evaluatorId: evaluator.evaluatorId,
    evaluatorVersion: evaluator.evaluatorVersion,
    integrityHash: hash.value,
  };
  return DecisionReceiptSchema.parse({
    id: request.id,
    schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION,
    createdAt: request.createdAt,
    evaluatedAt: evaluation.receipt.evaluatedAt,
    decisionClass: evaluation.decisionClass,
    snapshot: snapshotReference,
    contract,
    ruleSet,
    evaluator,
    outcome: evaluation.outcome,
    reasons,
    limitations,
    appliedRules,
    evidenceIds,
    completenessStatus: snapshot.completeness.status,
    provenance,
    hash,
    replay,
    supersession: request.supersession,
    reanalysis:
      request.reanalysisOfReceiptId === undefined
        ? undefined
        : { kind: 'REANALYSIS_OF' as const, receiptId: request.reanalysisOfReceiptId },
  });
}

export async function validateDecisionReceipt(receipt: DecisionReceipt): Promise<DecisionReceipt> {
  const parsed = DecisionReceiptSchema.parse(receipt);
  if (parsed.outcome.decisionClass !== parsed.decisionClass) {
    throw new Error('outcome is not valid for the decision class');
  }
  if (parsed.snapshot.decisionClass !== parsed.decisionClass) {
    throw new Error('snapshot decision class must match the receipt');
  }
  if (
    parsed.supersession?.supersedesReceiptId === parsed.id ||
    parsed.supersession?.supersededByReceiptId === parsed.id ||
    parsed.reanalysis?.receiptId === parsed.id
  ) {
    throw new Error('a receipt cannot supersede itself');
  }
  if (Date.parse(parsed.createdAt) < Date.parse(parsed.evaluatedAt)) {
    throw new Error('receipt time precedes evaluation time');
  }
  const hash = await digest(
    hashMaterial({
      decisionClass: parsed.decisionClass,
      snapshot: parsed.snapshot,
      contract: parsed.contract,
      ruleSet: parsed.ruleSet,
      evaluator: parsed.evaluator,
      outcome: parsed.outcome,
      reasons: parsed.reasons,
      limitations: parsed.limitations,
      appliedRules: parsed.appliedRules,
      evidenceIds: parsed.evidenceIds,
      completenessStatus: parsed.completenessStatus,
      evaluatedAt: parsed.evaluatedAt,
      evaluationProvenanceActivityId: parsed.provenance.evaluationProvenanceActivityId,
    })
  );
  if (hash.value !== parsed.hash.value || parsed.replay.integrityHash !== parsed.hash.value) {
    throw new Error('receipt hash does not match canonical content');
  }
  return deepFreeze(parsed);
}
