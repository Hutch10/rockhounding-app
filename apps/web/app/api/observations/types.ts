/**
 * Observation API Types
 * Route-specific types not covered by the SDK.
 * Observation and CreateObservationRequest live in @/lib/api.
 */

import type { Observation } from '@/lib/api';

export interface ObservationWithDetails extends Observation {
  locationName?: string | null;
}

export interface CreateObservationResponse {
  success: boolean;
  observation: Observation;
}

export interface ObservationErrorResponse {
  error: string;
  details?: string;
}
