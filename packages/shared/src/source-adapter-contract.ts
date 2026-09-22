/**
 * Source Adapter Contract R1
 *
 * Persistence-free translation boundary. An adapter may normalize
 * representation. It may not manufacture authority, certainty, confidence,
 * permission, completeness, currency, or absence.
 */

import { z } from 'zod';

import { claimedAuthorityIsElevated } from './provenance-activity-kernel';
import { TruthClockSchema, type TruthClock } from './truth-clock-availability';
import {
  EvidenceAuthorityClassSchema,
  type EvidenceAuthorityClass,
} from './universal-geological-evidence-schema';

export const SOURCE_ADAPTER_CONTRACT_SCHEMA_VERSION = 1;

const OpaqueIdSchema = z.string().min(1).max(128);
const VersionSchema = z.object({
  major: z.number().int().nonnegative(),
  minor: z.number().int().nonnegative(),
  patch: z.number().int().nonnegative(),
});

export const SourceAdapterInputKind = {
  RAW_RECORD: 'RAW_RECORD',
  RAW_DOCUMENT: 'RAW_DOCUMENT',
  RAW_FEATURE: 'RAW_FEATURE',
  RAW_OBSERVATION: 'RAW_OBSERVATION',
  RAW_SAMPLE_RECORD: 'RAW_SAMPLE_RECORD',
  RAW_MEDIA_METADATA: 'RAW_MEDIA_METADATA',
  LOCAL_FIXTURE: 'LOCAL_FIXTURE',
  DERIVED_INPUT: 'DERIVED_INPUT',
  OTHER: 'OTHER',
} as const;

export type SourceAdapterInputKind =
  (typeof SourceAdapterInputKind)[keyof typeof SourceAdapterInputKind];

export const SourceAdapterOutputKind = {
  RESOURCE_DERIVED_RECORD: 'RESOURCE_DERIVED_RECORD',
  GEOLOGICAL_FEATURE_CANDIDATE: 'GEOLOGICAL_FEATURE_CANDIDATE',
  OBSERVATION_CANDIDATE: 'OBSERVATION_CANDIDATE',
  SAMPLE_CANDIDATE: 'SAMPLE_CANDIDATE',
  SAMPLING_EVENT_CANDIDATE: 'SAMPLING_EVENT_CANDIDATE',
  UGES_ASSERTION_CANDIDATE: 'UGES_ASSERTION_CANDIDATE',
  DERIVED_PRODUCT_CANDIDATE: 'DERIVED_PRODUCT_CANDIDATE',
  DOCUMENT_EVIDENCE_CANDIDATE: 'DOCUMENT_EVIDENCE_CANDIDATE',
  QUARANTINE_CANDIDATE: 'QUARANTINE_CANDIDATE',
  OTHER: 'OTHER',
} as const;

export type SourceAdapterOutputKind =
  (typeof SourceAdapterOutputKind)[keyof typeof SourceAdapterOutputKind];

export const SourceAdapterCapability = {
  DETERMINISTIC_TRANSLATION: 'DETERMINISTIC_TRANSLATION',
  PARTIAL_OUTPUT: 'PARTIAL_OUTPUT',
  QUARANTINE_ON_UNKNOWN: 'QUARANTINE_ON_UNKNOWN',
  VOCABULARY_RETENTION: 'VOCABULARY_RETENTION',
  AUTHORITY_CEILING: 'AUTHORITY_CEILING',
} as const;

export type SourceAdapterCapability =
  (typeof SourceAdapterCapability)[keyof typeof SourceAdapterCapability];

export const SourceAdapterPrecondition = {
  RESOURCE_IDENTIFIED: 'RESOURCE_IDENTIFIED',
  SOURCE_VERSION_ACCEPTED: 'SOURCE_VERSION_ACCEPTED',
  GOVERNANCE_CONTEXT_PRESENT: 'GOVERNANCE_CONTEXT_PRESENT',
  GOVERNANCE_OPERATION_ALLOWED: 'GOVERNANCE_OPERATION_ALLOWED',
  RAW_INPUT_PRESERVED: 'RAW_INPUT_PRESERVED',
  TRUTH_CLOCK_CONTEXT_PRESENT_OR_EXPLICITLY_UNKNOWN:
    'TRUTH_CLOCK_CONTEXT_PRESENT_OR_EXPLICITLY_UNKNOWN',
  COVERAGE_CONTEXT_PRESERVED: 'COVERAGE_CONTEXT_PRESERVED',
  PROVENANCE_CONTEXT_INITIALIZED: 'PROVENANCE_CONTEXT_INITIALIZED',
} as const;

export type SourceAdapterPrecondition =
  (typeof SourceAdapterPrecondition)[keyof typeof SourceAdapterPrecondition];

export const SourceRequestedUseOperation = {
  READ: 'READ',
  TRANSFORM: 'TRANSFORM',
  AUTOMATED_QUERY: 'AUTOMATED_QUERY',
  BULK_DOWNLOAD: 'BULK_DOWNLOAD',
  MODEL_INPUT: 'MODEL_INPUT',
  TRAINING_USE: 'TRAINING_USE',
} as const;

export type SourceRequestedUseOperation =
  (typeof SourceRequestedUseOperation)[keyof typeof SourceRequestedUseOperation];

export const SourceFieldMappingType = {
  DIRECT: 'DIRECT',
  RENAMED: 'RENAMED',
  ENUM_MAPPED: 'ENUM_MAPPED',
  UNIT_NORMALIZED: 'UNIT_NORMALIZED',
  SEMANTIC_NORMALIZATION: 'SEMANTIC_NORMALIZATION',
  DERIVED: 'DERIVED',
  UNMAPPED: 'UNMAPPED',
  IGNORED_BY_CONTRACT: 'IGNORED_BY_CONTRACT',
} as const;

export type SourceFieldMappingType =
  (typeof SourceFieldMappingType)[keyof typeof SourceFieldMappingType];

export const SourceNormalizationRuleKind = {
  STRING_NORMALIZATION: 'STRING_NORMALIZATION',
  ENUM_MAPPING: 'ENUM_MAPPING',
  UNIT_MAPPING: 'UNIT_MAPPING',
  IDENTIFIER_MAPPING: 'IDENTIFIER_MAPPING',
  DATE_MAPPING: 'DATE_MAPPING',
  GEOMETRY_MAPPING: 'GEOMETRY_MAPPING',
  VOCABULARY_MAPPING: 'VOCABULARY_MAPPING',
  CUSTOM_DECLARED: 'CUSTOM_DECLARED',
} as const;

export type SourceNormalizationRuleKind =
  (typeof SourceNormalizationRuleKind)[keyof typeof SourceNormalizationRuleKind];

export const SourceAdapterFailureCode = {
  INVALID_INPUT: 'INVALID_INPUT',
  RESOURCE_IDENTITY_MISSING: 'RESOURCE_IDENTITY_MISSING',
  GOVERNANCE_CONTEXT_MISSING: 'GOVERNANCE_CONTEXT_MISSING',
  GOVERNANCE_UNRESOLVED: 'GOVERNANCE_UNRESOLVED',
  GOVERNANCE_NOT_ALLOWED: 'GOVERNANCE_NOT_ALLOWED',
  SOURCE_SCHEMA_MISMATCH: 'SOURCE_SCHEMA_MISMATCH',
  UNSUPPORTED_SOURCE_VERSION: 'UNSUPPORTED_SOURCE_VERSION',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  INVALID_GEOMETRY: 'INVALID_GEOMETRY',
  INVALID_TEMPORAL_VALUE: 'INVALID_TEMPORAL_VALUE',
  UNKNOWN_REQUIRED_SEMANTIC: 'UNKNOWN_REQUIRED_SEMANTIC',
  AUTHORITY_ELEVATION_ATTEMPT: 'AUTHORITY_ELEVATION_ATTEMPT',
  COVERAGE_METADATA_INVALID: 'COVERAGE_METADATA_INVALID',
  NORMALIZATION_FAILED: 'NORMALIZATION_FAILED',
  PROVENANCE_CONTEXT_MISSING: 'PROVENANCE_CONTEXT_MISSING',
  UNSUPPORTED_OUTPUT: 'UNSUPPORTED_OUTPUT',
  TEMPORAL_CONTEXT_INSUFFICIENT: 'TEMPORAL_CONTEXT_INSUFFICIENT',
  COVERAGE_CONTEXT_INSUFFICIENT: 'COVERAGE_CONTEXT_INSUFFICIENT',
  INTERNAL_CONTRACT_VIOLATION: 'INTERNAL_CONTRACT_VIOLATION',
  OTHER: 'OTHER',
} as const;

export type SourceAdapterFailureCode =
  (typeof SourceAdapterFailureCode)[keyof typeof SourceAdapterFailureCode];

export const SourceAdapterResultStatus = {
  SUCCESS: 'SUCCESS',
  PARTIAL_SUCCESS: 'PARTIAL_SUCCESS',
  QUARANTINED: 'QUARANTINED',
  FAILED: 'FAILED',
} as const;

export type SourceAdapterResultStatus =
  (typeof SourceAdapterResultStatus)[keyof typeof SourceAdapterResultStatus];

const ClockFieldSchema = z.enum([
  'phenomenonTime',
  'effectiveFrom',
  'effectiveTo',
  'sourceRecordedAt',
  'publishedAt',
  'sourceUpdatedAt',
  'retrievedAt',
]);

export type TruthClockField = z.infer<typeof ClockFieldSchema>;

const CoverageRank: Record<string, number> = {
  UNKNOWN: 0,
  PARTIAL: 1,
  COMPLETE: 2,
};

export const SourceNormalizationRuleSchema = z.object({
  kind: z.enum([
    'STRING_NORMALIZATION',
    'ENUM_MAPPING',
    'UNIT_MAPPING',
    'IDENTIFIER_MAPPING',
    'DATE_MAPPING',
    'GEOMETRY_MAPPING',
    'VOCABULARY_MAPPING',
    'CUSTOM_DECLARED',
  ]),
  enumMap: z
    .array(
      z.object({
        source: z.string().min(1).max(256),
        target: z.string().min(1).max(256),
      })
    )
    .max(64)
    .optional(),
  sourceLabel: z.string().min(1).max(256).optional(),
  normalizedConcept: z.string().min(1).max(256).optional(),
  fromUnit: z.string().min(1).max(32).optional(),
  toUnit: z.string().min(1).max(32).optional(),
  factor: z.number().finite().optional(),
  targetClockField: ClockFieldSchema.optional(),
  declaredTemporalEquivalence: z.boolean().optional(),
});

export type SourceNormalizationRule = z.infer<typeof SourceNormalizationRuleSchema>;

export const SourceFieldMappingSchema = z.object({
  sourceField: z.string().min(1).max(128),
  targetField: z.string().min(1).max(128).optional(),
  targetConcept: z.string().min(1).max(256).optional(),
  mappingType: z.enum([
    'DIRECT',
    'RENAMED',
    'ENUM_MAPPED',
    'UNIT_NORMALIZED',
    'SEMANTIC_NORMALIZATION',
    'DERIVED',
    'UNMAPPED',
    'IGNORED_BY_CONTRACT',
  ]),
  normalizationRule: SourceNormalizationRuleSchema.optional(),
  lossless: z.boolean().optional(),
  required: z.boolean().optional(),
  notes: z.string().min(1).max(1000).optional(),
});

export type SourceFieldMapping = z.infer<typeof SourceFieldMappingSchema>;

export const SourceAdapterDefinitionSchema = z.object({
  id: OpaqueIdSchema,
  version: VersionSchema,
  schemaVersion: z.literal(SOURCE_ADAPTER_CONTRACT_SCHEMA_VERSION),
  name: z.string().min(1).max(256),
  sourceResourceTypes: z.array(z.string().min(1).max(64)).min(1).max(16),
  supportedResourceIds: z.array(OpaqueIdSchema).max(64).optional(),
  inputKinds: z
    .array(
      z.enum([
        'RAW_RECORD',
        'RAW_DOCUMENT',
        'RAW_FEATURE',
        'RAW_OBSERVATION',
        'RAW_SAMPLE_RECORD',
        'RAW_MEDIA_METADATA',
        'LOCAL_FIXTURE',
        'DERIVED_INPUT',
        'OTHER',
      ])
    )
    .min(1)
    .max(16),
  outputKinds: z
    .array(
      z.enum([
        'RESOURCE_DERIVED_RECORD',
        'GEOLOGICAL_FEATURE_CANDIDATE',
        'OBSERVATION_CANDIDATE',
        'SAMPLE_CANDIDATE',
        'SAMPLING_EVENT_CANDIDATE',
        'UGES_ASSERTION_CANDIDATE',
        'DERIVED_PRODUCT_CANDIDATE',
        'DOCUMENT_EVIDENCE_CANDIDATE',
        'QUARANTINE_CANDIDATE',
        'OTHER',
      ])
    )
    .min(1)
    .max(16),
  capabilities: z
    .array(
      z.enum([
        'DETERMINISTIC_TRANSLATION',
        'PARTIAL_OUTPUT',
        'QUARANTINE_ON_UNKNOWN',
        'VOCABULARY_RETENTION',
        'AUTHORITY_CEILING',
      ])
    )
    .max(8),
  deterministic: z.boolean(),
  implementationRef: z.string().min(1).max(256).optional(),
  limitations: z.array(z.string().min(1).max(256)).min(1).max(32),
  normalizationProfile: z.string().min(1).max(128).optional(),
  requiredBuildingBlocks: z.array(z.string().min(1).max(128)).max(16),
  requiredPreconditions: z
    .array(
      z.enum([
        'RESOURCE_IDENTIFIED',
        'SOURCE_VERSION_ACCEPTED',
        'GOVERNANCE_CONTEXT_PRESENT',
        'GOVERNANCE_OPERATION_ALLOWED',
        'RAW_INPUT_PRESERVED',
        'TRUTH_CLOCK_CONTEXT_PRESENT_OR_EXPLICITLY_UNKNOWN',
        'COVERAGE_CONTEXT_PRESERVED',
        'PROVENANCE_CONTEXT_INITIALIZED',
      ])
    )
    .max(8),
  allowExplicitUnknownTemporalContext: z.boolean(),
  supportedSourceVersions: z.array(z.string().min(1).max(64)).max(32),
  tolerantUnsupportedVersion: z.boolean(),
  requiredUseOperation: z.enum([
    'READ',
    'TRANSFORM',
    'AUTOMATED_QUERY',
    'BULK_DOWNLOAD',
    'MODEL_INPUT',
    'TRAINING_USE',
  ]),
});

export type SourceAdapterDefinition = z.infer<typeof SourceAdapterDefinitionSchema>;
export type SourceAdapterId = SourceAdapterDefinition['id'];
export type SourceAdapterVersion = SourceAdapterDefinition['version'];

export const SourceGovernanceReferenceSchema = z.object({
  receiptId: OpaqueIdSchema,
  resourceId: OpaqueIdSchema,
  decision: z.enum(['ALLOWED', 'UNKNOWN', 'PROHIBITED']),
  allowedOperations: z
    .array(
      z.enum([
        'READ',
        'TRANSFORM',
        'AUTOMATED_QUERY',
        'BULK_DOWNLOAD',
        'MODEL_INPUT',
        'TRAINING_USE',
      ])
    )
    .max(8),
});

export type SourceGovernanceReference = z.infer<typeof SourceGovernanceReferenceSchema>;

export const SourceCoverageMetadataSchema = z.object({
  state: z.enum([
    'AVAILABLE',
    'STALE',
    'MISSING',
    'FETCH_FAILED',
    'COVERAGE_GAP',
    'UNRESOLVED',
    'CONFLICTED',
    'NOT_APPLICABLE',
    'ACCESS_RESTRICTED',
    'UNKNOWN',
  ]),
  reason: z
    .object({
      code: z.string().min(1).max(64),
      detail: z.string().min(1).max(1000).optional(),
    })
    .optional(),
  recordCoverage: z.enum(['COMPLETE', 'PARTIAL', 'UNKNOWN']).optional(),
  geometryCoverage: z.enum(['COMPLETE', 'PARTIAL', 'UNKNOWN']).optional(),
  temporalCoverage: z.enum(['COMPLETE', 'PARTIAL', 'UNKNOWN']).optional(),
  knownMissingClasses: z.array(z.string().min(1).max(128)).max(32).optional(),
  resultCount: z.number().int().nonnegative().optional(),
});

export type SourceCoverageMetadata = z.infer<typeof SourceCoverageMetadataSchema>;

export const SourceTruthClockReferenceSchema = z.discriminatedUnion('presence', [
  z.object({ presence: z.literal('PRESENT'), clock: TruthClockSchema }),
  z.object({ presence: z.literal('UNKNOWN') }),
  z.object({ presence: z.literal('ABSENT') }),
]);

export type SourceTruthClockReference = z.infer<typeof SourceTruthClockReferenceSchema>;

export const SourceProvenanceReferenceSchema = z.object({
  activityId: OpaqueIdSchema,
  initialized: z.boolean(),
});

export type SourceProvenanceReference = z.infer<typeof SourceProvenanceReferenceSchema>;

export const RawSourceRecordSchema = z.object({
  id: OpaqueIdSchema,
  sourceResourceId: OpaqueIdSchema,
  sourceRecordId: z.string().min(1).max(256).optional(),
  sourceVersionRef: z.string().min(1).max(64).optional(),
  retrievedFromRef: z.string().min(1).max(512).optional(),
  rawFields: z.record(z.unknown()),
  rawPayloadRef: z.string().min(1).max(512).optional(),
  sourceEncoding: z.string().min(1).max(64).optional(),
  sourceSchemaRef: z.string().min(1).max(256).optional(),
  truthClockRef: z.string().min(1).max(128).optional(),
  governanceReceiptId: z.string().min(1).max(128).optional(),
  coverageMetadata: SourceCoverageMetadataSchema.optional(),
});

export type RawSourceRecord = z.infer<typeof RawSourceRecordSchema>;

export const SourceAdapterDiagnosticSchema = z.object({
  code: z.string().min(1).max(64),
  field: z.string().min(1).max(128).optional(),
  detail: z.string().min(1).max(1000).optional(),
});

export type SourceAdapterDiagnostic = z.infer<typeof SourceAdapterDiagnosticSchema>;

export const NormalizedSourceRecordSchema = z.object({
  id: OpaqueIdSchema,
  rawSourceRecordId: OpaqueIdSchema,
  normalizedFields: z.record(z.unknown()),
  fieldMappings: z.array(SourceFieldMappingSchema).max(128),
  normalizationDiagnostics: z.array(SourceAdapterDiagnosticSchema).max(128),
});

export type NormalizedSourceRecord = z.infer<typeof NormalizedSourceRecordSchema>;

export const SourceAdapterInputSchema = z.object({
  kind: z.enum([
    'RAW_RECORD',
    'RAW_DOCUMENT',
    'RAW_FEATURE',
    'RAW_OBSERVATION',
    'RAW_SAMPLE_RECORD',
    'RAW_MEDIA_METADATA',
    'LOCAL_FIXTURE',
    'DERIVED_INPUT',
    'OTHER',
  ]),
  raw: RawSourceRecordSchema,
  mappings: z.array(SourceFieldMappingSchema).max(128),
  requestedOutputs: z
    .array(
      z.enum([
        'RESOURCE_DERIVED_RECORD',
        'GEOLOGICAL_FEATURE_CANDIDATE',
        'OBSERVATION_CANDIDATE',
        'SAMPLE_CANDIDATE',
        'SAMPLING_EVENT_CANDIDATE',
        'UGES_ASSERTION_CANDIDATE',
        'DERIVED_PRODUCT_CANDIDATE',
        'DOCUMENT_EVIDENCE_CANDIDATE',
        'QUARANTINE_CANDIDATE',
        'OTHER',
      ])
    )
    .max(16),
  claimedCoverage: z
    .object({
      recordCoverage: z.enum(['COMPLETE', 'PARTIAL', 'UNKNOWN']).optional(),
      geometryCoverage: z.enum(['COMPLETE', 'PARTIAL', 'UNKNOWN']).optional(),
      temporalCoverage: z.enum(['COMPLETE', 'PARTIAL', 'UNKNOWN']).optional(),
    })
    .optional(),
  samplingProvenancePresent: z.boolean().optional(),
  observationOrigin: z.enum(['DIRECT', 'DERIVED', 'INTERPRETED', 'MODEL_GENERATED']).optional(),
  claimedObservationOrigin: z
    .enum(['DIRECT', 'DERIVED', 'INTERPRETED', 'MODEL_GENERATED'])
    .optional(),
});

export type SourceAdapterInput = z.infer<typeof SourceAdapterInputSchema>;

export const SourceAdapterContextSchema = z.object({
  resourceId: z.string().max(128),
  requestedUseOperation: z.enum([
    'READ',
    'TRANSFORM',
    'AUTOMATED_QUERY',
    'BULK_DOWNLOAD',
    'MODEL_INPUT',
    'TRAINING_USE',
  ]),
  governance: SourceGovernanceReferenceSchema.optional(),
  truthClock: SourceTruthClockReferenceSchema,
  coverage: SourceCoverageMetadataSchema.optional(),
  provenance: SourceProvenanceReferenceSchema,
  sourceAuthorities: z.array(EvidenceAuthorityClassSchema).min(1).max(8),
  claimedAuthority: EvidenceAuthorityClassSchema,
});

export type SourceAdapterContext = z.infer<typeof SourceAdapterContextSchema>;

export type SourceAdapterPreconditionResult = {
  precondition: SourceAdapterPrecondition;
  status: 'PASSED' | 'FAILED' | 'NOT_REQUIRED';
  failureCode?: SourceAdapterFailureCode;
};

export type SourceAuthorityProjection = {
  sourceAuthorities: EvidenceAuthorityClass[];
  claimedAuthority: EvidenceAuthorityClass;
  accepted: boolean;
};

export type SourceAdapterCandidate = {
  kind: SourceAdapterOutputKind;
  origin?: 'DIRECT' | 'DERIVED' | 'INTERPRETED' | 'MODEL_GENERATED';
  admission?: 'CANDIDATE';
  verified?: false;
  certainty?: undefined;
  confidence?: undefined;
};

export type SourceAdapterResult = {
  status: SourceAdapterResultStatus;
  failureCode?: SourceAdapterFailureCode;
  diagnostics: SourceAdapterDiagnostic[];
  raw?: RawSourceRecord;
  normalized?: NormalizedSourceRecord;
  canonicalCandidateId?: string;
  provenance?: {
    sourceResourceId: string;
    adapterId: string;
    adapterVersion: SourceAdapterVersion;
    rawSourceRecordId: string;
    normalizedRecordId?: string;
    derivationKind: 'NORMALIZED_FROM';
    manufacturesTruth: false;
  };
  authority?: SourceAuthorityProjection;
  governanceReceiptId?: string;
  truthClockCandidate?: Partial<
    Pick<
      TruthClock,
      | 'phenomenonTime'
      | 'effectiveFrom'
      | 'effectiveTo'
      | 'sourceRecordedAt'
      | 'publishedAt'
      | 'sourceUpdatedAt'
      | 'retrievedAt'
    >
  >;
  successfulRetrievalImpliesCurrency: false;
  confirmedAbsence: false;
  coverage?: SourceCoverageMetadata;
  candidates: SourceAdapterCandidate[];
  succeeded: string[];
  failed: SourceAdapterDiagnostic[];
  unknown: SourceAdapterDiagnostic[];
  safeToContinue: boolean;
};

export function validateSourceAdapterDefinition(input: unknown): SourceAdapterDefinition {
  return SourceAdapterDefinitionSchema.parse(input);
}

export function createSourceAdapterRegistry(definitions: readonly unknown[]): {
  list: () => SourceAdapterDefinition[];
} {
  const parsed = definitions.map((definition) => validateSourceAdapterDefinition(definition));
  const keys = parsed.map(
    (definition) =>
      `${definition.id}@${definition.version.major}.${definition.version.minor}.${definition.version.patch}`
  );
  if (new Set(keys).size !== keys.length) {
    throw new Error('Duplicate adapter id/version is not allowed');
  }
  return {
    list: () => parsed.map((definition) => structuredClone(definition)),
  };
}

export function adapterAuthorizesUse(): false {
  return false;
}

export function operationImplies(
  left: SourceRequestedUseOperation,
  right: SourceRequestedUseOperation
): boolean {
  return left === right;
}

export function adapterEstablishesConfirmedAbsence(): false {
  return false;
}

export function adapterFabricatesCertainty(): false {
  return false;
}

export function adapterFabricatesConfidence(): false {
  return false;
}

export function adapterFabricatesProhibited(): false {
  return false;
}

export function provenanceManufacturesTruth(): false {
  return false;
}

export function coverageWasPromoted(
  from: 'COMPLETE' | 'PARTIAL' | 'UNKNOWN' | undefined,
  to: 'COMPLETE' | 'PARTIAL' | 'UNKNOWN' | undefined
): boolean {
  if (from === undefined || to === undefined) {
    return false;
  }
  return (CoverageRank[to] ?? 0) > (CoverageRank[from] ?? 0);
}

export function projectAuthorityChain(
  sourceAuthorities: readonly EvidenceAuthorityClass[],
  claims: readonly EvidenceAuthorityClass[]
): { accepted: boolean; elevatingStep?: number } {
  for (const [index, claimed] of claims.entries()) {
    if (claimedAuthorityIsElevated(sourceAuthorities, claimed)) {
      return { accepted: false, elevatingStep: index };
    }
  }
  return { accepted: true };
}

function failed(
  code: SourceAdapterFailureCode,
  diagnostics: SourceAdapterDiagnostic[] = [],
  extras: Partial<SourceAdapterResult> = {}
): SourceAdapterResult {
  return {
    status: SourceAdapterResultStatus.FAILED,
    failureCode: code,
    diagnostics,
    successfulRetrievalImpliesCurrency: false,
    confirmedAbsence: false,
    candidates: [],
    succeeded: [],
    failed: diagnostics,
    unknown: [],
    safeToContinue: false,
    ...extras,
  };
}

export function evaluatePreconditions(
  definition: SourceAdapterDefinition,
  sourceInput: SourceAdapterInput,
  sourceContext: SourceAdapterContext
): SourceAdapterPreconditionResult[] {
  return definition.requiredPreconditions.map((precondition) => {
    const failureCode = preconditionFailure(precondition, definition, sourceInput, sourceContext);
    if (failureCode === undefined) {
      return { precondition, status: 'PASSED' as const };
    }
    return { precondition, status: 'FAILED' as const, failureCode };
  });
}

function preconditionFailure(
  precondition: SourceAdapterPrecondition,
  definition: SourceAdapterDefinition,
  sourceInput: SourceAdapterInput,
  sourceContext: SourceAdapterContext
): SourceAdapterFailureCode | undefined {
  switch (precondition) {
    case SourceAdapterPrecondition.RESOURCE_IDENTIFIED:
      if (
        sourceContext.resourceId.length === 0 ||
        sourceContext.resourceId !== sourceInput.raw.sourceResourceId
      ) {
        return SourceAdapterFailureCode.RESOURCE_IDENTITY_MISSING;
      }
      return undefined;
    case SourceAdapterPrecondition.SOURCE_VERSION_ACCEPTED: {
      const version = sourceInput.raw.sourceVersionRef;
      if (version === undefined || !definition.supportedSourceVersions.includes(version)) {
        return definition.tolerantUnsupportedVersion
          ? undefined
          : SourceAdapterFailureCode.UNSUPPORTED_SOURCE_VERSION;
      }
      return undefined;
    }
    case SourceAdapterPrecondition.GOVERNANCE_CONTEXT_PRESENT:
      if (sourceContext.governance === undefined) {
        return SourceAdapterFailureCode.GOVERNANCE_CONTEXT_MISSING;
      }
      if (sourceContext.governance.decision === 'UNKNOWN') {
        return SourceAdapterFailureCode.GOVERNANCE_UNRESOLVED;
      }
      if (sourceContext.governance.decision === 'PROHIBITED') {
        return SourceAdapterFailureCode.GOVERNANCE_NOT_ALLOWED;
      }
      return undefined;
    case SourceAdapterPrecondition.GOVERNANCE_OPERATION_ALLOWED: {
      const governance = sourceContext.governance;
      if (governance === undefined) {
        return SourceAdapterFailureCode.GOVERNANCE_CONTEXT_MISSING;
      }
      if (governance.decision === 'UNKNOWN') {
        return SourceAdapterFailureCode.GOVERNANCE_UNRESOLVED;
      }
      if (
        governance.decision === 'PROHIBITED' ||
        !governance.allowedOperations.includes(sourceContext.requestedUseOperation) ||
        sourceContext.requestedUseOperation !== definition.requiredUseOperation
      ) {
        return SourceAdapterFailureCode.GOVERNANCE_NOT_ALLOWED;
      }
      return undefined;
    }
    case SourceAdapterPrecondition.RAW_INPUT_PRESERVED:
      return undefined;
    case SourceAdapterPrecondition.TRUTH_CLOCK_CONTEXT_PRESENT_OR_EXPLICITLY_UNKNOWN:
      if (sourceContext.truthClock.presence === 'PRESENT') {
        return undefined;
      }
      if (
        sourceContext.truthClock.presence === 'UNKNOWN' &&
        definition.allowExplicitUnknownTemporalContext
      ) {
        return undefined;
      }
      return SourceAdapterFailureCode.TEMPORAL_CONTEXT_INSUFFICIENT;
    case SourceAdapterPrecondition.COVERAGE_CONTEXT_PRESERVED:
      return sourceContext.coverage === undefined
        ? SourceAdapterFailureCode.COVERAGE_CONTEXT_INSUFFICIENT
        : undefined;
    case SourceAdapterPrecondition.PROVENANCE_CONTEXT_INITIALIZED:
      return sourceContext.provenance.initialized
        ? undefined
        : SourceAdapterFailureCode.PROVENANCE_CONTEXT_MISSING;
    default:
      return SourceAdapterFailureCode.INTERNAL_CONTRACT_VIOLATION;
  }
}

function isIsoDateTime(value: unknown): value is string {
  return (
    typeof value === 'string' && z.string().datetime({ offset: true }).safeParse(value).success
  );
}

function forbiddenTemporalInference(mapping: SourceFieldMapping): boolean {
  const target = mapping.normalizationRule?.targetClockField;
  if (target === undefined || mapping.normalizationRule?.declaredTemporalEquivalence === true) {
    return false;
  }
  return (
    (mapping.sourceField === 'retrievedAt' && target === 'sourceUpdatedAt') ||
    (mapping.sourceField === 'publishedAt' && target === 'effectiveFrom')
  );
}

function applyMappings(
  rawFields: Record<string, unknown>,
  mappings: readonly SourceFieldMapping[]
): {
  normalizedFields: Record<string, unknown>;
  diagnostics: SourceAdapterDiagnostic[];
  clock: NonNullable<SourceAdapterResult['truthClockCandidate']>;
  requiredMissing: boolean;
  requiredUnknown: boolean;
} {
  const normalizedFields: Record<string, unknown> = {};
  const diagnostics: SourceAdapterDiagnostic[] = [];
  const clock: NonNullable<SourceAdapterResult['truthClockCandidate']> = {};
  const seen = new Set<string>();
  let requiredMissing = false;
  let requiredUnknown = false;

  for (const mapping of mappings) {
    seen.add(mapping.sourceField);
    const value = rawFields[mapping.sourceField];
    const target = mapping.targetField ?? mapping.sourceField;
    if (mapping.mappingType === SourceFieldMappingType.IGNORED_BY_CONTRACT) {
      continue;
    }
    if (value === undefined) {
      if (mapping.required === true) {
        requiredMissing = true;
        diagnostics.push({
          code: 'MISSING_REQUIRED_SOURCE_FIELD',
          field: mapping.sourceField,
        });
      }
      continue;
    }
    const rule = mapping.normalizationRule;
    if (
      rule !== undefined &&
      (rule.kind === 'DATE_MAPPING' || rule.targetClockField !== undefined)
    ) {
      if (forbiddenTemporalInference(mapping)) {
        diagnostics.push({
          code: 'UNSUPPORTED_TIME_SEMANTICS',
          field: mapping.sourceField,
          detail: 'Timestamp fields are not inferred from each other',
        });
        continue;
      }
      if (!isIsoDateTime(value)) {
        diagnostics.push({ code: 'INVALID_TEMPORAL_VALUE', field: mapping.sourceField });
        continue;
      }
      const clockField = rule.targetClockField;
      if (clockField !== undefined) {
        clock[clockField] = value;
      }
      continue;
    }
    if (mapping.mappingType === SourceFieldMappingType.ENUM_MAPPED) {
      const match = mapping.normalizationRule?.enumMap?.find((entry) => entry.source === value);
      if (match === undefined) {
        diagnostics.push({ code: 'UNKNOWN_ENUM_VALUE', field: mapping.sourceField });
        if (mapping.required === true) {
          requiredUnknown = true;
        }
        continue;
      }
      normalizedFields[target] = match.target;
      continue;
    }
    if (
      mapping.mappingType === SourceFieldMappingType.SEMANTIC_NORMALIZATION ||
      mapping.normalizationRule?.kind === 'VOCABULARY_MAPPING'
    ) {
      const concept = mapping.normalizationRule?.normalizedConcept ?? mapping.targetConcept;
      if (concept === undefined) {
        diagnostics.push({ code: 'UNRECOGNIZED_TERM', field: mapping.sourceField });
        if (mapping.required === true) {
          requiredUnknown = true;
        }
        continue;
      }
      normalizedFields[target] = {
        sourceLabel: mapping.normalizationRule?.sourceLabel ?? value,
        normalizedConcept: concept,
      };
      if (value !== concept) {
        diagnostics.push({
          code: 'RAW_NORMALIZED_DISTINCT',
          field: mapping.sourceField,
          detail: 'Source vocabulary and normalized concept are both retained',
        });
      }
      continue;
    }
    if (mapping.mappingType === SourceFieldMappingType.UNIT_NORMALIZED) {
      const rule = mapping.normalizationRule;
      const normalized =
        typeof value === 'number' && rule?.factor !== undefined ? value * rule.factor : undefined;
      normalizedFields[target] = {
        original: value,
        originalUnit: rule?.fromUnit,
        normalized,
        normalizedUnit: rule?.toUnit,
      };
      continue;
    }
    if (
      mapping.mappingType === SourceFieldMappingType.DIRECT ||
      mapping.mappingType === SourceFieldMappingType.RENAMED
    ) {
      normalizedFields[target] = value;
    }
  }

  for (const field of Object.keys(rawFields)) {
    if (!seen.has(field)) {
      diagnostics.push({ code: 'UNMAPPED_FIELD', field });
    }
  }

  return { normalizedFields, diagnostics, clock, requiredMissing, requiredUnknown };
}

function coveragePromotion(
  current: SourceCoverageMetadata | undefined,
  claimed: SourceAdapterInput['claimedCoverage']
): boolean {
  if (current === undefined || claimed === undefined) {
    return false;
  }
  return (
    coverageWasPromoted(current.recordCoverage, claimed.recordCoverage) ||
    coverageWasPromoted(current.geometryCoverage, claimed.geometryCoverage) ||
    coverageWasPromoted(current.temporalCoverage, claimed.temporalCoverage)
  );
}

export function translateSourceMaterial(
  definitionInput: SourceAdapterDefinition,
  sourceInput: SourceAdapterInput,
  sourceContext: SourceAdapterContext
): SourceAdapterResult {
  const definition = structuredClone(definitionInput);
  const inputSnapshot = structuredClone(sourceInput);
  const contextSnapshot = structuredClone(sourceContext);
  const raw = structuredClone(inputSnapshot.raw);

  const firstFailure = evaluatePreconditions(definition, inputSnapshot, contextSnapshot).find(
    (result) => result.status === 'FAILED'
  );
  if (firstFailure?.failureCode !== undefined) {
    return failed(firstFailure.failureCode, [], { raw, coverage: contextSnapshot.coverage });
  }

  if (
    claimedAuthorityIsElevated(contextSnapshot.sourceAuthorities, contextSnapshot.claimedAuthority)
  ) {
    return failed(SourceAdapterFailureCode.AUTHORITY_ELEVATION_ATTEMPT, [], {
      raw,
      authority: {
        sourceAuthorities: [...contextSnapshot.sourceAuthorities],
        claimedAuthority: contextSnapshot.claimedAuthority,
        accepted: false,
      },
    });
  }

  if (coveragePromotion(contextSnapshot.coverage, inputSnapshot.claimedCoverage)) {
    return failed(SourceAdapterFailureCode.COVERAGE_METADATA_INVALID, [], {
      raw,
      coverage: contextSnapshot.coverage,
    });
  }

  if (
    inputSnapshot.observationOrigin === 'MODEL_GENERATED' &&
    inputSnapshot.claimedObservationOrigin === 'DIRECT'
  ) {
    return failed(SourceAdapterFailureCode.INTERNAL_CONTRACT_VIOLATION, [
      {
        code: 'INTERNAL_CONTRACT_VIOLATION',
        detail: 'Model-generated content cannot become a DIRECT observation',
      },
    ]);
  }

  const unsupported = inputSnapshot.requestedOutputs.find(
    (kind) => !definition.outputKinds.includes(kind)
  );
  if (unsupported !== undefined) {
    return failed(SourceAdapterFailureCode.UNSUPPORTED_OUTPUT, [
      { code: 'UNSUPPORTED_OUTPUT', detail: unsupported },
    ]);
  }

  const mapped = applyMappings(raw.rawFields, inputSnapshot.mappings);
  const diagnostics = [...mapped.diagnostics];
  if (
    inputSnapshot.raw.sourceVersionRef !== undefined &&
    !definition.supportedSourceVersions.includes(inputSnapshot.raw.sourceVersionRef) &&
    definition.tolerantUnsupportedVersion
  ) {
    diagnostics.push({
      code: 'UNSUPPORTED_SOURCE_VERSION',
      detail: inputSnapshot.raw.sourceVersionRef,
    });
  }

  const normalized: NormalizedSourceRecord = {
    id: `norm:${raw.id}`,
    rawSourceRecordId: raw.id,
    normalizedFields: mapped.normalizedFields,
    fieldMappings: structuredClone(inputSnapshot.mappings),
    normalizationDiagnostics: diagnostics,
  };
  const provenance = {
    sourceResourceId: raw.sourceResourceId,
    adapterId: definition.id,
    adapterVersion: definition.version,
    rawSourceRecordId: raw.id,
    normalizedRecordId: normalized.id,
    derivationKind: 'NORMALIZED_FROM' as const,
    manufacturesTruth: false as const,
  };
  const authority: SourceAuthorityProjection = {
    sourceAuthorities: [...contextSnapshot.sourceAuthorities],
    claimedAuthority: contextSnapshot.claimedAuthority,
    accepted: true,
  };
  const candidates: SourceAdapterCandidate[] = [];
  for (const kind of inputSnapshot.requestedOutputs) {
    if (kind === SourceAdapterOutputKind.SAMPLING_EVENT_CANDIDATE) {
      if (inputSnapshot.samplingProvenancePresent !== true) {
        diagnostics.push({
          code: 'SAMPLING_PROVENANCE_ABSENT',
          detail: 'Sampling event was not fabricated',
        });
        continue;
      }
    }
    if (kind === SourceAdapterOutputKind.OBSERVATION_CANDIDATE) {
      candidates.push({
        kind,
        ...(inputSnapshot.observationOrigin === undefined
          ? {}
          : { origin: inputSnapshot.observationOrigin }),
        admission: 'CANDIDATE',
        verified: false,
      });
      continue;
    }
    if (kind === SourceAdapterOutputKind.UGES_ASSERTION_CANDIDATE) {
      candidates.push({
        kind,
        admission: 'CANDIDATE',
        verified: false,
      });
      continue;
    }
    if (kind === SourceAdapterOutputKind.SAMPLE_CANDIDATE) {
      candidates.push({ kind, admission: 'CANDIDATE' });
      continue;
    }
    candidates.push({ kind, admission: 'CANDIDATE' });
  }

  const unknown = diagnostics.filter(
    (item) =>
      item.code === 'UNMAPPED_FIELD' ||
      item.code === 'UNKNOWN_ENUM_VALUE' ||
      item.code === 'UNRECOGNIZED_TERM' ||
      item.code === 'AMBIGUOUS_SOURCE_VALUE'
  );
  const base = {
    diagnostics,
    raw,
    normalized,
    canonicalCandidateId: `candidate:${definition.id}:${raw.id}`,
    provenance,
    authority,
    governanceReceiptId: contextSnapshot.governance?.receiptId,
    truthClockCandidate: mapped.clock,
    successfulRetrievalImpliesCurrency: false as const,
    confirmedAbsence: false as const,
    coverage:
      contextSnapshot.coverage === undefined
        ? undefined
        : structuredClone(contextSnapshot.coverage),
    candidates,
    succeeded: candidates.map((candidate) => candidate.kind),
    failed: diagnostics.filter((item) => item.code === 'MISSING_REQUIRED_SOURCE_FIELD'),
    unknown,
  };

  if (mapped.requiredMissing) {
    return failed(SourceAdapterFailureCode.REQUIRED_FIELD_MISSING, diagnostics, base);
  }
  if (mapped.requiredUnknown && definition.capabilities.includes('QUARANTINE_ON_UNKNOWN')) {
    const quarantine = {
      ...base,
      candidates: [
        ...candidates,
        { kind: SourceAdapterOutputKind.QUARANTINE_CANDIDATE, admission: 'CANDIDATE' as const },
      ],
    };
    return {
      ...quarantine,
      status: SourceAdapterResultStatus.QUARANTINED,
      safeToContinue: false,
    };
  }
  if (unknown.length > 0 && definition.capabilities.includes('PARTIAL_OUTPUT')) {
    return {
      ...base,
      status: SourceAdapterResultStatus.PARTIAL_SUCCESS,
      safeToContinue: true,
    };
  }
  if (unknown.length > 0) {
    return failed(SourceAdapterFailureCode.NORMALIZATION_FAILED, diagnostics, base);
  }
  return {
    ...base,
    status: SourceAdapterResultStatus.SUCCESS,
    safeToContinue: true,
  };
}
