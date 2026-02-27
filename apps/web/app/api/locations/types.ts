import { LegalTagSchema } from '@rockhounding/shared';
import { z } from 'zod';

/**
 * Thin pin response payload
 * Build Document: NEVER return full detail in bbox endpoint
 *
 * LOCKED FIELDS (do not add or remove):
 * - id
 * - name
 * - lat
 * - lon
 * - legal_tag
 * - access_model
 * - difficulty
 * - kid_friendly
 * - status
 */
export interface ThinLocationPin {
  id: string;
  name: string;
  lat: number;
  lon: number;
  legal_tag: string;
  access_model: string;
  difficulty: number | null;
  kid_friendly: boolean;
  status: string;
}

/**
 * Query parameters schema for GET /api/locations
 * Build Document: bbox is REQUIRED, others are OPTIONAL
 */
export const LocationQuerySchema = z.object({
  // REQUIRED: bounding box (minLon,minLat,maxLon,maxLat)
  bbox: z
    .string()
    .regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/, 'Invalid bbox format')
    .transform((val) => {
      const [minLon, minLat, maxLon, maxLat] = val.split(',').map(Number);
      return { minLon, minLat, maxLon, maxLat };
    }),

  // OPTIONAL: legal tag filter
  legal_tag: LegalTagSchema.optional(),

  // OPTIONAL: access model filter
  access_model: z
    .enum(['PUBLIC_LAND', 'FEE_SITE', 'CLUB_ONLY', 'PERMISSION_REQUIRED', 'UNKNOWN'])
    .optional(),

  // OPTIONAL: material ID filter (UUID)
  material_id: z.string().uuid().optional(),

  // OPTIONAL: max difficulty (1-5)
  difficulty_max: z.coerce.number().int().min(1).max(5).optional(),

  // OPTIONAL: kid-friendly filter
  kid_friendly: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export type LocationQuery = z.infer<typeof LocationQuerySchema>;

/**
 * Response wrapper for thin pins
 */
export interface LocationsResponse {
  data: ThinLocationPin[];
  count: number;
  max_results: number;
}
