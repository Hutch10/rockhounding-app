import type { ProvenanceRecord } from './index';

export interface ProvenanceStore {
  save(record: ProvenanceRecord): Promise<void>;
  getByClientOperationId(clientOperationId: string): Promise<ProvenanceRecord | null>;
}

export interface HashProvider {
  hash(input: string): Promise<string>;
}

export interface RetentionPolicy {
  retentionDays: number;
  shouldPurge(createdAt: string): boolean;
}
