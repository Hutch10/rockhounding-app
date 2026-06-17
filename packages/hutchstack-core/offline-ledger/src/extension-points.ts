import type { LedgerEnqueueInput, LedgerOperationSummary } from './index';

/** Pluggable persistence layer for ledger operations. */
export interface StorageBackend {
  readonly name: string;
  put(operation: LedgerOperationSummary & { payload: Record<string, unknown> }): Promise<void>;
  getById(clientOperationId: string): Promise<LedgerOperationSummary | null>;
  listByQueueStatus(status: string): Promise<LedgerOperationSummary[]>;
  updateStatus(clientOperationId: string, status: string): Promise<void>;
  delete(clientOperationId: string): Promise<void>;
}

/** Validates operations before enqueue. */
export interface OperationValidator {
  validate(input: LedgerEnqueueInput): Promise<{ valid: true } | { valid: false; reason: string }>;
}

/** TTL and capacity eviction policy. */
export interface EvictionPolicy {
  shouldEvict(operation: LedgerOperationSummary, queueDepth: number): boolean;
}

/** Domain registers entity types for handler routing metadata. */
export interface EntityTypeRegistration {
  entityType: string;
  tableName?: string;
  description?: string;
}

export interface EntityTypeRegistry {
  register(registration: EntityTypeRegistration): void;
  get(entityType: string): EntityTypeRegistration | undefined;
  list(): EntityTypeRegistration[];
}
