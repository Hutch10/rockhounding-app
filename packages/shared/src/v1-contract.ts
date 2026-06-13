import { z } from 'zod';

/**
 * =====================================================
 * CORE DOMAIN ENUMS
 * =====================================================
 */

export const AccessStatusSchema = z.enum([
  'allowed',
  'caution',
  'restricted',
  'prohibited',
  'unknown',
]);
export type AccessStatus = z.infer<typeof AccessStatusSchema>;

export const AdvisoryLevelSchema = z.enum(['safe', 'caution', 'warning', 'critical']);
export type AdvisoryLevel = z.infer<typeof AdvisoryLevelSchema>;

export const SyncOperationStatusSchema = z.enum(['pending', 'accepted', 'applied', 'failed']);
export type SyncOperationStatus = z.infer<typeof SyncOperationStatusSchema>;

/**
 * =====================================================
 * COMMON STRUCTURES
 * =====================================================
 */

export const ConfidenceBreakdownSchema = z.object({
  total: z.number().min(0).max(1),
  metrics: z.record(z.string(), z.number()),
  source: z.string().optional(),
  breakdown: z
    .object({
      visual: z.number().optional(),
      expert: z.number().optional(),
      machine: z.number().optional(),
      consensus: z.number().optional(),
    })
    .optional(),
});
export type ConfidenceBreakdown = z.infer<typeof ConfidenceBreakdownSchema>;

export const ExactLocationSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  alt: z.number().optional(),
  acc: z.number().optional(),
});

export const FuzzyLocationSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  precision: z.literal('~1km'),
});

/**
 * =====================================================
 * ENTITY SCHEMAS (V1)
 * =====================================================
 */

export const ProfileV1Schema = z.object({
  id: z.string().uuid(),
  username: z.string().nullable(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  reputation_score: z.number(),
  trust_level: z.number(),
  is_admin: z.boolean(),
  preferences: z.record(z.string(), z.any()),
  created_at: z.string().datetime(),
});

export const RegionV1Schema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  region_type: z.string(),
  boundary: z.any(),
  metadata: z.record(z.string(), z.any()),
});

export const LandParcelV1Schema = z.object({
  id: z.string().uuid(),
  parcel_id: z.string().nullable(),
  owner_name: z.string().nullable(),
  owner_type: z.string().nullable(),
  managing_agency: z.string().nullable(),
  geom: z.any(),
  metadata: z.record(z.string(), z.any()),
});

export const AccessRuleV1Schema = z.object({
  id: z.string().uuid(),
  parcel_id: z.string().uuid().nullable(),
  region_id: z.string().uuid().nullable(),
  status: AccessStatusSchema,
  rule_text: z.string().nullable(),
  authority_url: z.string().nullable(),
  authority_level: z.number().int().default(1),
  source_type: z.enum(['official', 'crowdsourced', 'derived']).default('official'),
  verification_status: z.enum(['pending', 'verified', 'disputed']).default('pending'),
  priority_weight: z.number().int().default(1),
  last_verified_at: z.string().datetime().nullable(),
  confidence_metrics: ConfidenceBreakdownSchema,
});

export const LocationV1Schema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  fuzzy_location: FuzzyLocationSchema.nullable(),
  access_status: AccessStatusSchema,
  difficulty_rating: z.number().min(1).max(5).nullable(),
  is_verified: z.boolean(),
  metadata: z.record(z.string(), z.any()),
});

export const FindV1Schema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  trip_id: z.string().uuid().nullable(),
  material_name: z.string(),
  material_taxonomy_id: z.string().uuid().nullable(),
  exact_location: ExactLocationSchema.optional(),
  fuzzy_location: FuzzyLocationSchema.nullable(),
  is_fuzzy: z.boolean(),
  confidence_metrics: ConfidenceBreakdownSchema,
  notes: z.string().nullable(),
  discovered_at: z.string().datetime(),
  created_at: z.string().datetime(),
  idempotency_key: z.string().nullable(),
});

export const TripV1Schema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().nullable(),
  status: z.string(),
  metrics: z
    .object({
      total_finds: z.number().int().nonnegative(),
      total_weight: z.number().nonnegative().nullable(),
      unique_materials: z.number().int().nonnegative(),
    })
    .optional(),
  device_id: z.string(),
});

/**
 * =====================================================
 * API V1 CONTRACTS (DTOs)
 * =====================================================
 */

export const ProfileResponseSchema = ProfileV1Schema;
export const LocationsListResponseSchema = z.object({
  data: z.array(LocationV1Schema),
  count: z.number().int().nonnegative(),
});
export const FindsListResponseSchema = z.object({
  data: z.array(FindV1Schema),
  count: z.number().int().nonnegative(),
});
export const TripsListResponseSchema = z.object({
  data: z.array(TripV1Schema),
  count: z.number().int().nonnegative(),
});

export const SyncBatchRequestSchema = z.object({
  operations: z.array(
    z.object({
      client_operation_id: z.string().uuid(),
      entity_type: z.enum(['find', 'trip', 'profile', 'location_suggest']),
      operation_type: z.enum(['create', 'update', 'delete']),
      payload: z.any(),
      timestamp: z.string().datetime(),
    })
  ),
  idempotency_key: z.string(),
});

export const SyncBatchResponseSchema = z.object({
  results: z.array(
    z.object({
      client_operation_id: z.string().uuid(),
      server_id: z.string().uuid().nullable(),
      status: SyncOperationStatusSchema,
      error: z.string().nullable(),
    })
  ),
});

export const AccessCheckRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  material_id: z.string().uuid().optional(),
});

/**
 * MANDATORY CONFIDENCE BREAKDOWN (V2)
 * All keys must be present and represent numeric signed penalties.
 */
export const ConfidenceBreakdownV2Schema = z.object({
  boundary: z
    .number()
    .describe('Penalty for spatial precision: parcel(0), region(-0.1), none(-0.4)'),
  rule_presence: z.number().describe('Penalty for missing explicit rule: found(0), missing(-0.2)'),
  staleness: z
    .number()
    .describe('Penalty for age of verification: fresh(0), stale(-0.1), archived(-0.2)'),
  conflict: z
    .number()
    .describe(
      'Penalty for spatial/severity collisions: none(0), collision(-0.3), authority_mismatch(-0.2)'
    ),
});
export type ConfidenceBreakdownV2 = z.infer<typeof ConfidenceBreakdownV2Schema>;

export const AccessCheckResponseSchema = z.object({
  legalState: AccessStatusSchema,
  advisoryLevel: AdvisoryLevelSchema,
  confidence: z.number().min(0).max(1),
  confidenceBreakdown: ConfidenceBreakdownV2Schema,
  parcel_info: z
    .object({
      id: z.string().uuid(),
      owner: z.string().nullable(),
      agency: z.string().nullable(),
      owner_type: z.string().nullable(),
      managing_agency: z.string().nullable(),
    })
    .nullable(),
  evidence: z.object({
    boundaryMatch: z.enum(['parcel', 'region', 'none']),
    appliedRule: z.string().uuid().nullable(),
    conflicts: z.array(z.string()),
    reasonCodes: z.array(z.string()),
  }),
});

export type AccessCheckRequest = z.infer<typeof AccessCheckRequestSchema>;
export type AccessCheckResponse = z.infer<typeof AccessCheckResponseSchema>;
export type SyncBatchRequest = z.infer<typeof SyncBatchRequestSchema>;
export type SyncBatchResponse = z.infer<typeof SyncBatchResponseSchema>;
export type ProfileV1 = z.infer<typeof ProfileV1Schema>;
export type FindV1 = z.infer<typeof FindV1Schema>;
export type TripV1 = z.infer<typeof TripV1Schema>;
export type LocationV1 = z.infer<typeof LocationV1Schema>;
export type AccessRuleV1 = z.infer<typeof AccessRuleV1Schema>;
