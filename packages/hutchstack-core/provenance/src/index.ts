export const PACKAGE_VERSION = '0.0.0-phase0';

export interface ProvenanceRecord {
  clientOperationId: string;
  serverId: string;
  entityType: string;
  emittedAt: string;
  policyVersion?: string;
}

export interface ProvenanceEmitter {
  emitApplied(record: ProvenanceRecord): Promise<void>;
  emitFailed(clientOperationId: string, error: string): Promise<void>;
}

export interface ProvenanceHook {
  onBatchApplied(records: ProvenanceRecord[]): Promise<void>;
}

export type { ProvenanceStore, HashProvider, RetentionPolicy } from './extension-points';
