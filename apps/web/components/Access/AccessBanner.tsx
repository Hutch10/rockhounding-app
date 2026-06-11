export type AccessStatus = 'allowed' | 'caution' | 'restricted' | 'prohibited' | 'unknown';

interface AccessBannerProps {
  accessStatus: AccessStatus;
  className?: string;
}

type BannerConfig = {
  show: boolean;
  title: string;
  body: string;
  className: string;
  icon: string;
};

const BANNER_CONFIG: Record<AccessStatus, BannerConfig> = {
  prohibited: {
    show: true,
    title: 'Access Prohibited',
    body: 'Collecting is strictly forbidden in this zone.',
    className: 'bg-rose-950/90 border-rose-500 text-rose-100',
    icon: '🚫',
  },
  restricted: {
    show: true,
    title: 'Restricted Access',
    body: 'Specific permits or seasonal restrictions apply.',
    className: 'bg-orange-950/90 border-orange-500 text-orange-100',
    icon: '🚫',
  },
  caution: {
    show: true,
    title: 'Proceed with Caution',
    body: 'Verify land boundaries and local rules before collecting.',
    className: 'bg-amber-950/90 border-amber-500 text-amber-100',
    icon: '⚠️',
  },
  allowed: { show: false, title: '', body: '', className: '', icon: '' },
  unknown: { show: false, title: '', body: '', className: '', icon: '' },
};

export function AccessBanner({
  accessStatus,
  className = '',
}: AccessBannerProps): JSX.Element | null {
  const config: BannerConfig = BANNER_CONFIG[accessStatus];
  if (!config.show) {
    return null;
  }

  const isProhibited = accessStatus === 'prohibited';

  return (
    <div
      data-testid={`access-banner-${accessStatus}`}
      role="alert"
      aria-live="polite"
      className={`rounded-lg border-l-4 p-3 ${config.className} ${className}`}
      {...(isProhibited ? { 'data-nondismissible': 'true' } : {})}
    >
      <p className="font-bold text-sm flex items-center gap-2">
        <span aria-hidden="true">{config.icon}</span>
        {config.title}
      </p>
      <p className="text-xs mt-1 opacity-90">{config.body}</p>
    </div>
  );
}

export function normalizeAccessStatus(value: string | undefined): AccessStatus {
  if (
    value === 'allowed' ||
    value === 'caution' ||
    value === 'restricted' ||
    value === 'prohibited' ||
    value === 'unknown'
  ) {
    return value;
  }
  return 'unknown';
}

export function isCollectingDisabled(accessStatus: string | undefined): boolean {
  const status = normalizeAccessStatus(accessStatus);
  return status === 'prohibited' || status === 'restricted';
}
