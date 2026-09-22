/**
 * Provenance Activity Kernel R1
 *
 * Persistence-free lineage of entities, activities, and agents.
 * Provenance records how something was produced. It does not establish
 * truth, authority, certainty, confidence, or permission.
 */

import { z } from 'zod';

import { EvidenceAuthorityClass } from './universal-geological-evidence-schema';

export const PROVENANCE_SCHEMA_VERSION = 1;
export const PROVENANCE_HASH_SCOPE = 'canonical-activity-v1';

const OpaqueIdSchema = z.string().min(1).max(128);
const IsoDateTimeSchema = z.string().datetime({ offset: true });
const FiniteNumberSchema = z.number().finite();

export const ProvenanceEntityType = {
  UGES_ASSERTION: 'UGES_ASSERTION',
  RESOURCE_RECORD: 'RESOURCE_RECORD',
  GEOLOGICAL_LAYER: 'GEOLOGICAL_LAYER',
  OBSERVATION: 'OBSERVATION',
  SAMPLING_EVENT: 'SAMPLING_EVENT',
  SAMPLE: 'SAMPLE',
  PROCEDURE: 'PROCEDURE',
  DERIVED_PRODUCT: 'DERIVED_PRODUCT',
  DOCUMENT: 'DOCUMENT',
  MEDIA: 'MEDIA',
  DECISION_SNAPSHOT: 'DECISION_SNAPSHOT',
  OFFLINE_PACKAGE: 'OFFLINE_PACKAGE',
  MODEL_OUTPUT: 'MODEL_OUTPUT',
  OTHER: 'OTHER',
} as const;

export type ProvenanceEntityType = (typeof ProvenanceEntityType)[keyof typeof ProvenanceEntityType];

export const ProvenanceEntityTypeSchema = z.enum([
  'UGES_ASSERTION',
  'RESOURCE_RECORD',
  'GEOLOGICAL_LAYER',
  'OBSERVATION',
  'SAMPLING_EVENT',
  'SAMPLE',
  'PROCEDURE',
  'DERIVED_PRODUCT',
  'DOCUMENT',
  'MEDIA',
  'DECISION_SNAPSHOT',
  'OFFLINE_PACKAGE',
  'MODEL_OUTPUT',
  'OTHER',
]);

export const ProvenanceEntityReferenceSchema = z.object({
  entityId: OpaqueIdSchema,
  entityType: ProvenanceEntityTypeSchema,
  buildingBlockId: z.string().min(1).max(128).optional(),
  buildingBlockVersion: z
    .object({
      major: z.number().int().nonnegative(),
      minor: z.number().int().nonnegative(),
      patch: z.number().int().nonnegative(),
    })
    .optional(),
  externalRef: z.string().min(1).max(512).optional(),
  versionRef: z.string().min(1).max(128).optional(),
});

export type ProvenanceEntityReference = z.infer<typeof ProvenanceEntityReferenceSchema>;

export const ProvenanceActivityType = {
  SOURCE_RETRIEVAL: 'SOURCE_RETRIEVAL',
  MANUAL_ENTRY: 'MANUAL_ENTRY',
  FIELD_OBSERVATION: 'FIELD_OBSERVATION',
  SAMPLING: 'SAMPLING',
  IMAGE_CAPTURE: 'IMAGE_CAPTURE',
  NORMALIZATION: 'NORMALIZATION',
  CLASSIFICATION: 'CLASSIFICATION',
  TRANSFORMATION: 'TRANSFORMATION',
  DERIVATION: 'DERIVATION',
  GIS_ANALYSIS: 'GIS_ANALYSIS',
  LAB_ANALYSIS: 'LAB_ANALYSIS',
  MODEL_ANALYSIS: 'MODEL_ANALYSIS',
  AI_ANALYSIS: 'AI_ANALYSIS',
  SOURCE_RECONCILIATION: 'SOURCE_RECONCILIATION',
  RIGHTS_EVALUATION: 'RIGHTS_EVALUATION',
  DECISION_EVALUATION: 'DECISION_EVALUATION',
  PACKAGE_CREATION: 'PACKAGE_CREATION',
  DISCLOSURE_TRANSFORMATION: 'DISCLOSURE_TRANSFORMATION',
  CORRECTION: 'CORRECTION',
  SUPERSESSION: 'SUPERSESSION',
  IMPORT: 'IMPORT',
  EXPORT: 'EXPORT',
  OTHER: 'OTHER',
} as const;

export type ProvenanceActivityType =
  (typeof ProvenanceActivityType)[keyof typeof ProvenanceActivityType];

export const ProvenanceActivityTypeSchema = z.enum([
  'SOURCE_RETRIEVAL',
  'MANUAL_ENTRY',
  'FIELD_OBSERVATION',
  'SAMPLING',
  'IMAGE_CAPTURE',
  'NORMALIZATION',
  'CLASSIFICATION',
  'TRANSFORMATION',
  'DERIVATION',
  'GIS_ANALYSIS',
  'LAB_ANALYSIS',
  'MODEL_ANALYSIS',
  'AI_ANALYSIS',
  'SOURCE_RECONCILIATION',
  'RIGHTS_EVALUATION',
  'DECISION_EVALUATION',
  'PACKAGE_CREATION',
  'DISCLOSURE_TRANSFORMATION',
  'CORRECTION',
  'SUPERSESSION',
  'IMPORT',
  'EXPORT',
  'OTHER',
]);

export const ProvenanceAgentType = {
  PERSON: 'PERSON',
  ORGANIZATION: 'ORGANIZATION',
  SOFTWARE: 'SOFTWARE',
  AI_MODEL: 'AI_MODEL',
  INSTRUMENT: 'INSTRUMENT',
  SYSTEM: 'SYSTEM',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ProvenanceAgentType = (typeof ProvenanceAgentType)[keyof typeof ProvenanceAgentType];

export const ProvenanceAgentRole = {
  OBSERVER: 'OBSERVER',
  COLLECTOR: 'COLLECTOR',
  OPERATOR: 'OPERATOR',
  ANALYST: 'ANALYST',
  REVIEWER: 'REVIEWER',
  SOFTWARE_EXECUTOR: 'SOFTWARE_EXECUTOR',
  MODEL_EXECUTOR: 'MODEL_EXECUTOR',
  DATA_PROVIDER: 'DATA_PROVIDER',
  CURATOR: 'CURATOR',
  IMPORTER: 'IMPORTER',
  OTHER: 'OTHER',
} as const;

export type ProvenanceAgentRole = (typeof ProvenanceAgentRole)[keyof typeof ProvenanceAgentRole];

export const ProvenanceAgentReferenceSchema = z.object({
  agentId: OpaqueIdSchema,
  agentType: z.enum([
    'PERSON',
    'ORGANIZATION',
    'SOFTWARE',
    'AI_MODEL',
    'INSTRUMENT',
    'SYSTEM',
    'UNKNOWN',
  ]),
  role: z.enum([
    'OBSERVER',
    'COLLECTOR',
    'OPERATOR',
    'ANALYST',
    'REVIEWER',
    'SOFTWARE_EXECUTOR',
    'MODEL_EXECUTOR',
    'DATA_PROVIDER',
    'CURATOR',
    'IMPORTER',
    'OTHER',
  ]),
  displayName: z.string().min(1).max(256).optional(),
  externalIdentifier: z.string().min(1).max(256).optional(),
  version: z.string().min(1).max(64).optional(),
  organizationRef: OpaqueIdSchema.optional(),
});

export type ProvenanceAgentReference = z.infer<typeof ProvenanceAgentReferenceSchema>;

export const ProvenanceLineageClass = {
  SOURCE: 'SOURCE',
  PROCESS: 'PROCESS',
} as const;

export type ProvenanceLineageClass =
  (typeof ProvenanceLineageClass)[keyof typeof ProvenanceLineageClass];

export const ProvenanceLineageClassSchema = z.enum(['SOURCE', 'PROCESS']);

export const ProvenanceDerivationKind = {
  DIRECT_COPY: 'DIRECT_COPY',
  NORMALIZED_FROM: 'NORMALIZED_FROM',
  TRANSFORMED_FROM: 'TRANSFORMED_FROM',
  DERIVED_FROM: 'DERIVED_FROM',
  AGGREGATED_FROM: 'AGGREGATED_FROM',
  INTERPRETED_FROM: 'INTERPRETED_FROM',
  MODEL_DERIVED_FROM: 'MODEL_DERIVED_FROM',
  CORRECTED_FROM: 'CORRECTED_FROM',
  SUPERSEDED_FROM: 'SUPERSEDED_FROM',
} as const;

export type ProvenanceDerivationKind =
  (typeof ProvenanceDerivationKind)[keyof typeof ProvenanceDerivationKind];

export const ProvenanceRelationship = {
  DERIVES: 'DERIVES',
  CORRECTS: 'CORRECTS',
  SUPERSEDES: 'SUPERSEDES',
  INVALIDATES: 'INVALIDATES',
  ANNOTATES: 'ANNOTATES',
} as const;

export type ProvenanceRelationship =
  (typeof ProvenanceRelationship)[keyof typeof ProvenanceRelationship];

export const ProvenanceDerivationSchema = z.object({
  kind: z.enum([
    'DIRECT_COPY',
    'NORMALIZED_FROM',
    'TRANSFORMED_FROM',
    'DERIVED_FROM',
    'AGGREGATED_FROM',
    'INTERPRETED_FROM',
    'MODEL_DERIVED_FROM',
    'CORRECTED_FROM',
    'SUPERSEDED_FROM',
  ]),
  relationship: z.enum(['DERIVES', 'CORRECTS', 'SUPERSEDES', 'INVALIDATES', 'ANNOTATES']),
  lineageClass: ProvenanceLineageClassSchema,
  generated: ProvenanceEntityReferenceSchema,
  used: ProvenanceEntityReferenceSchema,
});

export type ProvenanceDerivation = z.infer<typeof ProvenanceDerivationSchema>;

export const ProvenanceProcessReferenceSchema = z.object({
  processId: OpaqueIdSchema,
  processVersion: z.string().min(1).max(64).optional(),
  implementationRef: z.string().min(1).max(256).optional(),
  buildingBlockId: z.string().min(1).max(128).optional(),
  buildingBlockVersion: z
    .object({
      major: z.number().int().nonnegative(),
      minor: z.number().int().nonnegative(),
      patch: z.number().int().nonnegative(),
    })
    .optional(),
});

export type ProvenanceProcessReference = z.infer<typeof ProvenanceProcessReferenceSchema>;

export const ProvenanceSoftwareReferenceSchema = z.object({
  name: z.string().min(1).max(128),
  version: z.string().min(1).max(64).optional(),
  commitSha: z.string().min(7).max(64).optional(),
  packageVersion: z.string().min(1).max(64).optional(),
  runtime: z.string().min(1).max(64).optional(),
});

export type ProvenanceSoftwareReference = z.infer<typeof ProvenanceSoftwareReferenceSchema>;

export const ProvenanceParameterSchema = z.discriminatedUnion('type', [
  z.object({
    name: z.string().min(1).max(128),
    type: z.literal('STRING'),
    value: z.string().max(2000),
  }),
  z.object({
    name: z.string().min(1).max(128),
    type: z.literal('NUMBER'),
    value: FiniteNumberSchema,
  }),
  z.object({ name: z.string().min(1).max(128), type: z.literal('BOOLEAN'), value: z.boolean() }),
  z.object({
    name: z.string().min(1).max(128),
    type: z.literal('IDENTIFIER'),
    value: z.string().min(1).max(256),
  }),
  z.object({
    name: z.string().min(1).max(128),
    type: z.literal('QUANTITY'),
    value: FiniteNumberSchema,
    unit: z.string().min(1).max(64),
  }),
  z.object({
    name: z.string().min(1).max(128),
    type: z.literal('JSON'),
    value: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  }),
]);

export type ProvenanceParameter = z.infer<typeof ProvenanceParameterSchema>;

export const ProvenanceHashDescriptorSchema = z.object({
  algorithm: z.literal('SHA-256'),
  value: z.string().regex(/^[a-f0-9]{64}$/),
  scope: z.string().min(1).max(128),
});

export type ProvenanceHashDescriptor = z.infer<typeof ProvenanceHashDescriptorSchema>;

export const ProvenanceAiMetadataSchema = z.object({
  modelName: z.string().min(1).max(128).optional(),
  modelVersion: z.string().min(1).max(64).optional(),
  provider: z.string().min(1).max(128).optional(),
  taskContractVersion: z.string().min(1).max(64).optional(),
  reasoningMode: z.string().min(1).max(64).optional(),
  evidenceBundleHash: z.string().min(1).max(128).optional(),
});

export type ProvenanceAiMetadata = z.infer<typeof ProvenanceAiMetadataSchema>;

export const ProvenanceActivitySchema = z
  .object({
    id: OpaqueIdSchema,
    schemaVersion: z.literal(PROVENANCE_SCHEMA_VERSION),
    activityType: ProvenanceActivityTypeSchema,
    lineageClass: ProvenanceLineageClassSchema,
    used: z.array(ProvenanceEntityReferenceSchema).max(128).default([]),
    generated: z.array(ProvenanceEntityReferenceSchema).max(128).default([]),
    associatedAgents: z.array(ProvenanceAgentReferenceSchema).max(32).default([]),
    process: ProvenanceProcessReferenceSchema.optional(),
    software: ProvenanceSoftwareReferenceSchema.optional(),
    startedAt: IsoDateTimeSchema.optional(),
    endedAt: IsoDateTimeSchema.optional(),
    parameters: z.array(ProvenanceParameterSchema).max(64).default([]),
    notes: z.string().min(1).max(2000).optional(),
    limitations: z.array(z.string().min(1).max(256)).max(32).optional(),
    status: z.enum(['STARTED', 'COMPLETED', 'FAILED', 'UNKNOWN']).optional(),
    activityHash: ProvenanceHashDescriptorSchema.optional(),
    ai: ProvenanceAiMetadataSchema.optional(),
    governanceReceiptId: OpaqueIdSchema.optional(),
  })
  .superRefine((activity, ctx) => {
    if (
      activity.startedAt !== undefined &&
      activity.endedAt !== undefined &&
      Date.parse(activity.endedAt) < Date.parse(activity.startedAt)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endedAt must not precede startedAt',
        path: ['endedAt'],
      });
    }
  });

export type ProvenanceActivity = z.infer<typeof ProvenanceActivitySchema>;
export type ProvenanceActivityId = ProvenanceActivity['id'];

export const ProvenanceGraphSchema = z.object({
  schemaVersion: z.literal(PROVENANCE_SCHEMA_VERSION),
  activities: z.array(ProvenanceActivitySchema).max(512),
  derivations: z.array(ProvenanceDerivationSchema).max(1024),
});

export type ProvenanceGraph = z.infer<typeof ProvenanceGraphSchema>;

export type ProvenanceLineage = {
  source: ProvenanceEntityReference[];
  processing: ProvenanceEntityReference[];
};

export type ProvenanceAssociation = ProvenanceAgentReference;
export type ProvenanceInputReference = ProvenanceEntityReference;
export type ProvenanceOutputReference = ProvenanceEntityReference;

export function validateProvenanceActivity(input: unknown): ProvenanceActivity {
  return ProvenanceActivitySchema.parse(input);
}

export function validateProvenanceHashDescriptor(input: unknown): ProvenanceHashDescriptor {
  return ProvenanceHashDescriptorSchema.parse(input);
}

function derivationKey(derivation: ProvenanceDerivation): string {
  return [
    derivation.kind,
    derivation.relationship,
    derivation.lineageClass,
    derivation.generated.entityId,
    derivation.used.entityId,
  ].join('|');
}

function detectDerivationCycles(derivations: readonly ProvenanceDerivation[]): void {
  const parents = new Map<string, string[]>();
  for (const derivation of derivations) {
    const list = parents.get(derivation.generated.entityId) ?? [];
    list.push(derivation.used.entityId);
    parents.set(derivation.generated.entityId, list);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (node: string): void => {
    if (visited.has(node)) {
      return;
    }
    if (visiting.has(node)) {
      throw new Error(`Provenance derivation cycle detected at ${node}`);
    }
    visiting.add(node);
    for (const parent of parents.get(node) ?? []) {
      visit(parent);
    }
    visiting.delete(node);
    visited.add(node);
  };
  for (const node of parents.keys()) {
    visit(node);
  }
}

export function validateProvenanceGraph(input: ProvenanceGraph): ProvenanceGraph {
  const parsed = ProvenanceGraphSchema.parse(input);
  const ids = parsed.activities.map((activity) => activity.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Duplicate provenance activity ID is not allowed');
  }
  const seen = new Set<string>();
  for (const derivation of parsed.derivations) {
    if (derivation.generated.entityId === derivation.used.entityId) {
      throw new Error('Direct self-derivation is not allowed');
    }
    const key = derivationKey(derivation);
    if (seen.has(key)) {
      throw new Error('Duplicate equivalent derivation is not allowed');
    }
    seen.add(key);
  }
  detectDerivationCycles(parsed.derivations);
  return {
    schemaVersion: parsed.schemaVersion,
    activities: [...parsed.activities].sort((left, right) => left.id.localeCompare(right.id)),
    derivations: [...parsed.derivations].sort((left, right) => {
      const generated = left.generated.entityId.localeCompare(right.generated.entityId);
      if (generated !== 0) {
        return generated;
      }
      return left.used.entityId.localeCompare(right.used.entityId);
    }),
  };
}

function cloneEntity(entity: ProvenanceEntityReference): ProvenanceEntityReference {
  return structuredClone(entity);
}

function sortEntities(entities: readonly ProvenanceEntityReference[]): ProvenanceEntityReference[] {
  const unique = new Map<string, ProvenanceEntityReference>();
  for (const entity of entities) {
    unique.set(entity.entityId, entity);
  }
  return [...unique.values()]
    .sort((left, right) => left.entityId.localeCompare(right.entityId))
    .map(cloneEntity);
}

export function getActivitiesGeneratingEntity(
  graph: ProvenanceGraph,
  entityId: string
): ProvenanceActivity[] {
  return graph.activities
    .filter((activity) => activity.generated.some((entity) => entity.entityId === entityId))
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((activity) => structuredClone(activity));
}

export function getActivitiesUsingEntity(
  graph: ProvenanceGraph,
  entityId: string
): ProvenanceActivity[] {
  return graph.activities
    .filter((activity) => activity.used.some((entity) => entity.entityId === entityId))
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((activity) => structuredClone(activity));
}

export function getInputEntitiesForActivity(
  graph: ProvenanceGraph,
  activityId: string
): ProvenanceEntityReference[] {
  const activity = graph.activities.find((item) => item.id === activityId);
  return activity === undefined ? [] : activity.used.map(cloneEntity);
}

export function getOutputEntitiesForActivity(
  graph: ProvenanceGraph,
  activityId: string
): ProvenanceEntityReference[] {
  const activity = graph.activities.find((item) => item.id === activityId);
  return activity === undefined ? [] : activity.generated.map(cloneEntity);
}

export function getDerivedEntities(
  graph: ProvenanceGraph,
  entityId: string
): ProvenanceEntityReference[] {
  return sortEntities(
    graph.derivations
      .filter((derivation) => derivation.used.entityId === entityId)
      .map((derivation) => derivation.generated)
  );
}

function upstreamEntities(
  graph: ProvenanceGraph,
  entityId: string,
  lineageClass: ProvenanceLineageClass
): ProvenanceEntityReference[] {
  const found = new Map<string, ProvenanceEntityReference>();
  const seen = new Set<string>();

  const walk = (current: string): void => {
    if (seen.has(current)) {
      return;
    }
    seen.add(current);
    for (const derivation of graph.derivations) {
      if (derivation.generated.entityId !== current) {
        continue;
      }
      if (lineageClass === ProvenanceLineageClass.PROCESS) {
        if (derivation.lineageClass !== ProvenanceLineageClass.PROCESS) {
          continue;
        }
        found.set(derivation.used.entityId, derivation.used);
        walk(derivation.used.entityId);
        continue;
      }
      if (derivation.lineageClass === ProvenanceLineageClass.SOURCE) {
        found.set(derivation.used.entityId, derivation.used);
      }
      walk(derivation.used.entityId);
    }
    for (const activity of graph.activities) {
      if (!activity.generated.some((entity) => entity.entityId === current)) {
        continue;
      }
      for (const used of activity.used) {
        if (lineageClass === ProvenanceLineageClass.PROCESS) {
          if (activity.lineageClass !== ProvenanceLineageClass.PROCESS) {
            continue;
          }
          found.set(used.entityId, used);
          walk(used.entityId);
          continue;
        }
        if (activity.lineageClass === ProvenanceLineageClass.SOURCE) {
          found.set(used.entityId, used);
          if (current !== entityId) {
            const generated = activity.generated.find((entity) => entity.entityId === current);
            if (generated !== undefined) {
              found.set(generated.entityId, generated);
            }
          }
        }
        walk(used.entityId);
      }
    }
  };

  walk(entityId);
  if (lineageClass === ProvenanceLineageClass.PROCESS) {
    found.delete(entityId);
  }
  return sortEntities([...found.values()]);
}

export function getSourceAncestors(
  graph: ProvenanceGraph,
  entityId: string
): ProvenanceEntityReference[] {
  return upstreamEntities(graph, entityId, ProvenanceLineageClass.SOURCE);
}

export function getProcessingAncestors(
  graph: ProvenanceGraph,
  entityId: string
): ProvenanceEntityReference[] {
  return upstreamEntities(graph, entityId, ProvenanceLineageClass.PROCESS);
}

export function traceEntityLineage(graph: ProvenanceGraph, entityId: string): ProvenanceLineage {
  return {
    source: getSourceAncestors(graph, entityId),
    processing: getProcessingAncestors(graph, entityId),
  };
}

const AUTHORITY_RANK: Record<EvidenceAuthorityClass, number> = {
  UNKNOWN: 0,
  USER_OBSERVATION: 1,
  COMMUNITY_REPORT: 1,
  MODEL_DERIVED: 1,
  PROFESSIONAL_INTERPRETATION: 2,
  SCIENTIFIC_PUBLICATION: 3,
  SECONDARY_AUTHORITY: 4,
  PRIMARY_AUTHORITY: 5,
};

export function claimedAuthorityIsElevated(
  inputAuthorities: readonly EvidenceAuthorityClass[],
  claimed: EvidenceAuthorityClass
): boolean {
  const ceiling = inputAuthorities.reduce(
    (max, authority) => Math.max(max, AUTHORITY_RANK[authority]),
    0
  );
  return AUTHORITY_RANK[claimed] > ceiling;
}

export function provenanceSetsUgesTruth(_activity: ProvenanceActivity): boolean {
  return false;
}

export function provenanceAuthorizesUse(_activity: ProvenanceActivity): boolean {
  return false;
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

export async function hashProvenanceActivity(
  activity: ProvenanceActivity
): Promise<ProvenanceHashDescriptor> {
  const material: Record<string, unknown> = { ...activity };
  delete material['activityHash'];
  delete material['notes'];
  delete material['limitations'];
  const canonical = canonicalize(material);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  const value = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return validateProvenanceHashDescriptor({
    algorithm: 'SHA-256',
    value,
    scope: PROVENANCE_HASH_SCOPE,
  });
}
