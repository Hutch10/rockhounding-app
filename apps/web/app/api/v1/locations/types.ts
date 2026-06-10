import { z } from 'zod';

const AccessStatusSchema = z.enum(['allowed', 'caution', 'restricted', 'prohibited', 'unknown']);

export const BboxQuerySchema = z.object({
  bbox: z
    .string()
    .regex(
      /^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/,
      'bbox must be minLon,minLat,maxLon,maxLat'
    )
    .transform((raw) => {
      const [minLon, minLat, maxLon, maxLat] = raw.split(',').map(Number);
      return { minLon, minLat, maxLon, maxLat };
    }),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
  access: z
    .union([AccessStatusSchema, z.array(AccessStatusSchema)])
    .optional()
    .transform((v) => (v == null ? undefined : Array.isArray(v) ? v : [v])),
  trust: z
    .union([
      z.enum(['official', 'verified', 'community', 'unverified']),
      z.array(z.enum(['official', 'verified', 'community', 'unverified'])),
    ])
    .optional()
    .transform((v) => (v == null ? undefined : Array.isArray(v) ? v : [v])),
  materials: z
    .union([z.string().uuid(), z.array(z.string().uuid())])
    .optional()
    .transform((v) => (v == null ? undefined : Array.isArray(v) ? v : [v])),
});

export type BboxQuery = z.infer<typeof BboxQuerySchema>;

export interface LocationBboxRow {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  fuzzy_lat: number | null;
  fuzzy_lon: number | null;
  access_status: string;
  difficulty_rating: number | null;
  is_verified: boolean;
  trust_category: string | null;
  freshness_checked_at: string | null;
  freshness_status: string | null;
  metadata: Record<string, unknown> | null;
  source_tier: string | null;
  top_materials: string[] | null;
}

export interface LocationDetailRow extends LocationBboxRow {
  permit_summary?: string | null;
  collecting_summary?: string | null;
  materials?: { id: string; name: string; abundance: string | null }[];
}
