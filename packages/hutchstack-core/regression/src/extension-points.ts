import type { WatchlistItem, WatchlistSpec } from './index';

export interface WatchlistMerger {
  merge(base: WatchlistSpec, domain: WatchlistSpec): WatchlistSpec;
}

export interface AutomatedCheck {
  item: WatchlistItem;
  testCommand: string;
}

export interface ManualCheck {
  item: WatchlistItem;
  playbookUrl: string;
}
