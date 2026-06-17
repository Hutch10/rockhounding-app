export const PACKAGE_VERSION = '0.0.0-phase0';

export interface WatchlistItem {
  id: string;
  area: string;
  verify: string;
  how: 'automated' | 'manual';
  owner: string;
  blockPromote: boolean;
  ciTag?: string;
}

export interface WatchlistSpec {
  id: string;
  version: string;
  extends?: string;
  items: WatchlistItem[];
}

export interface WatchlistReportItem {
  id: string;
  passed: boolean;
  evidence?: string;
}

export interface WatchlistReport {
  specId: string;
  runAt: string;
  items: WatchlistReportItem[];
  blockPromote: boolean;
}

export interface WatchlistRunner {
  run(spec: WatchlistSpec): Promise<WatchlistReport>;
}

export type { WatchlistMerger, AutomatedCheck, ManualCheck } from './extension-points';
