/**
 * FieldSession Schema Tests
 * 
 * Validates:
 * - State machine transitions
 * - Validation rules
 * - Aggregation logic
 * - Sync queue behavior
 * - Deterministic computations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Enums
  SessionState,
  SyncStatus,
  WeatherCondition,
  SessionVisibility,
  // Interfaces
  FieldSession,
  FindLog,
  // Schemas
  CreateFieldSessionSchema,
  UpdateFieldSessionSchema,
  CreateFindLogSchema,
  UpdateFindLogSchema,
  SessionStateTransitionSchema,
  // Functions
  isValidStateTransition,
  canAddFindLog,
  canFinalizeSession,
  canCancelSession,
  calculateSessionDuration,
  aggregateSessionMetrics,
  validateSessionForSync,
  getSyncPriority,
  calculateNextRetry,
  VALID_STATE_TRANSITIONS,
} from './field-session-schema';

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function createMockSession(overrides?: Partial<FieldSession>): FieldSession {
  return {
    id: 'session-123',
    user_id: 'user-456',
    state: SessionState.DRAFT,
    sync_status: SyncStatus.LOCAL_ONLY,
    title: 'Test Session',
    visibility: SessionVisibility.PRIVATE,
    start_time: new Date('2024-01-01T10:00:00Z'),
    total_specimens: 0,
    unique_materials: 0,
    materials_found: [],
    client_created_at: new Date('2024-01-01T10:00:00Z'),
    client_updated_at: new Date('2024-01-01T10:00:00Z'),
    version: 1,
    device_id: 'device-789',
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:00:00Z'),
    ...overrides,
  };
}

function createMockFindLog(overrides?: Partial<FindLog>): FindLog {
  return {
    id: 'find-123',
    session_id: 'session-123',
    user_id: 'user-456',
    photo_paths: [],
    found_at: new Date('2024-01-01T11:00:00Z'),
    sync_status: SyncStatus.LOCAL_ONLY,
    client_created_at: new Date('2024-01-01T11:00:00Z'),
    client_updated_at: new Date('2024-01-01T11:00:00Z'),
    version: 1,
    device_id: 'device-789',
    created_at: new Date('2024-01-01T11:00:00Z'),
    updated_at: new Date('2024-01-01T11:00:00Z'),
    ...overrides,
  };
}

// ============================================================================
// STATE MACHINE TESTS
// ============================================================================

describe('Session State Machine', () => {
  it('allows DRAFT -> ACTIVE transition', () => {
    expect(isValidStateTransition(SessionState.DRAFT, SessionState.ACTIVE)).toBe(true);
  });

  it('allows DRAFT -> CANCELLED transition', () => {
    expect(isValidStateTransition(SessionState.DRAFT, SessionState.CANCELLED)).toBe(true);
  });

  it('disallows DRAFT -> COMPLETED transition', () => {
    expect(isValidStateTransition(SessionState.DRAFT, SessionState.COMPLETED)).toBe(false);
  });

  it('allows ACTIVE -> PAUSED transition', () => {
    expect(isValidStateTransition(SessionState.ACTIVE, SessionState.PAUSED)).toBe(true);
  });

  it('allows ACTIVE -> FINALIZING transition', () => {
    expect(isValidStateTransition(SessionState.ACTIVE, SessionState.FINALIZING)).toBe(true);
  });

  it('allows PAUSED -> ACTIVE transition (resume)', () => {
    expect(isValidStateTransition(SessionState.PAUSED, SessionState.ACTIVE)).toBe(true);
  });

  it('allows FINALIZING -> COMPLETED transition', () => {
    expect(isValidStateTransition(SessionState.FINALIZING, SessionState.COMPLETED)).toBe(true);
  });

  it('allows FINALIZING -> CONFLICT transition', () => {
    expect(isValidStateTransition(SessionState.FINALIZING, SessionState.CONFLICT)).toBe(true);
  });

  it('allows CONFLICT -> COMPLETED transition (after resolution)', () => {
    expect(isValidStateTransition(SessionState.CONFLICT, SessionState.COMPLETED)).toBe(true);
  });

  it('disallows transitions from terminal state COMPLETED', () => {
    expect(isValidStateTransition(SessionState.COMPLETED, SessionState.ACTIVE)).toBe(false);
    expect(isValidStateTransition(SessionState.COMPLETED, SessionState.CANCELLED)).toBe(false);
  });

  it('disallows transitions from terminal state CANCELLED', () => {
    expect(isValidStateTransition(SessionState.CANCELLED, SessionState.ACTIVE)).toBe(false);
    expect(isValidStateTransition(SessionState.CANCELLED, SessionState.COMPLETED)).toBe(false);
  });
});

// ============================================================================
// BUSINESS RULE TESTS
// ============================================================================

describe('Business Rules', () => {
  describe('canAddFindLog', () => {
    it('allows adding FindLog when session is ACTIVE', () => {
      const session = createMockSession({ state: SessionState.ACTIVE });
      expect(canAddFindLog(session)).toBe(true);
    });

    it('allows adding FindLog when session is PAUSED', () => {
      const session = createMockSession({ state: SessionState.PAUSED });
      expect(canAddFindLog(session)).toBe(true);
    });

    it('disallows adding FindLog when session is DRAFT', () => {
      const session = createMockSession({ state: SessionState.DRAFT });
      expect(canAddFindLog(session)).toBe(false);
    });

    it('disallows adding FindLog when session is COMPLETED', () => {
      const session = createMockSession({ state: SessionState.COMPLETED });
      expect(canAddFindLog(session)).toBe(false);
    });
  });

  describe('canFinalizeSession', () => {
    it('allows finalizing ACTIVE session with specimens', () => {
      const session = createMockSession({
        state: SessionState.ACTIVE,
        total_specimens: 5,
      });
      expect(canFinalizeSession(session)).toBe(true);
    });

    it('disallows finalizing session with zero specimens', () => {
      const session = createMockSession({
        state: SessionState.ACTIVE,
        total_specimens: 0,
      });
      expect(canFinalizeSession(session)).toBe(false);
    });

    it('disallows finalizing DRAFT session', () => {
      const session = createMockSession({
        state: SessionState.DRAFT,
        total_specimens: 5,
      });
      expect(canFinalizeSession(session)).toBe(false);
    });
  });

  describe('canCancelSession', () => {
    it('allows cancelling DRAFT session', () => {
      const session = createMockSession({ state: SessionState.DRAFT });
      expect(canCancelSession(session)).toBe(true);
    });

    it('allows cancelling ACTIVE session', () => {
      const session = createMockSession({ state: SessionState.ACTIVE });
      expect(canCancelSession(session)).toBe(true);
    });

    it('disallows cancelling COMPLETED session', () => {
      const session = createMockSession({ state: SessionState.COMPLETED });
      expect(canCancelSession(session)).toBe(false);
    });

    it('disallows cancelling already CANCELLED session', () => {
      const session = createMockSession({ state: SessionState.CANCELLED });
      expect(canCancelSession(session)).toBe(false);
    });
  });
});

// ============================================================================
// DURATION CALCULATION TESTS
// ============================================================================

describe('calculateSessionDuration', () => {
  it('calculates duration in seconds between start and end', () => {
    const start = new Date('2024-01-01T10:00:00Z');
    const end = new Date('2024-01-01T12:30:00Z');
    const duration = calculateSessionDuration(start, end);
    expect(duration).toBe(9000); // 2.5 hours = 9000 seconds
  });

  it('calculates duration from start to now if no end time provided', () => {
    const start = new Date(Date.now() - 5000); // 5 seconds ago
    const duration = calculateSessionDuration(start);
    expect(duration).toBeGreaterThanOrEqual(4); // Allow for execution time
    expect(duration).toBeLessThan(10);
  });

  it('returns 0 for same start and end time', () => {
    const time = new Date('2024-01-01T10:00:00Z');
    const duration = calculateSessionDuration(time, time);
    expect(duration).toBe(0);
  });
});

// ============================================================================
// AGGREGATION TESTS
// ============================================================================

describe('aggregateSessionMetrics', () => {
  it('aggregates empty FindLog array', () => {
    const metrics = aggregateSessionMetrics([]);
    expect(metrics).toEqual({
      total_specimens: 0,
      unique_materials: 0,
      total_weight_grams: 0,
      average_quality: 0,
      materials_found: [],
    });
  });

  it('aggregates single FindLog entry', () => {
    const findLogs = [
      createMockFindLog({
        material_id: 'quartz-123',
        quality_rating: 4,
        weight_grams: 150,
      }),
    ];
    
    const metrics = aggregateSessionMetrics(findLogs);
    expect(metrics).toEqual({
      total_specimens: 1,
      unique_materials: 1,
      total_weight_grams: 150,
      average_quality: 4,
      materials_found: ['quartz-123'],
    });
  });

  it('aggregates multiple FindLog entries with different materials', () => {
    const findLogs = [
      createMockFindLog({
        material_id: 'quartz-123',
        quality_rating: 4,
        weight_grams: 150,
      }),
      createMockFindLog({
        material_id: 'amethyst-456',
        quality_rating: 5,
        weight_grams: 200,
      }),
      createMockFindLog({
        material_id: 'quartz-123', // Duplicate material
        quality_rating: 3,
        weight_grams: 100,
      }),
    ];
    
    const metrics = aggregateSessionMetrics(findLogs);
    expect(metrics).toEqual({
      total_specimens: 3,
      unique_materials: 2, // quartz and amethyst
      total_weight_grams: 450,
      average_quality: 4, // (4 + 5 + 3) / 3
      materials_found: ['quartz-123', 'amethyst-456'],
    });
  });

  it('handles FindLog entries without material_id', () => {
    const findLogs = [
      createMockFindLog({
        material_id: 'quartz-123',
        quality_rating: 4,
      }),
      createMockFindLog({
        // No material_id
        quality_rating: 3,
      }),
    ];
    
    const metrics = aggregateSessionMetrics(findLogs);
    expect(metrics.total_specimens).toBe(2);
    expect(metrics.unique_materials).toBe(1); // Only quartz counted
    expect(metrics.materials_found).toEqual(['quartz-123']);
  });

  it('handles FindLog entries without quality_rating', () => {
    const findLogs = [
      createMockFindLog({ quality_rating: 4 }),
      createMockFindLog({ quality_rating: 5 }),
      createMockFindLog({ /* No quality_rating */ }),
    ];
    
    const metrics = aggregateSessionMetrics(findLogs);
    expect(metrics.total_specimens).toBe(3);
    expect(metrics.average_quality).toBe(4.5); // (4 + 5) / 2, ignores missing
  });

  it('handles FindLog entries without weight', () => {
    const findLogs = [
      createMockFindLog({ weight_grams: 100 }),
      createMockFindLog({ /* No weight */ }),
      createMockFindLog({ weight_grams: 200 }),
    ];
    
    const metrics = aggregateSessionMetrics(findLogs);
    expect(metrics.total_weight_grams).toBe(300); // Ignores missing weights
  });
});

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('Validation Schemas', () => {
  describe('CreateFieldSessionSchema', () => {
    it('validates valid session creation', () => {
      const input = {
        title: 'Morning Rockhounding',
        description: 'Early morning session at Crystal Peak',
        location_id: '123e4567-e89b-12d3-a456-426614174000',
        start_time: new Date(),
        device_id: 'device-123',
      };
      
      const result = CreateFieldSessionSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects title shorter than 3 characters', () => {
      const input = {
        title: 'Ab',
        device_id: 'device-123',
      };
      
      const result = CreateFieldSessionSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('applies default values for optional fields', () => {
      const input = {
        title: 'Test Session',
        device_id: 'device-123',
      };
      
      const result = CreateFieldSessionSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.visibility).toBe(SessionVisibility.PRIVATE);
        expect(result.data.start_time).toBeInstanceOf(Date);
      }
    });

    it('validates temperature range', () => {
      const validInput = {
        title: 'Test Session',
        temperature_celsius: 25,
        device_id: 'device-123',
      };
      expect(CreateFieldSessionSchema.safeParse(validInput).success).toBe(true);

      const tooHot = { ...validInput, temperature_celsius: 70 };
      expect(CreateFieldSessionSchema.safeParse(tooHot).success).toBe(false);

      const tooCold = { ...validInput, temperature_celsius: -60 };
      expect(CreateFieldSessionSchema.safeParse(tooCold).success).toBe(false);
    });
  });

  describe('CreateFindLogSchema', () => {
    it('validates valid FindLog creation', () => {
      const input = {
        session_id: '123e4567-e89b-12d3-a456-426614174000',
        material_id: '123e4567-e89b-12d3-a456-426614174001',
        quality_rating: 4,
        weight_grams: 150.5,
        notes: 'Beautiful quartz crystal',
        device_id: 'device-123',
      };
      
      const result = CreateFindLogSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects quality_rating outside 1-5 range', () => {
      const input = {
        session_id: '123e4567-e89b-12d3-a456-426614174000',
        quality_rating: 6,
        device_id: 'device-123',
      };
      
      const result = CreateFindLogSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects negative weight', () => {
      const input = {
        session_id: '123e4567-e89b-12d3-a456-426614174000',
        weight_grams: -50,
        device_id: 'device-123',
      };
      
      const result = CreateFindLogSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates specimen dimensions', () => {
      const input = {
        session_id: '123e4567-e89b-12d3-a456-426614174000',
        dimensions_mm: { length: 50, width: 30, height: 20 },
        device_id: 'device-123',
      };
      
      const result = CreateFindLogSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('SessionStateTransitionSchema', () => {
    it('validates valid state transition', () => {
      const input = {
        from_state: SessionState.DRAFT,
        to_state: SessionState.ACTIVE,
      };
      
      const result = SessionStateTransitionSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid state transition', () => {
      const input = {
        from_state: SessionState.COMPLETED,
        to_state: SessionState.ACTIVE,
      };
      
      const result = SessionStateTransitionSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('validateSessionForSync', () => {
  it('validates complete session ready for sync', () => {
    const session = createMockSession({
      state: SessionState.COMPLETED,
      end_time: new Date('2024-01-01T12:00:00Z'),
    });
    
    const result = validateSessionForSync(session);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects session without user_id', () => {
    const session = createMockSession({ user_id: '' });
    
    const result = validateSessionForSync(session);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Session must have user_id');
  });

  it('rejects session with invalid title', () => {
    const session = createMockSession({ title: 'AB' });
    
    const result = validateSessionForSync(session);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Session must have valid title');
  });

  it('rejects COMPLETED session without end_time', () => {
    const session = createMockSession({
      state: SessionState.COMPLETED,
      end_time: undefined,
    });
    
    const result = validateSessionForSync(session);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Completed session must have end_time');
  });

  it('rejects session with negative total_specimens', () => {
    const session = createMockSession({ total_specimens: -1 });
    
    const result = validateSessionForSync(session);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('total_specimens cannot be negative');
  });
});

// ============================================================================
// SYNC QUEUE TESTS
// ============================================================================

describe('Sync Queue', () => {
  describe('getSyncPriority', () => {
    it('assigns high priority to session.created events', () => {
      expect(getSyncPriority('session.created')).toBe(100);
    });

    it('assigns medium priority to findlog.added events', () => {
      expect(getSyncPriority('findlog.added')).toBe(80);
    });

    it('assigns low priority to session.cancelled events', () => {
      expect(getSyncPriority('session.cancelled')).toBe(20);
    });

    it('returns 0 for unknown event types', () => {
      expect(getSyncPriority('unknown.event')).toBe(0);
    });

    it('prioritizes session.created over findlog.added', () => {
      const sessionPriority = getSyncPriority('session.created');
      const findlogPriority = getSyncPriority('findlog.added');
      expect(sessionPriority).toBeGreaterThan(findlogPriority);
    });
  });

  describe('calculateNextRetry', () => {
    it('calculates exponential backoff for retries', () => {
      const retry0 = calculateNextRetry(0);
      const retry1 = calculateNextRetry(1);
      const retry2 = calculateNextRetry(2);
      
      const delay0 = retry0.getTime() - Date.now();
      const delay1 = retry1.getTime() - Date.now();
      const delay2 = retry2.getTime() - Date.now();
      
      // Each retry should roughly double the delay
      expect(delay1).toBeGreaterThan(delay0);
      expect(delay2).toBeGreaterThan(delay1);
    });

    it('caps retry delay at maximum', () => {
      const retryHigh = calculateNextRetry(20); // Very high retry count
      const delay = retryHigh.getTime() - Date.now();
      
      expect(delay).toBeLessThanOrEqual(60000); // Max 60 seconds
    });

    it('increases delay on successive retries', () => {
      const delays: number[] = [];
      for (let i = 0; i < 5; i++) {
        const retry = calculateNextRetry(i);
        delays.push(retry.getTime() - Date.now());
      }
      
      // Each delay should be >= previous (monotonically increasing)
      for (let i = 1; i < delays.length; i++) {
        expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
      }
    });
  });
});

// ============================================================================
// DETERMINISTIC COMPUTATION TESTS
// ============================================================================

describe('Deterministic Guarantees', () => {
  it('produces same aggregation given same FindLog array', () => {
    const findLogs = [
      createMockFindLog({
        id: 'find-1',
        material_id: 'quartz-123',
        quality_rating: 4,
        weight_grams: 150,
      }),
      createMockFindLog({
        id: 'find-2',
        material_id: 'amethyst-456',
        quality_rating: 5,
        weight_grams: 200,
      }),
    ];
    
    const metrics1 = aggregateSessionMetrics(findLogs);
    const metrics2 = aggregateSessionMetrics(findLogs);
    
    expect(metrics1).toEqual(metrics2);
  });

  it('produces same duration calculation given same timestamps', () => {
    const start = new Date('2024-01-01T10:00:00Z');
    const end = new Date('2024-01-01T12:00:00Z');
    
    const duration1 = calculateSessionDuration(start, end);
    const duration2 = calculateSessionDuration(start, end);
    
    expect(duration1).toBe(duration2);
  });

  it('validates state transitions consistently', () => {
    const from = SessionState.ACTIVE;
    const to = SessionState.PAUSED;
    
    expect(isValidStateTransition(from, to)).toBe(true);
    expect(isValidStateTransition(from, to)).toBe(true); // Same result
  });

  it('aggregates FindLog entries in any order', () => {
    const findLog1 = createMockFindLog({
      material_id: 'quartz-123',
      quality_rating: 4,
      weight_grams: 150,
    });
    const findLog2 = createMockFindLog({
      material_id: 'amethyst-456',
      quality_rating: 5,
      weight_grams: 200,
    });
    
    const metricsAB = aggregateSessionMetrics([findLog1, findLog2]);
    const metricsBA = aggregateSessionMetrics([findLog2, findLog1]);
    
    // Should produce same totals regardless of order
    expect(metricsAB.total_specimens).toBe(metricsBA.total_specimens);
    expect(metricsAB.unique_materials).toBe(metricsBA.unique_materials);
    expect(metricsAB.total_weight_grams).toBe(metricsBA.total_weight_grams);
    expect(metricsAB.average_quality).toBe(metricsBA.average_quality);
    // materials_found order may differ, so compare as sets
    expect(new Set(metricsAB.materials_found)).toEqual(new Set(metricsBA.materials_found));
  });
});
