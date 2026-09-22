/**
 * Source Governance Contract R1
 *
 * Persistence-free rules for admitting cataloged sources into downstream
 * workflows. Governance does not describe what a resource is, what a layer
 * can do, or what an evidence record asserts.
 *
 * A governance record cannot: generate UGES assertions, elevate authority,
 * authorize collection, or interpret regulation as executable law.
 */

import { z } from 'zod';

import { ResourceUsage, ResourceUsageSchema } from './resource-catalog';

export const SOURCE_GOVERNANCE_SCHEMA_VERSION = 1;

const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const SourceSubjectKind = {
  RESOURCE: 'RESOURCE',
  LAYER: 'LAYER',
  PROVIDER: 'PROVIDER',
} as const;

export type SourceSubjectKind = (typeof SourceSubjectKind)[keyof typeof SourceSubjectKind];

export const SourceSubjectKindSchema = z.enum(['RESOURCE', 'LAYER', 'PROVIDER']);

export const SourceGovernanceStatus = {
  CANDIDATE: 'CANDIDATE',
  ADMITTED: 'ADMITTED',
  RESTRICTED: 'RESTRICTED',
  SUSPENDED: 'SUSPENDED',
  DEPRECATED: 'DEPRECATED',
  REJECTED: 'REJECTED',
} as const;

export type SourceGovernanceStatus =
  (typeof SourceGovernanceStatus)[keyof typeof SourceGovernanceStatus];

export const SourceGovernanceStatusSchema = z.enum([
  'CANDIDATE',
  'ADMITTED',
  'RESTRICTED',
  'SUSPENDED',
  'DEPRECATED',
  'REJECTED',
]);

export const SourceReviewState = {
  UNREVIEWED: 'UNREVIEWED',
  REVIEWED: 'REVIEWED',
  NEEDS_REVALIDATION: 'NEEDS_REVALIDATION',
} as const;

export type SourceReviewState = (typeof SourceReviewState)[keyof typeof SourceReviewState];

export const SourceReviewStateSchema = z.enum(['UNREVIEWED', 'REVIEWED', 'NEEDS_REVALIDATION']);

export const SourceAdmissionClass = {
  UNGOVERNED: 'UNGOVERNED',
  GOVERNED_METADATA: 'GOVERNED_METADATA',
  GOVERNED_DECISION_INPUT: 'GOVERNED_DECISION_INPUT',
  RESEARCH_ONLY: 'RESEARCH_ONLY',
} as const;

export type SourceAdmissionClass = (typeof SourceAdmissionClass)[keyof typeof SourceAdmissionClass];

export const SourceAdmissionClassSchema = z.enum([
  'UNGOVERNED',
  'GOVERNED_METADATA',
  'GOVERNED_DECISION_INPUT',
  'RESEARCH_ONLY',
]);

export const SourceRevalidationPolicy = {
  NEVER: 'NEVER',
  ON_EXPIRY: 'ON_EXPIRY',
  BEFORE_DECISION_USE: 'BEFORE_DECISION_USE',
} as const;

export type SourceRevalidationPolicy =
  (typeof SourceRevalidationPolicy)[keyof typeof SourceRevalidationPolicy];

export const SourceRevalidationPolicySchema = z.enum(['NEVER', 'ON_EXPIRY', 'BEFORE_DECISION_USE']);

export const SourceConstraintValue = {
  ALLOWED: 'ALLOWED',
  PROHIBITED: 'PROHIBITED',
} as const;

export type SourceConstraintValue =
  (typeof SourceConstraintValue)[keyof typeof SourceConstraintValue];

export const SourceConstraintValueSchema = z.enum(['ALLOWED', 'PROHIBITED']);

export const SourceGovernanceLimitationCode = {
  UNVERIFIED_CURRENCY: 'UNVERIFIED_CURRENCY',
  COMMUNITY_SOURCED: 'COMMUNITY_SOURCED',
  LEGAL_NONAUTHORITATIVE: 'LEGAL_NONAUTHORITATIVE',
  MODEL_DERIVED: 'MODEL_DERIVED',
  DECISION_INPUT_ONLY: 'DECISION_INPUT_ONLY',
  RESEARCH_SCOPE: 'RESEARCH_SCOPE',
} as const;

export type SourceGovernanceLimitationCode =
  (typeof SourceGovernanceLimitationCode)[keyof typeof SourceGovernanceLimitationCode];

export const SourceGovernanceLimitationCodeSchema = z.enum([
  'UNVERIFIED_CURRENCY',
  'COMMUNITY_SOURCED',
  'LEGAL_NONAUTHORITATIVE',
  'MODEL_DERIVED',
  'DECISION_INPUT_ONLY',
  'RESEARCH_SCOPE',
]);

const COMMUNITY_SUBJECT_IDS: ReadonlySet<string> = new Set([
  'res-local-field-observations',
  'rockhound-field-observations',
]);

export const SourceGovernanceSubjectSchema = z.object({
  kind: SourceSubjectKindSchema,
  id: z.string().min(1).max(128),
});

export type SourceGovernanceSubject = z.infer<typeof SourceGovernanceSubjectSchema>;

export const SourceGovernanceConstraintsSchema = z.object({
  authorityPromotion: SourceConstraintValueSchema,
  collectionAuthorization: SourceConstraintValueSchema,
  legalInterpretation: SourceConstraintValueSchema,
  assertionGeneration: SourceConstraintValueSchema,
});

export type SourceGovernanceConstraints = z.infer<typeof SourceGovernanceConstraintsSchema>;

export const SourceGovernanceLimitationSchema = z.object({
  code: SourceGovernanceLimitationCodeSchema,
  description: z.string().min(1).max(1000).optional(),
});

export type SourceGovernanceLimitation = z.infer<typeof SourceGovernanceLimitationSchema>;

export const SourceGovernanceRecordSchema = z
  .object({
    id: z.string().min(1).max(128),
    schemaVersion: z.literal(SOURCE_GOVERNANCE_SCHEMA_VERSION),
    subject: SourceGovernanceSubjectSchema,
    status: SourceGovernanceStatusSchema,
    reviewState: SourceReviewStateSchema,
    admissionClass: SourceAdmissionClassSchema,
    allowedUses: z.array(ResourceUsageSchema).min(1).max(16),
    deniedUses: z.array(ResourceUsageSchema).max(16).default([]),
    revalidationPolicy: SourceRevalidationPolicySchema,
    constraints: SourceGovernanceConstraintsSchema,
    limitations: z.array(SourceGovernanceLimitationSchema).min(1).max(32),
    effectiveFrom: IsoDateTimeSchema.optional(),
    effectiveTo: IsoDateTimeSchema.optional(),
  })
  .superRefine((record, ctx) => {
    if (
      record.effectiveFrom !== undefined &&
      record.effectiveTo !== undefined &&
      Date.parse(record.effectiveFrom) > Date.parse(record.effectiveTo)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'effectiveFrom must be less than or equal to effectiveTo',
        path: ['effectiveTo'],
      });
    }

    const allowed = new Set(record.allowedUses);
    for (const use of record.deniedUses) {
      if (allowed.has(use)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'allowedUses and deniedUses cannot overlap',
          path: ['deniedUses'],
        });
        break;
      }
    }

    if (record.constraints.authorityPromotion === SourceConstraintValue.ALLOWED) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Source governance cannot promote authority class',
        path: ['constraints', 'authorityPromotion'],
      });
    }
    if (record.constraints.collectionAuthorization === SourceConstraintValue.ALLOWED) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Source governance cannot authorize collection',
        path: ['constraints', 'collectionAuthorization'],
      });
    }
    if (record.constraints.legalInterpretation === SourceConstraintValue.ALLOWED) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Source governance cannot interpret regulation as executable law',
        path: ['constraints', 'legalInterpretation'],
      });
    }
    if (record.constraints.assertionGeneration === SourceConstraintValue.ALLOWED) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Source governance cannot generate UGES assertions',
        path: ['constraints', 'assertionGeneration'],
      });
    }

    if (
      COMMUNITY_SUBJECT_IDS.has(record.subject.id) &&
      record.constraints.authorityPromotion !== SourceConstraintValue.PROHIBITED
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Community/user subjects cannot receive authority promotion',
        path: ['constraints', 'authorityPromotion'],
      });
    }
  });

export type SourceGovernanceRecord = z.infer<typeof SourceGovernanceRecordSchema>;

export function validateSourceGovernanceRecord(input: unknown): SourceGovernanceRecord {
  return SourceGovernanceRecordSchema.parse(input);
}

function cloneRecord(record: SourceGovernanceRecord): SourceGovernanceRecord {
  return structuredClone(record);
}

function sortedClone(records: readonly SourceGovernanceRecord[]): SourceGovernanceRecord[] {
  return [...records].sort((left, right) => left.id.localeCompare(right.id)).map(cloneRecord);
}

export type SourceAdmissionDecision = {
  admitted: boolean;
  reason: string;
};

export function evaluateSourceAdmission(
  record: SourceGovernanceRecord,
  intendedUse: ResourceUsage
): SourceAdmissionDecision {
  if (
    record.status === SourceGovernanceStatus.REJECTED ||
    record.status === SourceGovernanceStatus.SUSPENDED ||
    record.status === SourceGovernanceStatus.CANDIDATE
  ) {
    return { admitted: false, reason: `status ${record.status} is not admissible` };
  }
  if (record.deniedUses.includes(intendedUse)) {
    return { admitted: false, reason: `use ${intendedUse} is denied` };
  }
  if (!record.allowedUses.includes(intendedUse)) {
    return { admitted: false, reason: `use ${intendedUse} is not allowed` };
  }
  if (
    record.status === SourceGovernanceStatus.DEPRECATED &&
    intendedUse !== ResourceUsage.RESEARCH_ONLY
  ) {
    return { admitted: false, reason: 'deprecated sources are limited to RESEARCH_ONLY' };
  }
  return { admitted: true, reason: 'admitted for declared use' };
}

export function governanceAuthorizesCollection(_record: SourceGovernanceRecord): boolean {
  return false;
}

export function governanceElevatesAuthority(_record: SourceGovernanceRecord): boolean {
  return false;
}

export function governanceCreatesUgesAssertion(_record: SourceGovernanceRecord): boolean {
  return false;
}

export function governanceInterpretsLaw(_record: SourceGovernanceRecord): boolean {
  return false;
}

export type SourceGovernanceContract = {
  readonly schemaVersion: typeof SOURCE_GOVERNANCE_SCHEMA_VERSION;
  getSourceGovernanceRecord: (id: string) => SourceGovernanceRecord | undefined;
  listSourceGovernanceRecords: () => SourceGovernanceRecord[];
  listGovernanceByStatus: (status: SourceGovernanceStatus) => SourceGovernanceRecord[];
  listGovernanceBySubject: (kind: SourceSubjectKind, subjectId: string) => SourceGovernanceRecord[];
};

export function createSourceGovernanceContract(
  records: readonly SourceGovernanceRecord[] = BUILTIN_SOURCE_GOVERNANCE_RECORDS
): SourceGovernanceContract {
  const parsed = records.map((record) => validateSourceGovernanceRecord(record));
  const ids = parsed.map((record) => record.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Duplicate governance IDs are not allowed');
  }

  const byId = new Map(parsed.map((record) => [record.id, cloneRecord(record)] as const));

  return {
    schemaVersion: SOURCE_GOVERNANCE_SCHEMA_VERSION,
    getSourceGovernanceRecord(id: string): SourceGovernanceRecord | undefined {
      const found = byId.get(id);
      if (found === undefined) {
        return undefined;
      }
      return cloneRecord(found);
    },
    listSourceGovernanceRecords(): SourceGovernanceRecord[] {
      return sortedClone([...byId.values()]);
    },
    listGovernanceByStatus(status: SourceGovernanceStatus): SourceGovernanceRecord[] {
      return sortedClone([...byId.values()].filter((record) => record.status === status));
    },
    listGovernanceBySubject(kind: SourceSubjectKind, subjectId: string): SourceGovernanceRecord[] {
      return sortedClone(
        [...byId.values()].filter(
          (record) => record.subject.kind === kind && record.subject.id === subjectId
        )
      );
    },
  };
}

export function listSourceGovernanceRecords(
  contract: SourceGovernanceContract
): SourceGovernanceRecord[] {
  return contract.listSourceGovernanceRecords();
}

export function listGovernanceByStatus(
  contract: SourceGovernanceContract,
  status: SourceGovernanceStatus
): SourceGovernanceRecord[] {
  return contract.listGovernanceByStatus(status);
}

export function listGovernanceBySubject(
  contract: SourceGovernanceContract,
  kind: SourceSubjectKind,
  subjectId: string
): SourceGovernanceRecord[] {
  return contract.listGovernanceBySubject(kind, subjectId);
}

const PROHIBITED_CONSTRAINTS: SourceGovernanceConstraints = {
  authorityPromotion: 'PROHIBITED',
  collectionAuthorization: 'PROHIBITED',
  legalInterpretation: 'PROHIBITED',
  assertionGeneration: 'PROHIBITED',
};

export const BUILTIN_SOURCE_GOVERNANCE_RECORDS: readonly SourceGovernanceRecord[] = [
  validateSourceGovernanceRecord({
    id: 'gov-usgs-ngmdb',
    schemaVersion: SOURCE_GOVERNANCE_SCHEMA_VERSION,
    subject: { kind: SourceSubjectKind.RESOURCE, id: 'res-usgs-ngmdb' },
    status: SourceGovernanceStatus.ADMITTED,
    reviewState: SourceReviewState.REVIEWED,
    admissionClass: SourceAdmissionClass.GOVERNED_METADATA,
    allowedUses: [
      ResourceUsage.DISCOVERY,
      ResourceUsage.GEOLOGICAL_CONTEXT,
      ResourceUsage.RESEARCH_ONLY,
    ],
    deniedUses: [ResourceUsage.COLLECTION_DECISION_INPUT],
    revalidationPolicy: SourceRevalidationPolicy.ON_EXPIRY,
    constraints: PROHIBITED_CONSTRAINTS,
    limitations: [{ code: SourceGovernanceLimitationCode.UNVERIFIED_CURRENCY }],
  }),
  validateSourceGovernanceRecord({
    id: 'gov-usgs-mrds',
    schemaVersion: SOURCE_GOVERNANCE_SCHEMA_VERSION,
    subject: { kind: SourceSubjectKind.RESOURCE, id: 'res-usgs-mrds' },
    status: SourceGovernanceStatus.ADMITTED,
    reviewState: SourceReviewState.REVIEWED,
    admissionClass: SourceAdmissionClass.GOVERNED_METADATA,
    allowedUses: [
      ResourceUsage.DISCOVERY,
      ResourceUsage.GEOLOGICAL_CONTEXT,
      ResourceUsage.RESEARCH_ONLY,
    ],
    deniedUses: [ResourceUsage.COLLECTION_DECISION_INPUT],
    revalidationPolicy: SourceRevalidationPolicy.ON_EXPIRY,
    constraints: PROHIBITED_CONSTRAINTS,
    limitations: [{ code: SourceGovernanceLimitationCode.UNVERIFIED_CURRENCY }],
  }),
  validateSourceGovernanceRecord({
    id: 'gov-usgs-3dep',
    schemaVersion: SOURCE_GOVERNANCE_SCHEMA_VERSION,
    subject: { kind: SourceSubjectKind.RESOURCE, id: 'res-usgs-3dep' },
    status: SourceGovernanceStatus.ADMITTED,
    reviewState: SourceReviewState.REVIEWED,
    admissionClass: SourceAdmissionClass.GOVERNED_METADATA,
    allowedUses: [
      ResourceUsage.ROUTE_DECISION_INPUT,
      ResourceUsage.GEOLOGICAL_CONTEXT,
      ResourceUsage.RESEARCH_ONLY,
    ],
    deniedUses: [],
    revalidationPolicy: SourceRevalidationPolicy.ON_EXPIRY,
    constraints: PROHIBITED_CONSTRAINTS,
    limitations: [{ code: SourceGovernanceLimitationCode.UNVERIFIED_CURRENCY }],
  }),
  validateSourceGovernanceRecord({
    id: 'gov-blm-mlrs',
    schemaVersion: SOURCE_GOVERNANCE_SCHEMA_VERSION,
    subject: { kind: SourceSubjectKind.RESOURCE, id: 'res-blm-mlrs' },
    status: SourceGovernanceStatus.ADMITTED,
    reviewState: SourceReviewState.REVIEWED,
    admissionClass: SourceAdmissionClass.GOVERNED_DECISION_INPUT,
    allowedUses: [ResourceUsage.COLLECTION_DECISION_INPUT, ResourceUsage.DISCOVERY],
    deniedUses: [],
    revalidationPolicy: SourceRevalidationPolicy.BEFORE_DECISION_USE,
    constraints: PROHIBITED_CONSTRAINTS,
    limitations: [
      { code: SourceGovernanceLimitationCode.DECISION_INPUT_ONLY },
      { code: SourceGovernanceLimitationCode.LEGAL_NONAUTHORITATIVE },
    ],
  }),
  validateSourceGovernanceRecord({
    id: 'gov-nws-alerts',
    schemaVersion: SOURCE_GOVERNANCE_SCHEMA_VERSION,
    subject: { kind: SourceSubjectKind.RESOURCE, id: 'res-nws-alerts' },
    status: SourceGovernanceStatus.ADMITTED,
    reviewState: SourceReviewState.REVIEWED,
    admissionClass: SourceAdmissionClass.GOVERNED_DECISION_INPUT,
    allowedUses: [ResourceUsage.SAFETY_DECISION_INPUT, ResourceUsage.ROUTE_DECISION_INPUT],
    deniedUses: [ResourceUsage.COLLECTION_DECISION_INPUT],
    revalidationPolicy: SourceRevalidationPolicy.BEFORE_DECISION_USE,
    constraints: PROHIBITED_CONSTRAINTS,
    limitations: [{ code: SourceGovernanceLimitationCode.UNVERIFIED_CURRENCY }],
  }),
  validateSourceGovernanceRecord({
    id: 'gov-nasa-firms',
    schemaVersion: SOURCE_GOVERNANCE_SCHEMA_VERSION,
    subject: { kind: SourceSubjectKind.RESOURCE, id: 'res-nasa-firms' },
    status: SourceGovernanceStatus.ADMITTED,
    reviewState: SourceReviewState.REVIEWED,
    admissionClass: SourceAdmissionClass.GOVERNED_DECISION_INPUT,
    allowedUses: [ResourceUsage.SAFETY_DECISION_INPUT],
    deniedUses: [ResourceUsage.COLLECTION_DECISION_INPUT],
    revalidationPolicy: SourceRevalidationPolicy.BEFORE_DECISION_USE,
    constraints: PROHIBITED_CONSTRAINTS,
    limitations: [{ code: SourceGovernanceLimitationCode.MODEL_DERIVED }],
  }),
  validateSourceGovernanceRecord({
    id: 'gov-regulation-document-example',
    schemaVersion: SOURCE_GOVERNANCE_SCHEMA_VERSION,
    subject: { kind: SourceSubjectKind.RESOURCE, id: 'res-regulation-document-example' },
    status: SourceGovernanceStatus.ADMITTED,
    reviewState: SourceReviewState.REVIEWED,
    admissionClass: SourceAdmissionClass.GOVERNED_DECISION_INPUT,
    allowedUses: [ResourceUsage.COLLECTION_DECISION_INPUT, ResourceUsage.RESEARCH_ONLY],
    deniedUses: [],
    revalidationPolicy: SourceRevalidationPolicy.BEFORE_DECISION_USE,
    constraints: PROHIBITED_CONSTRAINTS,
    limitations: [{ code: SourceGovernanceLimitationCode.LEGAL_NONAUTHORITATIVE }],
  }),
  validateSourceGovernanceRecord({
    id: 'gov-local-field-observations',
    schemaVersion: SOURCE_GOVERNANCE_SCHEMA_VERSION,
    subject: { kind: SourceSubjectKind.RESOURCE, id: 'res-local-field-observations' },
    status: SourceGovernanceStatus.ADMITTED,
    reviewState: SourceReviewState.REVIEWED,
    admissionClass: SourceAdmissionClass.GOVERNED_METADATA,
    allowedUses: [
      ResourceUsage.DISCOVERY,
      ResourceUsage.SPECIMEN_CONTEXT,
      ResourceUsage.GEOLOGICAL_CONTEXT,
    ],
    deniedUses: [ResourceUsage.COLLECTION_DECISION_INPUT],
    revalidationPolicy: SourceRevalidationPolicy.ON_EXPIRY,
    constraints: PROHIBITED_CONSTRAINTS,
    limitations: [{ code: SourceGovernanceLimitationCode.COMMUNITY_SOURCED }],
  }),
  validateSourceGovernanceRecord({
    id: 'gov-derived-terrain-analysis',
    schemaVersion: SOURCE_GOVERNANCE_SCHEMA_VERSION,
    subject: { kind: SourceSubjectKind.RESOURCE, id: 'res-derived-terrain-analysis' },
    status: SourceGovernanceStatus.ADMITTED,
    reviewState: SourceReviewState.REVIEWED,
    admissionClass: SourceAdmissionClass.RESEARCH_ONLY,
    allowedUses: [ResourceUsage.ROUTE_DECISION_INPUT, ResourceUsage.RESEARCH_ONLY],
    deniedUses: [ResourceUsage.COLLECTION_DECISION_INPUT],
    revalidationPolicy: SourceRevalidationPolicy.ON_EXPIRY,
    constraints: PROHIBITED_CONSTRAINTS,
    limitations: [{ code: SourceGovernanceLimitationCode.MODEL_DERIVED }],
  }),
];
