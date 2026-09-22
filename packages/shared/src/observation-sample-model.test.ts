/**
 * Observation / Sample Model R1
 *
 * Production change that would fail these tests: collapsing observation into
 * UGES assertion, overwriting raw results with later identification, treating
 * FOSSIL_SPECIMEN as lawful collection, or promoting MODEL_GENERATED to DIRECT.
 */

import { describe, expect, it } from 'vitest';

import {
  BuildingBlockLifecycleStatus,
  createBuildingBlockRegistry,
  getLatestStableBuildingBlock,
  GEOLOGICAL_LAYER_REGISTRY_BLOCK_ID,
  RESOURCE_CATALOG_BLOCK_ID,
  SOURCE_GOVERNANCE_BLOCK_ID,
  UGES_BLOCK_ID,
} from './building-block-registry';
import { EvidenceAuthorityClass, EvidenceCertainty } from './universal-geological-evidence-schema';

import {
  OBSERVATION_SAMPLE_SCHEMA_VERSION,
  ObservationResultOrigin,
  SampleLineageKind,
  SampleTransformationEffect,
  SampleType,
  fossilSpecimenImpliesLawfulCollection,
  observationIsUgesAssertion,
  projectObservationToUgesSource,
  sampleAuthorizesCollection,
  sampleIsUgesAssertion,
  samplingEventAuthorizesCollection,
  validateObservation,
  validateProcedure,
  validateSample,
  validateSampleLineageGraph,
  validateSamplingEvent,
  type Observation,
} from './observation-sample-model';

const HISTORIC = '1990-06-15T12:00:00.000Z';
const RECORDED = '2026-09-22T21:00:00.000Z';

function directText(text: string) {
  return {
    type: 'TEXT' as const,
    origin: ObservationResultOrigin.DIRECT,
    text,
  };
}

function minimalObservation(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: 'obs-1',
    schemaVersion: OBSERVATION_SAMPLE_SCHEMA_VERSION,
    featureOfInterest: { kind: 'SAMPLE', id: 'spec-1' },
    observedProperty: { id: 'color' },
    result: directText('red-brown'),
    observedAt: RECORDED,
    ...overrides,
  };
}

function minimalSample(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: 'spec-1',
    schemaVersion: OBSERVATION_SAMPLE_SCHEMA_VERSION,
    sampleType: SampleType.ROCK_SPECIMEN,
    status: 'LOCAL_CAPTURED',
    ...overrides,
  };
}

function minimalSamplingEvent(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: 'se-1',
    schemaVersion: OBSERVATION_SAMPLE_SCHEMA_VERSION,
    sampledFeature: { kind: 'SITE', id: 'site-1' },
    resultingSampleIds: ['spec-1'],
    ...overrides,
  };
}

function minimalProcedure(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: 'proc-hardness',
    procedureType: 'FIELD_TEST',
    name: 'Scratch glass',
    destructiveEffect: SampleTransformationEffect.NONE,
    ...overrides,
  };
}

describe('Observation', () => {
  it('accepts a valid direct observation', () => {
    const parsed = validateObservation(minimalObservation());
    expect(parsed.result.origin).toBe(ObservationResultOrigin.DIRECT);
    expect(parsed.schemaVersion).toBe(1);
  });

  it('accepts a valid interpreted observation', () => {
    const parsed = validateObservation(
      minimalObservation({
        id: 'obs-id',
        observedProperty: { id: 'material_identification' },
        result: {
          type: 'TEXT',
          origin: ObservationResultOrigin.INTERPRETED,
          text: 'possible jasper',
        },
      })
    );
    expect(parsed.result.origin).toBe(ObservationResultOrigin.INTERPRETED);
  });

  it('distinguishes model-generated results from direct results', () => {
    const modeled = validateObservation(
      minimalObservation({
        id: 'obs-model',
        observedProperty: { id: 'material_identification' },
        result: {
          type: 'TEXT',
          origin: ObservationResultOrigin.MODEL_GENERATED,
          text: 'chalcedony',
        },
      })
    );
    const direct = validateObservation(minimalObservation());
    expect(modeled.result.origin).toBe(ObservationResultOrigin.MODEL_GENERATED);
    expect(direct.result.origin).toBe(ObservationResultOrigin.DIRECT);
    expect(modeled.result.origin).not.toBe(direct.result.origin);
  });

  it('represents UNKNOWN results explicitly', () => {
    const parsed = validateObservation(
      minimalObservation({
        result: { type: 'UNKNOWN', origin: ObservationResultOrigin.DIRECT },
      })
    );
    expect(parsed.result.type).toBe('UNKNOWN');
  });

  it('rejects NaN numeric results', () => {
    expect(() =>
      validateObservation(
        minimalObservation({
          observedProperty: { id: 'mass' },
          result: { type: 'NUMBER', origin: ObservationResultOrigin.DIRECT, value: Number.NaN },
        })
      )
    ).toThrow();
  });

  it('rejects infinite numeric results', () => {
    expect(() =>
      validateObservation(
        minimalObservation({
          observedProperty: { id: 'mass' },
          result: {
            type: 'NUMBER',
            origin: ObservationResultOrigin.DIRECT,
            value: Number.POSITIVE_INFINITY,
          },
        })
      )
    ).toThrow();
  });

  it('requires a finite numeric value and unit for QUANTITY', () => {
    const parsed = validateObservation(
      minimalObservation({
        observedProperty: { id: 'sample_mass' },
        result: {
          type: 'QUANTITY',
          origin: ObservationResultOrigin.DIRECT,
          value: 12.5,
          unit: 'g',
        },
      })
    );
    expect(parsed.result.type).toBe('QUANTITY');
    expect(() =>
      validateObservation(
        minimalObservation({
          result: { type: 'QUANTITY', origin: ObservationResultOrigin.DIRECT, value: 1 },
        })
      )
    ).toThrow();
  });

  it('allows optional timestamps on a minimal valid observation', () => {
    const parsed = validateObservation({
      id: 'obs-min',
      schemaVersion: OBSERVATION_SAMPLE_SCHEMA_VERSION,
      featureOfInterest: { kind: 'SITE', id: 'site-1' },
      observedProperty: { id: 'luster' },
      result: directText('waxy'),
    });
    expect(parsed.observedAt).toBeUndefined();
    expect(parsed.recordedAt).toBeUndefined();
    expect(parsed.procedure).toBeUndefined();
  });

  it('rejects recordedAt earlier than observedAt', () => {
    expect(() =>
      validateObservation(
        minimalObservation({
          observedAt: RECORDED,
          recordedAt: HISTORIC,
        })
      )
    ).toThrow();
  });

  it('allows historical observedAt years before recordedAt', () => {
    const parsed = validateObservation(
      minimalObservation({
        observedAt: HISTORIC,
        recordedAt: RECORDED,
      })
    );
    expect(parsed.observedAt).toBe(HISTORIC);
  });

  it('allows a future observedAt', () => {
    const parsed = validateObservation(
      minimalObservation({ observedAt: '2099-01-01T00:00:00.000Z' })
    );
    expect(parsed.observedAt).toBe('2099-01-01T00:00:00.000Z');
  });

  it('accepts extensible observed-property identifiers', () => {
    const parsed = validateObservation(
      minimalObservation({ observedProperty: { id: 'custom:fluorescence_waveband' } })
    );
    expect(parsed.observedProperty.id).toBe('custom:fluorescence_waveband');
  });

  it('does not require a procedure reference', () => {
    const parsed = validateObservation(minimalObservation());
    expect(parsed.procedure).toBeUndefined();
  });

  it('is not a UGES assertion', () => {
    const parsed = validateObservation(minimalObservation());
    expect(observationIsUgesAssertion(parsed)).toBe(false);
    expect('predicate' in parsed).toBe(false);
    expect('certainty' in parsed).toBe(false);
    expect('authorityClass' in parsed).toBe(false);
  });

  it('keeps later identification from overwriting a direct observation', () => {
    const raw = validateObservation(
      minimalObservation({
        id: 'obs-scratch',
        observedProperty: { id: 'scratches_glass' },
        result: { type: 'BOOLEAN', origin: ObservationResultOrigin.DIRECT, value: true },
      })
    );
    const interpreted = validateObservation(
      minimalObservation({
        id: 'obs-id-later',
        observedProperty: { id: 'material_identification' },
        result: {
          type: 'TEXT',
          origin: ObservationResultOrigin.INTERPRETED,
          text: 'chalcedony',
        },
      })
    );
    expect(raw.id).not.toBe(interpreted.id);
    expect(raw.result).toEqual({
      type: 'BOOLEAN',
      origin: ObservationResultOrigin.DIRECT,
      value: true,
    });
  });

  it('allows multiple observations of the same sample', () => {
    const first = validateObservation(minimalObservation({ id: 'obs-a' }));
    const second = validateObservation(
      minimalObservation({
        id: 'obs-b',
        observedProperty: { id: 'hardness' },
        result: {
          type: 'QUANTITY',
          origin: ObservationResultOrigin.DIRECT,
          value: 7,
          unit: 'mohs',
        },
      })
    );
    expect(first.featureOfInterest.id).toBe(second.featureOfInterest.id);
    expect(first.id).not.toBe(second.id);
  });
});

describe('SamplingEvent', () => {
  it('accepts a valid sampling event independent of Sample records', () => {
    const parsed = validateSamplingEvent(minimalSamplingEvent({ resultingSampleIds: [] }));
    expect(parsed.resultingSampleIds).toEqual([]);
  });

  it('may list multiple resulting sample IDs', () => {
    const parsed = validateSamplingEvent(
      minimalSamplingEvent({ resultingSampleIds: ['a-1', 'a-2', 'a-3'] })
    );
    expect(parsed.resultingSampleIds).toHaveLength(3);
  });

  it('rejects duplicate resulting sample IDs', () => {
    expect(() =>
      validateSamplingEvent(minimalSamplingEvent({ resultingSampleIds: ['spec-1', 'spec-1'] }))
    ).toThrow();
  });

  it('does not imply collection legality', () => {
    const parsed = validateSamplingEvent(minimalSamplingEvent());
    expect(samplingEventAuthorizesCollection(parsed)).toBe(false);
  });

  it('allows a missing collector', () => {
    const parsed = validateSamplingEvent(minimalSamplingEvent());
    expect(parsed.collectorId).toBeUndefined();
  });

  it('uses a location reference rather than embedded geometry', () => {
    const parsed = validateSamplingEvent(
      minimalSamplingEvent({ locationRef: { kind: 'SITE', id: 'site-ref-1' } })
    );
    expect(parsed.locationRef?.id).toBe('site-ref-1');
    expect('geometry' in parsed).toBe(false);
  });
});

describe('Sample', () => {
  it('accepts a valid specimen', () => {
    const parsed = validateSample(minimalSample());
    expect(parsed.sampleType).toBe(SampleType.ROCK_SPECIMEN);
  });

  it('accepts an external sample without a local SamplingEvent', () => {
    const parsed = validateSample(
      minimalSample({
        id: 'museum-1',
        samplingEventId: undefined,
        originNote: 'historic museum specimen; sampling event unresolved',
      })
    );
    expect(parsed.samplingEventId).toBeUndefined();
  });

  it('supports multiple external identifiers including IGSN-like PIDs', () => {
    const parsed = validateSample(
      minimalSample({
        externalIdentifiers: [
          { scheme: 'IGSN', value: 'IEABC1234' },
          { scheme: 'LAB', value: 'lab-99' },
        ],
      })
    );
    expect(parsed.id).toBe('spec-1');
    expect(parsed.externalIdentifiers?.map((item) => item.scheme)).toEqual(['IGSN', 'LAB']);
  });

  it('rejects duplicate equivalent external identifiers', () => {
    expect(() =>
      validateSample(
        minimalSample({
          externalIdentifiers: [
            { scheme: 'IGSN', value: 'IEABC1234' },
            { scheme: 'IGSN', value: 'IEABC1234' },
          ],
        })
      )
    ).toThrow();
  });

  it('supports parent/child physical lineage', () => {
    const parent = validateSample(minimalSample({ id: 'spec-a' }));
    const child = validateSample(
      minimalSample({
        id: 'spec-a-1',
        lineage: [
          {
            kind: SampleLineageKind.SPLIT_FROM,
            parentSampleId: parent.id,
            transformationEffect: SampleTransformationEffect.PARTIALLY_DESTRUCTIVE,
          },
        ],
      })
    );
    expect(child.lineage?.[0]?.parentSampleId).toBe('spec-a');
  });

  it('rejects direct self-lineage', () => {
    expect(() =>
      validateSample(
        minimalSample({
          id: 'spec-loop',
          lineage: [{ kind: SampleLineageKind.DERIVED_FROM, parentSampleId: 'spec-loop' }],
        })
      )
    ).toThrow();
  });

  it('rejects duplicate lineage edges', () => {
    expect(() =>
      validateSample(
        minimalSample({
          id: 'child',
          lineage: [
            { kind: SampleLineageKind.CUT_FROM, parentSampleId: 'parent' },
            { kind: SampleLineageKind.CUT_FROM, parentSampleId: 'parent' },
          ],
        })
      )
    ).toThrow();
  });

  it('detects lineage cycles across a sample graph', () => {
    const a = validateSample(
      minimalSample({
        id: 'cyc-a',
        lineage: [{ kind: SampleLineageKind.DERIVED_FROM, parentSampleId: 'cyc-b' }],
      })
    );
    const b = validateSample(
      minimalSample({
        id: 'cyc-b',
        lineage: [{ kind: SampleLineageKind.DERIVED_FROM, parentSampleId: 'cyc-a' }],
      })
    );
    expect(() => validateSampleLineageGraph([a, b])).toThrow(/cycle/i);
  });

  it('does not treat physical-state change as identity change', () => {
    const before = validateSample(
      minimalSample({ id: 'spec-same', physicalState: 'intact hand sample' })
    );
    const after = validateSample(
      minimalSample({ id: 'spec-same', physicalState: 'cut slab remaining' })
    );
    expect(before.id).toBe(after.id);
    expect(before.physicalState).not.toBe(after.physicalState);
  });

  it('does not treat FOSSIL_SPECIMEN as lawful collection', () => {
    const parsed = validateSample(minimalSample({ sampleType: SampleType.FOSSIL_SPECIMEN }));
    expect(fossilSpecimenImpliesLawfulCollection(parsed)).toBe(false);
    expect(sampleAuthorizesCollection(parsed)).toBe(false);
  });

  it('does not automatically copy scientific conclusions onto child samples', () => {
    const child = validateSample(
      minimalSample({
        id: 'child-1',
        lineage: [{ kind: SampleLineageKind.CUT_FROM, parentSampleId: 'parent-1' }],
      })
    );
    expect('materialIdentification' in child).toBe(false);
    expect(sampleIsUgesAssertion(child)).toBe(false);
  });
});

describe('Procedure and transformation', () => {
  it('accepts a valid procedure', () => {
    const parsed = validateProcedure(minimalProcedure());
    expect(parsed.procedureType).toBe('FIELD_TEST');
  });

  it('distinguishes MODEL_ANALYSIS from FIELD_VISUAL', () => {
    const model = validateProcedure(
      minimalProcedure({ id: 'proc-ml', procedureType: 'MODEL_ANALYSIS', name: 'Classifier' })
    );
    const visual = validateProcedure(
      minimalProcedure({ id: 'proc-eye', procedureType: 'FIELD_VISUAL', name: 'Visual' })
    );
    expect(model.procedureType).not.toBe(visual.procedureType);
  });

  it('represents destructive effect independently of procedure type', () => {
    const parsed = validateProcedure(
      minimalProcedure({
        procedureType: 'LAB_ANALYSIS',
        destructiveEffect: SampleTransformationEffect.DESTRUCTIVE,
      })
    );
    expect(parsed.destructiveEffect).toBe(SampleTransformationEffect.DESTRUCTIVE);
  });

  it('allows optional instrument references and calibration metadata', () => {
    const parsed = validateProcedure(
      minimalProcedure({
        version: '1.0',
        instruments: [
          {
            instrumentId: 'gps-1',
            instrumentType: 'GNSS',
            modelName: 'Garmin',
            calibrationStatus: 'CALIBRATED',
            calibratedAt: RECORDED,
            unitCapabilities: ['m'],
          },
        ],
      })
    );
    expect(parsed.instruments?.[0]?.calibrationStatus).toBe('CALIBRATED');
    expect(parsed.version).toBe('1.0');
  });

  it('preserves parent sample ID on transformation lineage', () => {
    const child = validateSample(
      minimalSample({
        id: 'powder-1',
        sampleType: SampleType.POWDER,
        lineage: [
          {
            kind: SampleLineageKind.PREPARED_FROM,
            parentSampleId: 'hand-1',
            transformationEffect: SampleTransformationEffect.DESTRUCTIVE,
          },
        ],
      })
    );
    expect(child.lineage?.[0]?.parentSampleId).toBe('hand-1');
  });
});

describe('boundaries', () => {
  it('does not project an observation into a UGES assertion', () => {
    const observation = validateObservation(minimalObservation());
    const source = projectObservationToUgesSource(observation);
    expect(observationIsUgesAssertion(observation)).toBe(false);
    expect(source.authorityClass).not.toBe(EvidenceAuthorityClass.PRIMARY_AUTHORITY);
    expect('predicate' in source).toBe(false);
  });

  it('does not promote MODEL_GENERATED observations to PRIMARY_AUTHORITY', () => {
    const observation = validateObservation(
      minimalObservation({
        result: {
          type: 'TEXT',
          origin: ObservationResultOrigin.MODEL_GENERATED,
          text: 'opportunity score',
        },
      })
    );
    const source = projectObservationToUgesSource(observation);
    expect(source.authorityClass).toBe(EvidenceAuthorityClass.MODEL_DERIVED);
  });

  it('does not manufacture source authority from a field observation', () => {
    const source = projectObservationToUgesSource(validateObservation(minimalObservation()));
    expect(source.authorityClass).toBe(EvidenceAuthorityClass.USER_OBSERVATION);
  });

  it('leaves UGES certainty and PROHIBITED semantics unchanged', () => {
    expect(Object.values(EvidenceCertainty)).not.toContain('HIGH');
    expect(Object.values(EvidenceCertainty)).not.toContain('PROHIBITED');
  });

  it('keeps three repeated hardness tests as three observations', () => {
    const repeats: Observation[] = [1, 2, 3].map((index) =>
      validateObservation(
        minimalObservation({
          id: `obs-h-${index}`,
          observedProperty: { id: 'hardness' },
          result: {
            type: 'QUANTITY',
            origin: ObservationResultOrigin.DIRECT,
            value: 6 + index * 0.1,
            unit: 'mohs',
          },
        })
      )
    );
    expect(new Set(repeats.map((item) => item.id)).size).toBe(3);
  });

  it('keeps conflicting visual label and later procedure result as separate records', () => {
    const visual = validateObservation(
      minimalObservation({
        id: 'obs-visual',
        observedProperty: { id: 'field_material_identification' },
        result: {
          type: 'TEXT',
          origin: ObservationResultOrigin.INTERPRETED,
          text: 'turquoise',
        },
      })
    );
    const test = validateObservation(
      minimalObservation({
        id: 'obs-test',
        observedProperty: { id: 'scratches_glass' },
        result: { type: 'BOOLEAN', origin: ObservationResultOrigin.DIRECT, value: true },
      })
    );
    expect(visual.result).not.toEqual(test.result);
  });
});

describe('Building Block Registry promotion', () => {
  it('promotes observation, sample, and sampling-event to STABLE 1.0.0', () => {
    const registry = createBuildingBlockRegistry();
    expect(getLatestStableBuildingBlock(registry, 'rockhounding:observation')?.version).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
    });
    expect(getLatestStableBuildingBlock(registry, 'rockhounding:sample')?.lifecycleStatus).toBe(
      BuildingBlockLifecycleStatus.STABLE
    );
    expect(
      getLatestStableBuildingBlock(registry, 'rockhounding:sampling-event')?.lifecycleStatus
    ).toBe(BuildingBlockLifecycleStatus.STABLE);
  });

  it('leaves existing stable foundation versions unchanged', () => {
    const registry = createBuildingBlockRegistry();
    expect(getLatestStableBuildingBlock(registry, UGES_BLOCK_ID)?.version).toEqual({
      major: 1,
      minor: 1,
      patch: 0,
    });
    expect(
      getLatestStableBuildingBlock(registry, GEOLOGICAL_LAYER_REGISTRY_BLOCK_ID)?.version
    ).toEqual({ major: 1, minor: 0, patch: 0 });
    expect(getLatestStableBuildingBlock(registry, RESOURCE_CATALOG_BLOCK_ID)?.version).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
    });
    expect(getLatestStableBuildingBlock(registry, SOURCE_GOVERNANCE_BLOCK_ID)?.version).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
    });
  });
});
