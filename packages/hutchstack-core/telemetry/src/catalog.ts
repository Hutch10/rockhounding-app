/**
 * Field operations telemetry event catalog (ops plan §2.2).
 */
export interface FieldOpsEventCatalogEntry {
  eventName: string;
  category: 'sync' | 'user_interaction';
  when: string;
  metadataKeys: string[];
}

export const FIELD_OPS_EVENT_CATALOG: FieldOpsEventCatalogEntry[] = [
  {
    eventName: 'sync_queue_depth',
    category: 'sync',
    when: 'Heartbeat (15s) + on enqueue',
    metadataKeys: ['pending_count', 'failed_count', 'is_online'],
  },
  {
    eventName: 'sync_batch_result',
    category: 'sync',
    when: 'After POST /api/v1/sync/batch',
    metadataKeys: ['batch_size', 'applied', 'failed', 'duration_ms'],
  },
  {
    eventName: 'sync_batch_retry',
    category: 'sync',
    when: 'Before retry flush',
    metadataKeys: ['client_operation_id', 'retry_count'],
  },
  {
    eventName: 'quick_log_started',
    category: 'user_interaction',
    when: 'Quick Add modal open',
    metadataKeys: ['surface'],
  },
  {
    eventName: 'quick_log_completed',
    category: 'user_interaction',
    when: 'Local enqueue success',
    metadataKeys: ['duration_ms', 'is_offline', 'access_state'],
  },
  {
    eventName: 'quick_log_blocked_prohibited',
    category: 'user_interaction',
    when: 'Online prohibited block',
    metadataKeys: ['lat', 'lon', 'surface'],
  },
  {
    eventName: 'access_check_result',
    category: 'user_interaction',
    when: 'After /api/v1/access/check',
    metadataKeys: ['legal_state', 'duration_ms'],
  },
];

export const FIELD_TELEMETRY_ROLLUP_EVENTS = ['quick_log_completed', 'sync_queue_depth'] as const;

export type FieldTelemetryRollupEvent = (typeof FIELD_TELEMETRY_ROLLUP_EVENTS)[number];
