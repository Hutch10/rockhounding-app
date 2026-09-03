/**
 * Universal Geological Evidence Schema (UGES) R1 / R1.1
 *
 * Provenance-first assertion primitive for geology, access, observations,
 * and specimens. Persistence, Layer Registry, and adapters are out of scope.
 *
 * Four independent epistemic dimensions (do not collapse):
 * - authorityClass — who/what class of actor produced the claim
 * - evidenceClass — how the assertion entered the system
 * - certainty — truth/freshness state of the claim
 * - confidence — optional subjective strength (LOW | MEDIUM | HIGH)
 *
 * Identifier semantics:
 * - assertion.id — opaque stable application identifier (1–128 chars; UUID not required)
 * - source.id — stable platform source-catalog identifier
 * - sourceRecordId / provenance.sourceRecordId — provider-native external record id
 * - supportingEvidenceIds / contradictingEvidenceIds — assertion id references only;
 *   existence is not validated here (deferred to persistence/query layers)
 */

import { z } from 'zod';

import { GeoJSONLineStringSchema, GeoJSONPointSchema } from './field-session-schema';

/** Deterministic R1 version. Future versions increment this literal. */
export const UGES_SCHEMA_VERSION = 1;

const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const EvidenceSubjectKind = {
  SITE: 'SITE',
  GEOLOGIC_UNIT: 'GEOLOGIC_UNIT',
  MINERAL_OCCURRENCE: 'MINERAL_OCCURRENCE',
  ACCESS_AREA: 'ACCESS_AREA',
  ROUTE: 'ROUTE',
  SPECIMEN: 'SPECIMEN',
  FIELD_OBSERVATION: 'FIELD_OBSERVATION',
} as const;

export type EvidenceSubjectKind = (typeof EvidenceSubjectKind)[keyof typeof EvidenceSubjectKind];

export const EvidenceSubjectKindSchema = z.enum([
  'SITE',
  'GEOLOGIC_UNIT',
  'MINERAL_OCCURRENCE',
  'ACCESS_AREA',
  'ROUTE',
  'SPECIMEN',
  'FIELD_OBSERVATION',
]);

export const EvidencePredicate = {
  GEOLOGY: 'GEOLOGY',
  OCCURRENCE: 'OCCURRENCE',
  OWNERSHIP: 'OWNERSHIP',
  MANAGING_AUTHORITY: 'MANAGING_AUTHORITY',
  ACCESS: 'ACCESS',
  COLLECTING_PERMISSION: 'COLLECTING_PERMISSION',
  PERMIT_REQUIREMENT: 'PERMIT_REQUIREMENT',
  CLOSURE: 'CLOSURE',
  ROUTE_CONDITION: 'ROUTE_CONDITION',
  HAZARD_SAFETY: 'HAZARD_SAFETY',
  FIELD_OBSERVATION: 'FIELD_OBSERVATION',
  SPECIMEN_IDENTITY: 'SPECIMEN_IDENTITY',
  DERIVED_GEOLOGICAL_INTERPRETATION: 'DERIVED_GEOLOGICAL_INTERPRETATION',
} as const;

export type EvidencePredicate = (typeof EvidencePredicate)[keyof typeof EvidencePredicate];

export const EvidencePredicateSchema = z.enum([
  'GEOLOGY',
  'OCCURRENCE',
  'OWNERSHIP',
  'MANAGING_AUTHORITY',
  'ACCESS',
  'COLLECTING_PERMISSION',
  'PERMIT_REQUIREMENT',
  'CLOSURE',
  'ROUTE_CONDITION',
  'HAZARD_SAFETY',
  'FIELD_OBSERVATION',
  'SPECIMEN_IDENTITY',
  'DERIVED_GEOLOGICAL_INTERPRETATION',
]);

export const EvidenceAuthorityClass = {
  PRIMARY_AUTHORITY: 'PRIMARY_AUTHORITY',
  SECONDARY_AUTHORITY: 'SECONDARY_AUTHORITY',
  SCIENTIFIC_PUBLICATION: 'SCIENTIFIC_PUBLICATION',
  PROFESSIONAL_INTERPRETATION: 'PROFESSIONAL_INTERPRETATION',
  COMMUNITY_REPORT: 'COMMUNITY_REPORT',
  USER_OBSERVATION: 'USER_OBSERVATION',
  MODEL_DERIVED: 'MODEL_DERIVED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type EvidenceAuthorityClass =
  (typeof EvidenceAuthorityClass)[keyof typeof EvidenceAuthorityClass];

export const EvidenceAuthorityClassSchema = z.enum([
  'PRIMARY_AUTHORITY',
  'SECONDARY_AUTHORITY',
  'SCIENTIFIC_PUBLICATION',
  'PROFESSIONAL_INTERPRETATION',
  'COMMUNITY_REPORT',
  'USER_OBSERVATION',
  'MODEL_DERIVED',
  'UNKNOWN',
]);

export const EvidenceClass = {
  DIRECT_OBSERVATION: 'DIRECT_OBSERVATION',
  AUTHORITATIVE_DATA: 'AUTHORITATIVE_DATA',
  DOCUMENTED_REPORT: 'DOCUMENTED_REPORT',
  IMPORTED_DATASET: 'IMPORTED_DATASET',
  DERIVED: 'DERIVED',
  MODELED: 'MODELED',
  USER_REPORTED: 'USER_REPORTED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type EvidenceClass = (typeof EvidenceClass)[keyof typeof EvidenceClass];

export const EvidenceClassSchema = z.enum([
  'DIRECT_OBSERVATION',
  'AUTHORITATIVE_DATA',
  'DOCUMENTED_REPORT',
  'IMPORTED_DATASET',
  'DERIVED',
  'MODELED',
  'USER_REPORTED',
  'UNKNOWN',
]);

/**
 * Truth/freshness epistemic state — not permission outcome, not confidence magnitude.
 * PROHIBITED is a permission status on value.kind = 'permission', not a certainty member.
 */
export const EvidenceCertainty = {
  VERIFIED: 'VERIFIED',
  SUPPORTED: 'SUPPORTED',
  REPORTED: 'REPORTED',
  UNRESOLVED: 'UNRESOLVED',
  CONFLICTED: 'CONFLICTED',
  STALE: 'STALE',
} as const;

export type EvidenceCertainty = (typeof EvidenceCertainty)[keyof typeof EvidenceCertainty];

export const EvidenceCertaintySchema = z.enum([
  'VERIFIED',
  'SUPPORTED',
  'REPORTED',
  'UNRESOLVED',
  'CONFLICTED',
  'STALE',
]);

/** Optional subjective confidence magnitude — independent from certainty truth state. */
export const EvidenceConfidenceLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export type EvidenceConfidenceLevel =
  (typeof EvidenceConfidenceLevel)[keyof typeof EvidenceConfidenceLevel];

export const EvidenceConfidenceLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const EvidencePermissionDimension = {
  VISIT: 'VISIT',
  OBSERVE: 'OBSERVE',
  PHOTOGRAPH: 'PHOTOGRAPH',
  COLLECT: 'COLLECT',
  PERMIT: 'PERMIT',
  ROUTE: 'ROUTE',
  CLOSURE: 'CLOSURE',
} as const;

export type EvidencePermissionDimension =
  (typeof EvidencePermissionDimension)[keyof typeof EvidencePermissionDimension];

export const EvidencePermissionDimensionSchema = z.enum([
  'VISIT',
  'OBSERVE',
  'PHOTOGRAPH',
  'COLLECT',
  'PERMIT',
  'ROUTE',
  'CLOSURE',
]);

export const EvidencePermissionStatus = {
  ALLOWED: 'ALLOWED',
  RESTRICTED: 'RESTRICTED',
  PERMIT_REQUIRED: 'PERMIT_REQUIRED',
  PROHIBITED: 'PROHIBITED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type EvidencePermissionStatus =
  (typeof EvidencePermissionStatus)[keyof typeof EvidencePermissionStatus];

export const EvidencePermissionStatusSchema = z.enum([
  'ALLOWED',
  'RESTRICTED',
  'PERMIT_REQUIRED',
  'PROHIBITED',
  'UNKNOWN',
]);

const Wgs84PositionSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

const LinearRingSchema = z.array(Wgs84PositionSchema).min(4);

function ringIsClosed(ring: ReadonlyArray<[number, number]>): boolean {
  if (ring.length < 4) return false;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  return first[0] === last[0] && first[1] === last[1];
}

const ClosedLinearRingSchema = LinearRingSchema.superRefine((ring, ctx) => {
  if (!ringIsClosed(ring)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Polygon ring must be closed (first coordinate equals last)',
    });
  }
});

export const EvidencePolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(ClosedLinearRingSchema).min(1),
});

export const EvidenceMultiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(ClosedLinearRingSchema).min(1)).min(1),
});

export const EvidenceGeometrySchema = z.discriminatedUnion('type', [
  GeoJSONPointSchema,
  GeoJSONLineStringSchema,
  EvidencePolygonSchema,
  EvidenceMultiPolygonSchema,
]);

export type EvidenceGeometry = z.infer<typeof EvidenceGeometrySchema>;

export const EvidenceSubjectSchema = z.object({
  kind: EvidenceSubjectKindSchema,
  id: z.string().min(1).max(128),
  label: z.string().min(1).max(256).optional(),
});

export type EvidenceSubject = z.infer<typeof EvidenceSubjectSchema>;

export const EvidenceValueSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('text'),
    text: z.string().min(1).max(4000),
  }),
  z.object({
    kind: z.literal('geologic_unit'),
    name: z.string().min(1).max(256),
    age: z.string().min(1).max(128).optional(),
    lithology: z.string().min(1).max(256).optional(),
  }),
  z.object({
    kind: z.literal('mineral_occurrence'),
    species: z.string().min(1).max(256),
    reported: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal('managing_authority'),
    agency: z.string().min(1).max(256),
    unitName: z.string().min(1).max(256).optional(),
  }),
  z.object({
    kind: z.literal('permission'),
    dimension: EvidencePermissionDimensionSchema,
    status: EvidencePermissionStatusSchema,
    notes: z.string().min(1).max(1000).optional(),
  }),
  z.object({
    kind: z.literal('specimen'),
    identity: z.string().min(1).max(256),
    locationId: z.string().min(1).max(128),
    collected: z.boolean().optional(),
  }),
]);

export type EvidenceValue = z.infer<typeof EvidenceValueSchema>;

/** Expected value.kind for well-known predicates (extension contract baseline). */
const PREDICATE_VALUE_KIND: Partial<Record<EvidencePredicate, EvidenceValue['kind'][]>> = {
  GEOLOGY: ['geologic_unit', 'text'],
  OCCURRENCE: ['mineral_occurrence'],
  MANAGING_AUTHORITY: ['managing_authority'],
  ACCESS: ['permission'],
  COLLECTING_PERMISSION: ['permission'],
  PERMIT_REQUIREMENT: ['permission'],
  CLOSURE: ['permission'],
  FIELD_OBSERVATION: ['text'],
  SPECIMEN_IDENTITY: ['specimen'],
};

const LOW_TRUST_SOURCE_AUTHORITY: ReadonlySet<EvidenceAuthorityClass> = new Set([
  EvidenceAuthorityClass.USER_OBSERVATION,
  EvidenceAuthorityClass.COMMUNITY_REPORT,
]);

const AGENCY_ASSERTION_AUTHORITY: ReadonlySet<EvidenceAuthorityClass> = new Set([
  EvidenceAuthorityClass.PRIMARY_AUTHORITY,
  EvidenceAuthorityClass.SECONDARY_AUTHORITY,
]);

const DIRECT_EVIDENCE_CLASS: ReadonlySet<EvidenceClass> = new Set([
  EvidenceClass.DIRECT_OBSERVATION,
  EvidenceClass.USER_REPORTED,
]);

export const EvidenceProvenanceSchema = z.object({
  sourceSystem: z.string().min(1).max(128),
  sourceUri: z.string().min(1).max(2048).optional(),
  sourceRecordId: z.string().min(1).max(256).optional(),
  transformVersion: z.string().min(1).max(128).optional(),
  contentHash: z.string().min(7).max(128).optional(),
  ingestionMethod: z.string().min(1).max(128),
  derivationChain: z.array(z.string().min(1).max(128)).max(64).optional(),
});

export type EvidenceProvenance = z.infer<typeof EvidenceProvenanceSchema>;

export const EvidenceSourceDescriptorSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(256),
  provider: z.string().min(1).max(256),
  authorityClass: EvidenceAuthorityClassSchema,
  sourceType: z.string().min(1).max(64),
  license: z.string().min(1).max(256).optional(),
  canonicalUri: z.string().url().optional(),
  retrievalPolicy: z.string().min(1).max(64).optional(),
  freshness: z
    .object({
      retrievedAt: IsoDateTimeSchema.optional(),
      statedVintage: z.string().min(1).max(64).optional(),
      ttlHours: z.number().positive().optional(),
    })
    .optional(),
});

export type EvidenceSourceDescriptor = z.infer<typeof EvidenceSourceDescriptorSchema>;

const UniqueIdListSchema = z
  .array(z.string().min(1).max(128))
  .max(128)
  .superRefine((ids, ctx) => {
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Relation IDs must be unique',
      });
    }
  });

export const EvidenceAssertionSchema = z
  .object({
    id: z.string().min(1).max(128),
    schemaVersion: z.literal(UGES_SCHEMA_VERSION),
    subject: EvidenceSubjectSchema,
    predicate: EvidencePredicateSchema,
    value: EvidenceValueSchema,
    geometry: EvidenceGeometrySchema.optional(),
    validFrom: IsoDateTimeSchema.optional(),
    validTo: IsoDateTimeSchema.optional(),
    observedAt: IsoDateTimeSchema.optional(),
    retrievedAt: IsoDateTimeSchema,
    source: EvidenceSourceDescriptorSchema,
    sourceRecordId: z.string().min(1).max(256).optional(),
    authorityClass: EvidenceAuthorityClassSchema,
    evidenceClass: EvidenceClassSchema,
    certainty: EvidenceCertaintySchema,
    confidence: EvidenceConfidenceLevelSchema.optional(),
    derivationMethod: z.string().min(1).max(128).optional(),
    supportingEvidenceIds: UniqueIdListSchema.default([]),
    contradictingEvidenceIds: UniqueIdListSchema.default([]),
    provenance: EvidenceProvenanceSchema,
  })
  .superRefine((assertion, ctx) => {
    if (
      assertion.validFrom !== undefined &&
      assertion.validTo !== undefined &&
      Date.parse(assertion.validFrom) > Date.parse(assertion.validTo)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validFrom must be less than or equal to validTo',
        path: ['validTo'],
      });
    }

    if (assertion.supportingEvidenceIds.includes(assertion.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'An assertion cannot support itself',
        path: ['supportingEvidenceIds'],
      });
    }

    if (assertion.contradictingEvidenceIds.includes(assertion.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'An assertion cannot contradict itself',
        path: ['contradictingEvidenceIds'],
      });
    }

    const support = new Set(assertion.supportingEvidenceIds);
    for (const id of assertion.contradictingEvidenceIds) {
      if (support.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'The same evidence ID cannot both support and contradict',
          path: ['contradictingEvidenceIds'],
        });
        break;
      }
    }

    const allowedKinds = PREDICATE_VALUE_KIND[assertion.predicate];
    if (allowedKinds !== undefined && !allowedKinds.includes(assertion.value.kind)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `predicate ${assertion.predicate} requires value.kind in [${allowedKinds.join(', ')}]`,
        path: ['value'],
      });
    }

    if (
      AGENCY_ASSERTION_AUTHORITY.has(assertion.authorityClass) &&
      LOW_TRUST_SOURCE_AUTHORITY.has(assertion.source.authorityClass) &&
      DIRECT_EVIDENCE_CLASS.has(assertion.evidenceClass) &&
      assertion.derivationMethod === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Direct user/community-sourced assertions cannot carry PRIMARY/SECONDARY authority without derivationMethod',
        path: ['authorityClass'],
      });
    }
  });

export type EvidenceAssertion = z.infer<typeof EvidenceAssertionSchema>;

export function parseEvidenceAssertion(input: unknown): EvidenceAssertion {
  return EvidenceAssertionSchema.parse(input);
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      const next = record[key];
      if (next !== undefined) {
        sorted[key] = sortJson(next);
      }
    }
    return sorted;
  }
  return value;
}

/** JSON-safe canonical serialization (sorted keys, ISO strings, no functions). */
export function serializeEvidenceAssertion(assertion: EvidenceAssertion): string {
  const parsed = EvidenceAssertionSchema.parse(assertion);
  return JSON.stringify(sortJson(parsed));
}
