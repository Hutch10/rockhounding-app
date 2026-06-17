/**
 * HutchStack Core telemetry base contract (Phase 1).
 */
import { z } from 'zod';

export const TelemetryEventCategory = z.enum([
  'performance',
  'sync',
  'cache',
  'background_job',
  'user_interaction',
  'error',
  'network',
  'database',
]);

export type TelemetryEventCategory = z.infer<typeof TelemetryEventCategory>;

export const EventSeverity = z.enum(['debug', 'info', 'warning', 'error', 'critical']);

export type EventSeverity = z.infer<typeof EventSeverity>;

export const BaseTelemetryEventSchema = z.object({
  event_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  session_id: z.string().uuid(),
  category: TelemetryEventCategory,
  event_name: z.string().min(1).max(100),
  timestamp: z.string().datetime(),
  severity: EventSeverity,
  device_type: z.enum(['mobile', 'tablet', 'desktop']).nullable(),
  platform: z.string().max(50).nullable(),
  browser: z.string().max(50).nullable(),
  viewport_width: z.number().int().positive().nullable(),
  viewport_height: z.number().int().positive().nullable(),
  connection_type: z.string().max(20).nullable(),
  is_online: z.boolean(),
  app_version: z.string().max(20).nullable(),
  page_url: z.string().max(500).nullable(),
  metadata: z.record(z.unknown()).nullable(),
});

export type BaseTelemetryEvent = z.infer<typeof BaseTelemetryEventSchema>;
