/**
 * Truth Clock / Evidence Availability R1
 *
 * Production change that would fail these tests: treating retrievedAt as
 * sourceUpdatedAt, treating fresh as true, treating a zero-result partial
 * query as confirmed absence, or mutating UGES certainty from freshness.
 */

import { describe, expect, it } from 'vitest';

import {
  BuildingBlockLifecycleStatus,
  GEOLOGICAL_LAYER_REGISTRY_BLOCK_ID,
  OBSERVATION_BLOCK_ID,
  PROVENANCE_ACTIVITY_BLOCK_ID,
  RESOURCE_CATALOG_BLOCK_ID,
  SOURCE_GOVERNANCE_BLOCK_ID,
  UGES_BLOCK_ID,
  createBuildingBlockRegistry,
  getBuildingBlock,
  getLatestStableBuildingBlock,
} from './building-block-registry';
import { EvidenceAuthorityClass, EvidenceCertainty } from './universal-geological-evidence-schema';

import {
  TRUTH_CLOCK_SCHEMA_VERSION,
  EvidenceAvailabilityState,
  EvidenceAvailabilityReasonCode,
  FreshnessState,
  ReferenceTimestampKind,
  TemporalFitness,
  TemporalUseContext,
  availabilityAuthorizesUse,
  confirmedAbsenceEstablished,
  evaluateAvailability,
  evaluateFreshness,
  evaluateTemporalFitness,
  projectObservationTimesToTruthClock,
  projectResourceTemporalToTruthClock,
  provenanceExecutionIsTruthState,
  requiresRevalidation,
  truthClockCreatesUgesAssertion,
  truthClockMutatesCertainty,
  validateEvidenceAvailability,
  validateTruthClock,
  type FreshnessPolicy,
  type TruthClock,
} from './truth-clock-availability';

const NOW = '2026-09-22T21:00:00.000Z';
const DAY = 24 * 60 * 60 * 1000;
const YEAR = 365 * DAY;

function clock(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: 'clock-1',
    schemaVersion: TRUTH_CLOCK_SCHEMA_VERSION,
    ...overrides,
  };
}

function policy(overrides: Partial<FreshnessPolicy> = {}): FreshnessPolicy {
  return {
    maxAgeMs: 30 * DAY,
    warningAgeMs: 7 * DAY,
    revalidateBeforeUse: false,
    useContexts: [],
    referenceTimestampKind: ReferenceTimestampKind.SOURCE_UPDATED,
    ...overrides,
  };
}

describe('TruthClock', () => {
  it('accepts a partial clock and preserves distinct timestamps', () => {
    const empty = validateTruthClock(clock());
    expect(empty.phenomenonTime).toBeUndefined();
    expect(empty.retrievedAt).toBeUndefined();
    expect(empty.sourceUpdatedAt).toBeUndefined();

    const parsed = validateTruthClock(
      clock({
        phenomenonTime: '2020-01-01T00:00:00.000Z',
        publishedAt: '2026-09-21T00:00:00.000Z',
        effectiveFrom: '2026-10-01T00:00:00.000Z',
        retrievedAt: NOW,
        sourceUpdatedAt: '2024-09-22T21:00:00.000Z',
        verifiedAt: '2026-09-22T22:00:00.000Z',
        decisionUsedAt: '2026-09-22T23:00:00.000Z',
      })
    );
    expect(parsed.phenomenonTime).toBe('2020-01-01T00:00:00.000Z');
    expect(parsed.publishedAt).not.toBe(parsed.effectiveFrom);
    expect(parsed.retrievedAt).not.toBe(parsed.sourceUpdatedAt);
    expect(parsed.verifiedAt).toBe('2026-09-22T22:00:00.000Z');
    expect(parsed.decisionUsedAt).toBe('2026-09-22T23:00:00.000Z');
  });

  it('allows future timestamps, equal bounds, and open-ended intervals', () => {
    const parsed = validateTruthClock(
      clock({
        effectiveFrom: '2099-01-01T00:00:00.000Z',
        effectiveTo: '2099-01-01T00:00:00.000Z',
        publishedAt: '2099-06-01T00:00:00.000Z',
      })
    );
    expect(parsed.effectiveFrom).toBe(parsed.effectiveTo);
    expect(parsed.publishedAt).toBe('2099-06-01T00:00:00.000Z');
    const open = validateTruthClock(clock({ effectiveFrom: '2020-01-01T00:00:00.000Z' }));
    expect(open.effectiveTo).toBeUndefined();
  });

  it('rejects effectiveTo before effectiveFrom and does not infer missing times', () => {
    expect(() =>
      validateTruthClock(
        clock({
          effectiveFrom: '2026-02-01T00:00:00.000Z',
          effectiveTo: '2026-01-01T00:00:00.000Z',
        })
      )
    ).toThrow();
    const parsed = validateTruthClock(
      clock({
        publishedAt: '2026-09-21T00:00:00.000Z',
        retrievedAt: NOW,
      })
    );
    expect(parsed.effectiveFrom).toBeUndefined();
    expect(parsed.sourceUpdatedAt).toBeUndefined();
  });
});

describe('freshness', () => {
  const base = validateTruthClock(
    clock({ sourceUpdatedAt: '2026-09-20T21:00:00.000Z' })
  ) as TruthClock;

  it('evaluates CURRENT, AGING, REVALIDATION_REQUIRED, STALE, and UNKNOWN', () => {
    expect(
      evaluateFreshness(base, policy({ maxAgeMs: 30 * DAY, warningAgeMs: 7 * DAY }), NOW)
    ).toBe(FreshnessState.CURRENT);
    const aging = validateTruthClock(clock({ sourceUpdatedAt: '2026-09-10T21:00:00.000Z' }));
    expect(evaluateFreshness(aging, policy(), NOW)).toBe(FreshnessState.AGING);
    const due = validateTruthClock(
      clock({
        sourceUpdatedAt: '2026-09-20T21:00:00.000Z',
        revalidateAfter: '2026-09-21T00:00:00.000Z',
      })
    );
    expect(
      evaluateFreshness(due, policy({ revalidateBeforeUse: true, warningAgeMs: YEAR }), NOW)
    ).toBe(FreshnessState.REVALIDATION_REQUIRED);
    const stale = validateTruthClock(clock({ sourceUpdatedAt: '2024-01-01T00:00:00.000Z' }));
    expect(evaluateFreshness(stale, policy({ maxAgeMs: 30 * DAY }), NOW)).toBe(
      FreshnessState.STALE
    );
    expect(evaluateFreshness(validateTruthClock(clock()), policy(), NOW)).toBe(
      FreshnessState.UNKNOWN
    );
  });

  it('keeps stale evidence and does not change authority, confidence, or truth', () => {
    const stale = validateTruthClock(clock({ sourceUpdatedAt: '2020-01-01T00:00:00.000Z' }));
    const before = structuredClone(stale);
    const state = evaluateFreshness(stale, policy(), NOW);
    expect(state).toBe(FreshnessState.STALE);
    expect(stale).toEqual(before);
    expect(truthClockMutatesCertainty(stale)).toBe(false);
    expect(truthClockCreatesUgesAssertion(stale)).toBe(false);
    expect(Object.values(EvidenceCertainty)).not.toContain('HIGH');
    expect(Object.values(EvidenceAuthorityClass)).toContain('PRIMARY_AUTHORITY');
    expect(JSON.stringify(stale)).not.toContain('confidence');
  });

  it('does not treat a recent retrieval as a recent source update', () => {
    const parsed = validateTruthClock(
      clock({
        retrievedAt: NOW,
        sourceUpdatedAt: '2024-09-22T21:00:00.000Z',
      })
    );
    expect(
      evaluateFreshness(
        parsed,
        policy({ referenceTimestampKind: ReferenceTimestampKind.RETRIEVED, maxAgeMs: DAY }),
        NOW
      )
    ).toBe(FreshnessState.CURRENT);
    expect(
      evaluateFreshness(
        parsed,
        policy({
          referenceTimestampKind: ReferenceTimestampKind.SOURCE_UPDATED,
          maxAgeMs: 30 * DAY,
        }),
        NOW
      )
    ).toBe(FreshnessState.STALE);
  });
});

describe('availability and coverage', () => {
  it('keeps availability states and reasons distinct', () => {
    const missing = validateEvidenceAvailability({
      state: EvidenceAvailabilityState.MISSING,
      reason: { code: EvidenceAvailabilityReasonCode.NO_RECORD_RETURNED, detail: 'empty page' },
    });
    const failed = validateEvidenceAvailability({
      state: EvidenceAvailabilityState.FETCH_FAILED,
      reason: { code: EvidenceAvailabilityReasonCode.NETWORK_FAILURE },
    });
    const gap = validateEvidenceAvailability({
      state: EvidenceAvailabilityState.COVERAGE_GAP,
      reason: { code: EvidenceAvailabilityReasonCode.GEOGRAPHIC_COVERAGE_GAP },
      geometryCoverage: 'PARTIAL',
      recordCoverage: 'UNKNOWN',
    });
    const unresolved = validateEvidenceAvailability({
      state: EvidenceAvailabilityState.UNRESOLVED,
    });
    const conflicted = validateEvidenceAvailability({
      state: EvidenceAvailabilityState.CONFLICTED,
      reason: { code: EvidenceAvailabilityReasonCode.SOURCE_CONFLICT },
    });
    const na = validateEvidenceAvailability({
      state: EvidenceAvailabilityState.NOT_APPLICABLE,
      reason: { code: EvidenceAvailabilityReasonCode.NOT_APPLICABLE },
    });
    const restricted = validateEvidenceAvailability({
      state: EvidenceAvailabilityState.ACCESS_RESTRICTED,
      reason: { code: EvidenceAvailabilityReasonCode.AUTH_REQUIRED },
    });
    expect(missing.state).not.toBe(failed.state);
    expect(gap.state).not.toBe(missing.state);
    expect(unresolved.state).not.toBe(conflicted.state);
    expect(na.state).not.toBe(EvidenceAvailabilityState.UNKNOWN);
    expect(restricted.reason?.code).toBe(EvidenceAvailabilityReasonCode.AUTH_REQUIRED);
    expect(gap.geometryCoverage).toBe('PARTIAL');
    expect(gap.recordCoverage).toBe('UNKNOWN');
    expect(availabilityAuthorizesUse(restricted)).toBe(false);
    expect(JSON.stringify(restricted)).not.toContain('PROHIBITED');
  });

  it('does not treat zero results as confirmed absence', () => {
    const partial = evaluateAvailability({
      state: EvidenceAvailabilityState.MISSING,
      resultCount: 0,
      geometryCoverage: 'PARTIAL',
      recordCoverage: 'PARTIAL',
      temporalCoverage: 'UNKNOWN',
    });
    const unknown = evaluateAvailability({
      state: EvidenceAvailabilityState.MISSING,
      resultCount: 0,
      geometryCoverage: 'UNKNOWN',
      recordCoverage: 'UNKNOWN',
      temporalCoverage: 'UNKNOWN',
    });
    const complete = evaluateAvailability({
      state: EvidenceAvailabilityState.AVAILABLE,
      resultCount: 0,
      geometryCoverage: 'COMPLETE',
      recordCoverage: 'COMPLETE',
      temporalCoverage: 'COMPLETE',
    });
    expect(confirmedAbsenceEstablished(partial)).toBe(false);
    expect(confirmedAbsenceEstablished(unknown)).toBe(false);
    expect(confirmedAbsenceEstablished(complete)).toBe(false);
    expect(complete.recordCoverage).toBe('COMPLETE');
  });
});

describe('temporal fitness', () => {
  it('can be fit for historical review and not fit for a collection decision', () => {
    const geologic = validateTruthClock(clock({ sourceUpdatedAt: '2016-01-01T00:00:00.000Z' }));
    const policies: FreshnessPolicy[] = [
      policy({
        useContexts: [TemporalUseContext.HISTORICAL_REVIEW],
        maxAgeMs: 50 * YEAR,
        warningAgeMs: 20 * YEAR,
        revalidateBeforeUse: false,
      }),
      policy({
        useContexts: [TemporalUseContext.COLLECTION_DECISION],
        maxAgeMs: 30 * DAY,
        revalidateBeforeUse: true,
      }),
    ];
    expect(
      evaluateTemporalFitness(geologic, policies, TemporalUseContext.HISTORICAL_REVIEW, NOW)
    ).toBe(TemporalFitness.FIT);
    expect(
      evaluateTemporalFitness(geologic, policies, TemporalUseContext.COLLECTION_DECISION, NOW)
    ).toBe(TemporalFitness.NOT_FIT);
  });

  it('respects revalidate-before-use and unknown reference timestamps', () => {
    const recent = validateTruthClock(clock({ sourceUpdatedAt: '2026-09-21T21:00:00.000Z' }));
    expect(requiresRevalidation(recent, policy({ revalidateBeforeUse: true }), NOW)).toBe(true);
    expect(
      evaluateTemporalFitness(
        recent,
        [policy({ revalidateBeforeUse: true, useContexts: [TemporalUseContext.FIELD_NAVIGATION] })],
        TemporalUseContext.FIELD_NAVIGATION,
        NOW
      )
    ).toBe(TemporalFitness.REVALIDATION_REQUIRED);
    const unknown = validateTruthClock(clock({ phenomenonTime: '2026-09-01T00:00:00.000Z' }));
    expect(
      evaluateFreshness(
        unknown,
        policy({ referenceTimestampKind: ReferenceTimestampKind.SOURCE_UPDATED }),
        NOW
      )
    ).toBe(FreshnessState.UNKNOWN);
    expect(
      evaluateTemporalFitness(
        unknown,
        [policy({ referenceTimestampKind: ReferenceTimestampKind.SOURCE_UPDATED })],
        TemporalUseContext.SCIENTIFIC_ANALYSIS,
        NOW
      )
    ).toBe(TemporalFitness.UNKNOWN);
  });
});

describe('integrations', () => {
  it('projects resource and observation times without fabrication', () => {
    const fromResource = projectResourceTemporalToTruthClock({
      publishedAt: '2026-09-21T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      effectiveFrom: '2026-10-01T00:00:00.000Z',
    });
    expect(fromResource.publishedAt).toBe('2026-09-21T00:00:00.000Z');
    expect(fromResource.sourceUpdatedAt).toBe('2024-01-01T00:00:00.000Z');
    expect(fromResource.effectiveFrom).toBe('2026-10-01T00:00:00.000Z');
    expect(fromResource.retrievedAt).toBeUndefined();
    expect(fromResource.phenomenonTime).toBeUndefined();

    const sparse = projectResourceTemporalToTruthClock({ publishedAt: '2026-01-01T00:00:00.000Z' });
    expect(sparse.effectiveFrom).toBeUndefined();
    expect(sparse.sourceUpdatedAt).toBeUndefined();

    const fromObservation = projectObservationTimesToTruthClock({
      observedAt: '1990-06-15T12:00:00.000Z',
      recordedAt: NOW,
    });
    expect(fromObservation.phenomenonTime).toBe('1990-06-15T12:00:00.000Z');
    expect(fromObservation.sourceRecordedAt).toBe(NOW);
    const observationOnly = projectObservationTimesToTruthClock({
      observedAt: '1990-06-15T12:00:00.000Z',
    });
    expect(observationOnly.sourceRecordedAt).toBeUndefined();
  });

  it('keeps provenance execution time distinct from retrievedAt', () => {
    expect(
      provenanceExecutionIsTruthState({
        startedAt: '2026-09-22T20:00:00.000Z',
        endedAt: '2026-09-22T20:05:00.000Z',
      })
    ).toBe(false);
    const parsed = validateTruthClock(clock({ retrievedAt: NOW }));
    expect(parsed.retrievedAt).not.toBe('2026-09-22T20:05:00.000Z');
  });
});

describe('building block promotion', () => {
  it('promotes truth-clock to STABLE 1.0.0 and keeps DRAFT 0.1.0', () => {
    const registry = createBuildingBlockRegistry();
    expect(getLatestStableBuildingBlock(registry, 'rockhounding:truth-clock')?.version).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
    });
    expect(
      getBuildingBlock(registry, 'rockhounding:truth-clock', { major: 0, minor: 1, patch: 0 })
        ?.lifecycleStatus
    ).toBe(BuildingBlockLifecycleStatus.DRAFT);
  });

  it('leaves existing stable versions unchanged', () => {
    const registry = createBuildingBlockRegistry();
    expect(getLatestStableBuildingBlock(registry, UGES_BLOCK_ID)?.version).toEqual({
      major: 1,
      minor: 1,
      patch: 0,
    });
    expect(getLatestStableBuildingBlock(registry, OBSERVATION_BLOCK_ID)?.version).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
    });
    expect(getLatestStableBuildingBlock(registry, PROVENANCE_ACTIVITY_BLOCK_ID)?.version).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
    });
    expect(getLatestStableBuildingBlock(registry, RESOURCE_CATALOG_BLOCK_ID)?.version).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
    });
    expect(getLatestStableBuildingBlock(registry, SOURCE_GOVERNANCE_BLOCK_ID)?.version).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
    });
    expect(
      getLatestStableBuildingBlock(registry, GEOLOGICAL_LAYER_REGISTRY_BLOCK_ID)?.version
    ).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
    });
  });
});
