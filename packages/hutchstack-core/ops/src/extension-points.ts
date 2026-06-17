import type { AlertRule, DashboardPanel } from './index';

export interface PanelRegistry {
  register(panel: DashboardPanel): void;
  get(id: string): DashboardPanel | undefined;
  list(): DashboardPanel[];
}

export interface MetricProvider {
  query(panelId: string): Promise<{ value: number; timestamp: string }>;
}

export interface AlertExporter {
  exportRules(rules: AlertRule[]): Promise<string>;
}
