/**
 * Full Location Detail Types
 * Build Document Rule #3: Full detail endpoint contract
 *
 * LOCKED CONTRACT: These types define the complete location detail response
 * Used ONLY for /api/locations/:id endpoint
 * NEVER used during map panning (thin pins only)
 */

import type {
  LegalTag,
  SourceTier,
  Status,
} from '@rockhounding/shared';

/**
 * Related material found at this location
 */
export interface LocationMaterial {
  id: number;
  name: string;
  category: 'mineral' | 'gemstone' | 'rock' | 'fossil' | 'other';
}

/**
 * Ruleset governing this location
 */
export interface LocationRuleset {
  id: number;
  name: string;
  authority: string;
  url: string | null;
  summary: string | null;
}

/**
 * Provenance source for this location
 */
export interface LocationSource {
  id: number;
  citation: string;
  url: string | null;
  date_accessed: string | null;
}

/**
 * Full location detail response
 * Build Document: ALL fields required for detail view
 *
 * Core Fields (14):
 * - Identification: id, name, description
 * - Geography: lat, lon (extracted from geom via ST_X/ST_Y)
 * - Legal: legal_tag, legal_confidence, primary_ruleset_id
 * - Provenance: source_tier, verification_date
 * - Status: status
 * - Accessibility: access_model, difficulty, kid_friendly
 *
 * Related Arrays (3):
 * - materials[] - What can be collected here
 * - rulesets[] - Legal frameworks governing this location
 * - sources[] - Provenance documentation
 */
export interface FullLocationDetail {
  // Core identification
  id: number;
  name: string;
  description: string | null;

  // Geography (extracted from PostGIS)
  lat: number;
  lon: number;

  // Legal status
  legal_tag: LegalTag;
  legal_confidence: number; // 0-100
  primary_ruleset_id: number;

  // Provenance
  source_tier: SourceTier;
  verification_date: string | null; // ISO 8601

  // Status
  status: Status;

  // Accessibility
  access_model: string; // e.g., "Walk-in", "4WD Required"
  difficulty: number; // 1-5
  kid_friendly: boolean;

  // Related data (joined from other tables)
  materials: LocationMaterial[];
  rulesets: LocationRuleset[];
  sources: LocationSource[];
}

/**
 * API response wrapper
 */
export interface FullLocationDetailResponse {
  location: FullLocationDetail;
}
