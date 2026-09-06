/**
 * Resource Catalog R1
 *
 * Persistence-free catalog of discoverable datasets, APIs, documents, and
 * other evidence-producing resources. A record describes what a resource is.
 * It does not fetch, execute, persist, or interpret resource content.
 *
 * UGES = assertions. Geological Layer Registry = layer semantics.
 * Resource Catalog = discoverable origins. Adapters = future translation.
 */

import { z } from 'zod';

import {
  listLayerDefinitions,
  type GeologicalLayerDefinition,
  type GeologicalLayerRegistry,
} from './geological-layer-registry';
import {
  EvidenceAuthorityClass,
  EvidenceAuthorityClassSchema,
  EvidenceSourceDescriptorSchema,
  type EvidenceSourceDescriptor,
} from './universal-geological-evidence-schema';

export const RESOURCE_CATALOG_SCHEMA_VERSION = 1;

const IsoDateTimeSchema = z.string().datetime({ offset: true });

export type ResourceId = string;

export const ResourceType = {
  GEOSPATIAL_DATASET: 'GEOSPATIAL_DATASET',
  FEATURE_COLLECTION: 'FEATURE_COLLECTION',
  OBSERVATION_DATASET: 'OBSERVATION_DATASET',
  SPECIMEN_DATASET: 'SPECIMEN_DATASET',
  DOCUMENT: 'DOCUMENT',
  REGULATION_DOCUMENT: 'REGULATION_DOCUMENT',
  MAP: 'MAP',
  IMAGERY: 'IMAGERY',
  DEM: 'DEM',
  LIDAR_POINT_CLOUD: 'LIDAR_POINT_CLOUD',
  TILE_SERVICE: 'TILE_SERVICE',
  API: 'API',
  OGC_API: 'OGC_API',
  STAC_CATALOG: 'STAC_CATALOG',
  PROCESSING_SERVICE: 'PROCESSING_SERVICE',
  VOCABULARY: 'VOCABULARY',
  ONTOLOGY: 'ONTOLOGY',
  MODEL: 'MODEL',
  DERIVED_PRODUCT: 'DERIVED_PRODUCT',
  LOCAL_DATASET: 'LOCAL_DATASET',
  USER_GENERATED_DATASET: 'USER_GENERATED_DATASET',
} as const;

export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

export const ResourceTypeSchema = z.enum([
  'GEOSPATIAL_DATASET',
  'FEATURE_COLLECTION',
  'OBSERVATION_DATASET',
  'SPECIMEN_DATASET',
  'DOCUMENT',
  'REGULATION_DOCUMENT',
  'MAP',
  'IMAGERY',
  'DEM',
  'LIDAR_POINT_CLOUD',
  'TILE_SERVICE',
  'API',
  'OGC_API',
  'STAC_CATALOG',
  'PROCESSING_SERVICE',
  'VOCABULARY',
  'ONTOLOGY',
  'MODEL',
  'DERIVED_PRODUCT',
  'LOCAL_DATASET',
  'USER_GENERATED_DATASET',
]);

export const ResourceOriginKind = {
  AGENCY: 'AGENCY',
  SCIENTIFIC: 'SCIENTIFIC',
  COMMUNITY: 'COMMUNITY',
  USER: 'USER',
  MODEL: 'MODEL',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ResourceOriginKind = (typeof ResourceOriginKind)[keyof typeof ResourceOriginKind];

export const ResourceOriginKindSchema = z.enum([
  'AGENCY',
  'SCIENTIFIC',
  'COMMUNITY',
  'USER',
  'MODEL',
  'UNKNOWN',
]);

export const ResourceAccessMechanism = {
  STATIC_FILE: 'STATIC_FILE',
  REST_API: 'REST_API',
  OGC_API: 'OGC_API',
  WMS: 'WMS',
  WFS: 'WFS',
  STAC: 'STAC',
  TILE_SERVICE: 'TILE_SERVICE',
  DOWNLOAD: 'DOWNLOAD',
  MANUAL_DOCUMENT: 'MANUAL_DOCUMENT',
  LOCAL_FILE: 'LOCAL_FILE',
  USER_GENERATED: 'USER_GENERATED',
  OTHER: 'OTHER',
} as const;

export type ResourceAccessMechanism =
  (typeof ResourceAccessMechanism)[keyof typeof ResourceAccessMechanism];

export const ResourceAccessMechanismSchema = z.enum([
  'STATIC_FILE',
  'REST_API',
  'OGC_API',
  'WMS',
  'WFS',
  'STAC',
  'TILE_SERVICE',
  'DOWNLOAD',
  'MANUAL_DOCUMENT',
  'LOCAL_FILE',
  'USER_GENERATED',
  'OTHER',
]);

export const ResourceCapability = {
  SEARCH: 'SEARCH',
  FEATURE_QUERY: 'FEATURE_QUERY',
  BBOX_QUERY: 'BBOX_QUERY',
  POINT_QUERY: 'POINT_QUERY',
  TEMPORAL_QUERY: 'TEMPORAL_QUERY',
  DOWNLOAD: 'DOWNLOAD',
  TILE_RENDER: 'TILE_RENDER',
  HISTORICAL_LOOKUP: 'HISTORICAL_LOOKUP',
  VERSION_LOOKUP: 'VERSION_LOOKUP',
  CHANGE_DETECTION: 'CHANGE_DETECTION',
  PROVENANCE_LINKING: 'PROVENANCE_LINKING',
  PROCESS_EXECUTION_METADATA: 'PROCESS_EXECUTION_METADATA',
  OFFLINE_USE: 'OFFLINE_USE',
} as const;

export type ResourceCapability = (typeof ResourceCapability)[keyof typeof ResourceCapability];

export const ResourceCapabilitySchema = z.enum([
  'SEARCH',
  'FEATURE_QUERY',
  'BBOX_QUERY',
  'POINT_QUERY',
  'TEMPORAL_QUERY',
  'DOWNLOAD',
  'TILE_RENDER',
  'HISTORICAL_LOOKUP',
  'VERSION_LOOKUP',
  'CHANGE_DETECTION',
  'PROVENANCE_LINKING',
  'PROCESS_EXECUTION_METADATA',
  'OFFLINE_USE',
]);

export const ResourceUsage = {
  DISCOVERY: 'DISCOVERY',
  GEOLOGICAL_CONTEXT: 'GEOLOGICAL_CONTEXT',
  COLLECTION_DECISION_INPUT: 'COLLECTION_DECISION_INPUT',
  SAFETY_DECISION_INPUT: 'SAFETY_DECISION_INPUT',
  ROUTE_DECISION_INPUT: 'ROUTE_DECISION_INPUT',
  SPECIMEN_CONTEXT: 'SPECIMEN_CONTEXT',
  RESEARCH_ONLY: 'RESEARCH_ONLY',
} as const;

export type ResourceUsage = (typeof ResourceUsage)[keyof typeof ResourceUsage];

export const ResourceUsageSchema = z.enum([
  'DISCOVERY',
  'GEOLOGICAL_CONTEXT',
  'COLLECTION_DECISION_INPUT',
  'SAFETY_DECISION_INPUT',
  'ROUTE_DECISION_INPUT',
  'SPECIMEN_CONTEXT',
  'RESEARCH_ONLY',
]);

export const ResourceRelationshipKind = {
  DERIVED_FROM: 'DERIVED_FROM',
  SUPERSEDES: 'SUPERSEDES',
  SUPERSEDED_BY: 'SUPERSEDED_BY',
  DESCRIBES: 'DESCRIBES',
  DOCUMENTS: 'DOCUMENTS',
  IMPLEMENTS: 'IMPLEMENTS',
  PRODUCES: 'PRODUCES',
  CONSUMES: 'CONSUMES',
  HAS_VERSION: 'HAS_VERSION',
  PART_OF: 'PART_OF',
  MIRRORS: 'MIRRORS',
} as const;

export type ResourceRelationshipKind =
  (typeof ResourceRelationshipKind)[keyof typeof ResourceRelationshipKind];

export const ResourceRelationshipKindSchema = z.enum([
  'DERIVED_FROM',
  'SUPERSEDES',
  'SUPERSEDED_BY',
  'DESCRIBES',
  'DOCUMENTS',
  'IMPLEMENTS',
  'PRODUCES',
  'CONSUMES',
  'HAS_VERSION',
  'PART_OF',
  'MIRRORS',
]);

export const ResourceLimitationCode = {
  COARSE_SCALE: 'COARSE_SCALE',
  INCOMPLETE_COVERAGE: 'INCOMPLETE_COVERAGE',
  TEMPORAL_LAG: 'TEMPORAL_LAG',
  HISTORICAL_ONLY: 'HISTORICAL_ONLY',
  MODEL_DERIVED: 'MODEL_DERIVED',
  COMMUNITY_SOURCED: 'COMMUNITY_SOURCED',
  LEGAL_NONAUTHORITATIVE: 'LEGAL_NONAUTHORITATIVE',
  NOT_PARCEL_SCALE: 'NOT_PARCEL_SCALE',
  KNOWN_PROVIDER_ISSUE: 'KNOWN_PROVIDER_ISSUE',
  UNVERIFIED_CURRENCY: 'UNVERIFIED_CURRENCY',
  RATE_LIMITED: 'RATE_LIMITED',
  ACCESS_RESTRICTED: 'ACCESS_RESTRICTED',
} as const;

export type ResourceLimitationCode =
  (typeof ResourceLimitationCode)[keyof typeof ResourceLimitationCode];

export const ResourceLimitationCodeSchema = z.enum([
  'COARSE_SCALE',
  'INCOMPLETE_COVERAGE',
  'TEMPORAL_LAG',
  'HISTORICAL_ONLY',
  'MODEL_DERIVED',
  'COMMUNITY_SOURCED',
  'LEGAL_NONAUTHORITATIVE',
  'NOT_PARCEL_SCALE',
  'KNOWN_PROVIDER_ISSUE',
  'UNVERIFIED_CURRENCY',
  'RATE_LIMITED',
  'ACCESS_RESTRICTED',
]);

export const ResourcePermissionSchema = z.enum(['ALLOWED', 'PROHIBITED', 'UNKNOWN']);
export const ResourceAttributionPolicySchema = z.enum(['REQUIRED', 'NOT_REQUIRED', 'UNKNOWN']);

export const ResourceProviderSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(256),
  kind: z.enum(['AGENCY', 'SCIENTIFIC', 'COMMUNITY', 'COMMERCIAL', 'UNKNOWN']).optional(),
});

export type ResourceProvider = z.infer<typeof ResourceProviderSchema>;

export const ResourceAuthorityProfileSchema = z.object({
  originKind: ResourceOriginKindSchema,
  sourceAuthorityClass: EvidenceAuthorityClassSchema,
});

export type ResourceAuthorityProfile = z.infer<typeof ResourceAuthorityProfileSchema>;

export const ResourceTemporalProfileSchema = z.object({
  publishedAt: IsoDateTimeSchema.optional(),
  updatedAt: IsoDateTimeSchema.optional(),
  acquiredOrObservedFrom: IsoDateTimeSchema.optional(),
  acquiredOrObservedTo: IsoDateTimeSchema.optional(),
  coverageFrom: IsoDateTimeSchema.optional(),
  coverageTo: IsoDateTimeSchema.optional(),
  effectiveFrom: IsoDateTimeSchema.optional(),
  effectiveTo: IsoDateTimeSchema.optional(),
  retrievalExpectation: z.enum(['ON_DEMAND', 'BATCH', 'USER_SYNC', 'UNKNOWN']).optional(),
});

export type ResourceTemporalProfile = z.infer<typeof ResourceTemporalProfileSchema>;

export const ResourceSpatialProfileSchema = z.object({
  crs: z.string().min(1).max(64).optional(),
  bbox: z
    .tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
    ])
    .optional(),
  nominalScaleDenominator: z.number().positive().optional(),
  spatialResolutionMeters: z.number().positive().optional(),
  positionalAccuracyMeters: z.number().positive().optional(),
  coverageDescription: z.string().min(1).max(1000).optional(),
});

export type ResourceSpatialProfile = z.infer<typeof ResourceSpatialProfileSchema>;

export const ResourceAccessProfileSchema = z.object({
  mechanism: ResourceAccessMechanismSchema,
  endpoint: z.string().min(1).max(2048).optional(),
  authenticationRequired: z.enum(['REQUIRED', 'NOT_REQUIRED', 'UNKNOWN']),
  rateLimit: z.string().min(1).max(256).optional(),
  accessStatus: z.enum(['PUBLIC', 'RESTRICTED', 'UNKNOWN']).optional(),
  offlineAvailability: z.enum(['AVAILABLE', 'UNAVAILABLE', 'UNKNOWN']).optional(),
});

export type ResourceAccessProfile = z.infer<typeof ResourceAccessProfileSchema>;

export const ResourceLicenseProfileSchema = z.object({
  licenseId: z.string().min(1).max(256).optional(),
  licenseRef: z.string().min(1).max(2048).optional(),
  attributionRequired: ResourceAttributionPolicySchema,
  redistribution: ResourcePermissionSchema,
  offlineCaching: ResourcePermissionSchema,
  derivativeUse: ResourcePermissionSchema,
});

export type ResourceLicenseProfile = z.infer<typeof ResourceLicenseProfileSchema>;

export const ResourceVersionProfileSchema = z.object({
  versionId: z.string().min(1).max(128),
  publishedAt: IsoDateTimeSchema.optional(),
  updatedAt: IsoDateTimeSchema.optional(),
  supersedes: z.string().min(1).max(128).optional(),
  supersededBy: z.string().min(1).max(128).optional(),
  knownIssueRefs: z.array(z.string().min(1).max(256)).max(32).optional(),
  deprecated: z.boolean(),
});

export type ResourceVersionProfile = z.infer<typeof ResourceVersionProfileSchema>;

export const ResourceRelationshipSchema = z.object({
  kind: ResourceRelationshipKindSchema,
  targetResourceId: z.string().min(1).max(128),
});

export type ResourceRelationship = z.infer<typeof ResourceRelationshipSchema>;

export const ResourceLimitationSchema = z.object({
  code: ResourceLimitationCodeSchema,
  description: z.string().min(1).max(1000).optional(),
});

export type ResourceLimitation = z.infer<typeof ResourceLimitationSchema>;

export const ResourceUsageProfileSchema = z.object({
  intendedUses: z.array(ResourceUsageSchema).min(1).max(16),
});

export type ResourceUsageProfile = z.infer<typeof ResourceUsageProfileSchema>;

export const ResourceIdentifiersSchema = z.object({
  providerRecordId: z.string().min(1).max(256).optional(),
  doi: z.string().min(1).max(256).optional(),
  uri: z.string().url().optional(),
  catalogIdentifier: z.string().min(1).max(256).optional(),
  versionIdentifier: z.string().min(1).max(128).optional(),
});

export type ResourceIdentifiers = z.infer<typeof ResourceIdentifiersSchema>;

export const ResourceDerivationSchema = z.object({
  processId: z.string().min(1).max(128),
  processVersion: z.string().min(1).max(64),
  inputResourceIds: z.array(z.string().min(1).max(128)).max(128),
  derivationMethod: z.string().min(1).max(256),
  metadataRef: z.string().min(1).max(512).optional(),
});

export type ResourceDerivation = z.infer<typeof ResourceDerivationSchema>;

const UniqueIdListSchema = z
  .array(z.string().min(1).max(128))
  .max(128)
  .superRefine((ids, ctx) => {
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'IDs must be unique',
      });
    }
  });

const AUTHORITATIVE_SOURCE_CLASSES: ReadonlySet<string> = new Set([
  EvidenceAuthorityClass.PRIMARY_AUTHORITY,
  EvidenceAuthorityClass.SECONDARY_AUTHORITY,
]);

function isCommunityOrUserResource(record: {
  type: ResourceType;
  authority: ResourceAuthorityProfile;
  access: ResourceAccessProfile;
}): boolean {
  return (
    record.type === ResourceType.USER_GENERATED_DATASET ||
    record.authority.originKind === ResourceOriginKind.COMMUNITY ||
    record.authority.originKind === ResourceOriginKind.USER ||
    record.access.mechanism === ResourceAccessMechanism.USER_GENERATED
  );
}

function orderedIntervalInvalid(from: string | undefined, to: string | undefined): boolean {
  return from !== undefined && to !== undefined && Date.parse(from) > Date.parse(to);
}

export const ResourceRecordSchema = z
  .object({
    id: z.string().min(1).max(128),
    schemaVersion: z.literal(RESOURCE_CATALOG_SCHEMA_VERSION),
    name: z.string().min(1).max(256),
    type: ResourceTypeSchema,
    provider: ResourceProviderSchema,
    identifiers: ResourceIdentifiersSchema.optional(),
    authority: ResourceAuthorityProfileSchema,
    temporal: ResourceTemporalProfileSchema.optional(),
    spatial: ResourceSpatialProfileSchema.optional(),
    access: ResourceAccessProfileSchema,
    licensing: ResourceLicenseProfileSchema,
    version: ResourceVersionProfileSchema,
    relationships: z.array(ResourceRelationshipSchema).max(128).default([]),
    limitations: z.array(ResourceLimitationSchema).min(1).max(32),
    capabilities: z.array(ResourceCapabilitySchema).min(1).max(16),
    usage: ResourceUsageProfileSchema,
    derivation: ResourceDerivationSchema.extend({
      inputResourceIds: UniqueIdListSchema,
    }).optional(),
    standardsHints: z
      .array(
        z.enum([
          'OGC_API_RECORDS',
          'JSON_FG',
          'GEOJSON',
          'STAC',
          'GEOSCIML',
          'GEOPACKAGE',
          'GEOPARQUET',
          'RO_CRATE',
        ])
      )
      .max(16)
      .optional(),
  })
  .superRefine((record, ctx) => {
    const temporal = record.temporal;
    if (temporal !== undefined) {
      if (orderedIntervalInvalid(temporal.coverageFrom, temporal.coverageTo)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'temporal.coverageFrom must be less than or equal to coverageTo',
          path: ['temporal', 'coverageTo'],
        });
      }
      if (orderedIntervalInvalid(temporal.acquiredOrObservedFrom, temporal.acquiredOrObservedTo)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'acquiredOrObservedFrom must be less than or equal to acquiredOrObservedTo',
          path: ['temporal', 'acquiredOrObservedTo'],
        });
      }
      if (orderedIntervalInvalid(temporal.effectiveFrom, temporal.effectiveTo)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'effectiveFrom must be less than or equal to effectiveTo',
          path: ['temporal', 'effectiveTo'],
        });
      }
    }

    const bbox = record.spatial?.bbox;
    if (bbox !== undefined && bbox[1] > bbox[3]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'spatial.bbox south must be less than or equal to north',
        path: ['spatial', 'bbox'],
      });
    }

    if (record.type === ResourceType.DERIVED_PRODUCT && record.derivation === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DERIVED_PRODUCT requires derivation metadata',
        path: ['derivation'],
      });
    }

    if (
      isCommunityOrUserResource(record) &&
      AUTHORITATIVE_SOURCE_CLASSES.has(record.authority.sourceAuthorityClass)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Community/user resources cannot claim PRIMARY or SECONDARY source authority',
        path: ['authority', 'sourceAuthorityClass'],
      });
    }

    const seen = new Set<string>();
    for (const [index, relationship] of record.relationships.entries()) {
      if (relationship.targetResourceId === record.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Resource relationships cannot self-link',
          path: ['relationships', index],
        });
      }
      const key = `${relationship.kind}:${relationship.targetResourceId}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate equivalent relationships are not allowed',
          path: ['relationships', index],
        });
      }
      seen.add(key);
    }
  });

export type ResourceRecord = z.infer<typeof ResourceRecordSchema>;

export function validateResourceRecord(input: unknown): ResourceRecord {
  return ResourceRecordSchema.parse(input);
}

function cloneRecord(record: ResourceRecord): ResourceRecord {
  return structuredClone(record);
}

function sortedClone(records: readonly ResourceRecord[]): ResourceRecord[] {
  return [...records].sort((left, right) => left.id.localeCompare(right.id)).map(cloneRecord);
}

export type ResourceCatalog = {
  readonly schemaVersion: typeof RESOURCE_CATALOG_SCHEMA_VERSION;
  getResourceRecord: (id: ResourceId) => ResourceRecord | undefined;
  listResourceRecords: () => ResourceRecord[];
  listResourcesByType: (type: ResourceType) => ResourceRecord[];
  listResourcesByCapability: (capability: ResourceCapability) => ResourceRecord[];
  listResourcesByProvider: (providerId: string) => ResourceRecord[];
  listResourcesByUsage: (usage: ResourceUsage) => ResourceRecord[];
  listResourcesReferencing: (id: ResourceId) => ResourceRecord[];
};

export function createResourceCatalog(
  definitions: readonly ResourceRecord[] = BUILTIN_RESOURCE_RECORDS
): ResourceCatalog {
  const parsed = definitions.map((definition) => validateResourceRecord(definition));
  const ids = parsed.map((definition) => definition.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Duplicate resource IDs are not allowed');
  }

  const byId = new Map(parsed.map((record) => [record.id, cloneRecord(record)] as const));

  return {
    schemaVersion: RESOURCE_CATALOG_SCHEMA_VERSION,
    getResourceRecord(id: ResourceId): ResourceRecord | undefined {
      const found = byId.get(id);
      if (found === undefined) {
        return undefined;
      }
      return cloneRecord(found);
    },
    listResourceRecords(): ResourceRecord[] {
      return sortedClone([...byId.values()]);
    },
    listResourcesByType(type: ResourceType): ResourceRecord[] {
      return sortedClone([...byId.values()].filter((record) => record.type === type));
    },
    listResourcesByCapability(capability: ResourceCapability): ResourceRecord[] {
      return sortedClone(
        [...byId.values()].filter((record) => record.capabilities.includes(capability))
      );
    },
    listResourcesByProvider(providerId: string): ResourceRecord[] {
      return sortedClone([...byId.values()].filter((record) => record.provider.id === providerId));
    },
    listResourcesByUsage(usage: ResourceUsage): ResourceRecord[] {
      return sortedClone(
        [...byId.values()].filter((record) => record.usage.intendedUses.includes(usage))
      );
    },
    listResourcesReferencing(id: ResourceId): ResourceRecord[] {
      return sortedClone(
        [...byId.values()].filter((record) =>
          record.relationships.some((relationship) => relationship.targetResourceId === id)
        )
      );
    },
  };
}

export function getResourceRecord(
  catalog: ResourceCatalog,
  id: ResourceId
): ResourceRecord | undefined {
  return catalog.getResourceRecord(id);
}

export function listResourceRecords(catalog: ResourceCatalog): ResourceRecord[] {
  return catalog.listResourceRecords();
}

export function listResourcesByType(
  catalog: ResourceCatalog,
  type: ResourceType
): ResourceRecord[] {
  return catalog.listResourcesByType(type);
}

export function listResourcesByCapability(
  catalog: ResourceCatalog,
  capability: ResourceCapability
): ResourceRecord[] {
  return catalog.listResourcesByCapability(capability);
}

export function listResourcesByProvider(
  catalog: ResourceCatalog,
  providerId: string
): ResourceRecord[] {
  return catalog.listResourcesByProvider(providerId);
}

export function listResourcesByUsage(
  catalog: ResourceCatalog,
  usage: ResourceUsage
): ResourceRecord[] {
  return catalog.listResourcesByUsage(usage);
}

export function listResourcesReferencing(
  catalog: ResourceCatalog,
  id: ResourceId
): ResourceRecord[] {
  return catalog.listResourcesReferencing(id);
}

export function projectResourceToUgesSource(record: ResourceRecord): EvidenceSourceDescriptor {
  return EvidenceSourceDescriptorSchema.parse({
    id: record.id,
    name: record.name,
    provider: record.provider.name,
    authorityClass: record.authority.sourceAuthorityClass,
    sourceType: record.type,
    license: record.licensing.licenseId,
    canonicalUri: record.identifiers?.uri,
    retrievalPolicy: record.access.mechanism,
  });
}

export function resourceAuthorizesCollection(_record: ResourceRecord): boolean {
  return false;
}

export function layerAuthorizesCollectionFromResource(_record: ResourceRecord): boolean {
  return false;
}

export function regulationDocumentIsExecutableLaw(_record: ResourceRecord): boolean {
  return false;
}

export function resolveResourcesForLayer(
  layer: GeologicalLayerDefinition,
  catalog: ResourceCatalog
): { found: ResourceRecord[]; missing: string[] } {
  const ids = layer.resourceRecordIds ?? [];
  const found: ResourceRecord[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const record = catalog.getResourceRecord(id);
    if (record === undefined) {
      missing.push(id);
    } else {
      found.push(record);
    }
  }
  return { found, missing };
}

export function listLayersReferencingResource(
  registry: GeologicalLayerRegistry,
  resourceId: ResourceId
): GeologicalLayerDefinition[] {
  return listLayerDefinitions(registry).filter((layer) =>
    (layer.resourceRecordIds ?? []).includes(resourceId)
  );
}

const UNKNOWN_LICENSE: ResourceLicenseProfile = {
  attributionRequired: 'UNKNOWN',
  redistribution: 'UNKNOWN',
  offlineCaching: 'UNKNOWN',
  derivativeUse: 'UNKNOWN',
};

export const BUILTIN_RESOURCE_RECORDS: readonly ResourceRecord[] = [
  validateResourceRecord({
    id: 'res-usgs-ngmdb',
    schemaVersion: RESOURCE_CATALOG_SCHEMA_VERSION,
    name: 'USGS National Geologic Map Database',
    type: ResourceType.MAP,
    provider: { id: 'usgs', name: 'USGS', kind: 'AGENCY' },
    identifiers: {
      uri: 'https://ngmdb.usgs.gov/',
      catalogIdentifier: 'NGMDB',
    },
    authority: {
      originKind: ResourceOriginKind.AGENCY,
      sourceAuthorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
    },
    temporal: {
      coverageFrom: '1879-01-01T00:00:00.000Z',
      retrievalExpectation: 'BATCH',
    },
    spatial: {
      crs: 'EPSG:4326',
      nominalScaleDenominator: 24000,
      coverageDescription: 'Conterminous US and territories; vintage varies by quadrangle',
    },
    access: {
      mechanism: ResourceAccessMechanism.STATIC_FILE,
      authenticationRequired: 'UNKNOWN',
      accessStatus: 'PUBLIC',
      offlineAvailability: 'UNKNOWN',
    },
    licensing: { ...UNKNOWN_LICENSE, licenseId: 'USGS-public-domain-unverified-r1' },
    version: { versionId: 'metadata-r1', deprecated: false },
    relationships: [],
    limitations: [
      { code: ResourceLimitationCode.COARSE_SCALE },
      { code: ResourceLimitationCode.INCOMPLETE_COVERAGE },
      { code: ResourceLimitationCode.NOT_PARCEL_SCALE },
      { code: ResourceLimitationCode.LEGAL_NONAUTHORITATIVE },
      { code: ResourceLimitationCode.UNVERIFIED_CURRENCY },
    ],
    capabilities: [
      ResourceCapability.SEARCH,
      ResourceCapability.FEATURE_QUERY,
      ResourceCapability.BBOX_QUERY,
      ResourceCapability.HISTORICAL_LOOKUP,
      ResourceCapability.PROVENANCE_LINKING,
    ],
    usage: {
      intendedUses: [
        ResourceUsage.DISCOVERY,
        ResourceUsage.GEOLOGICAL_CONTEXT,
        ResourceUsage.RESEARCH_ONLY,
      ],
    },
    standardsHints: ['OGC_API_RECORDS', 'GEOJSON'],
  }),
  validateResourceRecord({
    id: 'res-usgs-mrds',
    schemaVersion: RESOURCE_CATALOG_SCHEMA_VERSION,
    name: 'USGS Mineral Resources Data System family',
    type: ResourceType.FEATURE_COLLECTION,
    provider: { id: 'usgs', name: 'USGS', kind: 'AGENCY' },
    identifiers: { uri: 'https://mrdata.usgs.gov/', catalogIdentifier: 'MRDS' },
    authority: {
      originKind: ResourceOriginKind.AGENCY,
      sourceAuthorityClass: EvidenceAuthorityClass.SECONDARY_AUTHORITY,
    },
    temporal: { retrievalExpectation: 'BATCH' },
    spatial: {
      crs: 'EPSG:4326',
      positionalAccuracyMeters: 1000,
    },
    access: {
      mechanism: ResourceAccessMechanism.REST_API,
      authenticationRequired: 'UNKNOWN',
      accessStatus: 'PUBLIC',
    },
    licensing: { ...UNKNOWN_LICENSE, licenseId: 'USGS-public-domain-unverified-r1' },
    version: { versionId: 'metadata-r1', deprecated: false },
    relationships: [],
    limitations: [
      { code: ResourceLimitationCode.HISTORICAL_ONLY },
      { code: ResourceLimitationCode.INCOMPLETE_COVERAGE },
      { code: ResourceLimitationCode.TEMPORAL_LAG },
      { code: ResourceLimitationCode.NOT_PARCEL_SCALE },
      { code: ResourceLimitationCode.LEGAL_NONAUTHORITATIVE },
    ],
    capabilities: [
      ResourceCapability.SEARCH,
      ResourceCapability.FEATURE_QUERY,
      ResourceCapability.POINT_QUERY,
    ],
    usage: {
      intendedUses: [
        ResourceUsage.DISCOVERY,
        ResourceUsage.GEOLOGICAL_CONTEXT,
        ResourceUsage.RESEARCH_ONLY,
      ],
    },
  }),
  validateResourceRecord({
    id: 'res-usgs-3dep',
    schemaVersion: RESOURCE_CATALOG_SCHEMA_VERSION,
    name: 'USGS 3D Elevation Program',
    type: ResourceType.DEM,
    provider: { id: 'usgs', name: 'USGS', kind: 'AGENCY' },
    identifiers: { uri: 'https://www.usgs.gov/3d-elevation-program', catalogIdentifier: '3DEP' },
    authority: {
      originKind: ResourceOriginKind.AGENCY,
      sourceAuthorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
    },
    spatial: { crs: 'EPSG:4326', spatialResolutionMeters: 10 },
    access: {
      mechanism: ResourceAccessMechanism.TILE_SERVICE,
      authenticationRequired: 'UNKNOWN',
    },
    licensing: { ...UNKNOWN_LICENSE, licenseId: 'USGS-public-domain-unverified-r1' },
    version: { versionId: 'metadata-r1', deprecated: false },
    relationships: [],
    limitations: [
      { code: ResourceLimitationCode.INCOMPLETE_COVERAGE },
      { code: ResourceLimitationCode.LEGAL_NONAUTHORITATIVE },
    ],
    capabilities: [
      ResourceCapability.TILE_RENDER,
      ResourceCapability.BBOX_QUERY,
      ResourceCapability.DOWNLOAD,
    ],
    usage: {
      intendedUses: [ResourceUsage.ROUTE_DECISION_INPUT, ResourceUsage.GEOLOGICAL_CONTEXT],
    },
    standardsHints: ['GEOPARQUET'],
  }),
  validateResourceRecord({
    id: 'res-blm-mlrs',
    schemaVersion: RESOURCE_CATALOG_SCHEMA_VERSION,
    name: 'BLM Mineral & Land Records System family',
    type: ResourceType.API,
    provider: { id: 'blm', name: 'BLM', kind: 'AGENCY' },
    identifiers: { uri: 'https://www.blm.gov/services/land-records', catalogIdentifier: 'MLRS' },
    authority: {
      originKind: ResourceOriginKind.AGENCY,
      sourceAuthorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
    },
    access: {
      mechanism: ResourceAccessMechanism.REST_API,
      authenticationRequired: 'UNKNOWN',
      accessStatus: 'PUBLIC',
    },
    licensing: UNKNOWN_LICENSE,
    version: { versionId: 'metadata-r1', deprecated: false },
    relationships: [],
    limitations: [
      { code: ResourceLimitationCode.TEMPORAL_LAG },
      { code: ResourceLimitationCode.NOT_PARCEL_SCALE },
      { code: ResourceLimitationCode.LEGAL_NONAUTHORITATIVE },
      { code: ResourceLimitationCode.UNVERIFIED_CURRENCY },
    ],
    capabilities: [
      ResourceCapability.SEARCH,
      ResourceCapability.FEATURE_QUERY,
      ResourceCapability.VERSION_LOOKUP,
    ],
    usage: {
      intendedUses: [ResourceUsage.COLLECTION_DECISION_INPUT, ResourceUsage.DISCOVERY],
    },
  }),
  validateResourceRecord({
    id: 'res-nws-alerts',
    schemaVersion: RESOURCE_CATALOG_SCHEMA_VERSION,
    name: 'NWS alerts / weather family',
    type: ResourceType.API,
    provider: { id: 'nws', name: 'National Weather Service', kind: 'AGENCY' },
    identifiers: { uri: 'https://api.weather.gov/' },
    authority: {
      originKind: ResourceOriginKind.AGENCY,
      sourceAuthorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
    },
    access: {
      mechanism: ResourceAccessMechanism.REST_API,
      authenticationRequired: 'NOT_REQUIRED',
      rateLimit: 'unknown-provider-policy',
    },
    licensing: UNKNOWN_LICENSE,
    version: { versionId: 'metadata-r1', deprecated: false },
    relationships: [],
    limitations: [
      { code: ResourceLimitationCode.TEMPORAL_LAG },
      { code: ResourceLimitationCode.RATE_LIMITED },
      { code: ResourceLimitationCode.LEGAL_NONAUTHORITATIVE },
    ],
    capabilities: [
      ResourceCapability.FEATURE_QUERY,
      ResourceCapability.TEMPORAL_QUERY,
      ResourceCapability.BBOX_QUERY,
    ],
    usage: {
      intendedUses: [ResourceUsage.SAFETY_DECISION_INPUT, ResourceUsage.ROUTE_DECISION_INPUT],
    },
  }),
  validateResourceRecord({
    id: 'res-nasa-firms',
    schemaVersion: RESOURCE_CATALOG_SCHEMA_VERSION,
    name: 'NASA FIRMS active-fire family',
    type: ResourceType.STAC_CATALOG,
    provider: { id: 'nasa', name: 'NASA', kind: 'AGENCY' },
    identifiers: { uri: 'https://firms.modaps.eosdis.nasa.gov/', catalogIdentifier: 'FIRMS' },
    authority: {
      originKind: ResourceOriginKind.AGENCY,
      sourceAuthorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
    },
    spatial: { crs: 'EPSG:4326', spatialResolutionMeters: 375 },
    access: {
      mechanism: ResourceAccessMechanism.STAC,
      authenticationRequired: 'UNKNOWN',
    },
    licensing: UNKNOWN_LICENSE,
    version: { versionId: 'metadata-r1', deprecated: false },
    relationships: [],
    limitations: [
      { code: ResourceLimitationCode.COARSE_SCALE },
      { code: ResourceLimitationCode.TEMPORAL_LAG },
      { code: ResourceLimitationCode.MODEL_DERIVED },
      { code: ResourceLimitationCode.LEGAL_NONAUTHORITATIVE },
    ],
    capabilities: [
      ResourceCapability.FEATURE_QUERY,
      ResourceCapability.TEMPORAL_QUERY,
      ResourceCapability.SEARCH,
    ],
    usage: { intendedUses: [ResourceUsage.SAFETY_DECISION_INPUT] },
    standardsHints: ['STAC'],
  }),
  validateResourceRecord({
    id: 'res-regulation-document-example',
    schemaVersion: RESOURCE_CATALOG_SCHEMA_VERSION,
    name: 'Example collecting regulation document (metadata only)',
    type: ResourceType.REGULATION_DOCUMENT,
    provider: { id: 'example-agency', name: 'Example land agency', kind: 'AGENCY' },
    authority: {
      originKind: ResourceOriginKind.AGENCY,
      sourceAuthorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
    },
    access: {
      mechanism: ResourceAccessMechanism.MANUAL_DOCUMENT,
      authenticationRequired: 'UNKNOWN',
    },
    licensing: UNKNOWN_LICENSE,
    version: { versionId: 'metadata-r1', deprecated: false },
    relationships: [],
    limitations: [
      { code: ResourceLimitationCode.LEGAL_NONAUTHORITATIVE },
      { code: ResourceLimitationCode.UNVERIFIED_CURRENCY },
    ],
    capabilities: [ResourceCapability.SEARCH, ResourceCapability.DOWNLOAD],
    usage: {
      intendedUses: [ResourceUsage.COLLECTION_DECISION_INPUT, ResourceUsage.RESEARCH_ONLY],
    },
  }),
  validateResourceRecord({
    id: 'res-stac-imagery-example',
    schemaVersion: RESOURCE_CATALOG_SCHEMA_VERSION,
    name: 'Example STAC-like imagery catalog (metadata only)',
    type: ResourceType.STAC_CATALOG,
    provider: { id: 'example-imagery', name: 'Example imagery provider', kind: 'UNKNOWN' },
    authority: {
      originKind: ResourceOriginKind.UNKNOWN,
      sourceAuthorityClass: EvidenceAuthorityClass.UNKNOWN,
    },
    spatial: { crs: 'EPSG:4326', spatialResolutionMeters: 10 },
    access: {
      mechanism: ResourceAccessMechanism.STAC,
      authenticationRequired: 'UNKNOWN',
    },
    licensing: UNKNOWN_LICENSE,
    version: { versionId: 'metadata-r1', deprecated: false },
    relationships: [],
    limitations: [
      { code: ResourceLimitationCode.UNVERIFIED_CURRENCY },
      { code: ResourceLimitationCode.INCOMPLETE_COVERAGE },
    ],
    capabilities: [
      ResourceCapability.SEARCH,
      ResourceCapability.TILE_RENDER,
      ResourceCapability.TEMPORAL_QUERY,
    ],
    usage: { intendedUses: [ResourceUsage.DISCOVERY, ResourceUsage.RESEARCH_ONLY] },
    standardsHints: ['STAC', 'JSON_FG'],
  }),
  validateResourceRecord({
    id: 'res-local-field-observations',
    schemaVersion: RESOURCE_CATALOG_SCHEMA_VERSION,
    name: 'Local field / community observation dataset',
    type: ResourceType.USER_GENERATED_DATASET,
    provider: { id: 'rockhound-web', name: 'rockhound-web', kind: 'COMMUNITY' },
    authority: {
      originKind: ResourceOriginKind.USER,
      sourceAuthorityClass: EvidenceAuthorityClass.USER_OBSERVATION,
    },
    spatial: { crs: 'EPSG:4326', positionalAccuracyMeters: 15 },
    access: {
      mechanism: ResourceAccessMechanism.USER_GENERATED,
      authenticationRequired: 'UNKNOWN',
      offlineAvailability: 'AVAILABLE',
    },
    licensing: UNKNOWN_LICENSE,
    version: { versionId: 'local-r1', deprecated: false },
    relationships: [],
    limitations: [
      { code: ResourceLimitationCode.COMMUNITY_SOURCED },
      { code: ResourceLimitationCode.INCOMPLETE_COVERAGE },
      { code: ResourceLimitationCode.LEGAL_NONAUTHORITATIVE },
    ],
    capabilities: [
      ResourceCapability.POINT_QUERY,
      ResourceCapability.PROVENANCE_LINKING,
      ResourceCapability.OFFLINE_USE,
    ],
    usage: {
      intendedUses: [
        ResourceUsage.DISCOVERY,
        ResourceUsage.SPECIMEN_CONTEXT,
        ResourceUsage.GEOLOGICAL_CONTEXT,
      ],
    },
  }),
  validateResourceRecord({
    id: 'res-derived-terrain-analysis',
    schemaVersion: RESOURCE_CATALOG_SCHEMA_VERSION,
    name: 'Derived terrain-analysis product (metadata only)',
    type: ResourceType.DERIVED_PRODUCT,
    provider: { id: 'rockhound-derived', name: 'Rockhound derived products', kind: 'UNKNOWN' },
    authority: {
      originKind: ResourceOriginKind.MODEL,
      sourceAuthorityClass: EvidenceAuthorityClass.MODEL_DERIVED,
    },
    access: {
      mechanism: ResourceAccessMechanism.LOCAL_FILE,
      authenticationRequired: 'UNKNOWN',
    },
    licensing: UNKNOWN_LICENSE,
    version: { versionId: 'slope-aspect-1.0.0', deprecated: false },
    relationships: [
      { kind: ResourceRelationshipKind.DERIVED_FROM, targetResourceId: 'res-usgs-3dep' },
    ],
    limitations: [
      { code: ResourceLimitationCode.MODEL_DERIVED },
      { code: ResourceLimitationCode.LEGAL_NONAUTHORITATIVE },
    ],
    capabilities: [
      ResourceCapability.PROCESS_EXECUTION_METADATA,
      ResourceCapability.PROVENANCE_LINKING,
    ],
    usage: { intendedUses: [ResourceUsage.ROUTE_DECISION_INPUT, ResourceUsage.RESEARCH_ONLY] },
    derivation: {
      processId: 'terrain-analysis',
      processVersion: '1.0.0',
      inputResourceIds: ['res-usgs-3dep'],
      derivationMethod: 'slope-aspect-v1',
    },
  }),
];
