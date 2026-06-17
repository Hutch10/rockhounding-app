export const PACKAGE_VERSION = '0.0.0-phase0';

export type AlertSeverity = 'P0' | 'P1' | 'P2' | 'P3';

export interface MetricTarget {
  metricId: string;
  target: number;
  unit: string;
  comparison: 'gte' | 'lte';
}

export interface DashboardPanel {
  id: string;
  title: string;
  description: string;
  source: 'supabase' | 'sentry' | 'ci' | 'telemetry';
  query?: string;
  eventName?: string;
  targets?: MetricTarget[];
}

export interface DashboardSpec {
  id: string;
  version: string;
  panels: DashboardPanel[];
  extends?: string;
}

export interface AlertRule {
  id: string;
  condition: string;
  window: string;
  severity: AlertSeverity;
  runbookUrl?: string;
  blockPromote?: boolean;
}

export interface EscalationPolicy {
  id: string;
  severity: AlertSeverity;
  responseTimeMinutes: number;
  channels: string[];
  escalateAfterMinutes?: number;
}

export type { PanelRegistry, MetricProvider, AlertExporter } from './extension-points';
