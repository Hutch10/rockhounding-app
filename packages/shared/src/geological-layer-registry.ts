/**
 * Geological Layer Registry R1
 *
 * Persistence-free catalog of geological/geospatial data-source definitions.
 * A registry entry describes what a layer/source is. It does not claim what
 * any specific evidence record asserts (that is UGES).
 *
 * Does not fetch, persist, render, reproject, or evaluate legal permission.
 */

import { z } from 'zod';

import {
  EvidenceAuthorityClass,
  EvidenceAuthorityClassSchema,
  EvidenceSourceDescriptorSchema,
  type EvidenceSourceDescriptor,
} from './universal-geological-evidence-schema';

export const GEOLOGICAL_LAYER_REGISTRY_SCHEMA_VERSION = 1;

const IsoDateTimeSchema = z.string().datetime({ offset: true });

export type LayerId = string;

export const LayerCategory = {
  GEOLOGY: 'GEOLOGY',
  MINERAL_OCCURRENCE: 'MINERAL_OCCURRENCE',
  MINE_PROSPECT_QUARRY: 'MINE_PROSPECT_QUARRY',
  FAULT_STRUCTURE: 'FAULT_STRUCTURE',
  TERRAIN_ELEVATION: 'TERRAIN_ELEVATION',
  HYDROLOGY: 'HYDROLOGY',
  LAND_OWNERSHIP: 'LAND_OWNERSHIP',
  LAND_MANAGEMENT: 'LAND_MANAGEMENT',
  MINERAL_ESTATE: 'MINERAL_ESTATE',
  MINING_CLAIM: 'MINING_CLAIM',
  COLLECTION_RULE: 'COLLECTION_RULE',
  CLOSURE: 'CLOSURE',
  ROAD_TRAIL_ACCESS: 'ROAD_TRAIL_ACCESS',
  WEATHER: 'WEATHER',
  FIRE: 'FIRE',
  IMAGERY: 'IMAGERY',
  HISTORICAL_MAP: 'HISTORICAL_MAP',
  FIELD_OBSERVATION: 'FIELD_OBSERVATION',
  SPECIMEN: 'SPECIMEN',
  DERIVED_ANALYSIS: 'DERIVED_ANALYSIS',
} as const;

export type LayerCategory = (typeof LayerCategory)[keyof typeof LayerCategory];

export const LayerCategorySchema = z.enum([
  'GEOLOGY',
  'MINERAL_OCCURRENCE',
  'MINE_PROSPECT_QUARRY',
  'FAULT_STRUCTURE',
  'TERRAIN_ELEVATION',
  'HYDROLOGY',
  'LAND_OWNERSHIP',
  'LAND_MANAGEMENT',
  'MINERAL_ESTATE',
  'MINING_CLAIM',
  'COLLECTION_RULE',
  'CLOSURE',
  'ROAD_TRAIL_ACCESS',
  'WEATHER',
  'FIRE',
  'IMAGERY',
  'HISTORICAL_MAP',
  'FIELD_OBSERVATION',
  'SPECIMEN',
  'DERIVED_ANALYSIS',
]);

export const LayerOriginKind = {
  AGENCY: 'AGENCY',
  SCIENTIFIC: 'SCIENTIFIC',
  COMMUNITY: 'COMMUNITY',
  USER: 'USER',
  MODEL: 'MODEL',
  UNKNOWN: 'UNKNOWN',
} as const;

export type LayerOriginKind = (typeof LayerOriginKind)[keyof typeof LayerOriginKind];

export const LayerOriginKindSchema = z.enum([
  'AGENCY',
  'SCIENTIFIC',
  'COMMUNITY',
  'USER',
  'MODEL',
  'UNKNOWN',
]);

export const LayerCapability = {
  FEATURE_QUERY: 'FEATURE_QUERY',
  BBOX_QUERY: 'BBOX_QUERY',
  TEMPORAL_QUERY: 'TEMPORAL_QUERY',
  POINT_QUERY: 'POINT_QUERY',
  TILE_RENDER: 'TILE_RENDER',
  OFFLINE_CACHE: 'OFFLINE_CACHE',
  HISTORICAL_LOOKUP: 'HISTORICAL_LOOKUP',
  CHANGE_DETECTION: 'CHANGE_DETECTION',
  SOURCE_VERSIONING: 'SOURCE_VERSIONING',
  PROVENANCE_LINKING: 'PROVENANCE_LINKING',
} as const;

export type LayerCapability = (typeof LayerCapability)[keyof typeof LayerCapability];

export const LayerCapabilitySchema = z.enum([
  'FEATURE_QUERY',
  'BBOX_QUERY',
  'TEMPORAL_QUERY',
  'POINT_QUERY',
  'TILE_RENDER',
  'OFFLINE_CACHE',
  'HISTORICAL_LOOKUP',
  'CHANGE_DETECTION',
  'SOURCE_VERSIONING',
  'PROVENANCE_LINKING',
]);

export const LayerUsage = {
  DISCOVERY: 'DISCOVERY',
  GEOLOGICAL_CONTEXT: 'GEOLOGICAL_CONTEXT',
  COLLECTION_DECISION_INPUT: 'COLLECTION_DECISION_INPUT',
  SAFETY_DECISION_INPUT: 'SAFETY_DECISION_INPUT',
  ROUTE_DECISION_INPUT: 'ROUTE_DECISION_INPUT',
  SPECIMEN_CONTEXT: 'SPECIMEN_CONTEXT',
  RESEARCH_ONLY: 'RESEARCH_ONLY',
} as const;

export type LayerUsage = (typeof LayerUsage)[keyof typeof LayerUsage];

export const LayerUsageSchema = z.enum([
  'DISCOVERY',
  'GEOLOGICAL_CONTEXT',
  'COLLECTION_DECISION_INPUT',
  'SAFETY_DECISION_INPUT',
  'ROUTE_DECISION_INPUT',
  'SPECIMEN_CONTEXT',
  'RESEARCH_ONLY',
]);

export const LayerRetrievalMode = {
  STATIC_FILE: 'STATIC_FILE',
  REST_API: 'REST_API',
  OGC_API: 'OGC_API',
  WMS: 'WMS',
  WFS: 'WFS',
  STAC: 'STAC',
  TILE_SERVICE: 'TILE_SERVICE',
  MANUAL_DOCUMENT: 'MANUAL_DOCUMENT',
  LOCAL_DATASET: 'LOCAL_DATASET',
  USER_GENERATED: 'USER_GENERATED',
} as const;

export type LayerRetrievalMode = (typeof LayerRetrievalMode)[keyof typeof LayerRetrievalMode];

export const LayerRetrievalModeSchema = z.enum([
  'STATIC_FILE',
  'REST_API',
  'OGC_API',
  'WMS',
  'WFS',
  'STAC',
  'TILE_SERVICE',
  'MANUAL_DOCUMENT',
  'LOCAL_DATASET',
  'USER_GENERATED',
]);

export const LayerFreshnessClass = {
  LONG_LIVED: 'LONG_LIVED',
  MODERATE: 'MODERATE',
  REVALIDATE_BEFORE_USE: 'REVALIDATE_BEFORE_USE',
  SHORT_LIVED: 'SHORT_LIVED',
  VERY_SHORT_LIVED: 'VERY_SHORT_LIVED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type LayerFreshnessClass = (typeof LayerFreshnessClass)[keyof typeof LayerFreshnessClass];

export const LayerFreshnessClassSchema = z.enum([
  'LONG_LIVED',
  'MODERATE',
  'REVALIDATE_BEFORE_USE',
  'SHORT_LIVED',
  'VERY_SHORT_LIVED',
  'UNKNOWN',
]);

export const LayerFreshnessExpiryEffect = {
  REVALIDATION_REQUIRED: 'REVALIDATION_REQUIRED',
  STALE: 'STALE',
} as const;

export type LayerFreshnessExpiryEffect =
  (typeof LayerFreshnessExpiryEffect)[keyof typeof LayerFreshnessExpiryEffect];

export const LayerFreshnessExpiryEffectSchema = z.enum(['REVALIDATION_REQUIRED', 'STALE']);

export const LayerLimitationCode = {
  COARSE_SCALE: 'COARSE_SCALE',
  INCOMPLETE_GEOGRAPHIC_COVERAGE: 'INCOMPLETE_GEOGRAPHIC_COVERAGE',
  REPORTING_DELAY: 'REPORTING_DELAY',
  PROVIDER_LATENCY: 'PROVIDER_LATENCY',
  HISTORICAL_ONLY: 'HISTORICAL_ONLY',
  INFERENCE_MODEL_OUTPUT: 'INFERENCE_MODEL_OUTPUT',
  COMMUNITY_SOURCED: 'COMMUNITY_SOURCED',
  NON_AUTHORITATIVE_FOR_LEGAL_DECISIONS: 'NON_AUTHORITATIVE_FOR_LEGAL_DECISIONS',
  NOT_SUITABLE_FOR_PARCEL_SCALE: 'NOT_SUITABLE_FOR_PARCEL_SCALE',
} as const;

export type LayerLimitationCode = (typeof LayerLimitationCode)[keyof typeof LayerLimitationCode];

export const LayerLimitationCodeSchema = z.enum([
  'COARSE_SCALE',
  'INCOMPLETE_GEOGRAPHIC_COVERAGE',
  'REPORTING_DELAY',
  'PROVIDER_LATENCY',
  'HISTORICAL_ONLY',
  'INFERENCE_MODEL_OUTPUT',
  'COMMUNITY_SOURCED',
  'NON_AUTHORITATIVE_FOR_LEGAL_DECISIONS',
  'NOT_SUITABLE_FOR_PARCEL_SCALE',
]);

export const LayerLegalUnknownSchema = z.enum(['ALLOWED', 'RESTRICTED', 'UNKNOWN']);
export const LayerAttributionPolicySchema = z.enum(['REQUIRED', 'NOT_REQUIRED', 'UNKNOWN']);

export const LayerLimitationSchema = z.object({
  code: LayerLimitationCodeSchema,
  description: z.string().min(1).max(1000).optional(),
});

export type LayerLimitation = z.infer<typeof LayerLimitationSchema>;

export const LayerSourceSchema = z.object({
  provider: z.string().min(1).max(256),
  sourceFamily: z.string().min(1).max(128),
  datasetName: z.string().min(1).max(256).optional(),
  canonicalUri: z.string().url().optional(),
  notes: z.string().min(1).max(2000).optional(),
});

export type LayerSource = z.infer<typeof LayerSourceSchema>;

export const LayerAuthorityProfileSchema = z.object({
  originKind: LayerOriginKindSchema,
  sourceAuthorityClass: EvidenceAuthorityClassSchema,
});

export type LayerAuthorityProfile = z.infer<typeof LayerAuthorityProfileSchema>;

export const LayerTemporalProfileSchema = z.object({
  publishedAt: IsoDateTimeSchema.optional(),
  updatedAt: IsoDateTimeSchema.optional(),
  observedOrAcquiredAt: IsoDateTimeSchema.optional(),
  coverageFrom: IsoDateTimeSchema.optional(),
  coverageTo: IsoDateTimeSchema.optional(),
  coverageMode: z.enum(['CURRENT', 'HISTORICAL', 'BOTH']),
  statedVintage: z.string().min(1).max(64).optional(),
  retrievalExpectation: z.enum(['ON_DEMAND', 'BATCH', 'USER_SYNC', 'UNKNOWN']).optional(),
});

export type LayerTemporalProfile = z.infer<typeof LayerTemporalProfileSchema>;

export const LayerSpatialProfileSchema = z.object({
  crs: z.string().min(1).max(64),
  geometrySupport: z.enum(['POINT', 'LINE', 'POLYGON', 'RASTER', 'MIXED']),
  extent: z
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
  coverageLimitation: z.string().min(1).max(1000).optional(),
});

export type LayerSpatialProfile = z.infer<typeof LayerSpatialProfileSchema>;

export const LayerAccessProfileSchema = z.object({
  retrievalMode: LayerRetrievalModeSchema,
  endpointHint: z.string().min(1).max(2048).optional(),
});

export type LayerAccessProfile = z.infer<typeof LayerAccessProfileSchema>;

export const LayerUsageProfileSchema = z.object({
  intendedUses: z.array(LayerUsageSchema).min(1).max(16),
});

export type LayerUsageProfile = z.infer<typeof LayerUsageProfileSchema>;

export const LayerFreshnessPolicySchema = z.object({
  class: LayerFreshnessClassSchema,
  maxAgeHours: z.number().positive().optional(),
  onExpiry: LayerFreshnessExpiryEffectSchema,
});

export type LayerFreshnessPolicy = z.infer<typeof LayerFreshnessPolicySchema>;

export const LayerDerivationSchema = z.object({
  processId: z.string().min(1).max(128),
  processVersion: z.string().min(1).max(64),
  inputLayerIds: z.array(z.string().min(1).max(128)).max(128),
  derivationMethod: z.string().min(1).max(256),
  metadataRef: z.string().min(1).max(512).optional(),
});

export type LayerDerivation = z.infer<typeof LayerDerivationSchema>;

export const LayerLicensingSchema = z.object({
  licenseId: z.string().min(1).max(256).optional(),
  licenseTextRef: z.string().min(1).max(2048).optional(),
  attributionRequired: LayerAttributionPolicySchema,
  redistribution: LayerLegalUnknownSchema,
  offlineCaching: LayerLegalUnknownSchema,
  derivativeUse: LayerLegalUnknownSchema,
});

export type LayerLicensing = z.infer<typeof LayerLicensingSchema>;

const UniqueIdListSchema = z
  .array(z.string().min(1).max(128))
  .max(128)
  .superRefine((ids, ctx) => {
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'inputLayerIds must be unique',
      });
    }
  });

const AUTHORITATIVE_SOURCE_CLASSES: ReadonlySet<string> = new Set([
  EvidenceAuthorityClass.PRIMARY_AUTHORITY,
  EvidenceAuthorityClass.SECONDARY_AUTHORITY,
]);

function isCommunityOrUserLayer(definition: {
  category: LayerCategory;
  authority: LayerAuthorityProfile;
  access: LayerAccessProfile;
}): boolean {
  return (
    definition.category === LayerCategory.FIELD_OBSERVATION ||
    definition.authority.originKind === LayerOriginKind.COMMUNITY ||
    definition.authority.originKind === LayerOriginKind.USER ||
    definition.access.retrievalMode === LayerRetrievalMode.USER_GENERATED
  );
}

export const GeologicalLayerDefinitionSchema = z
  .object({
    id: z.string().min(1).max(128),
    schemaVersion: z.literal(GEOLOGICAL_LAYER_REGISTRY_SCHEMA_VERSION),
    name: z.string().min(1).max(256),
    provider: z.string().min(1).max(256),
    category: LayerCategorySchema,
    source: LayerSourceSchema,
    authority: LayerAuthorityProfileSchema,
    temporal: LayerTemporalProfileSchema,
    spatial: LayerSpatialProfileSchema,
    access: LayerAccessProfileSchema,
    usage: LayerUsageProfileSchema,
    freshness: LayerFreshnessPolicySchema,
    capabilities: z.array(LayerCapabilitySchema).min(1).max(16),
    limitations: z.array(LayerLimitationSchema).min(1).max(32),
    licensing: LayerLicensingSchema,
    derivation: LayerDerivationSchema.extend({
      inputLayerIds: UniqueIdListSchema,
    }).optional(),
    resourceRecordIds: UniqueIdListSchema.optional(),
  })
  .superRefine((definition, ctx) => {
    const coverageFrom = definition.temporal.coverageFrom;
    const coverageTo = definition.temporal.coverageTo;
    if (
      coverageFrom !== undefined &&
      coverageTo !== undefined &&
      Date.parse(coverageFrom) > Date.parse(coverageTo)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'temporal.coverageFrom must be less than or equal to coverageTo',
        path: ['temporal', 'coverageTo'],
      });
    }

    const extent = definition.spatial.extent;
    if (extent !== undefined) {
      const south = extent[1];
      const north = extent[3];
      if (south > north) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'spatial.extent south must be less than or equal to north',
          path: ['spatial', 'extent'],
        });
      }
    }

    if (
      definition.category === LayerCategory.DERIVED_ANALYSIS &&
      definition.derivation === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DERIVED_ANALYSIS requires derivation metadata',
        path: ['derivation'],
      });
    }

    if (
      isCommunityOrUserLayer(definition) &&
      AUTHORITATIVE_SOURCE_CLASSES.has(definition.authority.sourceAuthorityClass)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Community/user layers cannot claim PRIMARY or SECONDARY source authority',
        path: ['authority', 'sourceAuthorityClass'],
      });
    }
  });

export type GeologicalLayerDefinition = z.infer<typeof GeologicalLayerDefinitionSchema>;

export function validateLayerDefinition(input: unknown): GeologicalLayerDefinition {
  return GeologicalLayerDefinitionSchema.parse(input);
}

function cloneDefinition(definition: GeologicalLayerDefinition): GeologicalLayerDefinition {
  return structuredClone(definition);
}

function sortedClone(
  definitions: readonly GeologicalLayerDefinition[]
): GeologicalLayerDefinition[] {
  return [...definitions]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(cloneDefinition);
}

export type GeologicalLayerRegistry = {
  readonly schemaVersion: typeof GEOLOGICAL_LAYER_REGISTRY_SCHEMA_VERSION;
  getLayerDefinition: (id: LayerId) => GeologicalLayerDefinition | undefined;
  listLayerDefinitions: () => GeologicalLayerDefinition[];
  listLayersByCategory: (category: LayerCategory) => GeologicalLayerDefinition[];
  listLayersByCapability: (capability: LayerCapability) => GeologicalLayerDefinition[];
  listLayersByUsage: (usage: LayerUsage) => GeologicalLayerDefinition[];
};

export function createGeologicalLayerRegistry(
  definitions: readonly GeologicalLayerDefinition[]
): GeologicalLayerRegistry {
  const parsed = definitions.map((definition) => validateLayerDefinition(definition));
  const ids = parsed.map((definition) => definition.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Duplicate layer IDs are not allowed');
  }

  const byId = new Map(
    parsed.map((definition) => [definition.id, cloneDefinition(definition)] as const)
  );

  return {
    schemaVersion: GEOLOGICAL_LAYER_REGISTRY_SCHEMA_VERSION,
    getLayerDefinition(id: LayerId): GeologicalLayerDefinition | undefined {
      const found = byId.get(id);
      if (found === undefined) {
        return undefined;
      }
      return cloneDefinition(found);
    },
    listLayerDefinitions(): GeologicalLayerDefinition[] {
      return sortedClone([...byId.values()]);
    },
    listLayersByCategory(category: LayerCategory): GeologicalLayerDefinition[] {
      return sortedClone(
        [...byId.values()].filter((definition) => definition.category === category)
      );
    },
    listLayersByCapability(capability: LayerCapability): GeologicalLayerDefinition[] {
      return sortedClone(
        [...byId.values()].filter((definition) => definition.capabilities.includes(capability))
      );
    },
    listLayersByUsage(usage: LayerUsage): GeologicalLayerDefinition[] {
      return sortedClone(
        [...byId.values()].filter((definition) => definition.usage.intendedUses.includes(usage))
      );
    },
  };
}

export function listLayerDefinitions(
  registry: GeologicalLayerRegistry
): GeologicalLayerDefinition[] {
  return registry.listLayerDefinitions();
}

export function listLayersByCategory(
  registry: GeologicalLayerRegistry,
  category: LayerCategory
): GeologicalLayerDefinition[] {
  return registry.listLayersByCategory(category);
}

export function listLayersByCapability(
  registry: GeologicalLayerRegistry,
  capability: LayerCapability
): GeologicalLayerDefinition[] {
  return registry.listLayersByCapability(capability);
}

export function listLayersByUsage(
  registry: GeologicalLayerRegistry,
  usage: LayerUsage
): GeologicalLayerDefinition[] {
  return registry.listLayersByUsage(usage);
}

export function listResourceIdsForLayer(layer: GeologicalLayerDefinition): string[] {
  return [...(layer.resourceRecordIds ?? [])];
}

export function evaluateFreshnessExpiryEffect(
  layer: GeologicalLayerDefinition
): LayerFreshnessExpiryEffect {
  return layer.freshness.onExpiry;
}

/**
 * Collection permission is never implied by registry usage metadata.
 * COLLECTION_DECISION_INPUT means the layer may inform a later decision system.
 */
export function layerAuthorizesCollection(_layer: GeologicalLayerDefinition): boolean {
  return false;
}

export function projectLayerToUgesSource(
  layer: GeologicalLayerDefinition
): EvidenceSourceDescriptor {
  const ttlHours = layer.freshness.maxAgeHours;
  const statedVintage = layer.temporal.statedVintage;
  return EvidenceSourceDescriptorSchema.parse({
    id: layer.id,
    name: layer.name,
    provider: layer.provider,
    authorityClass: layer.authority.sourceAuthorityClass,
    sourceType: layer.category,
    license: layer.licensing.licenseId,
    canonicalUri: layer.source.canonicalUri,
    retrievalPolicy: layer.access.retrievalMode,
    freshness:
      ttlHours !== undefined || statedVintage !== undefined
        ? {
            ttlHours,
            statedVintage,
          }
        : undefined,
  });
}

const USGS_PUBLIC_DOMAIN_UNKNOWN: LayerLicensing = {
  licenseId: 'USGS-public-domain-unverified-r1',
  attributionRequired: 'UNKNOWN',
  redistribution: 'UNKNOWN',
  offlineCaching: 'UNKNOWN',
  derivativeUse: 'UNKNOWN',
};

export const BUILTIN_GEOLOGICAL_LAYER_DEFINITIONS: readonly GeologicalLayerDefinition[] = [
  validateLayerDefinition({
    id: 'usgs-ngmdb-geologic-maps',
    schemaVersion: GEOLOGICAL_LAYER_REGISTRY_SCHEMA_VERSION,
    name: 'USGS National Geologic Map Database (geologic maps)',
    provider: 'USGS',
    category: LayerCategory.GEOLOGY,
    source: {
      provider: 'USGS',
      sourceFamily: 'NGMDB',
      datasetName: 'National Geologic Map Database',
      canonicalUri: 'https://ngmdb.usgs.gov/',
    },
    authority: {
      originKind: LayerOriginKind.AGENCY,
      sourceAuthorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
    },
    temporal: {
      coverageMode: 'BOTH',
      coverageFrom: '1879-01-01T00:00:00.000Z',
      retrievalExpectation: 'BATCH',
      statedVintage: 'map-dependent',
    },
    spatial: {
      crs: 'EPSG:4326',
      geometrySupport: 'POLYGON',
      nominalScaleDenominator: 24000,
      coverageLimitation: 'Coverage and compilation vintage vary by quadrangle',
    },
    access: {
      retrievalMode: LayerRetrievalMode.STATIC_FILE,
    },
    usage: {
      intendedUses: [LayerUsage.DISCOVERY, LayerUsage.GEOLOGICAL_CONTEXT, LayerUsage.RESEARCH_ONLY],
    },
    freshness: {
      class: LayerFreshnessClass.LONG_LIVED,
      onExpiry: LayerFreshnessExpiryEffect.STALE,
    },
    capabilities: [
      LayerCapability.FEATURE_QUERY,
      LayerCapability.BBOX_QUERY,
      LayerCapability.HISTORICAL_LOOKUP,
      LayerCapability.PROVENANCE_LINKING,
    ],
    limitations: [
      { code: LayerLimitationCode.COARSE_SCALE, description: 'Many maps are 1:24,000 or coarser' },
      { code: LayerLimitationCode.INCOMPLETE_GEOGRAPHIC_COVERAGE },
      { code: LayerLimitationCode.NOT_SUITABLE_FOR_PARCEL_SCALE },
      { code: LayerLimitationCode.NON_AUTHORITATIVE_FOR_LEGAL_DECISIONS },
    ],
    licensing: USGS_PUBLIC_DOMAIN_UNKNOWN,
    resourceRecordIds: ['res-usgs-ngmdb'],
  }),
  validateLayerDefinition({
    id: 'usgs-mrds-mineral-occurrence',
    schemaVersion: GEOLOGICAL_LAYER_REGISTRY_SCHEMA_VERSION,
    name: 'USGS mineral-occurrence source family (MRDS-equivalent)',
    provider: 'USGS',
    category: LayerCategory.MINERAL_OCCURRENCE,
    source: {
      provider: 'USGS',
      sourceFamily: 'MRDS',
      datasetName: 'Mineral Resources Data System family',
      canonicalUri: 'https://mrdata.usgs.gov/',
    },
    authority: {
      originKind: LayerOriginKind.AGENCY,
      sourceAuthorityClass: EvidenceAuthorityClass.SECONDARY_AUTHORITY,
    },
    temporal: {
      coverageMode: 'HISTORICAL',
      retrievalExpectation: 'BATCH',
      statedVintage: 'compilation-dependent',
    },
    spatial: {
      crs: 'EPSG:4326',
      geometrySupport: 'POINT',
      positionalAccuracyMeters: 1000,
    },
    access: {
      retrievalMode: LayerRetrievalMode.REST_API,
    },
    usage: {
      intendedUses: [LayerUsage.DISCOVERY, LayerUsage.GEOLOGICAL_CONTEXT, LayerUsage.RESEARCH_ONLY],
    },
    freshness: {
      class: LayerFreshnessClass.LONG_LIVED,
      onExpiry: LayerFreshnessExpiryEffect.STALE,
    },
    capabilities: [
      LayerCapability.FEATURE_QUERY,
      LayerCapability.POINT_QUERY,
      LayerCapability.BBOX_QUERY,
    ],
    limitations: [
      { code: LayerLimitationCode.HISTORICAL_ONLY },
      { code: LayerLimitationCode.INCOMPLETE_GEOGRAPHIC_COVERAGE },
      { code: LayerLimitationCode.REPORTING_DELAY },
      { code: LayerLimitationCode.NOT_SUITABLE_FOR_PARCEL_SCALE },
      { code: LayerLimitationCode.NON_AUTHORITATIVE_FOR_LEGAL_DECISIONS },
    ],
    licensing: USGS_PUBLIC_DOMAIN_UNKNOWN,
    resourceRecordIds: ['res-usgs-mrds'],
  }),
  validateLayerDefinition({
    id: 'usgs-3dep-elevation',
    schemaVersion: GEOLOGICAL_LAYER_REGISTRY_SCHEMA_VERSION,
    name: 'USGS 3D Elevation Program (3DEP)',
    provider: 'USGS',
    category: LayerCategory.TERRAIN_ELEVATION,
    source: {
      provider: 'USGS',
      sourceFamily: '3DEP',
      datasetName: '3D Elevation Program',
      canonicalUri: 'https://www.usgs.gov/3d-elevation-program',
    },
    authority: {
      originKind: LayerOriginKind.AGENCY,
      sourceAuthorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
    },
    temporal: {
      coverageMode: 'CURRENT',
      retrievalExpectation: 'ON_DEMAND',
    },
    spatial: {
      crs: 'EPSG:4326',
      geometrySupport: 'RASTER',
      spatialResolutionMeters: 10,
    },
    access: {
      retrievalMode: LayerRetrievalMode.TILE_SERVICE,
    },
    usage: {
      intendedUses: [LayerUsage.ROUTE_DECISION_INPUT, LayerUsage.GEOLOGICAL_CONTEXT],
    },
    freshness: {
      class: LayerFreshnessClass.LONG_LIVED,
      onExpiry: LayerFreshnessExpiryEffect.STALE,
    },
    capabilities: [
      LayerCapability.TILE_RENDER,
      LayerCapability.BBOX_QUERY,
      LayerCapability.OFFLINE_CACHE,
    ],
    limitations: [
      {
        code: LayerLimitationCode.INCOMPLETE_GEOGRAPHIC_COVERAGE,
        description: 'Resolution varies by area',
      },
      { code: LayerLimitationCode.NON_AUTHORITATIVE_FOR_LEGAL_DECISIONS },
    ],
    licensing: USGS_PUBLIC_DOMAIN_UNKNOWN,
    resourceRecordIds: ['res-usgs-3dep'],
  }),
  validateLayerDefinition({
    id: 'blm-mlrs-mining-claims',
    schemaVersion: GEOLOGICAL_LAYER_REGISTRY_SCHEMA_VERSION,
    name: 'BLM Mineral & Land Records System (claims/land records family)',
    provider: 'BLM',
    category: LayerCategory.MINING_CLAIM,
    source: {
      provider: 'BLM',
      sourceFamily: 'MLRS',
      datasetName: 'Mineral & Land Records System',
      canonicalUri: 'https://www.blm.gov/services/land-records',
    },
    authority: {
      originKind: LayerOriginKind.AGENCY,
      sourceAuthorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
    },
    temporal: {
      coverageMode: 'CURRENT',
      retrievalExpectation: 'ON_DEMAND',
    },
    spatial: {
      crs: 'EPSG:4326',
      geometrySupport: 'POLYGON',
    },
    access: {
      retrievalMode: LayerRetrievalMode.REST_API,
    },
    usage: {
      intendedUses: [LayerUsage.COLLECTION_DECISION_INPUT, LayerUsage.DISCOVERY],
    },
    freshness: {
      class: LayerFreshnessClass.REVALIDATE_BEFORE_USE,
      maxAgeHours: 168,
      onExpiry: LayerFreshnessExpiryEffect.REVALIDATION_REQUIRED,
    },
    capabilities: [
      LayerCapability.FEATURE_QUERY,
      LayerCapability.BBOX_QUERY,
      LayerCapability.SOURCE_VERSIONING,
    ],
    limitations: [
      { code: LayerLimitationCode.REPORTING_DELAY },
      { code: LayerLimitationCode.PROVIDER_LATENCY },
      { code: LayerLimitationCode.NOT_SUITABLE_FOR_PARCEL_SCALE },
      {
        code: LayerLimitationCode.NON_AUTHORITATIVE_FOR_LEGAL_DECISIONS,
        description: 'Does not authorize collection; downstream legal evaluation is required',
      },
    ],
    licensing: {
      attributionRequired: 'UNKNOWN',
      redistribution: 'UNKNOWN',
      offlineCaching: 'UNKNOWN',
      derivativeUse: 'UNKNOWN',
    },
    resourceRecordIds: ['res-blm-mlrs'],
  }),
  validateLayerDefinition({
    id: 'nws-alerts-weather',
    schemaVersion: GEOLOGICAL_LAYER_REGISTRY_SCHEMA_VERSION,
    name: 'NWS alerts / weather family',
    provider: 'NWS',
    category: LayerCategory.WEATHER,
    source: {
      provider: 'National Weather Service',
      sourceFamily: 'NWS-ALERTS',
      canonicalUri: 'https://api.weather.gov/',
    },
    authority: {
      originKind: LayerOriginKind.AGENCY,
      sourceAuthorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
    },
    temporal: {
      coverageMode: 'CURRENT',
      retrievalExpectation: 'ON_DEMAND',
    },
    spatial: {
      crs: 'EPSG:4326',
      geometrySupport: 'POLYGON',
    },
    access: {
      retrievalMode: LayerRetrievalMode.REST_API,
    },
    usage: {
      intendedUses: [LayerUsage.SAFETY_DECISION_INPUT, LayerUsage.ROUTE_DECISION_INPUT],
    },
    freshness: {
      class: LayerFreshnessClass.VERY_SHORT_LIVED,
      maxAgeHours: 6,
      onExpiry: LayerFreshnessExpiryEffect.REVALIDATION_REQUIRED,
    },
    capabilities: [
      LayerCapability.FEATURE_QUERY,
      LayerCapability.TEMPORAL_QUERY,
      LayerCapability.BBOX_QUERY,
    ],
    limitations: [
      { code: LayerLimitationCode.PROVIDER_LATENCY },
      { code: LayerLimitationCode.REPORTING_DELAY },
      { code: LayerLimitationCode.NON_AUTHORITATIVE_FOR_LEGAL_DECISIONS },
    ],
    licensing: {
      attributionRequired: 'UNKNOWN',
      redistribution: 'UNKNOWN',
      offlineCaching: 'UNKNOWN',
      derivativeUse: 'UNKNOWN',
    },
    resourceRecordIds: ['res-nws-alerts'],
  }),
  validateLayerDefinition({
    id: 'nasa-firms-fire',
    schemaVersion: GEOLOGICAL_LAYER_REGISTRY_SCHEMA_VERSION,
    name: 'NASA FIRMS active-fire family',
    provider: 'NASA',
    category: LayerCategory.FIRE,
    source: {
      provider: 'NASA',
      sourceFamily: 'FIRMS',
      datasetName: 'Fire Information for Resource Management System',
      canonicalUri: 'https://firms.modaps.eosdis.nasa.gov/',
    },
    authority: {
      originKind: LayerOriginKind.AGENCY,
      sourceAuthorityClass: EvidenceAuthorityClass.PRIMARY_AUTHORITY,
    },
    temporal: {
      coverageMode: 'CURRENT',
      retrievalExpectation: 'ON_DEMAND',
    },
    spatial: {
      crs: 'EPSG:4326',
      geometrySupport: 'POINT',
      spatialResolutionMeters: 375,
    },
    access: {
      retrievalMode: LayerRetrievalMode.STAC,
    },
    usage: {
      intendedUses: [LayerUsage.SAFETY_DECISION_INPUT],
    },
    freshness: {
      class: LayerFreshnessClass.VERY_SHORT_LIVED,
      maxAgeHours: 6,
      onExpiry: LayerFreshnessExpiryEffect.REVALIDATION_REQUIRED,
    },
    capabilities: [
      LayerCapability.FEATURE_QUERY,
      LayerCapability.TEMPORAL_QUERY,
      LayerCapability.BBOX_QUERY,
    ],
    limitations: [
      { code: LayerLimitationCode.COARSE_SCALE },
      { code: LayerLimitationCode.REPORTING_DELAY },
      {
        code: LayerLimitationCode.INFERENCE_MODEL_OUTPUT,
        description: 'Detection products, not ground-truth perimeters',
      },
      { code: LayerLimitationCode.NON_AUTHORITATIVE_FOR_LEGAL_DECISIONS },
    ],
    licensing: {
      attributionRequired: 'UNKNOWN',
      redistribution: 'UNKNOWN',
      offlineCaching: 'UNKNOWN',
      derivativeUse: 'UNKNOWN',
    },
    resourceRecordIds: ['res-nasa-firms'],
  }),
  validateLayerDefinition({
    id: 'rockhound-field-observations',
    schemaVersion: GEOLOGICAL_LAYER_REGISTRY_SCHEMA_VERSION,
    name: 'Rockhound field / community observations',
    provider: 'rockhound-web',
    category: LayerCategory.FIELD_OBSERVATION,
    source: {
      provider: 'rockhound-web',
      sourceFamily: 'FIELD_APP',
      datasetName: 'User and community field observations',
    },
    authority: {
      originKind: LayerOriginKind.USER,
      sourceAuthorityClass: EvidenceAuthorityClass.USER_OBSERVATION,
    },
    temporal: {
      coverageMode: 'CURRENT',
      retrievalExpectation: 'USER_SYNC',
    },
    spatial: {
      crs: 'EPSG:4326',
      geometrySupport: 'POINT',
      positionalAccuracyMeters: 15,
    },
    access: {
      retrievalMode: LayerRetrievalMode.USER_GENERATED,
    },
    usage: {
      intendedUses: [
        LayerUsage.DISCOVERY,
        LayerUsage.SPECIMEN_CONTEXT,
        LayerUsage.GEOLOGICAL_CONTEXT,
      ],
    },
    freshness: {
      class: LayerFreshnessClass.MODERATE,
      onExpiry: LayerFreshnessExpiryEffect.STALE,
    },
    capabilities: [
      LayerCapability.POINT_QUERY,
      LayerCapability.PROVENANCE_LINKING,
      LayerCapability.OFFLINE_CACHE,
    ],
    limitations: [
      { code: LayerLimitationCode.COMMUNITY_SOURCED },
      { code: LayerLimitationCode.INCOMPLETE_GEOGRAPHIC_COVERAGE },
      { code: LayerLimitationCode.NON_AUTHORITATIVE_FOR_LEGAL_DECISIONS },
    ],
    licensing: {
      attributionRequired: 'UNKNOWN',
      redistribution: 'UNKNOWN',
      offlineCaching: 'UNKNOWN',
      derivativeUse: 'UNKNOWN',
    },
    resourceRecordIds: ['res-local-field-observations'],
  }),
];
