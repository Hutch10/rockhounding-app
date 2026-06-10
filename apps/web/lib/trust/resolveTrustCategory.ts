/**
 * API-011: Server-side trust category resolution.
 * UI must never upgrade category — only display resolved value.
 */

export type TrustCategory = 'official' | 'verified' | 'community' | 'unverified';

const TRUST_CATEGORIES: TrustCategory[] = ['official', 'verified', 'community', 'unverified'];

export interface LocationTrustInput {
  trust_category?: string | null;
  is_verified: boolean;
  source_tier?: string | null;
  metadata?: Record<string, unknown> | null;
}

function isTrustCategory(value: string): value is TrustCategory {
  return TRUST_CATEGORIES.includes(value as TrustCategory);
}

/**
 * Resolve trust category for a canon location row.
 * Stored trust_category wins when valid; otherwise derive from source signals.
 */
export function resolveTrustCategory(input: LocationTrustInput): TrustCategory {
  if (
    input.trust_category != null &&
    input.trust_category !== '' &&
    isTrustCategory(input.trust_category)
  ) {
    return input.trust_category;
  }

  const tier =
    input.source_tier ??
    (typeof input.metadata?.source_tier === 'string' ? input.metadata.source_tier : null);

  if (tier === 'OFFICIAL') {
    return 'official';
  }

  if (input.is_verified && tier !== 'COMMUNITY_STAGED') {
    return 'verified';
  }

  if (tier === 'COMMUNITY_STAGED' || input.metadata?.promoted_from_staging === true) {
    return 'community';
  }

  return 'unverified';
}
