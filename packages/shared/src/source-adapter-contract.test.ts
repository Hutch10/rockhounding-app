import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  GEOLOGICAL_LAYER_REGISTRY_BLOCK_ID,
  OBSERVATION_BLOCK_ID,
  PROVENANCE_ACTIVITY_BLOCK_ID,
  RESOURCE_CATALOG_BLOCK_ID,
  SAMPLE_BLOCK_ID,
  SAMPLING_EVENT_BLOCK_ID,
  SOURCE_GOVERNANCE_BLOCK_ID,
  TRUTH_CLOCK_BLOCK_ID,
  UGES_BLOCK_ID,
  BuildingBlockRelationshipKind,
  createBuildingBlockRegistry,
  getBuildingBlock,
  getLatestStableBuildingBlock,
} from './building-block-registry';
import { ObservationResultOrigin } from './observation-sample-model';
import {
  type SourceAdapterContext,
  type SourceAdapterDefinition,
  type SourceAdapterInput,
  SourceAdapterFailureCode,
  SourceAdapterInputKind,
  SourceAdapterOutputKind,
  SourceAdapterPrecondition,
  SourceAdapterResultStatus,
  SourceFieldMappingType,
  SourceRequestedUseOperation,
  adapterAuthorizesUse,
  adapterEstablishesConfirmedAbsence,
  adapterFabricatesCertainty,
  adapterFabricatesConfidence,
  adapterFabricatesProhibited,
  coverageWasPromoted,
  createSourceAdapterRegistry,
  evaluatePreconditions,
  operationImplies,
  projectAuthorityChain,
  provenanceManufacturesTruth,
  translateSourceMaterial,
  validateSourceAdapterDefinition,
} from './source-adapter-contract';
import { confirmedAbsenceEstablished } from './truth-clock-availability';
import { EvidenceAuthorityClass, EvidenceCertainty } from './universal-geological-evidence-schema';

const VERSION = { major: 1, minor: 0, patch: 0 };

function definition(overrides: Partial<SourceAdapterDefinition> = {}): SourceAdapterDefinition {
  return validateSourceAdapterDefinition({
    id: 'adapter:contract-test',
    version: VERSION,
    schemaVersion: 1,
    name: 'Contract test adapter',
    sourceResourceTypes: ['DATASET'],
    inputKinds: [SourceAdapterInputKind.RAW_RECORD, SourceAdapterInputKind.RAW_SAMPLE_RECORD],
    outputKinds: [
      SourceAdapterOutputKind.RESOURCE_DERIVED_RECORD,
      SourceAdapterOutputKind.OBSERVATION_CANDIDATE,
      SourceAdapterOutputKind.SAMPLE_CANDIDATE,
      SourceAdapterOutputKind.SAMPLING_EVENT_CANDIDATE,
      SourceAdapterOutputKind.UGES_ASSERTION_CANDIDATE,
      SourceAdapterOutputKind.QUARANTINE_CANDIDATE,
    ],
    capabilities: [
      'DETERMINISTIC_TRANSLATION',
      'PARTIAL_OUTPUT',
      'QUARANTINE_ON_UNKNOWN',
      'VOCABULARY_RETENTION',
      'AUTHORITY_CEILING',
    ],
    deterministic: true,
    limitations: ['no-live-fetch'],
    requiredBuildingBlocks: [RESOURCE_CATALOG_BLOCK_ID],
    requiredPreconditions: Object.values(SourceAdapterPrecondition),
    allowExplicitUnknownTemporalContext: false,
    supportedSourceVersions: ['schema-1'],
    tolerantUnsupportedVersion: false,
    requiredUseOperation: SourceRequestedUseOperation.TRANSFORM,
    ...overrides,
  });
}

function context(overrides: Partial<SourceAdapterContext> = {}): SourceAdapterContext {
  return {
    resourceId: 'res-1',
    requestedUseOperation: SourceRequestedUseOperation.TRANSFORM,
    governance: {
      receiptId: 'gov-1',
      resourceId: 'res-1',
      decision: 'ALLOWED',
      allowedOperations: [SourceRequestedUseOperation.TRANSFORM],
    },
    truthClock: {
      presence: 'PRESENT',
      clock: {
        id: 'clk-1',
        schemaVersion: 1,
        phenomenonTime: '2020-06-01T00:00:00.000Z',
        publishedAt: '2024-01-01T00:00:00.000Z',
        retrievedAt: '2026-09-22T00:00:00.000Z',
      },
    },
    coverage: {
      state: 'AVAILABLE',
      recordCoverage: 'PARTIAL',
      geometryCoverage: 'PARTIAL',
      temporalCoverage: 'UNKNOWN',
      knownMissingClasses: ['road-closure'],
      reason: { code: 'RECORD_COVERAGE_PARTIAL', detail: 'north sheet missing' },
      resultCount: 1,
    },
    provenance: { activityId: 'act-1', initialized: true },
    sourceAuthorities: [EvidenceAuthorityClass.SECONDARY_AUTHORITY],
    claimedAuthority: EvidenceAuthorityClass.SECONDARY_AUTHORITY,
    ...overrides,
  };
}

function input(overrides: Partial<SourceAdapterInput> = {}): SourceAdapterInput {
  return {
    kind: SourceAdapterInputKind.RAW_RECORD,
    raw: {
      id: 'raw-1',
      sourceResourceId: 'res-1',
      sourceRecordId: 'provider-99',
      sourceVersionRef: 'schema-1',
      rawFields: { lithology: 'Qal', note: 'keep-me', extra: 'unmapped' },
    },
    mappings: [
      {
        sourceField: 'lithology',
        targetField: 'lithology',
        mappingType: SourceFieldMappingType.SEMANTIC_NORMALIZATION,
        normalizationRule: {
          kind: 'VOCABULARY_MAPPING',
          sourceLabel: 'Qal',
          normalizedConcept: 'Quaternary alluvium',
        },
        lossless: true,
      },
      {
        sourceField: 'note',
        targetField: 'note',
        mappingType: SourceFieldMappingType.DIRECT,
        lossless: true,
      },
    ],
    requestedOutputs: [SourceAdapterOutputKind.RESOURCE_DERIVED_RECORD],
    ...overrides,
  };
}

describe('source adapter contract r1', () => {
  it('accepts a valid definition and preserves the deterministic flag and kinds', () => {
    const adapter = definition();
    expect(adapter.deterministic).toBe(true);
    expect(adapter.inputKinds).toContain(SourceAdapterInputKind.RAW_RECORD);
    expect(adapter.outputKinds).toContain(SourceAdapterOutputKind.QUARANTINE_CANDIDATE);
    expect(createSourceAdapterRegistry([adapter]).list()).toHaveLength(1);
  });

  it('rejects a duplicate adapter id and version and a malformed definition', () => {
    const adapter = definition();
    expect(() => createSourceAdapterRegistry([adapter, adapter])).toThrow(/duplicate/i);
    expect(() =>
      validateSourceAdapterDefinition({ ...adapter, id: '', deterministic: 'yes' })
    ).toThrow();
  });

  it('fails closed when identity, version, governance, or provenance preconditions fail', () => {
    const adapter = definition();
    const missingResource = translateSourceMaterial(adapter, input(), context({ resourceId: '' }));
    expect(missingResource.status).toBe(SourceAdapterResultStatus.FAILED);
    expect(missingResource.failureCode).toBe(SourceAdapterFailureCode.RESOURCE_IDENTITY_MISSING);

    const badVersion = translateSourceMaterial(
      adapter,
      input({
        raw: { ...input().raw, sourceVersionRef: 'schema-9' },
      }),
      context()
    );
    expect(badVersion.failureCode).toBe(SourceAdapterFailureCode.UNSUPPORTED_SOURCE_VERSION);

    const unknownGov = translateSourceMaterial(
      adapter,
      input(),
      context({
        governance: { ...context().governance!, decision: 'UNKNOWN' },
      })
    );
    expect(unknownGov.failureCode).toBe(SourceAdapterFailureCode.GOVERNANCE_UNRESOLVED);

    const prohibited = translateSourceMaterial(
      adapter,
      input(),
      context({
        governance: { ...context().governance!, decision: 'PROHIBITED' },
      })
    );
    expect(prohibited.failureCode).toBe(SourceAdapterFailureCode.GOVERNANCE_NOT_ALLOWED);

    const noProvenance = translateSourceMaterial(
      adapter,
      input(),
      context({ provenance: { activityId: 'act-1', initialized: false } })
    );
    expect(noProvenance.failureCode).toBe(SourceAdapterFailureCode.PROVENANCE_CONTEXT_MISSING);
  });

  it('allows explicit UNKNOWN temporal context only when the adapter declares it', () => {
    const strict = translateSourceMaterial(
      definition(),
      input(),
      context({ truthClock: { presence: 'UNKNOWN' } })
    );
    expect(strict.failureCode).toBe(SourceAdapterFailureCode.TEMPORAL_CONTEXT_INSUFFICIENT);

    const tolerant = translateSourceMaterial(
      definition({ allowExplicitUnknownTemporalContext: true }),
      input(),
      context({ truthClock: { presence: 'UNKNOWN' } })
    );
    expect(tolerant.status).not.toBe(SourceAdapterResultStatus.FAILED);
    expect(
      evaluatePreconditions(
        definition({ allowExplicitUnknownTemporalContext: true }),
        input(),
        context({ truthClock: { presence: 'UNKNOWN' } })
      ).find(
        (item) =>
          item.precondition ===
          SourceAdapterPrecondition.TRUTH_CLOCK_CONTEXT_PRESENT_OR_EXPLICITLY_UNKNOWN
      )?.status
    ).toBe('PASSED');
  });

  it('preserves partial and unknown coverage through precondition evaluation', () => {
    const result = translateSourceMaterial(definition(), input(), context());
    expect(result.coverage?.recordCoverage).toBe('PARTIAL');
    expect(result.coverage?.geometryCoverage).toBe('PARTIAL');
    expect(result.coverage?.temporalCoverage).toBe('UNKNOWN');
    expect(result.coverage?.reason?.code).toBe('RECORD_COVERAGE_PARTIAL');
  });

  it('preserves raw fields, unmapped values, and explicit ignores without guessing enums', () => {
    const rawFields = {
      lithology: 'MadeUpRock',
      note: 'keep-me',
      secret: 'drop-me',
      extra: 'stay',
    };
    const supplied = input({
      raw: { ...input().raw, rawFields },
      mappings: [
        {
          sourceField: 'lithology',
          targetField: 'lithology',
          mappingType: SourceFieldMappingType.ENUM_MAPPED,
          normalizationRule: {
            kind: 'ENUM_MAPPING',
            enumMap: [{ source: 'Qal', target: 'quaternary-alluvium' }],
          },
        },
        {
          sourceField: 'note',
          targetField: 'note',
          mappingType: SourceFieldMappingType.DIRECT,
        },
        {
          sourceField: 'secret',
          mappingType: SourceFieldMappingType.IGNORED_BY_CONTRACT,
          notes: 'contract excludes this column',
        },
      ],
    });
    const before = structuredClone(supplied.raw.rawFields);
    const result = translateSourceMaterial(definition(), supplied, context());
    expect(supplied.raw.rawFields).toEqual(before);
    expect(result.raw?.rawFields).toEqual(before);
    expect(result.raw?.rawFields.extra).toBe('stay');
    expect(result.normalized?.normalizedFields.lithology).toBeUndefined();
    expect(result.diagnostics.some((item) => item.code === 'UNKNOWN_ENUM_VALUE')).toBe(true);
    expect(
      result.diagnostics.some((item) => item.code === 'UNMAPPED_FIELD' && item.field === 'extra')
    ).toBe(true);
    expect(
      result.normalized?.fieldMappings.some((item) => item.mappingType === 'IGNORED_BY_CONTRACT')
    ).toBe(true);
    expect(result.normalized?.normalizedFields.secret).toBeUndefined();
  });

  it('keeps provider record ids distinct from candidate ids and preserves adapter identity', () => {
    const result = translateSourceMaterial(definition(), input(), context());
    expect(result.raw?.sourceRecordId).toBe('provider-99');
    expect(result.canonicalCandidateId).not.toBe('provider-99');
    expect(result.raw?.sourceResourceId).toBe('res-1');
    expect(result.provenance?.adapterId).toBe('adapter:contract-test');
    expect(result.provenance?.adapterVersion).toEqual(VERSION);
  });

  it('permits equal or lower authority and rejects elevation, including across transformations', () => {
    const equal = translateSourceMaterial(definition(), input(), context());
    expect(equal.status).not.toBe(SourceAdapterResultStatus.FAILED);

    const downgrade = translateSourceMaterial(
      definition(),
      input(),
      context({
        sourceAuthorities: [EvidenceAuthorityClass.SECONDARY_AUTHORITY],
        claimedAuthority: EvidenceAuthorityClass.COMMUNITY_REPORT,
      })
    );
    expect(downgrade.authority?.accepted).toBe(true);

    const elevated = translateSourceMaterial(
      definition(),
      input(),
      context({
        sourceAuthorities: [EvidenceAuthorityClass.USER_OBSERVATION],
        claimedAuthority: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
      })
    );
    expect(elevated.failureCode).toBe(SourceAdapterFailureCode.AUTHORITY_ELEVATION_ATTEMPT);

    const model = translateSourceMaterial(
      definition(),
      input(),
      context({
        sourceAuthorities: [EvidenceAuthorityClass.MODEL_DERIVED],
        claimedAuthority: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
      })
    );
    expect(model.failureCode).toBe(SourceAdapterFailureCode.AUTHORITY_ELEVATION_ATTEMPT);

    const secondary = translateSourceMaterial(
      definition(),
      input(),
      context({
        sourceAuthorities: [EvidenceAuthorityClass.SECONDARY_AUTHORITY],
        claimedAuthority: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
      })
    );
    expect(secondary.failureCode).toBe(SourceAdapterFailureCode.AUTHORITY_ELEVATION_ATTEMPT);

    const chain = projectAuthorityChain(
      [EvidenceAuthorityClass.COMMUNITY_REPORT],
      [
        EvidenceAuthorityClass.COMMUNITY_REPORT,
        EvidenceAuthorityClass.COMMUNITY_REPORT,
        EvidenceAuthorityClass.PRIMARY_AUTHORITY,
      ]
    );
    expect(chain.accepted).toBe(false);
    expect(chain.elevatingStep).toBe(2);
  });

  it('preserves governance receipts and does not treat one operation as another', () => {
    const result = translateSourceMaterial(definition(), input(), context());
    expect(result.governanceReceiptId).toBe('gov-1');
    expect(adapterAuthorizesUse()).toBe(false);
    expect(
      operationImplies(SourceRequestedUseOperation.READ, SourceRequestedUseOperation.TRANSFORM)
    ).toBe(false);
    expect(
      operationImplies(
        SourceRequestedUseOperation.AUTOMATED_QUERY,
        SourceRequestedUseOperation.BULK_DOWNLOAD
      )
    ).toBe(false);
    expect(
      operationImplies(
        SourceRequestedUseOperation.MODEL_INPUT,
        SourceRequestedUseOperation.TRAINING_USE
      )
    ).toBe(false);

    const readOnly = translateSourceMaterial(
      definition(),
      input(),
      context({
        requestedUseOperation: SourceRequestedUseOperation.TRANSFORM,
        governance: {
          receiptId: 'gov-read',
          resourceId: 'res-1',
          decision: 'ALLOWED',
          allowedOperations: [SourceRequestedUseOperation.READ],
        },
      })
    );
    expect(readOnly.failureCode).toBe(SourceAdapterFailureCode.GOVERNANCE_NOT_ALLOWED);
  });

  it('maps clock fields independently and does not infer currency from retrieval', () => {
    const mapped = translateSourceMaterial(
      definition(),
      input({
        mappings: [
          ...input().mappings,
          {
            sourceField: 'happenedAt',
            targetField: 'phenomenonTime',
            mappingType: SourceFieldMappingType.DIRECT,
            normalizationRule: { kind: 'DATE_MAPPING', targetClockField: 'phenomenonTime' },
          },
        ],
        raw: {
          ...input().raw,
          rawFields: {
            ...input().raw.rawFields,
            happenedAt: '2019-05-01T00:00:00.000Z',
            retrievedAt: '2026-09-22T00:00:00.000Z',
          },
        },
      }),
      context()
    );
    expect(mapped.truthClockCandidate?.phenomenonTime).toBe('2019-05-01T00:00:00.000Z');
    expect(mapped.truthClockCandidate?.sourceUpdatedAt).toBeUndefined();
    expect(mapped.truthClockCandidate?.effectiveFrom).toBeUndefined();

    const inferred = translateSourceMaterial(
      definition(),
      input({
        mappings: [
          {
            sourceField: 'retrievedAt',
            targetField: 'sourceUpdatedAt',
            mappingType: SourceFieldMappingType.DIRECT,
            normalizationRule: { kind: 'DATE_MAPPING', targetClockField: 'sourceUpdatedAt' },
          },
        ],
        raw: {
          ...input().raw,
          rawFields: { retrievedAt: '2026-09-22T00:00:00.000Z' },
        },
      }),
      context()
    );
    expect(inferred.truthClockCandidate?.sourceUpdatedAt).toBeUndefined();
    expect(inferred.diagnostics.some((item) => item.code === 'UNSUPPORTED_TIME_SEMANTICS')).toBe(
      true
    );

    const badTime = translateSourceMaterial(
      definition(),
      input({
        mappings: [
          {
            sourceField: 'happenedAt',
            targetField: 'phenomenonTime',
            mappingType: SourceFieldMappingType.DIRECT,
            normalizationRule: { kind: 'DATE_MAPPING', targetClockField: 'phenomenonTime' },
          },
        ],
        raw: { ...input().raw, rawFields: { happenedAt: 'not-a-time' } },
      }),
      context()
    );
    expect(badTime.diagnostics.some((item) => item.code === 'INVALID_TEMPORAL_VALUE')).toBe(true);
    expect(badTime.successfulRetrievalImpliesCurrency).toBe(false);
  });

  it('refuses coverage promotion and confirmed absence', () => {
    const promoted = translateSourceMaterial(
      definition(),
      input({ claimedCoverage: { recordCoverage: 'COMPLETE', geometryCoverage: 'COMPLETE' } }),
      context()
    );
    expect(promoted.failureCode).toBe(SourceAdapterFailureCode.COVERAGE_METADATA_INVALID);
    expect(coverageWasPromoted('PARTIAL', 'COMPLETE')).toBe(true);
    expect(coverageWasPromoted('UNKNOWN', 'COMPLETE')).toBe(true);
    expect(adapterEstablishesConfirmedAbsence()).toBe(false);
    expect(
      confirmedAbsenceEstablished({
        state: 'MISSING',
        recordCoverage: 'PARTIAL',
        resultCount: 0,
      })
    ).toBe(false);
    const zero = translateSourceMaterial(
      definition(),
      input(),
      context({
        coverage: {
          state: 'COVERAGE_GAP',
          recordCoverage: 'UNKNOWN',
          geometryCoverage: 'PARTIAL',
          resultCount: 0,
          reason: { code: 'GEOGRAPHIC_COVERAGE_GAP' },
        },
      })
    );
    expect(zero.confirmedAbsence).toBe(false);
    expect(zero.coverage?.reason?.code).toBe('GEOGRAPHIC_COVERAGE_GAP');
  });

  it('records adapter version in lineage and keeps provenance from manufacturing truth', () => {
    const first = translateSourceMaterial(definition(), input(), context());
    const second = translateSourceMaterial(
      definition({ version: { major: 1, minor: 1, patch: 0 } }),
      input(),
      context()
    );
    expect(first.provenance?.sourceResourceId).toBe('res-1');
    expect(first.provenance?.rawSourceRecordId).toBe('raw-1');
    expect(first.provenance?.normalizedRecordId).toBe(first.normalized?.id);
    expect(first.provenance?.adapterVersion).toEqual(VERSION);
    expect(second.provenance?.adapterVersion).toEqual({ major: 1, minor: 1, patch: 0 });
    expect(second.normalized?.normalizedFields).toEqual(first.normalized?.normalizedFields);
    expect(provenanceManufacturesTruth()).toBe(false);
  });

  it('keeps observation, sample, and sampling-event candidates distinct', () => {
    const specimen = translateSourceMaterial(
      definition(),
      input({
        kind: SourceAdapterInputKind.RAW_SAMPLE_RECORD,
        requestedOutputs: [
          SourceAdapterOutputKind.SAMPLE_CANDIDATE,
          SourceAdapterOutputKind.SAMPLING_EVENT_CANDIDATE,
          SourceAdapterOutputKind.OBSERVATION_CANDIDATE,
        ],
        samplingProvenancePresent: false,
        observationOrigin: ObservationResultOrigin.MODEL_GENERATED,
      }),
      context()
    );
    const kinds = specimen.candidates.map((item) => item.kind);
    expect(kinds).toContain(SourceAdapterOutputKind.SAMPLE_CANDIDATE);
    expect(kinds).not.toContain(SourceAdapterOutputKind.SAMPLING_EVENT_CANDIDATE);
    expect(kinds).toContain(SourceAdapterOutputKind.OBSERVATION_CANDIDATE);
    const observation = specimen.candidates.find(
      (item) => item.kind === SourceAdapterOutputKind.OBSERVATION_CANDIDATE
    );
    const sample = specimen.candidates.find(
      (item) => item.kind === SourceAdapterOutputKind.SAMPLE_CANDIDATE
    );
    expect(observation?.origin).toBe(ObservationResultOrigin.MODEL_GENERATED);
    expect(sample?.kind).not.toBe(SourceAdapterOutputKind.OBSERVATION_CANDIDATE);

    const forged = translateSourceMaterial(
      definition(),
      input({
        requestedOutputs: [SourceAdapterOutputKind.OBSERVATION_CANDIDATE],
        observationOrigin: ObservationResultOrigin.MODEL_GENERATED,
        claimedObservationOrigin: ObservationResultOrigin.DIRECT,
      }),
      context()
    );
    expect(forged.failureCode).toBe(SourceAdapterFailureCode.INTERNAL_CONTRACT_VIOLATION);
  });

  it('emits UGES output only as an unverified candidate', () => {
    const result = translateSourceMaterial(
      definition(),
      input({ requestedOutputs: [SourceAdapterOutputKind.UGES_ASSERTION_CANDIDATE] }),
      context()
    );
    const assertion = result.candidates.find(
      (item) => item.kind === SourceAdapterOutputKind.UGES_ASSERTION_CANDIDATE
    );
    expect(assertion?.admission).toBe('CANDIDATE');
    expect(assertion?.verified).toBe(false);
    expect(assertion?.certainty).toBeUndefined();
    expect(assertion?.confidence).toBeUndefined();
    expect(adapterFabricatesCertainty()).toBe(false);
    expect(adapterFabricatesConfidence()).toBe(false);
    expect(adapterFabricatesProhibited()).toBe(false);
    expect(Object.values(EvidenceCertainty)).not.toContain('PROHIBITED');
  });

  it('returns typed failures, partial success, and replayable quarantine candidates', () => {
    const missing = translateSourceMaterial(
      definition(),
      input({
        mappings: [
          {
            sourceField: 'requiredCode',
            targetField: 'code',
            mappingType: SourceFieldMappingType.DIRECT,
            required: true,
          },
        ],
        raw: { ...input().raw, rawFields: { note: 'only' } },
      }),
      context()
    );
    expect(missing.failureCode).toBe(SourceAdapterFailureCode.REQUIRED_FIELD_MISSING);
    expect(missing.raw?.rawFields.note).toBe('only');

    const quarantined = translateSourceMaterial(
      definition(),
      input({
        mappings: [
          {
            sourceField: 'term',
            targetField: 'term',
            mappingType: SourceFieldMappingType.SEMANTIC_NORMALIZATION,
            required: true,
            normalizationRule: { kind: 'VOCABULARY_MAPPING' },
          },
        ],
        raw: { ...input().raw, rawFields: { term: 'not-in-vocabulary' } },
      }),
      context()
    );
    expect(quarantined.status).toBe(SourceAdapterResultStatus.QUARANTINED);
    expect(quarantined.candidates.some((item) => item.kind === 'QUARANTINE_CANDIDATE')).toBe(true);
    expect(quarantined.raw?.id).toBe('raw-1');
    expect(quarantined.provenance?.adapterVersion).toEqual(VERSION);
    expect(quarantined.governanceReceiptId).toBe('gov-1');

    const partial = translateSourceMaterial(definition(), input(), context());
    expect(partial.status).toBe(SourceAdapterResultStatus.PARTIAL_SUCCESS);
    expect(partial.succeeded.length).toBeGreaterThan(0);
    expect(partial.unknown.some((item) => item.field === 'extra')).toBe(true);
    expect(partial.safeToContinue).toBe(true);
  });

  it('retains source vocabulary and original units when normalization is declared', () => {
    const result = translateSourceMaterial(
      definition({
        capabilities: ['DETERMINISTIC_TRANSLATION', 'VOCABULARY_RETENTION', 'AUTHORITY_CEILING'],
      }),
      input({
        raw: {
          ...input().raw,
          rawFields: { lithology: 'Qal', elevation: 100 },
        },
        mappings: [
          {
            sourceField: 'lithology',
            targetConcept: 'Quaternary alluvium',
            mappingType: SourceFieldMappingType.SEMANTIC_NORMALIZATION,
            normalizationRule: {
              kind: 'VOCABULARY_MAPPING',
              sourceLabel: 'Qal',
              normalizedConcept: 'Quaternary alluvium',
            },
            lossless: true,
          },
          {
            sourceField: 'elevation',
            targetField: 'elevation',
            mappingType: SourceFieldMappingType.UNIT_NORMALIZED,
            normalizationRule: {
              kind: 'UNIT_MAPPING',
              fromUnit: 'ft',
              toUnit: 'm',
              factor: 0.3048,
            },
            lossless: true,
          },
        ],
      }),
      context()
    );
    expect(result.status).toBe(SourceAdapterResultStatus.SUCCESS);
    expect(result.raw?.rawFields.lithology).toBe('Qal');
    expect(result.normalized?.normalizedFields.lithology).toEqual({
      sourceLabel: 'Qal',
      normalizedConcept: 'Quaternary alluvium',
    });
    expect(result.normalized?.normalizedFields.elevation).toMatchObject({
      original: 100,
      originalUnit: 'ft',
      normalizedUnit: 'm',
    });
  });

  it('is deterministic and represents an adapter version change without mutating inputs', () => {
    const supplied = input();
    const before = structuredClone(supplied);
    const left = translateSourceMaterial(definition(), supplied, context());
    const right = translateSourceMaterial(definition(), structuredClone(supplied), context());
    expect(left).toEqual(right);
    expect(supplied).toEqual(before);

    const changed = translateSourceMaterial(
      definition(),
      input({ raw: { ...input().raw, rawFields: { ...input().raw.rawFields, note: 'changed' } } }),
      context()
    );
    expect(changed.normalized?.normalizedFields.note).not.toBe(
      left.normalized?.normalizedFields.note
    );
  });

  it('registers the source adapter contract as STABLE 1.0.0 without moving other stable versions', () => {
    const registry = createBuildingBlockRegistry();
    const block = getLatestStableBuildingBlock(registry, 'rockhounding:source-adapter-contract');
    expect(block?.lifecycleStatus).toBe('STABLE');
    expect(block?.version).toEqual({ major: 1, minor: 0, patch: 0 });
    expect(
      getBuildingBlock(registry, 'rockhounding:source-adapter-contract', {
        major: 0,
        minor: 1,
        patch: 0,
      })?.lifecycleStatus
    ).toBe('DRAFT');
    expect(getLatestStableBuildingBlock(registry, UGES_BLOCK_ID)?.version).toEqual({
      major: 1,
      minor: 1,
      patch: 0,
    });
    expect(
      getLatestStableBuildingBlock(registry, GEOLOGICAL_LAYER_REGISTRY_BLOCK_ID)?.version
    ).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
    });
    expect(getLatestStableBuildingBlock(registry, RESOURCE_CATALOG_BLOCK_ID)?.version).toEqual(
      VERSION
    );
    expect(getLatestStableBuildingBlock(registry, SOURCE_GOVERNANCE_BLOCK_ID)?.version).toEqual(
      VERSION
    );
    expect(getLatestStableBuildingBlock(registry, OBSERVATION_BLOCK_ID)?.version).toEqual(VERSION);
    expect(getLatestStableBuildingBlock(registry, SAMPLE_BLOCK_ID)?.version).toEqual(VERSION);
    expect(getLatestStableBuildingBlock(registry, SAMPLING_EVENT_BLOCK_ID)?.version).toEqual(
      VERSION
    );
    expect(getLatestStableBuildingBlock(registry, PROVENANCE_ACTIVITY_BLOCK_ID)?.version).toEqual(
      VERSION
    );
    expect(getLatestStableBuildingBlock(registry, TRUTH_CLOCK_BLOCK_ID)?.version).toEqual(VERSION);
    expect(
      block?.dependencies.every(
        (dependency) =>
          dependency.kind === BuildingBlockRelationshipKind.REFERENCES ||
          dependency.kind === BuildingBlockRelationshipKind.PROJECTS_TO
      )
    ).toBe(true);
    const doc = readFileSync(
      resolve(__dirname, '../../../docs/FIELD_PLATFORM_COORDINATOR.md'),
      'utf8'
    );
    expect(doc).toContain('rockhounding:source-adapter-contract');
    expect(doc).toContain('ROCKHOUNDING_EVIDENCE_QUARANTINE_R1');
    expect(doc).toContain('.cursor/');
  });
});
