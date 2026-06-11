export type TrustCategory = 'official' | 'verified' | 'community' | 'unverified';

export const TRUST_CATEGORY_LABELS: Record<TrustCategory, string> = {
  official: 'Official',
  verified: 'Verified',
  community: 'Community',
  unverified: 'Unverified',
};

/** Pin ring + badge colors — high contrast for field use */
export const TRUST_RING_COLORS: Record<TrustCategory, string> = {
  official: '#2563eb',
  verified: '#059669',
  community: '#d97706',
  unverified: '#64748b',
};

export const TRUST_BADGE_STYLES: Record<TrustCategory, string> = {
  official: 'bg-blue-700 text-white border-blue-500',
  verified: 'bg-emerald-700 text-white border-emerald-500',
  community: 'bg-amber-700 text-white border-amber-500',
  unverified: 'bg-slate-600 text-white border-slate-400',
};

export function parseTrustCategory(value: unknown): TrustCategory {
  if (
    value === 'official' ||
    value === 'verified' ||
    value === 'community' ||
    value === 'unverified'
  ) {
    return value;
  }
  return 'unverified';
}
