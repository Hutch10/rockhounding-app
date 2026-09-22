/**
 * Evidence Quarantine R1
 *
 * Persistence-free holding state for material that cannot safely enter
 * canonical evidence flow. Quarantine preserves and explains. It does not
 * accept, discard, verify, or authorize.
 */

import { z } from 'zod';

import type { SourceAdapterResult } from './source-adapter-contract';
import { EvidenceAuthorityClassSchema } from './universal-geological-evidence-schema';

export const EVIDENCE_QUARANTINE_SCHEMA_VERSION = 1;

const OpaqueIdSchema = z.string().min(1).max(128);
const IsoDateTimeSchema = z.string().datetime({ offset: true });
const VersionSchema = z.object({
  major: z.number().int().nonnegative(),
  minor: z.number().int().nonnegative(),
  patch: z.number().int().nonnegative(),
});

export const EvidenceQuarantineStatus = {
  PENDING_REVIEW: 'PENDING_REVIEW',
  SCHEMA_INVALID: 'SCHEMA_INVALID',
  SEMANTICALLY_UNMAPPED: 'SEMANTICALLY_UNMAPPED',
  SOURCE_VERSION_UNSUPPORTED: 'SOURCE_VERSION_UNSUPPORTED',
  AUTHORITY_CONFLICT: 'AUTHORITY_CONFLICT',
  TEMPORAL_AMBIGUITY: 'TEMPORAL_AMBIGUITY',
  COVERAGE_AMBIGUITY: 'COVERAGE_AMBIGUITY',
  PROVENANCE_INCOMPLETE: 'PROVENANCE_INCOMPLETE',
  GOVERNANCE_BLOCKED: 'GOVERNANCE_BLOCKED',
  DUPLICATE_SUSPECTED: 'DUPLICATE_SUSPECTED',
  MANUAL_REVIEW_REQUIRED: 'MANUAL_REVIEW_REQUIRED',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
  SUPERSEDED: 'SUPERSEDED',
} as const;

export type EvidenceQuarantineStatus =
  (typeof EvidenceQuarantineStatus)[keyof typeof EvidenceQuarantineStatus];

const StatusSchema = z.enum([
  'PENDING_REVIEW',
  'SCHEMA_INVALID',
  'SEMANTICALLY_UNMAPPED',
  'SOURCE_VERSION_UNSUPPORTED',
  'AUTHORITY_CONFLICT',
  'TEMPORAL_AMBIGUITY',
  'COVERAGE_AMBIGUITY',
  'PROVENANCE_INCOMPLETE',
  'GOVERNANCE_BLOCKED',
  'DUPLICATE_SUSPECTED',
  'MANUAL_REVIEW_REQUIRED',
  'RESOLVED',
  'REJECTED',
  'SUPERSEDED',
]);

export const EvidenceQuarantineReasonCode = {
  INVALID_SCHEMA: 'INVALID_SCHEMA',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  UNKNOWN_ENUM_VALUE: 'UNKNOWN_ENUM_VALUE',
  UNRECOGNIZED_TERM: 'UNRECOGNIZED_TERM',
  AMBIGUOUS_SOURCE_VALUE: 'AMBIGUOUS_SOURCE_VALUE',
  UNSUPPORTED_SOURCE_VERSION: 'UNSUPPORTED_SOURCE_VERSION',
  AUTHORITY_ELEVATION_ATTEMPT: 'AUTHORITY_ELEVATION_ATTEMPT',
  GOVERNANCE_UNKNOWN: 'GOVERNANCE_UNKNOWN',
  GOVERNANCE_PROHIBITED: 'GOVERNANCE_PROHIBITED',
  TEMPORAL_VALUE_INVALID: 'TEMPORAL_VALUE_INVALID',
  TEMPORAL_MEANING_UNKNOWN: 'TEMPORAL_MEANING_UNKNOWN',
  COVERAGE_PARTIAL: 'COVERAGE_PARTIAL',
  COVERAGE_UNKNOWN: 'COVERAGE_UNKNOWN',
  PROVENANCE_CONTEXT_MISSING: 'PROVENANCE_CONTEXT_MISSING',
  SOURCE_IDENTITY_MISSING: 'SOURCE_IDENTITY_MISSING',
  DUPLICATE_CANDIDATE: 'DUPLICATE_CANDIDATE',
  NORMALIZATION_FAILED: 'NORMALIZATION_FAILED',
  UNSUPPORTED_GEOMETRY: 'UNSUPPORTED_GEOMETRY',
  UNSUPPORTED_OUTPUT_TYPE: 'UNSUPPORTED_OUTPUT_TYPE',
  MANUAL_REVIEW_REQUIRED: 'MANUAL_REVIEW_REQUIRED',
  OTHER: 'OTHER',
} as const;

export type EvidenceQuarantineReasonCode =
  (typeof EvidenceQuarantineReasonCode)[keyof typeof EvidenceQuarantineReasonCode];

const ReasonCodeSchema = z.enum([
  'INVALID_SCHEMA',
  'REQUIRED_FIELD_MISSING',
  'UNKNOWN_ENUM_VALUE',
  'UNRECOGNIZED_TERM',
  'AMBIGUOUS_SOURCE_VALUE',
  'UNSUPPORTED_SOURCE_VERSION',
  'AUTHORITY_ELEVATION_ATTEMPT',
  'GOVERNANCE_UNKNOWN',
  'GOVERNANCE_PROHIBITED',
  'TEMPORAL_VALUE_INVALID',
  'TEMPORAL_MEANING_UNKNOWN',
  'COVERAGE_PARTIAL',
  'COVERAGE_UNKNOWN',
  'PROVENANCE_CONTEXT_MISSING',
  'SOURCE_IDENTITY_MISSING',
  'DUPLICATE_CANDIDATE',
  'NORMALIZATION_FAILED',
  'UNSUPPORTED_GEOMETRY',
  'UNSUPPORTED_OUTPUT_TYPE',
  'MANUAL_REVIEW_REQUIRED',
  'OTHER',
]);

export const EvidenceQuarantineDispositionKind = {
  KEEP_QUARANTINED: 'KEEP_QUARANTINED',
  RETURN_FOR_REPROCESSING: 'RETURN_FOR_REPROCESSING',
  ADMIT_CANDIDATE: 'ADMIT_CANDIDATE',
  REJECT: 'REJECT',
  SUPERSEDE: 'SUPERSEDE',
  DEFER: 'DEFER',
} as const;

export type EvidenceQuarantineDispositionKind =
  (typeof EvidenceQuarantineDispositionKind)[keyof typeof EvidenceQuarantineDispositionKind];

export const EvidenceQuarantineResolutionKind = {
  MAPPED_WITHOUT_LOSS: 'MAPPED_WITHOUT_LOSS',
  MAPPED_WITH_DECLARED_LOSS: 'MAPPED_WITH_DECLARED_LOSS',
  SOURCE_VERSION_ADDED: 'SOURCE_VERSION_ADDED',
  GOVERNANCE_RESOLVED: 'GOVERNANCE_RESOLVED',
  TEMPORAL_SEMANTICS_RESOLVED: 'TEMPORAL_SEMANTICS_RESOLVED',
  COVERAGE_LIMITATION_ACCEPTED: 'COVERAGE_LIMITATION_ACCEPTED',
  PROVENANCE_COMPLETED: 'PROVENANCE_COMPLETED',
  DUPLICATE_CONFIRMED: 'DUPLICATE_CONFIRMED',
  DUPLICATE_DISMISSED: 'DUPLICATE_DISMISSED',
  REJECTED_UNSAFE: 'REJECTED_UNSAFE',
  OTHER: 'OTHER',
} as const;

export type EvidenceQuarantineResolutionKind =
  (typeof EvidenceQuarantineResolutionKind)[keyof typeof EvidenceQuarantineResolutionKind];

export const EvidenceQuarantineReviewState = {
  UNREVIEWED: 'UNREVIEWED',
  IN_REVIEW: 'IN_REVIEW',
  REVIEWED: 'REVIEWED',
} as const;

export type EvidenceQuarantineReviewState =
  (typeof EvidenceQuarantineReviewState)[keyof typeof EvidenceQuarantineReviewState];

const TERMINAL: ReadonlySet<string> = new Set(['RESOLVED', 'REJECTED', 'SUPERSEDED']);

const ReasonSchema = z.object({
  code: ReasonCodeSchema,
  detail: z.string().min(1).max(1000).optional(),
});

export type EvidenceQuarantineReason = z.infer<typeof ReasonSchema>;

const DiagnosticSchema = z.object({
  code: z.string().min(1).max(64),
  field: z.string().min(1).max(128).optional(),
  detail: z.string().min(1).max(1000).optional(),
});

export type EvidenceQuarantineDiagnostic = z.infer<typeof DiagnosticSchema>;

const SourceReferenceSchema = z.object({
  sourceResourceId: OpaqueIdSchema.optional(),
  sourceRecordId: z.string().min(1).max(256).optional(),
  sourceVersionRef: z.string().min(1).max(64).optional(),
  rawFields: z.record(z.unknown()).optional(),
  rawPayloadRef: z.string().min(1).max(512).optional(),
});

export type EvidenceQuarantineSourceReference = z.infer<typeof SourceReferenceSchema>;

const AdapterReferenceSchema = z.object({
  adapterId: OpaqueIdSchema,
  adapterVersion: VersionSchema,
});

export type EvidenceQuarantineAdapterReference = z.infer<typeof AdapterReferenceSchema>;

const GovernanceReferenceSchema = z.object({
  receiptId: OpaqueIdSchema,
  resourceId: OpaqueIdSchema.optional(),
  decision: z.enum(['ALLOWED', 'UNKNOWN', 'PROHIBITED']).optional(),
});

export type EvidenceQuarantineGovernanceReference = z.infer<typeof GovernanceReferenceSchema>;

const TruthClockReferenceSchema = z.object({
  presence: z.enum(['PRESENT', 'UNKNOWN', 'ABSENT']),
  clock: z
    .object({
      id: OpaqueIdSchema,
      schemaVersion: z.literal(1),
      phenomenonTime: IsoDateTimeSchema.optional(),
      effectiveFrom: IsoDateTimeSchema.optional(),
      effectiveTo: IsoDateTimeSchema.optional(),
      sourceRecordedAt: IsoDateTimeSchema.optional(),
      publishedAt: IsoDateTimeSchema.optional(),
      sourceUpdatedAt: IsoDateTimeSchema.optional(),
      retrievedAt: IsoDateTimeSchema.optional(),
    })
    .optional(),
  rawTemporalValue: z.string().min(1).max(256).optional(),
});

export type EvidenceQuarantineTruthClockReference = z.infer<typeof TruthClockReferenceSchema>;

const ProvenanceReferenceSchema = z.object({
  activityId: OpaqueIdSchema.optional(),
  initialized: z.boolean(),
});

export type EvidenceQuarantineProvenanceReference = z.infer<typeof ProvenanceReferenceSchema>;

const CoverageReferenceSchema = z.object({
  state: z.string().min(1).max(64),
  recordCoverage: z.enum(['COMPLETE', 'PARTIAL', 'UNKNOWN']).optional(),
  geometryCoverage: z.enum(['COMPLETE', 'PARTIAL', 'UNKNOWN']).optional(),
  temporalCoverage: z.enum(['COMPLETE', 'PARTIAL', 'UNKNOWN']).optional(),
  resultCount: z.number().int().nonnegative().optional(),
  reasonCode: z.string().min(1).max(64).optional(),
});

export type EvidenceQuarantineCoverageReference = z.infer<typeof CoverageReferenceSchema>;

const CandidateSchema = z.object({
  kind: z.string().min(1).max(64),
  admission: z.literal('CANDIDATE'),
  verified: z.literal(false),
  origin: z.enum(['DIRECT', 'DERIVED', 'INTERPRETED', 'MODEL_GENERATED']).optional(),
});

const CaptureSchema = z.object({
  status: StatusSchema,
  reasons: z.array(ReasonSchema).min(1).max(32),
  source: SourceReferenceSchema,
  adapter: AdapterReferenceSchema.optional(),
  governance: GovernanceReferenceSchema.optional(),
  truthClock: TruthClockReferenceSchema.optional(),
  coverage: CoverageReferenceSchema.optional(),
  provenance: ProvenanceReferenceSchema.optional(),
  diagnostics: z.array(DiagnosticSchema).max(64),
  candidate: CandidateSchema.optional(),
  normalizedCandidate: z.unknown().optional(),
  attemptedAuthority: z
    .object({
      claimed: EvidenceAuthorityClassSchema,
      accepted: z.literal(false),
    })
    .optional(),
});

const HistoryEntrySchema = z.object({
  timestamp: IsoDateTimeSchema,
  fromStatus: StatusSchema.optional(),
  toStatus: StatusSchema,
  actorRef: z.string().min(1).max(128).optional(),
  reason: z.string().min(1).max(1000),
  notes: z.string().min(1).max(1000).optional(),
  resolutionRef: z.string().min(1).max(128).optional(),
});

export type EvidenceQuarantineHistoryEntry = z.infer<typeof HistoryEntrySchema>;

const DispositionSchema = z.object({
  kind: z.enum([
    'KEEP_QUARANTINED',
    'RETURN_FOR_REPROCESSING',
    'ADMIT_CANDIDATE',
    'REJECT',
    'SUPERSEDE',
    'DEFER',
  ]),
  timestamp: IsoDateTimeSchema,
  actorRef: z.string().min(1).max(128).optional(),
  supersessionRef: OpaqueIdSchema.optional(),
  notes: z.string().min(1).max(1000).optional(),
});

export type EvidenceQuarantineDisposition = z.infer<typeof DispositionSchema>;

const ResolutionSchema = z.object({
  timestamp: IsoDateTimeSchema,
  kind: z.enum([
    'MAPPED_WITHOUT_LOSS',
    'MAPPED_WITH_DECLARED_LOSS',
    'SOURCE_VERSION_ADDED',
    'GOVERNANCE_RESOLVED',
    'TEMPORAL_SEMANTICS_RESOLVED',
    'COVERAGE_LIMITATION_ACCEPTED',
    'PROVENANCE_COMPLETED',
    'DUPLICATE_CONFIRMED',
    'DUPLICATE_DISMISSED',
    'REJECTED_UNSAFE',
    'OTHER',
  ]),
  actorRef: z.string().min(1).max(128).optional(),
  why: z.string().min(1).max(1000),
  governanceReceiptId: OpaqueIdSchema.optional(),
  whatChanged: z.string().min(1).max(1000).optional(),
  whatDidNotChange: z.string().min(1).max(1000).optional(),
});

export type EvidenceQuarantineResolution = z.infer<typeof ResolutionSchema>;

const ReprocessingSchema = z.object({
  timestamp: IsoDateTimeSchema,
  previousAdapterVersion: VersionSchema,
  newAdapterVersion: VersionSchema,
  newCandidateRef: z.string().min(1).max(128).optional(),
  newQuarantineRef: z.string().min(1).max(128).optional(),
});

const DuplicateSchema = z.object({
  state: z.enum(['SUSPECTED', 'CONFIRMED', 'DISMISSED']),
  candidateDuplicateOf: z.array(OpaqueIdSchema).max(32),
  matchingSignals: z.array(z.string().min(1).max(128)).max(32),
});

export const EvidenceQuarantineRecordSchema = z
  .object({
    id: OpaqueIdSchema,
    schemaVersion: z.literal(EVIDENCE_QUARANTINE_SCHEMA_VERSION),
    status: StatusSchema,
    reviewState: z.enum(['UNREVIEWED', 'IN_REVIEW', 'REVIEWED']),
    capture: CaptureSchema,
    history: z.array(HistoryEntrySchema).min(1).max(64),
    dispositions: z.array(DispositionSchema).max(32),
    resolutions: z.array(ResolutionSchema).max(32),
    reprocessing: z.array(ReprocessingSchema).max(32),
    duplicate: DuplicateSchema.optional(),
    admitted: z.literal(false).default(false),
    confirmedAbsence: z.literal(false).default(false),
  })
  .superRefine((record, ctx) => {
    const missingIdentity = record.capture.source.sourceResourceId === undefined;
    const identityIsTheReason = record.capture.reasons.some(
      (reason) => reason.code === 'SOURCE_IDENTITY_MISSING'
    );
    if (missingIdentity && !identityIsTheReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Missing source identity must be an explicit quarantine reason',
        path: ['capture', 'source', 'sourceResourceId'],
      });
    }
    if (
      record.capture.source.rawFields === undefined &&
      record.capture.source.rawPayloadRef === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Quarantine must preserve raw fields or a raw payload reference',
        path: ['capture', 'source'],
      });
    }
    const first = record.history[0];
    const last = record.history[record.history.length - 1];
    if (first?.toStatus !== record.capture.status) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Original history status must match the captured status',
        path: ['history', 0, 'toStatus'],
      });
    }
    if (last?.toStatus !== record.status) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Current status must match the latest history entry',
        path: ['status'],
      });
    }
    for (let index = 1; index < record.history.length; index += 1) {
      const previous = record.history[index - 1];
      const current = record.history[index];
      if (
        previous !== undefined &&
        current !== undefined &&
        Date.parse(current.timestamp) <= Date.parse(previous.timestamp)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Quarantine history timestamps must be strictly increasing',
          path: ['history', index, 'timestamp'],
        });
      }
    }
  });

export type EvidenceQuarantineRecord = z.infer<typeof EvidenceQuarantineRecordSchema>;
export type EvidenceQuarantineId = EvidenceQuarantineRecord['id'];

export function validateEvidenceQuarantineRecord(input: unknown): EvidenceQuarantineRecord {
  return EvidenceQuarantineRecordSchema.parse(input);
}

export function createEvidenceQuarantineRegistry(records: readonly unknown[]): {
  list: () => EvidenceQuarantineRecord[];
  get: (id: string) => EvidenceQuarantineRecord | undefined;
} {
  const parsed = records.map((record) => validateEvidenceQuarantineRecord(record));
  const ids = parsed.map((record) => record.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Duplicate quarantine id is not allowed');
  }
  return {
    list: () => parsed.map((record) => structuredClone(record)),
    get: (id: string) => {
      const found = parsed.find((record) => record.id === id);
      return found === undefined ? undefined : structuredClone(found);
    },
  };
}

export function quarantineAuthorizesUse(): false {
  return false;
}

export function quarantineAdmitsEvidence(): false {
  return false;
}

export function quarantineMarksVerified(): false {
  return false;
}

export function quarantineEstablishesConfirmedAbsence(): false {
  return false;
}

export function quarantineManufacturesProvenance(): false {
  return false;
}

function assertTransition(
  fromStatus: EvidenceQuarantineStatus,
  toStatus: EvidenceQuarantineStatus
): void {
  if (TERMINAL.has(fromStatus) && fromStatus !== toStatus) {
    throw new Error('Invalid quarantine transition');
  }
}

export function appendQuarantineHistory(
  record: EvidenceQuarantineRecord,
  entry: {
    timestamp: string;
    toStatus: EvidenceQuarantineStatus;
    actorRef?: string;
    reason: string;
    notes?: string;
    resolutionRef?: string;
  }
): EvidenceQuarantineRecord {
  assertTransition(record.status, entry.toStatus);
  const next = structuredClone(record);
  next.history.push({
    timestamp: entry.timestamp,
    fromStatus: record.status,
    toStatus: entry.toStatus,
    ...(entry.actorRef === undefined ? {} : { actorRef: entry.actorRef }),
    reason: entry.reason,
    ...(entry.notes === undefined ? {} : { notes: entry.notes }),
    ...(entry.resolutionRef === undefined ? {} : { resolutionRef: entry.resolutionRef }),
  });
  next.status = entry.toStatus;
  return validateEvidenceQuarantineRecord(next);
}

export function applyQuarantineDisposition(
  record: EvidenceQuarantineRecord,
  disposition: EvidenceQuarantineDisposition
): EvidenceQuarantineRecord {
  const next = structuredClone(record);
  next.dispositions.push(structuredClone(disposition));
  next.admitted = false;
  if (next.capture.candidate !== undefined) {
    next.capture.candidate.verified = false;
  }
  if (disposition.kind === EvidenceQuarantineDispositionKind.REJECT) {
    return appendQuarantineHistory(validateEvidenceQuarantineRecord(next), {
      timestamp: disposition.timestamp,
      toStatus: EvidenceQuarantineStatus.REJECTED,
      ...(disposition.actorRef === undefined ? {} : { actorRef: disposition.actorRef }),
      reason: 'disposition REJECT',
    });
  }
  if (disposition.kind === EvidenceQuarantineDispositionKind.SUPERSEDE) {
    return appendQuarantineHistory(validateEvidenceQuarantineRecord(next), {
      timestamp: disposition.timestamp,
      toStatus: EvidenceQuarantineStatus.SUPERSEDED,
      ...(disposition.actorRef === undefined ? {} : { actorRef: disposition.actorRef }),
      reason: 'disposition SUPERSEDE',
    });
  }
  return validateEvidenceQuarantineRecord(next);
}

export function recordQuarantineResolution(
  record: EvidenceQuarantineRecord,
  resolution: EvidenceQuarantineResolution
): EvidenceQuarantineRecord {
  const transitioned = appendQuarantineHistory(record, {
    timestamp: resolution.timestamp,
    toStatus: EvidenceQuarantineStatus.RESOLVED,
    ...(resolution.actorRef === undefined ? {} : { actorRef: resolution.actorRef }),
    reason: resolution.why,
    resolutionRef: resolution.kind,
  });
  transitioned.resolutions.push(structuredClone(resolution));
  transitioned.admitted = false;
  return validateEvidenceQuarantineRecord(transitioned);
}

export function linkQuarantineReprocessing(
  record: EvidenceQuarantineRecord,
  link: {
    timestamp: string;
    previousAdapterVersion: EvidenceQuarantineAdapterReference['adapterVersion'];
    newAdapterVersion: EvidenceQuarantineAdapterReference['adapterVersion'];
    newCandidateRef?: string;
    newQuarantineRef?: string;
  }
): EvidenceQuarantineRecord {
  const next = structuredClone(record);
  next.reprocessing.push({
    timestamp: link.timestamp,
    previousAdapterVersion: link.previousAdapterVersion,
    newAdapterVersion: link.newAdapterVersion,
    ...(link.newCandidateRef === undefined ? {} : { newCandidateRef: link.newCandidateRef }),
    ...(link.newQuarantineRef === undefined ? {} : { newQuarantineRef: link.newQuarantineRef }),
  });
  next.history.push({
    timestamp: link.timestamp,
    fromStatus: record.status,
    toStatus: record.status,
    actorRef: 'SYSTEM',
    reason: 'reprocessing linked',
  });
  return validateEvidenceQuarantineRecord(next);
}

export function setDuplicateAssessment(
  record: EvidenceQuarantineRecord,
  assessment: {
    state: 'SUSPECTED' | 'CONFIRMED' | 'DISMISSED';
    candidateDuplicateOf: string[];
    matchingSignals: string[];
  }
): EvidenceQuarantineRecord {
  const next = structuredClone(record);
  next.duplicate = {
    state: assessment.state,
    candidateDuplicateOf: [...assessment.candidateDuplicateOf],
    matchingSignals: [...assessment.matchingSignals],
  };
  return validateEvidenceQuarantineRecord(next);
}

function reasonFromDiagnostic(code: string): EvidenceQuarantineReasonCode | undefined {
  if (code in EvidenceQuarantineReasonCode) {
    return code as EvidenceQuarantineReasonCode;
  }
  return undefined;
}

export function quarantineFromAdapterResult(
  result: SourceAdapterResult,
  id: string
): EvidenceQuarantineRecord {
  const rawFields = structuredClone(result.raw?.rawFields ?? {});
  const reasons: EvidenceQuarantineReason[] = [];
  const pushReason = (code: EvidenceQuarantineReasonCode, detail?: string): void => {
    if (!reasons.some((reason) => reason.code === code)) {
      reasons.push(detail === undefined ? { code } : { code, detail });
    }
  };
  if (result.failureCode !== undefined) {
    const mapped = reasonFromDiagnostic(result.failureCode);
    if (mapped !== undefined) {
      pushReason(mapped);
    }
  }
  for (const diagnostic of result.diagnostics) {
    const mapped = reasonFromDiagnostic(diagnostic.code);
    if (mapped !== undefined) {
      pushReason(mapped, diagnostic.field);
    }
  }
  if (result.authority?.accepted === false) {
    pushReason(EvidenceQuarantineReasonCode.AUTHORITY_ELEVATION_ATTEMPT);
  }
  if (
    result.coverage?.recordCoverage === 'UNKNOWN' ||
    result.coverage?.recordCoverage === 'PARTIAL'
  ) {
    pushReason(
      result.coverage.recordCoverage === 'UNKNOWN'
        ? EvidenceQuarantineReasonCode.COVERAGE_UNKNOWN
        : EvidenceQuarantineReasonCode.COVERAGE_PARTIAL
    );
  }
  if (reasons.length === 0) {
    pushReason(EvidenceQuarantineReasonCode.OTHER);
  }

  let status: EvidenceQuarantineStatus = EvidenceQuarantineStatus.PENDING_REVIEW;
  if (reasons.some((reason) => reason.code === 'AUTHORITY_ELEVATION_ATTEMPT')) {
    status = EvidenceQuarantineStatus.AUTHORITY_CONFLICT;
  } else if (reasons.some((reason) => reason.code === 'UNSUPPORTED_SOURCE_VERSION')) {
    status = EvidenceQuarantineStatus.SOURCE_VERSION_UNSUPPORTED;
  } else if (
    reasons.some(
      (reason) => reason.code === 'GOVERNANCE_UNKNOWN' || reason.code === 'GOVERNANCE_PROHIBITED'
    )
  ) {
    status = EvidenceQuarantineStatus.GOVERNANCE_BLOCKED;
  } else if (reasons.some((reason) => reason.code === 'PROVENANCE_CONTEXT_MISSING')) {
    status = EvidenceQuarantineStatus.PROVENANCE_INCOMPLETE;
  } else if (
    reasons.some(
      (reason) =>
        reason.code === 'TEMPORAL_MEANING_UNKNOWN' || reason.code === 'TEMPORAL_VALUE_INVALID'
    )
  ) {
    status = EvidenceQuarantineStatus.TEMPORAL_AMBIGUITY;
  } else if (
    reasons.some(
      (reason) => reason.code === 'COVERAGE_UNKNOWN' || reason.code === 'COVERAGE_PARTIAL'
    )
  ) {
    status = EvidenceQuarantineStatus.COVERAGE_AMBIGUITY;
  } else if (
    reasons.some(
      (reason) => reason.code === 'UNKNOWN_ENUM_VALUE' || reason.code === 'UNRECOGNIZED_TERM'
    )
  ) {
    status = EvidenceQuarantineStatus.SEMANTICALLY_UNMAPPED;
  } else if (reasons.some((reason) => reason.code === 'INVALID_SCHEMA')) {
    status = EvidenceQuarantineStatus.SCHEMA_INVALID;
  }

  const candidate = result.candidates[0];
  return validateEvidenceQuarantineRecord({
    id,
    schemaVersion: EVIDENCE_QUARANTINE_SCHEMA_VERSION,
    status,
    reviewState: EvidenceQuarantineReviewState.UNREVIEWED,
    admitted: false,
    confirmedAbsence: false,
    capture: {
      status,
      reasons,
      source: {
        ...(result.raw?.sourceResourceId === undefined
          ? {}
          : { sourceResourceId: result.raw.sourceResourceId }),
        ...(result.raw?.sourceRecordId === undefined
          ? {}
          : { sourceRecordId: result.raw.sourceRecordId }),
        ...(result.raw?.sourceVersionRef === undefined
          ? {}
          : { sourceVersionRef: result.raw.sourceVersionRef }),
        rawFields,
      },
      ...(result.provenance === undefined
        ? {}
        : {
            adapter: {
              adapterId: result.provenance.adapterId,
              adapterVersion: result.provenance.adapterVersion,
            },
          }),
      ...(result.governanceReceiptId === undefined
        ? {}
        : { governance: { receiptId: result.governanceReceiptId } }),
      ...(result.truthClockCandidate === undefined
        ? {}
        : {
            truthClock: {
              presence: 'PRESENT' as const,
              clock: {
                id: `clock:${id}`,
                schemaVersion: 1 as const,
                ...result.truthClockCandidate,
              },
            },
          }),
      ...(result.coverage === undefined
        ? {}
        : {
            coverage: {
              state: result.coverage.state,
              ...(result.coverage.recordCoverage === undefined
                ? {}
                : { recordCoverage: result.coverage.recordCoverage }),
              ...(result.coverage.geometryCoverage === undefined
                ? {}
                : { geometryCoverage: result.coverage.geometryCoverage }),
              ...(result.coverage.temporalCoverage === undefined
                ? {}
                : { temporalCoverage: result.coverage.temporalCoverage }),
              ...(result.coverage.resultCount === undefined
                ? {}
                : { resultCount: result.coverage.resultCount }),
            },
          }),
      diagnostics: result.diagnostics.map((diagnostic) => ({ ...diagnostic })),
      ...(candidate === undefined
        ? {}
        : {
            candidate: {
              kind: candidate.kind,
              admission: 'CANDIDATE' as const,
              verified: false as const,
              ...(candidate.origin === undefined ? {} : { origin: candidate.origin }),
            },
          }),
      ...(result.normalized === undefined
        ? {}
        : { normalizedCandidate: structuredClone(result.normalized) }),
      ...(result.authority?.accepted === false
        ? {
            attemptedAuthority: {
              claimed: result.authority.claimedAuthority,
              accepted: false as const,
            },
          }
        : {}),
    },
    history: [
      {
        timestamp: '2026-09-22T12:00:00.000Z',
        toStatus: status,
        actorRef: 'SYSTEM',
        reason: 'adapter quarantine candidate',
      },
    ],
    dispositions: [],
    resolutions: [],
    reprocessing: [],
  });
}
