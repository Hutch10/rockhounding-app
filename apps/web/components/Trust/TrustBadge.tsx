import {
  parseTrustCategory,
  TRUST_BADGE_STYLES,
  TRUST_CATEGORY_LABELS,
  type TrustCategory,
} from '@/lib/trust/types';

interface TrustBadgeProps {
  /** Read-only from API metadata.trust_category */
  trustCategory: unknown;
  size?: 'sm' | 'md';
  className?: string;
}

export function TrustBadge({
  trustCategory,
  size = 'md',
  className = '',
}: TrustBadgeProps): JSX.Element {
  const category = parseTrustCategory(trustCategory);
  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      data-testid={`trust-badge-${category}`}
      className={`inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide border ${TRUST_BADGE_STYLES[category]} ${sizeClass} ${className}`}
    >
      {TRUST_CATEGORY_LABELS[category]}
    </span>
  );
}

/** Extract trust category from LocationV1 metadata — never upgrade client-side */
export function trustFromMetadata(metadata: Record<string, unknown> | undefined): TrustCategory {
  return parseTrustCategory(metadata?.trust_category);
}
