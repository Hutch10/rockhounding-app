/**
 * Offline Fixture Adapters R1
 *
 * Deterministic local fixtures translated through the Source Adapter Contract.
 * No network, no live provider, no credentials, no evidence admission.
 */

import { z } from 'zod';

import {
  EVIDENCE_QUARANTINE_BLOCK_ID,
  SOURCE_ADAPTER_CONTRACT_BLOCK_ID,
} from './building-block-registry';
import { quarantineFromAdapterResult, type EvidenceQuarantineRecord } from './evidence-quarantine';
import {
  PROVENANCE_SCHEMA_VERSION,
  ProvenanceActivityType,
  ProvenanceAgentRole,
  ProvenanceAgentType,
  ProvenanceDerivationKind,
  ProvenanceEntityType,
  ProvenanceLineageClass,
  ProvenanceRelationship,
  hashProvenanceActivity,
  validateProvenanceActivity,
  validateProvenanceGraph,
  type ProvenanceActivity,
  type ProvenanceEntityReference,
  type ProvenanceGraph,
} from './provenance-activity-kernel';
import {
  SourceAdapterContextSchema,
  SourceAdapterFailureCode,
  SourceAdapterInputKind,
  SourceAdapterInputSchema,
  SourceAdapterOutputKind,
  SourceAdapterPrecondition,
  SourceAdapterResultStatus,
  SourceFieldMappingType,
  SourceNormalizationRuleKind,
  SourceRequestedUseOperation,
  createSourceAdapterRegistry,
  translateSourceMaterial,
  validateSourceAdapterDefinition,
  type SourceAdapterContext,
  type SourceAdapterDefinition,
  type SourceAdapterInput,
  type SourceAdapterResult,
  type SourceAdapterVersion,
  type SourceFieldMapping,
} from './source-adapter-contract';
import type { TruthClock } from './truth-clock-availability';

export const FIXTURE_GEOLOGY_ADAPTER_ID = 'rockhounding:fixture-geology-adapter';
export const FIXTURE_OBSERVATION_ADAPTER_ID = 'rockhounding:fixture-observation-adapter';
export const FIXTURE_SAMPLE_ADAPTER_ID = 'rockhounding:fixture-sample-adapter';

export const OFFLINE_FIXTURE_ADAPTER_VERSION: SourceAdapterVersion = {
  major: 1,
  minor: 0,
  patch: 0,
};

const PUBLISHED_AT = '2018-06-01T00:00:00.000Z';
const RETRIEVED_AT = '2026-09-22T12:00:00.000Z';
const EXECUTION_INSTANT = '2026-09-22T12:00:00.000Z';
const FIXTURE_SCHEMA_VERSION = 1;

const CLOCK_FIELDS = [
  'phenomenonTime',
  'effectiveFrom',
  'effectiveTo',
  'sourceRecordedAt',
  'publishedAt',
  'sourceUpdatedAt',
  'retrievedAt',
] as const;

export function fixtureAdaptersContactNetwork(): false {
  return false;
}

export function fixtureInvokesEvidenceAdmission(): false {
  return false;
}

export function fixtureInvokesDecisionSnapshot(): false {
  return false;
}

export function fixtureLiveIngestionPath(): false {
  return false;
}

const limitations = [
  'Offline fixtures only',
  'No live provider and no network',
  'No evidence admission or decision snapshot',
  'Fixtures do not establish real-world provider rights',
];

const preconditions = [
  SourceAdapterPrecondition.RESOURCE_IDENTIFIED,
  SourceAdapterPrecondition.SOURCE_VERSION_ACCEPTED,
  SourceAdapterPrecondition.GOVERNANCE_CONTEXT_PRESENT,
  SourceAdapterPrecondition.GOVERNANCE_OPERATION_ALLOWED,
  SourceAdapterPrecondition.RAW_INPUT_PRESERVED,
  SourceAdapterPrecondition.TRUTH_CLOCK_CONTEXT_PRESENT_OR_EXPLICITLY_UNKNOWN,
  SourceAdapterPrecondition.COVERAGE_CONTEXT_PRESERVED,
  SourceAdapterPrecondition.PROVENANCE_CONTEXT_INITIALIZED,
];

const capabilities = [
  'DETERMINISTIC_TRANSLATION',
  'PARTIAL_OUTPUT',
  'QUARANTINE_ON_UNKNOWN',
  'VOCABULARY_RETENTION',
  'AUTHORITY_CEILING',
] as const;

function definition(input: {
  id: string;
  name: string;
  inputKinds: SourceAdapterDefinition['inputKinds'];
  outputKinds: SourceAdapterDefinition['outputKinds'];
}): SourceAdapterDefinition {
  return validateSourceAdapterDefinition({
    id: input.id,
    version: OFFLINE_FIXTURE_ADAPTER_VERSION,
    schemaVersion: 1,
    name: input.name,
    sourceResourceTypes: ['LOCAL_FIXTURE'],
    inputKinds: input.inputKinds,
    outputKinds: input.outputKinds,
    capabilities: [...capabilities],
    deterministic: true,
    implementationRef: 'packages/shared/src/offline-fixture-adapters.ts',
    limitations,
    normalizationProfile: 'offline-fixture-r1',
    requiredBuildingBlocks: [SOURCE_ADAPTER_CONTRACT_BLOCK_ID, EVIDENCE_QUARANTINE_BLOCK_ID],
    requiredPreconditions: preconditions,
    allowExplicitUnknownTemporalContext: false,
    supportedSourceVersions: ['1'],
    tolerantUnsupportedVersion: false,
    requiredUseOperation: SourceRequestedUseOperation.TRANSFORM,
  });
}

const GEOLOGY_DEFINITION = definition({
  id: FIXTURE_GEOLOGY_ADAPTER_ID,
  name: 'Offline geological fixture adapter',
  inputKinds: [
    SourceAdapterInputKind.RAW_FEATURE,
    SourceAdapterInputKind.LOCAL_FIXTURE,
    SourceAdapterInputKind.DERIVED_INPUT,
  ],
  outputKinds: [
    SourceAdapterOutputKind.GEOLOGICAL_FEATURE_CANDIDATE,
    SourceAdapterOutputKind.UGES_ASSERTION_CANDIDATE,
    SourceAdapterOutputKind.DERIVED_PRODUCT_CANDIDATE,
    SourceAdapterOutputKind.QUARANTINE_CANDIDATE,
  ],
});

const OBSERVATION_DEFINITION = definition({
  id: FIXTURE_OBSERVATION_ADAPTER_ID,
  name: 'Offline observation fixture adapter',
  inputKinds: [SourceAdapterInputKind.RAW_OBSERVATION, SourceAdapterInputKind.LOCAL_FIXTURE],
  outputKinds: [
    SourceAdapterOutputKind.OBSERVATION_CANDIDATE,
    SourceAdapterOutputKind.QUARANTINE_CANDIDATE,
  ],
});

const SAMPLE_DEFINITION = definition({
  id: FIXTURE_SAMPLE_ADAPTER_ID,
  name: 'Offline sample fixture adapter',
  inputKinds: [SourceAdapterInputKind.RAW_SAMPLE_RECORD, SourceAdapterInputKind.LOCAL_FIXTURE],
  outputKinds: [
    SourceAdapterOutputKind.SAMPLE_CANDIDATE,
    SourceAdapterOutputKind.SAMPLING_EVENT_CANDIDATE,
    SourceAdapterOutputKind.QUARANTINE_CANDIDATE,
  ],
});

const ADAPTERS = createSourceAdapterRegistry([
  GEOLOGY_DEFINITION,
  OBSERVATION_DEFINITION,
  SAMPLE_DEFINITION,
]);

export function getFixtureAdapterDefinitions(): SourceAdapterDefinition[] {
  return ADAPTERS.list();
}

const OutcomeStatusSchema = z.enum(['SUCCESS', 'PARTIAL_SUCCESS', 'QUARANTINED', 'FAILED']);

export const FixtureAdapterCaseSchema = z.object({
  id: z.string().min(1).max(128),
  schemaVersion: z.literal(FIXTURE_SCHEMA_VERSION),
  adapterId: z.string().min(1).max(128),
  pipeline: z.enum(['SINGLE', 'NORMALIZE_THEN_DERIVE']),
  input: SourceAdapterInputSchema,
  context: SourceAdapterContextSchema,
  expectedResultStatus: OutcomeStatusSchema,
  expectedCandidateKinds: z.array(z.string().min(1).max(64)).max(16),
  expectedQuarantineReasons: z.array(z.string().min(1).max(64)).max(16).optional(),
});

export type FixtureAdapterCase = z.infer<typeof FixtureAdapterCaseSchema>;

export type FixtureOutcomeStatus = z.infer<typeof OutcomeStatusSchema>;

export type FixtureInvariantCheck = {
  id: string;
  passed: boolean;
};

export type FixtureAdapterRun = {
  caseId: string;
  outcomeStatus: FixtureOutcomeStatus;
  adapterResult: SourceAdapterResult;
  stageResults?: SourceAdapterResult[];
  candidateKinds: string[];
  quarantineRecord?: EvidenceQuarantineRecord;
  provenanceGraph: ProvenanceGraph;
  activityHash: string;
  checks: FixtureInvariantCheck[];
};

export function validateFixtureAdapterCase(input: unknown): FixtureAdapterCase {
  return FixtureAdapterCaseSchema.parse(input);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function clock(): SourceAdapterContext['truthClock'] {
  return {
    presence: 'PRESENT',
    clock: {
      id: 'clk-fixture',
      schemaVersion: 1,
      publishedAt: PUBLISHED_AT,
      retrievedAt: RETRIEVED_AT,
    },
  };
}

function context(input: {
  resourceId: string;
  activityId: string;
  decision?: 'ALLOWED' | 'UNKNOWN' | 'PROHIBITED';
  allowedOperations?: NonNullable<SourceAdapterContext['governance']>['allowedOperations'];
  sourceAuthorities?: SourceAdapterContext['sourceAuthorities'];
  claimedAuthority?: SourceAdapterContext['claimedAuthority'];
  recordCoverage?: 'COMPLETE' | 'PARTIAL' | 'UNKNOWN';
  resultCount?: number;
  receiptId?: string;
}): SourceAdapterContext {
  const decision = input.decision ?? 'ALLOWED';
  const recordCoverage = input.recordCoverage ?? 'COMPLETE';
  return {
    resourceId: input.resourceId,
    requestedUseOperation: SourceRequestedUseOperation.TRANSFORM,
    governance: {
      receiptId: input.receiptId ?? 'gov-fixture-transform',
      resourceId: input.resourceId,
      decision,
      allowedOperations: input.allowedOperations ?? [SourceRequestedUseOperation.TRANSFORM],
    },
    truthClock: clock(),
    coverage: {
      state: recordCoverage === 'COMPLETE' ? 'AVAILABLE' : 'COVERAGE_GAP',
      recordCoverage,
      geometryCoverage: recordCoverage,
      temporalCoverage: recordCoverage,
      resultCount: input.resultCount ?? 1,
    },
    provenance: { activityId: input.activityId, initialized: true },
    sourceAuthorities: input.sourceAuthorities ?? ['SECONDARY_AUTHORITY'],
    claimedAuthority: input.claimedAuthority ?? 'SECONDARY_AUTHORITY',
  };
}

function direct(sourceField: string, required = false): SourceFieldMapping {
  return {
    sourceField,
    targetField: sourceField,
    mappingType: SourceFieldMappingType.DIRECT,
    ...(required ? { required: true } : {}),
  };
}

function geologyMappings(): SourceFieldMapping[] {
  return [
    {
      sourceField: 'unit_code',
      targetField: 'unit_code',
      mappingType: SourceFieldMappingType.SEMANTIC_NORMALIZATION,
      required: true,
      normalizationRule: {
        kind: SourceNormalizationRuleKind.VOCABULARY_MAPPING,
        sourceLabel: 'Qal',
        normalizedConcept: 'quaternary-alluvium',
      },
    },
    direct('unit_name'),
    direct('age_text'),
    direct('geometry_ref'),
    {
      sourceField: 'published_date',
      mappingType: SourceFieldMappingType.DIRECT,
      normalizationRule: {
        kind: SourceNormalizationRuleKind.DATE_MAPPING,
        targetClockField: 'publishedAt',
      },
    },
    {
      sourceField: 'retrieved_at',
      mappingType: SourceFieldMappingType.DIRECT,
      normalizationRule: {
        kind: SourceNormalizationRuleKind.DATE_MAPPING,
        targetClockField: 'retrievedAt',
      },
    },
  ];
}

function geologyFields(): Record<string, unknown> {
  return {
    unit_code: 'Qal',
    unit_name: 'Alluvium',
    age_text: 'Quaternary',
    geometry_ref: 'fixture:polygon:geology-001',
    published_date: PUBLISHED_AT,
    retrieved_at: RETRIEVED_AT,
  };
}

function geologyInput(overrides?: {
  sourceVersionRef?: string;
  extraFields?: Record<string, unknown>;
  kind?: SourceAdapterInput['kind'];
  requestedOutputs?: SourceAdapterInput['requestedOutputs'];
}): SourceAdapterInput {
  return {
    kind: overrides?.kind ?? SourceAdapterInputKind.RAW_FEATURE,
    raw: {
      id: 'raw-geology-001',
      sourceResourceId: 'res-fixture-geology',
      sourceRecordId: 'fixture-geology-001',
      sourceVersionRef: overrides?.sourceVersionRef ?? '1',
      sourceSchemaRef: 'rockhounding:fixture-geology/1',
      rawFields: { ...geologyFields(), ...overrides?.extraFields },
    },
    mappings: geologyMappings(),
    requestedOutputs: overrides?.requestedOutputs ?? [
      SourceAdapterOutputKind.GEOLOGICAL_FEATURE_CANDIDATE,
      SourceAdapterOutputKind.UGES_ASSERTION_CANDIDATE,
    ],
  };
}

function fixtureCase(
  input: Omit<FixtureAdapterCase, 'schemaVersion'> & { schemaVersion?: 1 }
): FixtureAdapterCase {
  return validateFixtureAdapterCase({ schemaVersion: FIXTURE_SCHEMA_VERSION, ...input });
}

const GEOLOGY_CANDIDATES = [
  SourceAdapterOutputKind.GEOLOGICAL_FEATURE_CANDIDATE,
  SourceAdapterOutputKind.UGES_ASSERTION_CANDIDATE,
];

function buildCases(): FixtureAdapterCase[] {
  const geology = fixtureCase({
    id: 'fixture-geology-clean',
    adapterId: FIXTURE_GEOLOGY_ADAPTER_ID,
    pipeline: 'SINGLE',
    input: geologyInput(),
    context: context({ resourceId: 'res-fixture-geology', activityId: 'act-geology-clean' }),
    expectedResultStatus: 'SUCCESS',
    expectedCandidateKinds: GEOLOGY_CANDIDATES,
  });
  const observation = fixtureCase({
    id: 'fixture-observation-hardness',
    adapterId: FIXTURE_OBSERVATION_ADAPTER_ID,
    pipeline: 'SINGLE',
    input: {
      kind: SourceAdapterInputKind.RAW_OBSERVATION,
      raw: {
        id: 'raw-observation-001',
        sourceResourceId: 'res-fixture-observation',
        sourceRecordId: 'fixture-observation-001',
        sourceVersionRef: '1',
        sourceSchemaRef: 'rockhounding:fixture-observation/1',
        rawFields: { hardness_test: 'scratches glass' },
      },
      mappings: [direct('hardness_test', true)],
      requestedOutputs: [SourceAdapterOutputKind.OBSERVATION_CANDIDATE],
      observationOrigin: 'DIRECT',
    },
    context: context({
      resourceId: 'res-fixture-observation',
      activityId: 'act-observation-hardness',
      sourceAuthorities: ['USER_OBSERVATION'],
      claimedAuthority: 'USER_OBSERVATION',
    }),
    expectedResultStatus: 'SUCCESS',
    expectedCandidateKinds: [SourceAdapterOutputKind.OBSERVATION_CANDIDATE],
  });
  const sample = fixtureCase({
    id: 'fixture-sample-specimen',
    adapterId: FIXTURE_SAMPLE_ADAPTER_ID,
    pipeline: 'SINGLE',
    input: {
      kind: SourceAdapterInputKind.RAW_SAMPLE_RECORD,
      raw: {
        id: 'raw-sample-001',
        sourceResourceId: 'res-fixture-sample',
        sourceRecordId: 'fixture-specimen-001',
        sourceVersionRef: '1',
        sourceSchemaRef: 'rockhounding:fixture-sample/1',
        rawFields: { sample_type: 'hand-sample', material_label: 'quartz vein' },
      },
      mappings: [direct('sample_type'), direct('material_label')],
      requestedOutputs: [
        SourceAdapterOutputKind.SAMPLE_CANDIDATE,
        SourceAdapterOutputKind.SAMPLING_EVENT_CANDIDATE,
      ],
      samplingProvenancePresent: false,
    },
    context: context({ resourceId: 'res-fixture-sample', activityId: 'act-sample-specimen' }),
    expectedResultStatus: 'SUCCESS',
    expectedCandidateKinds: [SourceAdapterOutputKind.SAMPLE_CANDIDATE],
  });
  const zero = (id: string, recordCoverage: 'PARTIAL' | 'UNKNOWN'): FixtureAdapterCase =>
    fixtureCase({
      id,
      adapterId: FIXTURE_GEOLOGY_ADAPTER_ID,
      pipeline: 'SINGLE',
      input: {
        kind: SourceAdapterInputKind.LOCAL_FIXTURE,
        raw: {
          id: `raw-${id}`,
          sourceResourceId: 'res-fixture-geology',
          sourceRecordId: id,
          sourceVersionRef: '1',
          sourceSchemaRef: 'rockhounding:fixture-geology/1',
          rawFields: {},
        },
        mappings: [],
        requestedOutputs: [],
      },
      context: context({
        resourceId: 'res-fixture-geology',
        activityId: `act-${id}`,
        recordCoverage,
        resultCount: 0,
      }),
      expectedResultStatus: 'SUCCESS',
      expectedCandidateKinds: [],
    });
  return [
    geology,
    observation,
    sample,
    zero('fixture-zero-partial', 'PARTIAL'),
    zero('fixture-zero-unknown-coverage', 'UNKNOWN'),
    fixtureCase({
      id: 'fixture-coverage-complete',
      adapterId: FIXTURE_GEOLOGY_ADAPTER_ID,
      pipeline: 'SINGLE',
      input: geologyInput(),
      context: context({
        resourceId: 'res-fixture-geology',
        activityId: 'act-coverage-complete',
        recordCoverage: 'COMPLETE',
        resultCount: 1,
      }),
      expectedResultStatus: 'SUCCESS',
      expectedCandidateKinds: GEOLOGY_CANDIDATES,
    }),
    fixtureCase({
      id: 'fixture-unknown-enum',
      adapterId: FIXTURE_GEOLOGY_ADAPTER_ID,
      pipeline: 'SINGLE',
      input: {
        kind: SourceAdapterInputKind.RAW_FEATURE,
        raw: {
          id: 'raw-unknown-enum',
          sourceResourceId: 'res-fixture-geology',
          sourceRecordId: 'fixture-unknown-enum',
          sourceVersionRef: '1',
          sourceSchemaRef: 'rockhounding:fixture-geology/1',
          rawFields: { lithology_code: 'ZX-UNKNOWN' },
        },
        mappings: [
          {
            sourceField: 'lithology_code',
            targetField: 'lithology_code',
            mappingType: SourceFieldMappingType.ENUM_MAPPED,
            required: true,
            normalizationRule: {
              kind: SourceNormalizationRuleKind.ENUM_MAPPING,
              enumMap: [{ source: 'Qal', target: 'quaternary-alluvium' }],
            },
          },
        ],
        requestedOutputs: [SourceAdapterOutputKind.GEOLOGICAL_FEATURE_CANDIDATE],
      },
      context: context({ resourceId: 'res-fixture-geology', activityId: 'act-unknown-enum' }),
      expectedResultStatus: 'QUARANTINED',
      expectedCandidateKinds: [
        SourceAdapterOutputKind.GEOLOGICAL_FEATURE_CANDIDATE,
        SourceAdapterOutputKind.QUARANTINE_CANDIDATE,
      ],
      expectedQuarantineReasons: ['UNKNOWN_ENUM_VALUE'],
    }),
    fixtureCase({
      id: 'fixture-optional-unmapped',
      adapterId: FIXTURE_GEOLOGY_ADAPTER_ID,
      pipeline: 'SINGLE',
      input: geologyInput({ extraFields: { observer_note: 'unmapped note' } }),
      context: context({ resourceId: 'res-fixture-geology', activityId: 'act-optional-unmapped' }),
      expectedResultStatus: 'PARTIAL_SUCCESS',
      expectedCandidateKinds: GEOLOGY_CANDIDATES,
    }),
    fixtureCase({
      id: 'fixture-unsupported-version',
      adapterId: FIXTURE_GEOLOGY_ADAPTER_ID,
      pipeline: 'SINGLE',
      input: geologyInput({ sourceVersionRef: '99' }),
      context: context({
        resourceId: 'res-fixture-geology',
        activityId: 'act-unsupported-version',
      }),
      expectedResultStatus: 'QUARANTINED',
      expectedCandidateKinds: [],
      expectedQuarantineReasons: ['UNSUPPORTED_SOURCE_VERSION'],
    }),
    fixtureCase({
      id: 'fixture-authority-elevation',
      adapterId: FIXTURE_GEOLOGY_ADAPTER_ID,
      pipeline: 'SINGLE',
      input: geologyInput(),
      context: context({
        resourceId: 'res-fixture-geology',
        activityId: 'act-authority-elevation',
        sourceAuthorities: ['COMMUNITY_REPORT'],
        claimedAuthority: 'PRIMARY_AUTHORITY',
        receiptId: 'gov-fixture-community',
      }),
      expectedResultStatus: 'QUARANTINED',
      expectedCandidateKinds: [],
      expectedQuarantineReasons: ['AUTHORITY_ELEVATION_ATTEMPT'],
    }),
    fixtureCase({
      id: 'fixture-temporal-ambiguity',
      adapterId: FIXTURE_GEOLOGY_ADAPTER_ID,
      pipeline: 'SINGLE',
      input: {
        kind: SourceAdapterInputKind.RAW_FEATURE,
        raw: {
          id: 'raw-temporal-ambiguity',
          sourceResourceId: 'res-fixture-geology',
          sourceRecordId: 'fixture-temporal-ambiguity',
          sourceVersionRef: '1',
          sourceSchemaRef: 'rockhounding:fixture-geology/1',
          rawFields: { date: '2025' },
        },
        mappings: [
          {
            sourceField: 'date',
            mappingType: SourceFieldMappingType.DIRECT,
            normalizationRule: {
              kind: SourceNormalizationRuleKind.DATE_MAPPING,
              targetClockField: 'phenomenonTime',
            },
          },
        ],
        requestedOutputs: [],
      },
      context: context({
        resourceId: 'res-fixture-geology',
        activityId: 'act-temporal-ambiguity',
      }),
      expectedResultStatus: 'QUARANTINED',
      expectedCandidateKinds: [],
      expectedQuarantineReasons: ['TEMPORAL_MEANING_UNKNOWN'],
    }),
    fixtureCase({
      id: 'fixture-governance-unknown',
      adapterId: FIXTURE_GEOLOGY_ADAPTER_ID,
      pipeline: 'SINGLE',
      input: geologyInput(),
      context: context({
        resourceId: 'res-fixture-geology',
        activityId: 'act-governance-unknown',
        decision: 'UNKNOWN',
        allowedOperations: [],
        receiptId: 'gov-fixture-unknown',
      }),
      expectedResultStatus: 'FAILED',
      expectedCandidateKinds: [],
      expectedQuarantineReasons: ['GOVERNANCE_UNKNOWN'],
    }),
    fixtureCase({
      id: 'fixture-governance-prohibited',
      adapterId: FIXTURE_GEOLOGY_ADAPTER_ID,
      pipeline: 'SINGLE',
      input: geologyInput(),
      context: context({
        resourceId: 'res-fixture-geology',
        activityId: 'act-governance-prohibited',
        decision: 'PROHIBITED',
        allowedOperations: [SourceRequestedUseOperation.TRANSFORM],
        receiptId: 'gov-fixture-prohibited',
      }),
      expectedResultStatus: 'FAILED',
      expectedCandidateKinds: [],
      expectedQuarantineReasons: ['GOVERNANCE_PROHIBITED'],
    }),
    fixtureCase({
      id: 'fixture-governance-read-only',
      adapterId: FIXTURE_GEOLOGY_ADAPTER_ID,
      pipeline: 'SINGLE',
      input: geologyInput(),
      context: context({
        resourceId: 'res-fixture-geology',
        activityId: 'act-governance-read-only',
        decision: 'ALLOWED',
        allowedOperations: [SourceRequestedUseOperation.READ],
        receiptId: 'gov-fixture-read',
      }),
      expectedResultStatus: 'FAILED',
      expectedCandidateKinds: [],
    }),
    fixtureCase({
      id: 'fixture-geology-multistage',
      adapterId: FIXTURE_GEOLOGY_ADAPTER_ID,
      pipeline: 'NORMALIZE_THEN_DERIVE',
      input: geologyInput(),
      context: context({
        resourceId: 'res-fixture-geology',
        activityId: 'act-geology-multistage',
      }),
      expectedResultStatus: 'SUCCESS',
      expectedCandidateKinds: [SourceAdapterOutputKind.DERIVED_PRODUCT_CANDIDATE],
    }),
  ];
}

const FIXTURE_CASES = deepFreeze(buildCases());

export function listFixtureAdapterCases(): FixtureAdapterCase[] {
  return deepFreeze(structuredClone(FIXTURE_CASES));
}

function versionLabel(version: SourceAdapterVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function presentClockFields(
  clockValue: TruthClock
): NonNullable<SourceAdapterResult['truthClockCandidate']> {
  const picked: NonNullable<SourceAdapterResult['truthClockCandidate']> = {};
  for (const field of CLOCK_FIELDS) {
    const value = clockValue[field];
    if (value !== undefined) {
      picked[field] = value;
    }
  }
  return picked;
}

function temporalAmbiguity(result: SourceAdapterResult): boolean {
  return result.diagnostics.some(
    (diagnostic) =>
      diagnostic.code === 'INVALID_TEMPORAL_VALUE' ||
      diagnostic.code === 'UNSUPPORTED_TIME_SEMANTICS'
  );
}

function outcomeFor(result: SourceAdapterResult): FixtureOutcomeStatus {
  if (temporalAmbiguity(result)) {
    return 'QUARANTINED';
  }
  if (result.status === SourceAdapterResultStatus.QUARANTINED) {
    return 'QUARANTINED';
  }
  if (result.status === SourceAdapterResultStatus.FAILED) {
    if (
      result.failureCode === SourceAdapterFailureCode.UNSUPPORTED_SOURCE_VERSION ||
      result.failureCode === SourceAdapterFailureCode.AUTHORITY_ELEVATION_ATTEMPT
    ) {
      return 'QUARANTINED';
    }
    return 'FAILED';
  }
  if (result.status === SourceAdapterResultStatus.PARTIAL_SUCCESS) {
    return 'PARTIAL_SUCCESS';
  }
  return 'SUCCESS';
}

function annotateForQuarantine(
  definitionValue: SourceAdapterDefinition,
  sourceContext: SourceAdapterContext,
  result: SourceAdapterResult
): SourceAdapterResult {
  const ready = structuredClone(result);
  if (ready.provenance === undefined && ready.raw !== undefined) {
    ready.provenance = {
      sourceResourceId: ready.raw.sourceResourceId,
      adapterId: definitionValue.id,
      adapterVersion: definitionValue.version,
      rawSourceRecordId: ready.raw.id,
      derivationKind: 'NORMALIZED_FROM',
      manufacturesTruth: false,
    };
  }
  if (ready.governanceReceiptId === undefined && sourceContext.governance !== undefined) {
    ready.governanceReceiptId = sourceContext.governance.receiptId;
  }
  if (ready.failureCode === SourceAdapterFailureCode.GOVERNANCE_UNRESOLVED) {
    ready.diagnostics.push({ code: 'GOVERNANCE_UNKNOWN' });
  }
  if (
    ready.failureCode === SourceAdapterFailureCode.GOVERNANCE_NOT_ALLOWED &&
    sourceContext.governance?.decision === 'PROHIBITED'
  ) {
    ready.diagnostics.push({ code: 'GOVERNANCE_PROHIBITED' });
  }
  if (temporalAmbiguity(ready)) {
    ready.diagnostics.push({ code: 'TEMPORAL_MEANING_UNKNOWN' });
  }
  if (ready.truthClockCandidate === undefined && sourceContext.truthClock.presence === 'PRESENT') {
    ready.truthClockCandidate = presentClockFields(sourceContext.truthClock.clock);
  }
  return ready;
}

function entityForKind(kind: string, entityId: string): ProvenanceEntityReference {
  const entityType =
    kind === SourceAdapterOutputKind.OBSERVATION_CANDIDATE
      ? ProvenanceEntityType.OBSERVATION
      : kind === SourceAdapterOutputKind.SAMPLE_CANDIDATE
        ? ProvenanceEntityType.SAMPLE
        : kind === SourceAdapterOutputKind.UGES_ASSERTION_CANDIDATE
          ? ProvenanceEntityType.UGES_ASSERTION
          : kind === SourceAdapterOutputKind.DERIVED_PRODUCT_CANDIDATE
            ? ProvenanceEntityType.DERIVED_PRODUCT
            : kind === SourceAdapterOutputKind.GEOLOGICAL_FEATURE_CANDIDATE
              ? ProvenanceEntityType.GEOLOGICAL_LAYER
              : ProvenanceEntityType.OTHER;
  return { entityId, entityType };
}

function sourceEntity(result: SourceAdapterResult): ProvenanceEntityReference {
  return {
    entityId: result.raw?.sourceRecordId ?? result.raw?.id ?? 'fixture-source-missing',
    entityType: ProvenanceEntityType.RESOURCE_RECORD,
  };
}

async function activityFor(input: {
  id: string;
  definitionValue: SourceAdapterDefinition;
  sourceContext: SourceAdapterContext;
  activityType: ProvenanceActivity['activityType'];
  used: ProvenanceEntityReference[];
  generated: ProvenanceEntityReference[];
  status: 'COMPLETED' | 'FAILED';
}): Promise<ProvenanceActivity> {
  const activity = validateProvenanceActivity({
    id: input.id,
    schemaVersion: PROVENANCE_SCHEMA_VERSION,
    activityType: input.activityType,
    lineageClass: ProvenanceLineageClass.PROCESS,
    used: input.used,
    generated: input.generated,
    associatedAgents: [
      {
        agentId: 'fixture-adapter-runtime',
        agentType: ProvenanceAgentType.SOFTWARE,
        role: ProvenanceAgentRole.SOFTWARE_EXECUTOR,
      },
    ],
    process: {
      processId: input.definitionValue.id,
      processVersion: versionLabel(input.definitionValue.version),
      implementationRef: 'packages/shared/src/offline-fixture-adapters.ts',
      buildingBlockId: SOURCE_ADAPTER_CONTRACT_BLOCK_ID,
      buildingBlockVersion: { major: 1, minor: 0, patch: 0 },
    },
    startedAt: EXECUTION_INSTANT,
    endedAt: EXECUTION_INSTANT,
    parameters: [
      {
        name: 'adapterVersion',
        type: 'STRING',
        value: versionLabel(input.definitionValue.version),
      },
    ],
    status: input.status,
    ...(input.sourceContext.governance === undefined
      ? {}
      : { governanceReceiptId: input.sourceContext.governance.receiptId }),
  });
  const activityHash = await hashProvenanceActivity(activity);
  return validateProvenanceActivity({ ...activity, activityHash });
}

function derivedInput(first: SourceAdapterResult): SourceAdapterInput {
  const normalized = first.normalized?.normalizedFields ?? {};
  const rawFields: Record<string, unknown> = {
    source_record_id: first.raw?.sourceRecordId,
  };
  for (const key of Object.keys(normalized).sort()) {
    rawFields[key] = structuredClone(normalized[key]);
  }
  const mappings = Object.keys(rawFields)
    .sort()
    .map((field) => direct(field));
  return {
    kind: SourceAdapterInputKind.DERIVED_INPUT,
    raw: {
      id: 'raw-geology-001-derived',
      sourceResourceId: first.raw?.sourceResourceId ?? 'res-fixture-geology',
      sourceRecordId: first.raw?.sourceRecordId,
      sourceVersionRef: '1',
      sourceSchemaRef: 'rockhounding:fixture-geology/1',
      rawFields,
    },
    mappings,
    requestedOutputs: [SourceAdapterOutputKind.DERIVED_PRODUCT_CANDIDATE],
  };
}

function resolveDefinition(
  adapterId: string,
  adapterVersion?: SourceAdapterVersion
): SourceAdapterDefinition {
  const found = ADAPTERS.list().find((definitionValue) => definitionValue.id === adapterId);
  if (found === undefined) {
    throw new Error(`Unknown fixture adapter ${adapterId}`);
  }
  if (adapterVersion === undefined) {
    return found;
  }
  return validateSourceAdapterDefinition({ ...found, version: adapterVersion });
}

function candidateKindsOf(result: SourceAdapterResult): string[] {
  return result.candidates.map((candidate) => candidate.kind);
}

function flagIsFalse(value: unknown): boolean {
  return value === false;
}

function checksFor(
  fixtureCaseValue: FixtureAdapterCase,
  outcomeStatus: FixtureOutcomeStatus,
  candidateKinds: string[],
  quarantineRecord: EvidenceQuarantineRecord | undefined,
  adapterResult: SourceAdapterResult
): FixtureInvariantCheck[] {
  const reasons = quarantineRecord?.capture.reasons.map((reason) => reason.code) ?? [];
  const expectedReasons = fixtureCaseValue.expectedQuarantineReasons ?? [];
  return [
    {
      id: 'result-status',
      passed: outcomeStatus === fixtureCaseValue.expectedResultStatus,
    },
    {
      id: 'candidate-kinds',
      passed:
        candidateKinds.length === fixtureCaseValue.expectedCandidateKinds.length &&
        candidateKinds.every(
          (kind, index) => kind === fixtureCaseValue.expectedCandidateKinds[index]
        ),
    },
    {
      id: 'quarantine-reasons',
      passed: expectedReasons.every((reason) => reasons.some((code) => code === reason)),
    },
    { id: 'no-confirmed-absence', passed: flagIsFalse(adapterResult.confirmedAbsence) },
    {
      id: 'no-admission',
      passed:
        flagIsFalse(quarantineRecord?.admitted ?? false) &&
        flagIsFalse(fixtureInvokesEvidenceAdmission()),
    },
  ];
}

export async function runFixtureAdapterCase(
  fixtureCaseInput: FixtureAdapterCase,
  options?: { adapterVersion?: SourceAdapterVersion }
): Promise<FixtureAdapterRun> {
  const fixtureCaseValue = validateFixtureAdapterCase(structuredClone(fixtureCaseInput));
  const definitionValue = resolveDefinition(fixtureCaseValue.adapterId, options?.adapterVersion);
  const first = translateSourceMaterial(
    definitionValue,
    fixtureCaseValue.input,
    fixtureCaseValue.context
  );
  const stageResults: SourceAdapterResult[] = [first];
  let finalResult = first;
  if (fixtureCaseValue.pipeline === 'NORMALIZE_THEN_DERIVE' && outcomeFor(first) === 'SUCCESS') {
    finalResult = translateSourceMaterial(
      definitionValue,
      derivedInput(first),
      fixtureCaseValue.context
    );
    stageResults.push(finalResult);
  }
  const outcomeStatus = outcomeFor(finalResult);
  const quarantineRecord =
    outcomeStatus === 'QUARANTINED' || outcomeStatus === 'FAILED'
      ? quarantineFromAdapterResult(
          annotateForQuarantine(definitionValue, fixtureCaseValue.context, finalResult),
          `q:${fixtureCaseValue.id}`
        )
      : undefined;
  const source = sourceEntity(first);
  const normalized =
    first.normalized === undefined
      ? undefined
      : {
          entityId: first.normalized.id,
          entityType: ProvenanceEntityType.GEOLOGICAL_LAYER,
        };
  const finalCandidateId = finalResult.canonicalCandidateId;
  const finalKind = finalResult.candidates[0]?.kind;
  const generated =
    finalCandidateId !== undefined && finalKind !== undefined
      ? [entityForKind(finalKind, finalCandidateId)]
      : [];
  const normalizeActivity = await activityFor({
    id: `act:${fixtureCaseValue.id}:normalize`,
    definitionValue,
    sourceContext: fixtureCaseValue.context,
    activityType:
      fixtureCaseValue.adapterId === FIXTURE_OBSERVATION_ADAPTER_ID
        ? ProvenanceActivityType.FIELD_OBSERVATION
        : ProvenanceActivityType.NORMALIZATION,
    used: [source],
    generated: normalized === undefined ? generated : [normalized, ...generated],
    status:
      outcomeStatus === 'SUCCESS' || outcomeStatus === 'PARTIAL_SUCCESS' ? 'COMPLETED' : 'FAILED',
  });
  const activities = [normalizeActivity];
  const derivations: ProvenanceGraph['derivations'] = [];
  if (normalized !== undefined && finalCandidateId !== undefined && finalKind !== undefined) {
    const candidate = entityForKind(finalKind, finalCandidateId);
    derivations.push({
      kind: ProvenanceDerivationKind.NORMALIZED_FROM,
      relationship: ProvenanceRelationship.DERIVES,
      lineageClass: ProvenanceLineageClass.SOURCE,
      generated: candidate,
      used: source,
    });
    derivations.push({
      kind: ProvenanceDerivationKind.NORMALIZED_FROM,
      relationship: ProvenanceRelationship.DERIVES,
      lineageClass: ProvenanceLineageClass.PROCESS,
      generated: normalized,
      used: source,
    });
    if (fixtureCaseValue.pipeline === 'NORMALIZE_THEN_DERIVE') {
      const deriveActivity = await activityFor({
        id: `act:${fixtureCaseValue.id}:derive`,
        definitionValue,
        sourceContext: fixtureCaseValue.context,
        activityType: ProvenanceActivityType.DERIVATION,
        used: [normalized],
        generated: [candidate],
        status: 'COMPLETED',
      });
      activities.push(deriveActivity);
      derivations.push({
        kind: ProvenanceDerivationKind.DERIVED_FROM,
        relationship: ProvenanceRelationship.DERIVES,
        lineageClass: ProvenanceLineageClass.PROCESS,
        generated: candidate,
        used: normalized,
      });
    }
  }
  const provenanceGraph = validateProvenanceGraph({
    schemaVersion: PROVENANCE_SCHEMA_VERSION,
    activities,
    derivations,
  });
  const candidateKinds = candidateKindsOf(finalResult);
  return {
    caseId: fixtureCaseValue.id,
    outcomeStatus,
    adapterResult: finalResult,
    ...(stageResults.length > 1 ? { stageResults } : {}),
    candidateKinds,
    ...(quarantineRecord === undefined ? {} : { quarantineRecord }),
    provenanceGraph,
    activityHash: normalizeActivity.activityHash?.value ?? '',
    checks: checksFor(
      fixtureCaseValue,
      outcomeStatus,
      candidateKinds,
      quarantineRecord,
      finalResult
    ),
  };
}

export async function replayFixtureCatalog(): Promise<FixtureAdapterRun[]> {
  const runs: FixtureAdapterRun[] = [];
  for (const fixtureCaseValue of listFixtureAdapterCases()) {
    runs.push(await runFixtureAdapterCase(fixtureCaseValue));
  }
  return runs;
}
