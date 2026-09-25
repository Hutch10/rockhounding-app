/**
 * Presentation adapter for the frozen field permission summary.
 * A recorded access status is displayed beside the activities.
 * It never becomes visit, observation, photography, or collecting permission.
 */

export const FIELD_ACTIVITIES = [
  'visit',
  'observe',
  'photograph',
  'collect',
  'collect_with_permit',
] as const;

export type FieldActivity = (typeof FIELD_ACTIVITIES)[number];

export type ActivityDisposition = 'unresolved';

export interface FieldPermissionSummaryModel {
  recordedAccessStatus: string;
  activities: Record<FieldActivity, ActivityDisposition>;
  locationTrust: 'unresolved';
  accessTrust: 'unresolved';
  geologyTrust: 'unresolved';
  closureRevalidation: 'not_current';
  /** Departure stays not-ready while any required dimension is unresolved. */
  departure: 'not_ready';
  goNoGo: 'not_ready';
  statement: string;
}

const UNRESOLVED_ACTIVITIES: Record<FieldActivity, ActivityDisposition> = {
  visit: 'unresolved',
  observe: 'unresolved',
  photograph: 'unresolved',
  collect: 'unresolved',
  collect_with_permit: 'unresolved',
};

export function buildFieldPermissionSummary(
  recordedAccessStatus: string | undefined
): FieldPermissionSummaryModel {
  const recorded =
    recordedAccessStatus != null && recordedAccessStatus.trim() !== ''
      ? recordedAccessStatus
      : 'unknown';

  return {
    recordedAccessStatus: recorded,
    activities: { ...UNRESOLVED_ACTIVITIES },
    locationTrust: 'unresolved',
    accessTrust: 'unresolved',
    geologyTrust: 'unresolved',
    closureRevalidation: 'not_current',
    departure: 'not_ready',
    goNoGo: 'not_ready',
    statement:
      'A map pin, recorded access status, ownership, permit, route, or closure note does not decide collecting. Visit, observation, photography, and collecting stay unresolved until a separate current authority record exists. Cached or offline state is not current.',
  };
}
