/**
 * Offline Storage & Caching - Background Jobs
 * 
 * Background compaction, eviction, and cleanup jobs with telemetry
 */

import { getStorageManager, StorageManager } from '@/lib/storage/manager';

// ============================================================================
// Job Configuration
// ============================================================================

export interface BackgroundJobConfig {
  compaction: {
    enabled: boolean;
    interval: number; // ms
    retryCount: number;
  };
  cleanup: {
    enabled: boolean;
    interval: number; // ms
    retryCount: number;
  };
  eviction: {
    enabled: boolean;
    checkInterval: number; // ms
    triggerThreshold: number; // bytes
  };
  telemetry: {
    enabled: boolean;
    recordMetrics: boolean;
  };
}

// ============================================================================
// Job Status & Metrics
// ============================================================================

export interface JobExecution {
  jobId: string;
  jobType: 'compaction' | 'cleanup' | 'eviction' | 'health_check';
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number; // ms
  itemsProcessed: number;
  itemsRemoved: number;
  bytesFreed: number;
  error?: string;
  retryCount: number;
}

export interface JobMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number; // ms
  totalBytesFreed: number;
  lastExecution?: Date;
  nextExecution?: Date;
}

// ============================================================================
// Background Job Manager
// ============================================================================

export class BackgroundJobManager {
  private config: BackgroundJobConfig;
  private manager: StorageManager | null = null;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private executions: JobExecution[] = [];
  private metrics: Map<string, JobMetrics> = new Map();
  private telemetryCallback?: (event: any) => void;

  constructor(config: Partial<BackgroundJobConfig> = {}) {
    this.config = {
      compaction: {
        enabled: true,
        interval: 60 * 60 * 1000, // 1 hour
        retryCount: 3,
        ...config.compaction,
      },
      cleanup: {
        enabled: true,
        interval: 2 * 60 * 60 * 1000, // 2 hours
        retryCount: 3,
        ...config.cleanup,
      },
      eviction: {
        enabled: true,
        checkInterval: 30 * 60 * 1000, // 30 minutes
        triggerThreshold: 40 * 1024 * 1024, // 40MB
        ...config.eviction,
      },
      telemetry: {
        enabled: true,
        recordMetrics: true,
        ...config.telemetry,
      },
    };

    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metrics.set('compaction', {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageDuration: 0,
      totalBytesFreed: 0,
    });

    this.metrics.set('cleanup', {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageDuration: 0,
      totalBytesFreed: 0,
    });

    this.metrics.set('eviction', {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageDuration: 0,
      totalBytesFreed: 0,
    });
  }

  // ========================================================================
  // Initialization & Lifecycle
  // ========================================================================

  async initialize(): Promise<void> {
    try {
      this.manager = getStorageManager();

      if (this.config.compaction.enabled) {
        this.startCompactionJob();
      }

      if (this.config.cleanup.enabled) {
        this.startCleanupJob();
      }

      if (this.config.eviction.enabled) {
        this.startEvictionMonitor();
      }

      this.recordTelemetry('job_manager_initialized', {
        config: this.config,
      });
    } catch (error) {
      console.error('Failed to initialize background jobs:', error);
      this.recordTelemetry('job_manager_init_error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async destroy(): Promise<void> {
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();

    this.recordTelemetry('job_manager_destroyed', {
      executionCount: this.executions.length,
    });
  }

  setTelemetryCallback(callback: (event: any) => void): void {
    this.telemetryCallback = callback;
  }

  // ========================================================================
  // Compaction Job
  // ========================================================================

  private startCompactionJob(): void {
    const jobId = `compaction-${Date.now()}`;

    const interval = setInterval(async () => {
      try {
        await this.executeCompaction(jobId);
      } catch (error) {
        console.error('Compaction job failed:', error);
      }
    }, this.config.compaction.interval);

    this.intervals.set('compaction', interval);

    // Run initial compaction after short delay
    setTimeout(async () => {
      try {
        await this.executeCompaction(jobId);
      } catch (error) {
        console.error('Initial compaction failed:', error);
      }
    }, 5000);
  }

  private async executeCompaction(jobId: string): Promise<void> {
    if (!this.manager) return;

    const execution: JobExecution = {
      jobId,
      jobType: 'compaction',
      startedAt: new Date(),
      status: 'running',
      itemsProcessed: 0,
      itemsRemoved: 0,
      bytesFreed: 0,
      retryCount: 0,
    };

    try {
      const startSize = await this.calculateStorageSize();
      const itemsRemoved = await this.manager.compact();
      const endSize = await this.calculateStorageSize();
      const bytesFreed = startSize - endSize;

      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      execution.itemsRemoved = itemsRemoved;
      execution.bytesFreed = Math.max(0, bytesFreed);
      execution.status = 'completed';

      this.updateMetrics('compaction', execution);
      this.executions.push(execution);

      this.recordTelemetry('storage_compaction_completed', {
        bytesFreed: execution.bytesFreed,
        itemsRemoved: execution.itemsRemoved,
        durationMs: execution.duration,
      });
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();
      execution.duration =
        execution.completedAt.getTime() - execution.startedAt.getTime();

      this.updateMetrics('compaction', execution);
      this.executions.push(execution);

      this.recordTelemetry('storage_compaction_failed', {
        error: execution.error,
        durationMs: execution.duration,
      });
    }
  }

  // ========================================================================
  // Cleanup Job
  // ========================================================================

  private startCleanupJob(): void {
    const jobId = `cleanup-${Date.now()}`;

    const interval = setInterval(async () => {
      try {
        await this.executeCleanup(jobId);
      } catch (error) {
        console.error('Cleanup job failed:', error);
      }
    }, this.config.cleanup.interval);

    this.intervals.set('cleanup', interval);

    // Run initial cleanup after short delay
    setTimeout(async () => {
      try {
        await this.executeCleanup(jobId);
      } catch (error) {
        console.error('Initial cleanup failed:', error);
      }
    }, 10000);
  }

  private async executeCleanup(jobId: string): Promise<void> {
    if (!this.manager) return;

    const execution: JobExecution = {
      jobId,
      jobType: 'cleanup',
      startedAt: new Date(),
      status: 'running',
      itemsProcessed: 0,
      itemsRemoved: 0,
      bytesFreed: 0,
      retryCount: 0,
    };

    try {
      const startSize = await this.calculateStorageSize();
      const itemsRemoved = await this.manager.cleanupExpired();
      const endSize = await this.calculateStorageSize();
      const bytesFreed = startSize - endSize;

      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      execution.itemsRemoved = itemsRemoved;
      execution.bytesFreed = Math.max(0, bytesFreed);
      execution.status = 'completed';

      this.updateMetrics('cleanup', execution);
      this.executions.push(execution);

      this.recordTelemetry('storage_cleanup_completed', {
        bytesFreed: execution.bytesFreed,
        itemsRemoved: execution.itemsRemoved,
        durationMs: execution.duration,
      });
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();
      execution.duration =
        execution.completedAt.getTime() - execution.startedAt.getTime();

      this.updateMetrics('cleanup', execution);
      this.executions.push(execution);

      this.recordTelemetry('storage_cleanup_failed', {
        error: execution.error,
        durationMs: execution.duration,
      });
    }
  }

  // ========================================================================
  // Eviction Monitor
  // ========================================================================

  private startEvictionMonitor(): void {
    const jobId = `eviction-${Date.now()}`;

    const interval = setInterval(async () => {
      try {
        await this.checkAndEvict(jobId);
      } catch (error) {
        console.error('Eviction check failed:', error);
      }
    }, this.config.eviction.checkInterval);

    this.intervals.set('eviction', interval);
  }

  private async checkAndEvict(jobId: string): Promise<void> {
    if (!this.manager) return;

    const stats = await this.manager.getStats();

    if (stats.total_size_bytes > this.config.eviction.triggerThreshold) {
      const execution: JobExecution = {
        jobId,
        jobType: 'eviction',
        startedAt: new Date(),
        status: 'running',
        itemsProcessed: stats.total_entities,
        itemsRemoved: 0,
        bytesFreed: 0,
        retryCount: 0,
      };

      try {
        const startSize = stats.total_size_bytes;
        const targetSize = this.config.eviction.triggerThreshold * 0.8;

        // Perform compaction to reduce size
        const itemsRemoved = await this.manager.compact();
        const newStats = await this.manager.getStats();
        const bytesFreed = startSize - newStats.total_size_bytes;

        execution.completedAt = new Date();
        execution.duration =
          execution.completedAt.getTime() - execution.startedAt.getTime();
        execution.itemsRemoved = itemsRemoved;
        execution.bytesFreed = Math.max(0, bytesFreed);
        execution.status = 'completed';

        this.updateMetrics('eviction', execution);
        this.executions.push(execution);

        this.recordTelemetry('storage_eviction_triggered', {
          bytesFreed: execution.bytesFreed,
          itemsRemoved: execution.itemsRemoved,
          durationMs: execution.duration,
          targetSize,
        });
      } catch (error) {
        execution.status = 'failed';
        execution.error = error instanceof Error ? error.message : String(error);
        execution.completedAt = new Date();
        execution.duration =
          execution.completedAt.getTime() - execution.startedAt.getTime();

        this.updateMetrics('eviction', execution);
        this.executions.push(execution);

        this.recordTelemetry('storage_eviction_failed', {
          error: execution.error,
          durationMs: execution.duration,
        });
      }
    }
  }

  // ========================================================================
  // Health Check Job
  // ========================================================================

  async performHealthCheck(): Promise<void> {
    if (!this.manager) return;

    const execution: JobExecution = {
      jobId: `health-check-${Date.now()}`,
      jobType: 'health_check',
      startedAt: new Date(),
      status: 'running',
      itemsProcessed: 0,
      itemsRemoved: 0,
      bytesFreed: 0,
      retryCount: 0,
    };

    try {
      const health = await this.manager.getHealth();
      execution.status = health.status === 'healthy' ? 'completed' : 'failed';
      execution.completedAt = new Date();
      execution.duration =
        execution.completedAt.getTime() - execution.startedAt.getTime();

      this.executions.push(execution);

      this.recordTelemetry('storage_health_check_completed', {
        status: health.status,
        recommendations: health.recommendations,
        durationMs: execution.duration,
      });
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();
      execution.duration =
        execution.completedAt.getTime() - execution.startedAt.getTime();

      this.executions.push(execution);

      this.recordTelemetry('storage_health_check_failed', {
        error: execution.error,
        durationMs: execution.duration,
      });
    }
  }

  // ========================================================================
  // Metrics & Reporting
  // ========================================================================

  private updateMetrics(jobType: string, execution: JobExecution): void {
    const metrics = this.metrics.get(jobType);
    if (!metrics) return;

    metrics.totalExecutions++;
    if (execution.status === 'completed') {
      metrics.successfulExecutions++;
    } else {
      metrics.failedExecutions++;
    }

    metrics.totalBytesFreed += execution.bytesFreed;

    if (execution.duration) {
      const avgDuration =
        (metrics.averageDuration * (metrics.totalExecutions - 1) +
          execution.duration) /
        metrics.totalExecutions;
      metrics.averageDuration = avgDuration;
    }

    metrics.lastExecution = new Date();
  }

  getMetrics(jobType?: string): Map<string, JobMetrics> | JobMetrics | undefined {
    if (jobType) {
      return this.metrics.get(jobType);
    }
    return this.metrics;
  }

  getExecutions(
    jobType?: string,
    limit: number = 100
  ): JobExecution[] {
    let executions = this.executions;
    if (jobType) {
      executions = executions.filter(e => e.jobType === jobType);
    }
    return executions.slice(-limit);
  }

  // ========================================================================
  // Utilities
  // ========================================================================

  private async calculateStorageSize(): Promise<number> {
    if (!this.manager) return 0;

    const stats = await this.manager.getStats();
    return stats.total_size_bytes;
  }

  private recordTelemetry(eventName: string, data?: any): void {
    if (!this.config.telemetry.enabled) return;

    const event = {
      category: 'storage',
      event_name: eventName,
      severity: 'info' as const,
      timestamp: new Date().toISOString(),
      data: {
        ...data,
        source: 'background_job_manager',
      },
    };

    if (this.telemetryCallback) {
      this.telemetryCallback(event);
    }
  }
}

// ============================================================================
// Singleton
// ============================================================================

let jobManagerInstance: BackgroundJobManager | null = null;

export async function initBackgroundJobs(
  config?: Partial<BackgroundJobConfig>
): Promise<BackgroundJobManager> {
  if (jobManagerInstance) {
    return jobManagerInstance;
  }

  jobManagerInstance = new BackgroundJobManager(config);
  await jobManagerInstance.initialize();
  return jobManagerInstance;
}

export function getBackgroundJobManager(): BackgroundJobManager {
  if (!jobManagerInstance) {
    throw new Error('Background job manager not initialized. Call initBackgroundJobs first.');
  }
  return jobManagerInstance;
}
