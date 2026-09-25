import { buildFieldPermissionSummary } from '@/lib/field/permission-summary';

const ACTIVITY_LABELS = {
  visit: 'Visit',
  observe: 'Observe',
  photograph: 'Photograph',
  collect: 'Collect',
  collect_with_permit: 'Collect with permit',
} as const;

interface FieldPermissionSummaryProps {
  recordedAccessStatus: string | undefined;
}

/**
 * Shows the five field activities as independent unresolved rows.
 * The recorded access status is a separate fact.
 */
export function FieldPermissionSummary({
  recordedAccessStatus,
}: FieldPermissionSummaryProps): JSX.Element {
  const summary = buildFieldPermissionSummary(recordedAccessStatus);

  return (
    <section
      aria-label="Field permission summary"
      data-testid="field-permission-summary"
      className="rounded-xl border border-white/15 bg-black/70 p-3 text-white"
    >
      <h2 className="text-xs font-bold uppercase tracking-widest text-white/80">
        Field permission summary
      </h2>
      <p className="mt-1 text-sm">
        Recorded access status:{' '}
        <span className="font-semibold">{summary.recordedAccessStatus}</span>
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {(Object.keys(ACTIVITY_LABELS) as Array<keyof typeof ACTIVITY_LABELS>).map((activity) => (
          <li key={activity} className="flex items-center justify-between gap-3">
            <span>{ACTIVITY_LABELS[activity]}</span>
            <span className="font-semibold uppercase tracking-wide text-amber-200">
              {summary.activities[activity]}
            </span>
          </li>
        ))}
      </ul>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-white/60">Location</dt>
          <dd className="font-semibold">{summary.locationTrust}</dd>
        </div>
        <div>
          <dt className="text-white/60">Access</dt>
          <dd className="font-semibold">{summary.accessTrust}</dd>
        </div>
        <div>
          <dt className="text-white/60">Geology</dt>
          <dd className="font-semibold">{summary.geologyTrust}</dd>
        </div>
      </dl>
      <p className="mt-2 text-sm">
        Closure revalidation: <span className="font-semibold">{summary.closureRevalidation}</span>.
        A past closure note is not collecting permission.
      </p>
      <p className="mt-2 text-sm font-semibold">Go / No-Go: {summary.goNoGo}</p>
      <p className="text-sm">Departure: {summary.departure}</p>
      <p className="mt-1 text-xs leading-relaxed text-white/80">{summary.statement}</p>
    </section>
  );
}
