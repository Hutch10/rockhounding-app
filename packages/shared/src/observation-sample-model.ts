/**
 * Observation / Sample Model R1
 *
 * Persistence-free field-science primitives. Observations are not UGES
 * assertions. Samples are not observations. Sampling events are not samples.
 */

import { z } from 'zod';

import {
  EvidenceAuthorityClass,
  EvidenceSourceDescriptorSchema,
  type EvidenceSourceDescriptor,
} from './universal-geological-evidence-schema';

export const OBSERVATION_SAMPLE_SCHEMA_VERSION = 1;

const OpaqueIdSchema = z.string().min(1).max(128);
const IsoDateTimeSchema = z.string().datetime({ offset: true });
const FiniteNumberSchema = z.number().finite();

export const FeatureOfInterestKind = {
  SAMPLE: 'SAMPLE',
  SITE: 'SITE',
  GEOLOGIC_UNIT: 'GEOLOGIC_UNIT',
  MATERIAL: 'MATERIAL',
  OTHER: 'OTHER',
} as const;

export type FeatureOfInterestKind =
  (typeof FeatureOfInterestKind)[keyof typeof FeatureOfInterestKind];

export const FeatureOfInterestReferenceSchema = z
  .object({
    kind: z.enum(['SAMPLE', 'SITE', 'GEOLOGIC_UNIT', 'MATERIAL', 'OTHER']),
    id: OpaqueIdSchema.optional(),
    label: z.string().min(1).max(256).optional(),
  })
  .superRefine((feature, ctx) => {
    if (feature.id === undefined && feature.label === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Feature of interest requires id or label',
      });
    }
  });

export type FeatureOfInterestReference = z.infer<typeof FeatureOfInterestReferenceSchema>;

export const ObservedPropertyReferenceSchema = z.object({
  id: z.string().min(1).max(128),
  label: z.string().min(1).max(256).optional(),
});

export type ObservedPropertyReference = z.infer<typeof ObservedPropertyReferenceSchema>;

export const ObservationProcedureReferenceSchema = z.object({
  procedureId: OpaqueIdSchema,
});

export type ObservationProcedureReference = z.infer<typeof ObservationProcedureReferenceSchema>;

export const ObservationResultOrigin = {
  DIRECT: 'DIRECT',
  DERIVED: 'DERIVED',
  INTERPRETED: 'INTERPRETED',
  MODEL_GENERATED: 'MODEL_GENERATED',
} as const;

export type ObservationResultOrigin =
  (typeof ObservationResultOrigin)[keyof typeof ObservationResultOrigin];

export const ObservationResultOriginSchema = z.enum([
  'DIRECT',
  'DERIVED',
  'INTERPRETED',
  'MODEL_GENERATED',
]);

export type ObservationResult =
  | { type: 'TEXT'; origin: ObservationResultOrigin; text: string }
  | { type: 'BOOLEAN'; origin: ObservationResultOrigin; value: boolean }
  | { type: 'NUMBER'; origin: ObservationResultOrigin; value: number }
  | { type: 'QUANTITY'; origin: ObservationResultOrigin; value: number; unit: string }
  | { type: 'CATEGORY'; origin: ObservationResultOrigin; category: string }
  | { type: 'IDENTIFIER'; origin: ObservationResultOrigin; identifier: string }
  | { type: 'GEOMETRY_REFERENCE'; origin: ObservationResultOrigin; geometryRef: string }
  | { type: 'MEDIA_REFERENCE'; origin: ObservationResultOrigin; mediaRef: string }
  | { type: 'COMPOSITE'; origin: ObservationResultOrigin; parts: ObservationResult[] }
  | { type: 'UNKNOWN'; origin: ObservationResultOrigin };

const ObservationResultSchema: z.ZodType<ObservationResult> = z.lazy(() =>
  z.union([
    z.object({
      type: z.literal('TEXT'),
      origin: ObservationResultOriginSchema,
      text: z.string().min(1).max(4000),
    }),
    z.object({
      type: z.literal('BOOLEAN'),
      origin: ObservationResultOriginSchema,
      value: z.boolean(),
    }),
    z.object({
      type: z.literal('NUMBER'),
      origin: ObservationResultOriginSchema,
      value: FiniteNumberSchema,
    }),
    z.object({
      type: z.literal('QUANTITY'),
      origin: ObservationResultOriginSchema,
      value: FiniteNumberSchema,
      unit: z.string().min(1).max(64),
    }),
    z.object({
      type: z.literal('CATEGORY'),
      origin: ObservationResultOriginSchema,
      category: z.string().min(1).max(256),
    }),
    z.object({
      type: z.literal('IDENTIFIER'),
      origin: ObservationResultOriginSchema,
      identifier: z.string().min(1).max(256),
    }),
    z.object({
      type: z.literal('GEOMETRY_REFERENCE'),
      origin: ObservationResultOriginSchema,
      geometryRef: OpaqueIdSchema,
    }),
    z.object({
      type: z.literal('MEDIA_REFERENCE'),
      origin: ObservationResultOriginSchema,
      mediaRef: OpaqueIdSchema,
    }),
    z.object({
      type: z.literal('COMPOSITE'),
      origin: ObservationResultOriginSchema,
      parts: z.array(ObservationResultSchema).min(1).max(32),
    }),
    z.object({
      type: z.literal('UNKNOWN'),
      origin: ObservationResultOriginSchema,
    }),
  ])
);

export const ObservationQualityMetadataSchema = z.object({
  positionalAccuracy: z.string().min(1).max(128).optional(),
  measurementUncertainty: z.string().min(1).max(128).optional(),
  detectionLimit: z.string().min(1).max(128).optional(),
  calibrationStatus: z.string().min(1).max(64).optional(),
  repeatCount: z.number().int().positive().max(1000).optional(),
  observerMethod: z.string().min(1).max(128).optional(),
  coverage: z.string().min(1).max(128).optional(),
  knownLimitations: z.array(z.string().min(1).max(256)).max(32).optional(),
});

export type ObservationQualityMetadata = z.infer<typeof ObservationQualityMetadataSchema>;

export const RecordSyncStatus = {
  LOCAL_CAPTURED: 'LOCAL_CAPTURED',
  SYNC_PENDING: 'SYNC_PENDING',
  SYNCED: 'SYNCED',
  VALIDATED: 'VALIDATED',
  SUPERSEDED: 'SUPERSEDED',
} as const;

export type RecordSyncStatus = (typeof RecordSyncStatus)[keyof typeof RecordSyncStatus];

export const RecordSyncStatusSchema = z.enum([
  'LOCAL_CAPTURED',
  'SYNC_PENDING',
  'SYNCED',
  'VALIDATED',
  'SUPERSEDED',
]);

export const ObservationContextSchema = z.object({
  locationRef: FeatureOfInterestReferenceSchema.optional(),
  observerId: OpaqueIdSchema.optional(),
  resourceRecordId: OpaqueIdSchema.optional(),
  environmentalConditions: z.string().min(1).max(512).optional(),
  parameters: z.string().min(1).max(512).optional(),
  repeatabilityNotes: z.string().min(1).max(512).optional(),
});

export type ObservationContext = z.infer<typeof ObservationContextSchema>;

export const ObservationSchema = z
  .object({
    id: OpaqueIdSchema,
    schemaVersion: z.literal(OBSERVATION_SAMPLE_SCHEMA_VERSION),
    featureOfInterest: FeatureOfInterestReferenceSchema,
    observedProperty: ObservedPropertyReferenceSchema,
    procedure: ObservationProcedureReferenceSchema.optional(),
    result: ObservationResultSchema,
    observedAt: IsoDateTimeSchema.optional(),
    recordedAt: IsoDateTimeSchema.optional(),
    observerId: OpaqueIdSchema.optional(),
    locationRef: FeatureOfInterestReferenceSchema.optional(),
    quality: ObservationQualityMetadataSchema.optional(),
    context: ObservationContextSchema.optional(),
    resourceRecordId: OpaqueIdSchema.optional(),
    status: RecordSyncStatusSchema.optional(),
  })
  .superRefine((observation, ctx) => {
    if (observation.observedAt !== undefined && observation.recordedAt !== undefined) {
      if (Date.parse(observation.recordedAt) < Date.parse(observation.observedAt)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'recordedAt must not precede observedAt',
          path: ['recordedAt'],
        });
      }
    }
  });

export type Observation = z.infer<typeof ObservationSchema>;
export type ObservationId = Observation['id'];

export function validateObservation(input: unknown): Observation {
  return ObservationSchema.parse(input);
}

export const SampleType = {
  ROCK_SPECIMEN: 'ROCK_SPECIMEN',
  MINERAL_SPECIMEN: 'MINERAL_SPECIMEN',
  SEDIMENT_SAMPLE: 'SEDIMENT_SAMPLE',
  SOIL_SAMPLE: 'SOIL_SAMPLE',
  FOSSIL_SPECIMEN: 'FOSSIL_SPECIMEN',
  WATER_SAMPLE: 'WATER_SAMPLE',
  REFERENCE_SAMPLE: 'REFERENCE_SAMPLE',
  THIN_SECTION: 'THIN_SECTION',
  POWDER: 'POWDER',
  CHIP: 'CHIP',
  SLAB: 'SLAB',
  OTHER: 'OTHER',
} as const;

export type SampleType = (typeof SampleType)[keyof typeof SampleType];

export const SampleTypeSchema = z.enum([
  'ROCK_SPECIMEN',
  'MINERAL_SPECIMEN',
  'SEDIMENT_SAMPLE',
  'SOIL_SAMPLE',
  'FOSSIL_SPECIMEN',
  'WATER_SAMPLE',
  'REFERENCE_SAMPLE',
  'THIN_SECTION',
  'POWDER',
  'CHIP',
  'SLAB',
  'OTHER',
]);

export const SampleLineageKind = {
  DERIVED_FROM: 'DERIVED_FROM',
  SPLIT_FROM: 'SPLIT_FROM',
  SUBSAMPLED_FROM: 'SUBSAMPLED_FROM',
  CUT_FROM: 'CUT_FROM',
  PREPARED_FROM: 'PREPARED_FROM',
} as const;

export type SampleLineageKind = (typeof SampleLineageKind)[keyof typeof SampleLineageKind];

export const SampleLineageKindSchema = z.enum([
  'DERIVED_FROM',
  'SPLIT_FROM',
  'SUBSAMPLED_FROM',
  'CUT_FROM',
  'PREPARED_FROM',
]);

export const SampleTransformationEffect = {
  NONE: 'NONE',
  NON_DESTRUCTIVE: 'NON_DESTRUCTIVE',
  ALTERING: 'ALTERING',
  PARTIALLY_DESTRUCTIVE: 'PARTIALLY_DESTRUCTIVE',
  DESTRUCTIVE: 'DESTRUCTIVE',
  UNKNOWN: 'UNKNOWN',
} as const;

export type SampleTransformationEffect =
  (typeof SampleTransformationEffect)[keyof typeof SampleTransformationEffect];

export const SampleTransformationEffectSchema = z.enum([
  'NONE',
  'NON_DESTRUCTIVE',
  'ALTERING',
  'PARTIALLY_DESTRUCTIVE',
  'DESTRUCTIVE',
  'UNKNOWN',
]);

export const SampleLineageReferenceSchema = z.object({
  kind: SampleLineageKindSchema,
  parentSampleId: OpaqueIdSchema,
  transformationEffect: SampleTransformationEffectSchema.optional(),
});

export type SampleLineageReference = z.infer<typeof SampleLineageReferenceSchema>;
export type SampleTransformation = SampleLineageReference;

export const ExternalIdentifierSchema = z.object({
  scheme: z.enum(['IGSN', 'PROVIDER', 'LAB', 'OTHER']),
  value: z.string().min(1).max(256),
});

export type ExternalIdentifier = z.infer<typeof ExternalIdentifierSchema>;

function lineageKey(edge: SampleLineageReference): string {
  return `${edge.kind}|${edge.parentSampleId}`;
}

export const SampleSchema = z
  .object({
    id: OpaqueIdSchema,
    schemaVersion: z.literal(OBSERVATION_SAMPLE_SCHEMA_VERSION),
    sampleType: SampleTypeSchema,
    lineage: z.array(SampleLineageReferenceSchema).max(32).optional(),
    samplingEventId: OpaqueIdSchema.optional(),
    externalIdentifiers: z.array(ExternalIdentifierSchema).max(16).optional(),
    physicalState: z.string().min(1).max(256).optional(),
    recordedAt: IsoDateTimeSchema.optional(),
    status: RecordSyncStatusSchema.optional(),
    originNote: z.string().min(1).max(1000).optional(),
    resourceRecordId: OpaqueIdSchema.optional(),
  })
  .superRefine((sample, ctx) => {
    const edges = sample.lineage ?? [];
    const seenEdges = new Set<string>();
    for (const [index, edge] of edges.entries()) {
      if (edge.parentSampleId === sample.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Direct self-lineage is not allowed',
          path: ['lineage', index],
        });
      }
      const key = lineageKey(edge);
      if (seenEdges.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate lineage edge',
          path: ['lineage', index],
        });
      }
      seenEdges.add(key);
    }

    const identifiers = sample.externalIdentifiers ?? [];
    const seenIds = new Set<string>();
    for (const [index, identifier] of identifiers.entries()) {
      const key = `${identifier.scheme}|${identifier.value}`;
      if (seenIds.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate equivalent external identifier',
          path: ['externalIdentifiers', index],
        });
      }
      seenIds.add(key);
    }
  });

export type Sample = z.infer<typeof SampleSchema>;
export type SampleId = Sample['id'];

export function validateSample(input: unknown): Sample {
  return SampleSchema.parse(input);
}

export function validateSampleLineageGraph(samples: readonly Sample[]): void {
  const byId = new Map(samples.map((sample) => [sample.id, sample]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string): void => {
    if (visited.has(id)) {
      return;
    }
    if (visiting.has(id)) {
      throw new Error(`Sample lineage cycle detected at ${id}`);
    }
    visiting.add(id);
    const sample = byId.get(id);
    for (const edge of sample?.lineage ?? []) {
      visit(edge.parentSampleId);
    }
    visiting.delete(id);
    visited.add(id);
  };

  for (const sample of samples) {
    visit(sample.id);
  }
}

export const SamplingEventSchema = z.object({
  id: OpaqueIdSchema,
  schemaVersion: z.literal(OBSERVATION_SAMPLE_SCHEMA_VERSION),
  sampledFeature: FeatureOfInterestReferenceSchema,
  samplingProcedureId: OpaqueIdSchema.optional(),
  locationRef: FeatureOfInterestReferenceSchema.optional(),
  sampledAt: IsoDateTimeSchema.optional(),
  collectorId: OpaqueIdSchema.optional(),
  resultingSampleIds: z
    .array(OpaqueIdSchema)
    .max(128)
    .default([])
    .superRefine((ids, ctx) => {
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate resulting sample IDs are not allowed',
        });
      }
    }),
  notes: z.string().min(1).max(2000).optional(),
  resourceRecordId: OpaqueIdSchema.optional(),
});

export type SamplingEvent = z.infer<typeof SamplingEventSchema>;
export type SamplingEventId = SamplingEvent['id'];

export function validateSamplingEvent(input: unknown): SamplingEvent {
  return SamplingEventSchema.parse(input);
}

export const ProcedureType = {
  FIELD_VISUAL: 'FIELD_VISUAL',
  FIELD_TEST: 'FIELD_TEST',
  INSTRUMENT_MEASUREMENT: 'INSTRUMENT_MEASUREMENT',
  SAMPLING: 'SAMPLING',
  LAB_ANALYSIS: 'LAB_ANALYSIS',
  IMAGE_CAPTURE: 'IMAGE_CAPTURE',
  POSITION_MEASUREMENT: 'POSITION_MEASUREMENT',
  MANUAL_CLASSIFICATION: 'MANUAL_CLASSIFICATION',
  MODEL_ANALYSIS: 'MODEL_ANALYSIS',
  OTHER: 'OTHER',
} as const;

export type ProcedureType = (typeof ProcedureType)[keyof typeof ProcedureType];

export const ProcedureTypeSchema = z.enum([
  'FIELD_VISUAL',
  'FIELD_TEST',
  'INSTRUMENT_MEASUREMENT',
  'SAMPLING',
  'LAB_ANALYSIS',
  'IMAGE_CAPTURE',
  'POSITION_MEASUREMENT',
  'MANUAL_CLASSIFICATION',
  'MODEL_ANALYSIS',
  'OTHER',
]);

export const InstrumentReferenceSchema = z.object({
  instrumentId: OpaqueIdSchema.optional(),
  instrumentType: z.string().min(1).max(64).optional(),
  modelName: z.string().min(1).max(128).optional(),
  calibrationStatus: z.string().min(1).max(64).optional(),
  calibratedAt: IsoDateTimeSchema.optional(),
  unitCapabilities: z.array(z.string().min(1).max(32)).max(16).optional(),
});

export type InstrumentReference = z.infer<typeof InstrumentReferenceSchema>;

export const ProcedureSchema = z.object({
  id: OpaqueIdSchema,
  procedureType: ProcedureTypeSchema,
  name: z.string().min(1).max(256),
  description: z.string().min(1).max(2000).optional(),
  instruments: z.array(InstrumentReferenceSchema).max(16).optional(),
  methodRef: z.string().min(1).max(256).optional(),
  version: z.string().min(1).max(64).optional(),
  destructiveEffect: SampleTransformationEffectSchema,
  limitations: z.array(z.string().min(1).max(256)).max(32).optional(),
  repeatabilityNotes: z.string().min(1).max(512).optional(),
});

export type Procedure = z.infer<typeof ProcedureSchema>;
export type ProcedureId = Procedure['id'];

export function validateProcedure(input: unknown): Procedure {
  return ProcedureSchema.parse(input);
}

export function observationIsUgesAssertion(_observation: Observation): boolean {
  return false;
}

export function sampleIsUgesAssertion(_sample: Sample): boolean {
  return false;
}

export function samplingEventAuthorizesCollection(_event: SamplingEvent): boolean {
  return false;
}

export function sampleAuthorizesCollection(_sample: Sample): boolean {
  return false;
}

export function fossilSpecimenImpliesLawfulCollection(_sample: Sample): boolean {
  return false;
}

export function projectObservationToUgesSource(observation: Observation): EvidenceSourceDescriptor {
  const origin = observation.result.origin;
  const authorityClass =
    origin === ObservationResultOrigin.MODEL_GENERATED
      ? EvidenceAuthorityClass.MODEL_DERIVED
      : EvidenceAuthorityClass.USER_OBSERVATION;

  return EvidenceSourceDescriptorSchema.parse({
    id: observation.id,
    name: `Observation ${observation.id}`,
    provider: 'rockhounding-field',
    authorityClass,
    sourceType: 'observation',
  });
}
