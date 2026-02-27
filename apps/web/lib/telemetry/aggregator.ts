/**
 * Telemetry Client-Side Aggregator
 * 
 * Lightweight aggregator for batching telemetry events with offline-first buffering
 */

import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import {
  TelemetryEvent,
  TelemetryBatch,
  TelemetryConfig,
  TelemetryEventSchema,
  TelemetryBatchSchema,
  createEventId,
  createSessionId,
  getDeviceContext,
  getNetworkContext,
  shouldSampleEvent,
  BaseTelemetryEvent,
} from '@rockhounding/shared';

// ============================================================================
// IndexedDB Schema
// ============================================================================

// TODO: Replace with a proper DBSchema definition once storage shapes stabilize.
type TelemetryDB = Record<string, any>;

// ============================================================================
// Telemetry Aggregator Class
// ============================================================================

export class TelemetryAggregator {
  private db: IDBPDatabase<any> | null = null;
  private config: TelemetryConfig;
  private buffer: TelemetryEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private sessionId: string;
  private userId: string | null = null;
  private isOnline: boolean = true;
  
  // Metrics
  private metrics = {
    bufferedCount: 0,
    sentCount: 0,
    errorCount: 0,
    lastFlush: null as Date | null,
  };

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = {
      sampling_rate: config.sampling_rate ?? 1.0,
      performance_sampling_rate: config.performance_sampling_rate ?? 0.1,
      batch_size: config.batch_size ?? 50,
      batch_timeout_ms: config.batch_timeout_ms ?? 5000,
      max_buffer_size: config.max_buffer_size ?? 1000,
      offline_buffer_ttl_ms: config.offline_buffer_ttl_ms ?? 86400000,
      enabled_categories: config.enabled_categories ?? [
        'performance',
        'sync',
        'cache',
        'background_job',
        'user_interaction',
        'error',
        'network',
        'database',
      ],
      anonymize_user_data: config.anonymize_user_data ?? false,
      include_device_info: config.include_device_info ?? true,
      include_network_info: config.include_network_info ?? true,
    };

    this.sessionId = createSessionId();
    
    // Initialize IndexedDB
    this.initDB();
    
    // Set up network listeners
    this.setupNetworkListeners();
    
    // Start periodic flush
    this.startFlushTimer();
    
    // Load buffered events on startup
    this.loadBufferedEvents();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private async initDB(): Promise<void> {
    try {
      this.db = await openDB<any>('rockhound-telemetry', 1, {
        upgrade(db) {
          // Events store
          const eventsStore = db.createObjectStore('events', { keyPath: 'event_id' });
          eventsStore.createIndex('by-timestamp', 'timestamp');
          eventsStore.createIndex('by-category', 'category');

          // Batches store
          const batchesStore = db.createObjectStore('batches', { keyPath: 'batch.batch_id' });
          batchesStore.createIndex('by-sent', 'sent');

          // Config store
          db.createObjectStore('config');
        },
      });

      // Load config from IndexedDB
      const savedConfig = await this.db.get('config', 'telemetry_config');
      if (savedConfig) {
        this.config = { ...this.config, ...savedConfig };
      } else {
        await this.db.put('config', this.config, 'telemetry_config');
      }
    } catch (error) {
      console.error('Failed to initialize telemetry IndexedDB:', error);
      this.metrics.errorCount++;
    }
  }

  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flush(); // Flush buffered events when coming online
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    this.isOnline = navigator.onLine;
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.batch_timeout_ms);
  }

  private async loadBufferedEvents(): Promise<void> {
    if (!this.db) return;

    try {
      const events = await this.db.getAll('events');
      const now = Date.now();
      const ttl = this.config.offline_buffer_ttl_ms;

      for (const event of events) {
        const bufferedAt = new Date(event.buffered_at).getTime();
        
        // Remove expired events
        if (now - bufferedAt > ttl) {
          await this.db.delete('events', event.event_id);
          continue;
        }

        // Add to buffer
        const { buffered_at, ...cleanEvent } = event;
        this.buffer.push(cleanEvent as TelemetryEvent);
      }

      this.metrics.bufferedCount = this.buffer.length;

      // Flush if we're online
      if (this.isOnline && this.buffer.length > 0) {
        this.flush();
      }
    } catch (error) {
      console.error('Failed to load buffered telemetry events:', error);
      this.metrics.errorCount++;
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  setUserId(userId: string | null): void {
    this.userId = userId;
  }

  updateConfig(config: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.db) {
      this.db.put('config', this.config, 'telemetry_config').catch(error => {
        console.error('Failed to save telemetry config:', error);
      });
    }
  }

  recordEvent(event: Omit<TelemetryEvent, keyof BaseTelemetryEvent> & Partial<BaseTelemetryEvent>): void {
    try {
      // Check sampling
      if (event.category && !shouldSampleEvent(event.category, this.config)) {
        return;
      }

      // Build full event
      const deviceContext = this.config.include_device_info ? getDeviceContext() : {};
      const networkContext = this.config.include_network_info ? getNetworkContext() : {};

      const fullEvent: TelemetryEvent = {
        event_id: event.event_id ?? createEventId(),
        user_id: this.config.anonymize_user_data ? null : (event.user_id ?? this.userId),
        session_id: event.session_id ?? this.sessionId,
        timestamp: event.timestamp ?? new Date().toISOString(),
        severity: event.severity ?? 'info',
        app_version: event.app_version ?? null,
        page_url: event.page_url ?? (typeof window !== 'undefined' ? window.location.href : null),
        metadata: event.metadata ?? null,
        ...deviceContext,
        ...networkContext,
        ...event,
      } as TelemetryEvent;

      // Validate event
      const validationResult = TelemetryEventSchema.safeParse(fullEvent);
      if (!validationResult.success) {
        console.warn('Invalid telemetry event:', validationResult.error);
        this.metrics.errorCount++;
        return;
      }

      // Add to buffer
      this.buffer.push(validationResult.data);
      this.metrics.bufferedCount++;

      // Persist to IndexedDB if offline or buffer is large
      if (!this.isOnline || this.buffer.length > this.config.batch_size) {
        this.persistEvent(validationResult.data);
      }

      // Check if we should flush
      if (this.buffer.length >= this.config.batch_size) {
        this.flush();
      }

      // Enforce max buffer size
      if (this.buffer.length > this.config.max_buffer_size) {
        this.buffer = this.buffer.slice(-this.config.max_buffer_size);
      }
    } catch (error) {
      console.error('Failed to record telemetry event:', error);
      this.metrics.errorCount++;
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.isOnline) {
      return;
    }

    try {
      // Create batch
      const batch: TelemetryBatch = {
        batch_id: createEventId(),
        events: this.buffer.splice(0, this.config.batch_size),
        batch_timestamp: new Date().toISOString(),
        client_timestamp: new Date().toISOString(),
        compressed: false,
      };

      // Validate batch
      const validationResult = TelemetryBatchSchema.safeParse(batch);
      if (!validationResult.success) {
        console.warn('Invalid telemetry batch:', validationResult.error);
        this.metrics.errorCount++;
        return;
      }

      // Send batch
      await this.sendBatch(validationResult.data);

      // Update metrics
      this.metrics.sentCount += batch.events.length;
      this.metrics.bufferedCount = this.buffer.length;
      this.metrics.lastFlush = new Date();

      // Remove sent events from IndexedDB
      if (this.db) {
        const tx = this.db.transaction('events', 'readwrite');
        for (const event of batch.events) {
          await tx.store.delete(event.event_id);
        }
        await tx.done;
      }
    } catch (error) {
      console.error('Failed to flush telemetry batch:', error);
      this.metrics.errorCount++;
      
      // If send failed, put events back in buffer
      // (they're already in IndexedDB)
    }
  }

  getBufferedEvents(): TelemetryEvent[] {
    return [...this.buffer];
  }

  clearBuffer(): void {
    this.buffer = [];
    this.metrics.bufferedCount = 0;
    
    if (this.db) {
      this.db.clear('events').catch(error => {
        console.error('Failed to clear telemetry buffer:', error);
      });
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush
    this.flush();

    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async persistEvent(event: TelemetryEvent): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.put('events', {
        ...event,
        buffered_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to persist telemetry event:', error);
      this.metrics.errorCount++;
    }
  }

  private async sendBatch(batch: TelemetryBatch): Promise<void> {
    const response = await fetch('/api/telemetry/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      throw new Error(`Failed to send telemetry batch: ${response.status} ${response.statusText}`);
    }

    // Store successful batch in IndexedDB for debugging
    if (this.db) {
      await this.db.put('batches', {
        batch,
        sent: true,
        sent_at: new Date().toISOString(),
      });
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let telemetryInstance: TelemetryAggregator | null = null;

export function initTelemetry(config?: Partial<TelemetryConfig>): TelemetryAggregator {
  if (!telemetryInstance) {
    telemetryInstance = new TelemetryAggregator(config);
  }
  return telemetryInstance;
}

export function getTelemetry(): TelemetryAggregator {
  if (!telemetryInstance) {
    throw new Error('Telemetry not initialized. Call initTelemetry() first.');
  }
  return telemetryInstance;
}
