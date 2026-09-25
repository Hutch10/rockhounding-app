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
    title: 'Recorded access status: prohibited',
    body: 'This is a recorded access status. It is not a collecting verdict, and it does not decide visit, observation, photography, or entry.',
    className: 'bg-rose-950/90 border-rose-500 text-rose-100',
    icon: '!',
  },
  restricted: {
    show: true,
    title: 'Recorded access status: restricted',
    body: 'A permit or seasonal note is not current entry authorization. Collecting stays unresolved.',
    className: 'bg-orange-950/90 border-orange-500 text-orange-100',
    icon: '!',
  },
  caution: {
    show: true,
    title: 'Recorded access status: caution',
    body: 'Boundaries and rules remain unresolved. This status does not grant collecting permission.',
    className: 'bg-amber-950/90 border-amber-500 text-amber-100',
    icon: '!',
  },
  allowed: {
    show: true,
    title: 'Recorded access status: allowed',
    body: 'A recorded allowed status is not collecting permission, ownership permission, or current entry authorization.',
    className: 'bg-emerald-950/90 border-emerald-500 text-emerald-100',
    icon: 'i',
  },
  unknown: {
    show: true,
    title: 'Recorded access status: unresolved',
    body: 'Unknown stays unresolved. It is not allowed, and it is not prohibited.',
    className: 'bg-slate-900/90 border-slate-400 text-slate-100',
    icon: '?',
  },
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

/**
 * Holds Quick Log save for recorded prohibited or restricted access.
 * The hold is operational. It is not a collecting verdict.
 */
export function isCollectingDisabled(accessStatus: string | undefined): boolean {
  const status = normalizeAccessStatus(accessStatus);
  return status === 'prohibited' || status === 'restricted';
}
