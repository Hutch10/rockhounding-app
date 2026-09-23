/**
 * Decision Snapshot R1
 *
 * Freezes the evidence, contract, gaps, and time used to prepare a decision.
 * It does not produce a decision outcome and it does not execute replay.
 *
 * Canonical order, used for storage and the integrity hash:
 * evidence by candidate id then receipt id;
 * gaps by requirement id then reason;
 * contradictions by contradiction id;
 * policy references by policy id then version;
 * context parameters by key.
 */

import { z } from 'zod';

import {
  DecisionEvidenceBundleSchema,
  DecisionEvidenceGapSchema,
  type DecisionClass,
  type DecisionEvidenceContractVersion,
  type DecisionEvidenceGap,
} from './decision-evidence-contracts';

export const DECISION_SNAPSHOT_SCHEMA_VERSION = 1;
export const DECISION_SNAPSHOT_HASH_SCOPE = 'canonical-decision-snapshot-v1';
export const DECISION_SNAPSHOT_BLOCK_ID = 'rockhounding:decision-snapshot';

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

const CompletenessSchema = z.enum([
  'COMPLETE',
  'COMPLETE_WITH_LIMITATIONS',
  'INCOMPLETE',
  'UNRESOLVED',
  'CONFLICTED',
  'REVALIDATION_REQUIRED',
  'NOT_APPLICABLE',
]);

export type DecisionSnapshotId = string;
export type DecisionSnapshotVersion = typeof DECISION_SNAPSHOT_SCHEMA_VERSION;

export const DecisionSnapshotContextSchema = z.object({
  evaluatedAt: z.string().datetime({ offset: true }),
  targetDecisionTime: z.string().datetime({ offset: true }).optional(),
  revalidatedForTarget: z.boolean().optional(),
  applicability: z
    .record(z.string().min(1).max(64), z.enum(['APPLICABLE', 'NOT_APPLICABLE', 'UNRESOLVED']))
    .default({}),
  targetLocationRef: z.string().min(1).max(128).optional(),
  targetGeometryRef: z.string().min(1).max(128).optional(),
  targetSiteRef: z.string().min(1).max(128).optional(),
  targetRouteRef: z.string().min(1).max(128).optional(),
  targetSampleRef: z.string().min(1).max(128).optional(),
  decisionPurpose: z.string().min(1).max(128).optional(),
  contextParameters: z
    .array(z.object({ key: z.string().min(1).max(64), value: z.string().min(1).max(256) }))
    .max(32)
    .default([]),
});

export type DecisionSnapshotContext = z.infer<typeof DecisionSnapshotContextSchema>;

export const DecisionSnapshotContractReferenceSchema = z.object({
  contractId: z.string().min(1).max(128),
  contractVersion: VersionSchema,
  decisionClass: DecisionClassSchema,
  contractDefinitionRef: z.string().min(1).max(256).optional(),
});

export type DecisionSnapshotContractReference = z.infer<
  typeof DecisionSnapshotContractReferenceSchema
>;

export const DecisionSnapshotEvidenceReferenceSchema = z.object({
  candidateId: z.string().min(1).max(128),
  candidateKind: z.string().min(1).max(64),
  admissionReceiptId: z.string().min(1).max(128),
  admissionPolicyId: z.string().min(1).max(128),
  admissionPolicyVersion: VersionSchema,
  admissionDecision: z.string().min(1).max(64),
  domain: z.string().min(1).max(64),
  purpose: z.string().min(1).max(64),
  role: z.string().min(1).max(64),
  temporalFitness: z.string().min(1).max(64),
});

export type DecisionSnapshotEvidenceReference = z.infer<
  typeof DecisionSnapshotEvidenceReferenceSchema
>;

export const DecisionSnapshotAdmissionReferenceSchema = DecisionSnapshotEvidenceReferenceSchema;
export type DecisionSnapshotAdmissionReference = DecisionSnapshotEvidenceReference;

export const DecisionSnapshotGapReferenceSchema = DecisionEvidenceGapSchema;
export type DecisionSnapshotGapReference = DecisionEvidenceGap;

export const DecisionSnapshotContradictionReferenceSchema = z.object({
  contradictionId: z.string().min(1).max(160),
  domains: z.array(z.string().min(1).max(64)).min(1).max(8),
  evidenceIds: z.array(z.string().min(1).max(128)).min(1).max(16),
  resolutionState: z.enum(['NONE', 'UNRESOLVED', 'RESOLVED_BY_AUTHORITY']),
  policyBehavior: z.literal('RECORDED'),
});

export type DecisionSnapshotContradictionReference = z.infer<
  typeof DecisionSnapshotContradictionReferenceSchema
>;

export const DecisionSnapshotPolicyReferenceSchema = z.object({
  policyId: z.string().min(1).max(128),
  version: VersionSchema,
});

export type DecisionSnapshotPolicyReference = z.infer<typeof DecisionSnapshotPolicyReferenceSchema>;

export const DecisionSnapshotProvenanceReferenceSchema = z.object({
  activityId: z.string().min(1).max(128),
  softwareVersion: z.string().min(1).max(64).optional(),
  upstreamProvenanceIds: z.array(z.string().min(1).max(128)).max(32),
});

export type DecisionSnapshotProvenanceReference = z.infer<
  typeof DecisionSnapshotProvenanceReferenceSchema
>;

export const DecisionSnapshotTemporalContextSchema = z.object({
  evaluatedAt: z.string().datetime({ offset: true }),
  targetDecisionTime: z.string().datetime({ offset: true }).optional(),
  revalidationRequired: z.boolean(),
  evidenceTemporal: z
    .array(
      z.object({
        candidateId: z.string().min(1).max(128),
        fitness: z.string().min(1).max(64),
      })
    )
    .max(64),
});

export type DecisionSnapshotTemporalContext = z.infer<typeof DecisionSnapshotTemporalContextSchema>;

export const DecisionSnapshotCompletenessSchema = z.object({
  status: CompletenessSchema,
  requirements: z
    .array(
      z.object({
        requirementId: z.string().min(1).max(128),
        status: z.string().min(1).max(64),
        gaps: z.array(z.string().min(1).max(64)).max(16),
      })
    )
    .max(32),
  limitations: z.array(z.string().min(1).max(256)).max(32),
});

export type DecisionSnapshotCompleteness = z.infer<typeof DecisionSnapshotCompletenessSchema>;

export const DecisionSnapshotHashDescriptorSchema = z.object({
  algorithm: z.literal('SHA-256'),
  value: z.string().regex(/^[a-f0-9]{64}$/),
  scope: z.literal(DECISION_SNAPSHOT_HASH_SCOPE),
});

export type DecisionSnapshotHashDescriptor = z.infer<typeof DecisionSnapshotHashDescriptorSchema>;

export const DecisionSnapshotSupersessionSchema = z.object({
  supersedesSnapshotId: z.string().min(1).max(128),
  supersededBySnapshotId: z.string().min(1).max(128).optional(),
  reason: z.string().min(1).max(500),
  createdAt: z.string().datetime({ offset: true }),
});

export type DecisionSnapshotSupersession = z.infer<typeof DecisionSnapshotSupersessionSchema>;

export const DecisionSnapshotReplayMetadataSchema = z.object({
  kind: z.literal('REPLAY'),
  contractId: z.string().min(1).max(128),
  contractVersion: VersionSchema,
  admissionPolicies: z.array(DecisionSnapshotPolicyReferenceSchema).max(64),
  evidenceIds: z.array(z.string().min(1).max(128)).max(64),
  receiptIds: z.array(z.string().min(1).max(128)).max(64),
  schemaVersion: z.literal(DECISION_SNAPSHOT_SCHEMA_VERSION),
  softwareVersion: z.string().min(1).max(64).optional(),
  provenanceActivityId: z.string().min(1).max(128),
  integrityHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export type DecisionSnapshotReplayMetadata = z.infer<typeof DecisionSnapshotReplayMetadataSchema>;

export const DecisionReanalysisDescriptorSchema = z.object({
  kind: z.literal('REANALYSIS'),
  priorSnapshotId: z.string().min(1).max(128),
});

export type DecisionReanalysisDescriptor = z.infer<typeof DecisionReanalysisDescriptorSchema>;

const EvaluationInputSchema = z.object({
  contractId: z.string().min(1).max(128),
  contractVersion: VersionSchema,
  decisionClass: DecisionClassSchema,
  completeness: CompletenessSchema,
  requirements: z
    .array(
      z.object({
        requirementId: z.string().min(1).max(128),
        status: z.string().min(1).max(64),
        gaps: z.array(z.string().min(1).max(64)).max(16),
      })
    )
    .max(32),
  gaps: z.array(DecisionEvidenceGapSchema).max(64),
  limitations: z.array(z.string().min(1).max(256)).max(32),
});

export const DecisionSnapshotCreateInputSchema = z.object({
  id: z.string().min(1).max(128),
  createdAt: z.string().datetime({ offset: true }),
  decisionClass: DecisionClassSchema,
  evaluation: EvaluationInputSchema,
  bundles: z.array(DecisionEvidenceBundleSchema).max(64),
  context: DecisionSnapshotContextSchema,
  provenanceActivityId: z.string().min(1).max(128),
  softwareVersion: z.string().min(1).max(64).optional(),
  contractDefinitionRef: z.string().min(1).max(256).optional(),
  supersession: DecisionSnapshotSupersessionSchema.omit({
    supersededBySnapshotId: true,
  }).optional(),
  reanalysisOfSnapshotId: z.string().min(1).max(128).optional(),
});

export type DecisionSnapshotCreateInput = z.input<typeof DecisionSnapshotCreateInputSchema>;

export const DecisionSnapshotSchema = z.object({
  id: z.string().min(1).max(128),
  schemaVersion: z.literal(DECISION_SNAPSHOT_SCHEMA_VERSION),
  decisionClass: DecisionClassSchema,
  createdAt: z.string().datetime({ offset: true }),
  contract: DecisionSnapshotContractReferenceSchema,
  context: DecisionSnapshotContextSchema,
  evidence: z.array(DecisionSnapshotEvidenceReferenceSchema).max(64),
  admissions: z.array(DecisionSnapshotAdmissionReferenceSchema).max(64),
  policies: z.array(DecisionSnapshotPolicyReferenceSchema).max(64),
  completeness: DecisionSnapshotCompletenessSchema,
  gaps: z.array(DecisionSnapshotGapReferenceSchema).max(64),
  contradictions: z.array(DecisionSnapshotContradictionReferenceSchema).max(64),
  temporal: DecisionSnapshotTemporalContextSchema,
  provenance: DecisionSnapshotProvenanceReferenceSchema,
  replay: DecisionSnapshotReplayMetadataSchema,
  reanalysisOfSnapshotId: z.string().min(1).max(128).optional(),
  supersession: DecisionSnapshotSupersessionSchema.optional(),
  hash: DecisionSnapshotHashDescriptorSchema,
});

export type DecisionSnapshot = z.infer<typeof DecisionSnapshotSchema>;

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
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`;
  }
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

function sameVersion(
  left: DecisionEvidenceContractVersion,
  right: DecisionEvidenceContractVersion
): boolean {
  return left.major === right.major && left.minor === right.minor && left.patch === right.patch;
}

function sortedCopy<T>(items: readonly T[], compare: (left: T, right: T) => number): T[] {
  return [...items].sort(compare);
}

async function digest(material: unknown): Promise<DecisionSnapshotHashDescriptor> {
  const canonical = canonicalize(material);
  const hashed = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  const value = [...new Uint8Array(hashed)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return { algorithm: 'SHA-256', value, scope: DECISION_SNAPSHOT_HASH_SCOPE };
}

function hashMaterial(snapshot: {
  decisionClass: DecisionClass;
  contract: DecisionSnapshotContractReference;
  context: DecisionSnapshotContext;
  evidence: DecisionSnapshotEvidenceReference[];
  policies: DecisionSnapshotPolicyReference[];
  completeness: DecisionSnapshotCompleteness;
  gaps: DecisionEvidenceGap[];
  contradictions: DecisionSnapshotContradictionReference[];
  temporal: DecisionSnapshotTemporalContext;
}): Record<string, unknown> {
  return {
    schemaVersion: DECISION_SNAPSHOT_SCHEMA_VERSION,
    decisionClass: snapshot.decisionClass,
    contract: snapshot.contract,
    context: snapshot.context,
    evidence: snapshot.evidence,
    policies: snapshot.policies,
    completeness: snapshot.completeness,
    gaps: snapshot.gaps,
    contradictions: snapshot.contradictions,
    temporal: snapshot.temporal,
  };
}

export function decisionSnapshotEmitsOutcome(): false {
  return false;
}

export function decisionSnapshotHashIsSignature(): false {
  return false;
}

export function decisionSnapshotManufacturesUpstreamProvenance(): false {
  return false;
}

export function describeDecisionReanalysis(priorSnapshotId: string): DecisionReanalysisDescriptor {
  return deepFreeze(
    DecisionReanalysisDescriptorSchema.parse({ kind: 'REANALYSIS', priorSnapshotId })
  );
}

export async function createDecisionSnapshot(
  input: DecisionSnapshotCreateInput
): Promise<DecisionSnapshot> {
  const parsed = DecisionSnapshotCreateInputSchema.parse(structuredClone(input));
  if (parsed.decisionClass !== parsed.evaluation.decisionClass) {
    throw new Error('decision class does not match the contract evaluation');
  }
  if (Date.parse(parsed.createdAt) < Date.parse(parsed.context.evaluatedAt)) {
    throw new Error('snapshot time precedes evaluation time');
  }
  if (parsed.supersession?.supersedesSnapshotId === parsed.id) {
    throw new Error('a snapshot cannot supersede itself');
  }
  const candidateIds = parsed.bundles.map((bundle) => bundle.candidate.id);
  if (new Set(candidateIds).size !== candidateIds.length) {
    throw new Error('duplicate evidence reference');
  }

  const evidence = sortedCopy(parsed.bundles, (left, right) =>
    left.candidate.id.localeCompare(right.candidate.id)
  ).map((bundle) => ({
    candidateId: bundle.candidate.id,
    candidateKind: bundle.candidate.kind,
    admissionReceiptId: bundle.receipt.requestId,
    admissionPolicyId: bundle.policy.policyId,
    admissionPolicyVersion: { ...bundle.policy.version },
    admissionDecision: bundle.receipt.decision,
    domain: bundle.receipt.domain,
    purpose: bundle.receipt.purpose,
    role: bundle.receipt.evidenceRole,
    temporalFitness: bundle.receipt.temporalFitness,
  }));

  const policies = sortedCopy(
    evidence.map((item) => ({
      policyId: item.admissionPolicyId,
      version: item.admissionPolicyVersion,
    })),
    (left, right) => {
      const idOrder = left.policyId.localeCompare(right.policyId);
      if (idOrder !== 0) return idOrder;
      if (left.version.major !== right.version.major)
        return left.version.major - right.version.major;
      if (left.version.minor !== right.version.minor)
        return left.version.minor - right.version.minor;
      return left.version.patch - right.version.patch;
    }
  ).filter(
    (policy, index, all) =>
      all.findIndex(
        (item) => item.policyId === policy.policyId && sameVersion(item.version, policy.version)
      ) === index
  );

  const gaps = sortedCopy(parsed.evaluation.gaps, (left, right) => {
    const requirementOrder = left.requirementId.localeCompare(right.requirementId);
    if (requirementOrder !== 0) return requirementOrder;
    return left.reason.localeCompare(right.reason);
  });
  const contradictions = sortedCopy(
    parsed.bundles
      .filter((bundle) => bundle.candidate.contradiction.state !== 'NONE')
      .map((bundle) => ({
        contradictionId: `contradiction:${bundle.candidate.id}`,
        domains: [bundle.receipt.domain],
        evidenceIds: [bundle.candidate.id],
        resolutionState: bundle.candidate.contradiction.state,
        policyBehavior: 'RECORDED' as const,
      })),
    (left, right) => left.contradictionId.localeCompare(right.contradictionId)
  );
  const context = {
    ...parsed.context,
    contextParameters: sortedCopy(parsed.context.contextParameters, (left, right) =>
      left.key.localeCompare(right.key)
    ),
  };
  const temporal = {
    evaluatedAt: context.evaluatedAt,
    targetDecisionTime: context.targetDecisionTime,
    revalidationRequired: parsed.evaluation.completeness === 'REVALIDATION_REQUIRED',
    evidenceTemporal: evidence.map((item) => ({
      candidateId: item.candidateId,
      fitness: item.temporalFitness,
    })),
  };
  const contract = {
    contractId: parsed.evaluation.contractId,
    contractVersion: { ...parsed.evaluation.contractVersion },
    decisionClass: parsed.evaluation.decisionClass,
    contractDefinitionRef: parsed.contractDefinitionRef,
  };
  const completeness = {
    status: parsed.evaluation.completeness,
    requirements: sortedCopy(parsed.evaluation.requirements, (left, right) =>
      left.requirementId.localeCompare(right.requirementId)
    ),
    limitations: [...parsed.evaluation.limitations].sort((left, right) =>
      left.localeCompare(right)
    ),
  };
  const draft = {
    decisionClass: parsed.decisionClass,
    contract,
    context,
    evidence,
    policies,
    completeness,
    gaps,
    contradictions,
    temporal,
  };
  const hash = await digest(hashMaterial(draft));
  const snapshot: DecisionSnapshot = {
    id: parsed.id,
    schemaVersion: DECISION_SNAPSHOT_SCHEMA_VERSION,
    createdAt: parsed.createdAt,
    admissions: evidence,
    provenance: {
      activityId: parsed.provenanceActivityId,
      softwareVersion: parsed.softwareVersion,
      upstreamProvenanceIds: [],
    },
    replay: {
      kind: 'REPLAY',
      contractId: contract.contractId,
      contractVersion: contract.contractVersion,
      admissionPolicies: policies,
      evidenceIds: evidence.map((item) => item.candidateId),
      receiptIds: evidence.map((item) => item.admissionReceiptId),
      schemaVersion: DECISION_SNAPSHOT_SCHEMA_VERSION,
      softwareVersion: parsed.softwareVersion,
      provenanceActivityId: parsed.provenanceActivityId,
      integrityHash: hash.value,
    },
    reanalysisOfSnapshotId: parsed.reanalysisOfSnapshotId,
    supersession: parsed.supersession,
    hash,
    ...draft,
  };
  return deepFreeze(DecisionSnapshotSchema.parse(snapshot));
}

export async function validateDecisionSnapshot(
  snapshot: DecisionSnapshot
): Promise<DecisionSnapshot> {
  const parsed = DecisionSnapshotSchema.parse(structuredClone(snapshot));
  if (parsed.decisionClass !== parsed.contract.decisionClass) {
    throw new Error('decision class does not match the contract evaluation');
  }
  if (Date.parse(parsed.createdAt) < Date.parse(parsed.temporal.evaluatedAt)) {
    throw new Error('snapshot time precedes evaluation time');
  }
  if (parsed.supersession?.supersedesSnapshotId === parsed.id) {
    throw new Error('a snapshot cannot supersede itself');
  }
  if (!sameVersion(parsed.replay.contractVersion, parsed.contract.contractVersion)) {
    throw new Error('replay contract version does not match the pinned contract');
  }
  const evidenceIds = parsed.evidence.map((item) => item.candidateId);
  if (new Set(evidenceIds).size !== evidenceIds.length) {
    throw new Error('duplicate evidence reference');
  }
  const expected = await digest(hashMaterial(parsed));
  if (expected.value !== parsed.hash.value || parsed.replay.integrityHash !== parsed.hash.value) {
    throw new Error('snapshot hash does not match canonical content');
  }
  return deepFreeze(parsed);
}
