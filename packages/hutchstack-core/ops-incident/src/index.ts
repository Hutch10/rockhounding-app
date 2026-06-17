import type { AlertSeverity } from '@hutchstack/core-ops';

export const PACKAGE_VERSION = '0.0.0-phase0';

export interface IncidentTemplateSection {
  id: string;
  title: string;
  checklist: string[];
}

export interface IncidentTemplate {
  id: string;
  severity: AlertSeverity;
  responseTimeMinutes: number;
  sections: IncidentTemplateSection[];
}

export interface IncidentRecord {
  incidentId: string;
  severity: AlertSeverity;
  openedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  summary: string;
}

export interface PostmortemTemplate {
  sections: Array<{ id: string; title: string; prompt: string }>;
}

export type { DomainRunbook, IncidentExporter } from './extension-points';

export type { AlertSeverity };
