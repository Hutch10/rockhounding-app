import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  GEOLOGICAL_LAYER_REGISTRY_BLOCK_ID,
  OBSERVATION_BLOCK_ID,
  PROVENANCE_ACTIVITY_BLOCK_ID,
  RESOURCE_CATALOG_BLOCK_ID,
  SAMPLE_BLOCK_ID,
  SAMPLING_EVENT_BLOCK_ID,
  SOURCE_ADAPTER_CONTRACT_BLOCK_ID,
  SOURCE_GOVERNANCE_BLOCK_ID,
  TRUTH_CLOCK_BLOCK_ID,
  UGES_BLOCK_ID,
  BuildingBlockRelationshipKind,
  createBuildingBlockRegistry,
  getBuildingBlock,
  getLatestStableBuildingBlock,
} from './building-block-registry';
import {
  EvidenceQuarantineDispositionKind,
  EvidenceQuarantineReasonCode,
  EvidenceQuarantineResolutionKind,
  EvidenceQuarantineStatus,
  appendQuarantineHistory,
  applyQuarantineDisposition,
  createEvidenceQuarantineRegistry,
  linkQuarantineReprocessing,
  quarantineAdmitsEvidence,
  quarantineAuthorizesUse,
  quarantineEstablishesConfirmedAbsence,
  quarantineFromAdapterResult,
  quarantineManufacturesProvenance,
  quarantineMarksVerified,
  recordQuarantineResolution,
  setDuplicateAssessment,
  validateEvidenceQuarantineRecord,
  type EvidenceQuarantineRecord,
} from './evidence-quarantine';
import { SourceAdapterOutputKind, SourceAdapterResultStatus } from './source-adapter-contract';
import type { SourceAdapterResult } from './source-adapter-contract';
import { confirmedAbsenceEstablished } from './truth-clock-availability';

const VERSION = { major: 1, minor: 0, patch: 0 };

function record(overrides: Record<string, unknown> = {}): EvidenceQuarantineRecord {
  const draft = {
    id: 'q-1',
    schemaVersion: 1,
    status: EvidenceQuarantineStatus.SEMANTICALLY_UNMAPPED,
    reviewState: 'UNREVIEWED',
    capture: {
      status: EvidenceQuarantineStatus.SEMANTICALLY_UNMAPPED,
      reasons: [{ code: EvidenceQuarantineReasonCode.UNKNOWN_ENUM_VALUE, detail: 'lithology' }],
      source: {
        sourceResourceId: 'res-1',
        sourceRecordId: 'provider-9',
        sourceVersionRef: 'schema-1',
        rawFields: { lithology: 'MadeUpRock' },
      },
      adapter: { adapterId: 'adapter:test', adapterVersion: VERSION },
      governance: { receiptId: 'gov-1', resourceId: 'res-1', decision: 'ALLOWED' },
      truthClock: {
        presence: 'PRESENT',
        clock: { id: 'clk-1', schemaVersion: 1, retrievedAt: '2026-09-22T00:00:00.000Z' },
      },
      coverage: {
        state: 'AVAILABLE',
        recordCoverage: 'PARTIAL',
        geometryCoverage: 'UNKNOWN',
        resultCount: 1,
      },
      provenance: { activityId: 'act-1', initialized: true },
      diagnostics: [{ code: 'UNKNOWN_ENUM_VALUE', field: 'lithology' }],
      candidate: {
        kind: SourceAdapterOutputKind.UGES_ASSERTION_CANDIDATE,
        admission: 'CANDIDATE',
        verified: false,
      },
    },
    history: [
      {
        timestamp: '2026-09-22T12:00:00.000Z',
        toStatus: EvidenceQuarantineStatus.SEMANTICALLY_UNMAPPED,
        actorRef: 'SYSTEM',
        reason: 'initial quarantine',
      },
    ],
    dispositions: [],
    resolutions: [],
    reprocessing: [],
    ...overrides,
  };
  const capture = draft.capture as { status?: string };
  const history = draft.history as Array<{ toStatus?: string }>;
  if (history.length === 1 && capture.status !== undefined) {
    history[0] = { ...history[0], toStatus: capture.status };
    draft.status = capture.status as EvidenceQuarantineStatus;
  }
  return validateEvidenceQuarantineRecord(draft);
}

describe('evidence quarantine r1', () => {
  it('accepts a partial record and rejects malformed or duplicate ids', () => {
    const accepted = record();
    expect(accepted.capture.source.sourceRecordId).toBe('provider-9');
    const withoutProviderId = record({
      id: 'q-optional',
      capture: {
        ...record().capture,
        source: { sourceResourceId: 'res-1', rawFields: { note: 'only' } },
      },
    });
    expect(withoutProviderId.capture.source.sourceRecordId).toBeUndefined();
    const missingIdentity = record({
      id: 'q-missing-identity',
      status: EvidenceQuarantineStatus.SCHEMA_INVALID,
      capture: {
        ...record().capture,
        status: EvidenceQuarantineStatus.SCHEMA_INVALID,
        reasons: [{ code: EvidenceQuarantineReasonCode.SOURCE_IDENTITY_MISSING }],
        source: { rawFields: { lithology: 'Qal' } },
      },
    });
    expect(missingIdentity.capture.source.sourceResourceId).toBeUndefined();
    expect(() => validateEvidenceQuarantineRecord({ ...record(), id: '' })).toThrow();
    expect(() => createEvidenceQuarantineRegistry([accepted, accepted])).toThrow(/duplicate/i);
  });

  it('keeps status distinct from reason and retains the original reason after resolution', () => {
    expect(EvidenceQuarantineStatus.SEMANTICALLY_UNMAPPED).not.toBe(
      EvidenceQuarantineStatus.SCHEMA_INVALID
    );
    expect(EvidenceQuarantineStatus.GOVERNANCE_BLOCKED).not.toBe(EvidenceQuarantineStatus.REJECTED);
    const open = record({
      capture: {
        ...record().capture,
        reasons: [
          { code: EvidenceQuarantineReasonCode.UNKNOWN_ENUM_VALUE },
          { code: EvidenceQuarantineReasonCode.UNRECOGNIZED_TERM },
        ],
      },
    });
    expect(open.capture.reasons).toHaveLength(2);
    const resolved = recordQuarantineResolution(open, {
      timestamp: '2026-09-22T13:00:00.000Z',
      kind: EvidenceQuarantineResolutionKind.MAPPED_WITHOUT_LOSS,
      actorRef: 'reviewer-1',
      why: 'vocabulary entry added',
    });
    expect(resolved.status).toBe(EvidenceQuarantineStatus.RESOLVED);
    expect(resolved.capture.reasons.map((item) => item.code)).toContain('UNKNOWN_ENUM_VALUE');
    expect(resolved.resolutions[0]?.timestamp).toBe('2026-09-22T13:00:00.000Z');
    expect(resolved.resolutions[0]?.actorRef).toBe('reviewer-1');
  });

  it('preserves raw material, unknown enums, and unsupported versions without mutation', () => {
    const initial = record();
    const before = structuredClone(initial.capture.source.rawFields);
    const next = appendQuarantineHistory(initial, {
      timestamp: '2026-09-22T12:30:00.000Z',
      toStatus: EvidenceQuarantineStatus.MANUAL_REVIEW_REQUIRED,
      actorRef: 'SYSTEM',
      reason: 'needs a person',
    });
    expect(initial.capture.source.rawFields).toEqual(before);
    expect(next.capture.source.rawFields).toEqual({ lithology: 'MadeUpRock' });
    expect(next.capture.diagnostics[0]?.code).toBe('UNKNOWN_ENUM_VALUE');
    expect(next.capture.candidate?.kind).toBe(SourceAdapterOutputKind.UGES_ASSERTION_CANDIDATE);
    expect(next.capture.normalizedCandidate).toBeUndefined();
    const versioned = record({
      status: EvidenceQuarantineStatus.SOURCE_VERSION_UNSUPPORTED,
      capture: {
        ...record().capture,
        status: EvidenceQuarantineStatus.SOURCE_VERSION_UNSUPPORTED,
        reasons: [{ code: EvidenceQuarantineReasonCode.UNSUPPORTED_SOURCE_VERSION }],
        source: {
          sourceResourceId: 'res-1',
          sourceVersionRef: 'schema-9',
          rawFields: { lithology: 'Qal' },
        },
      },
    });
    expect(versioned.capture.source.sourceVersionRef).toBe('schema-9');
    expect(versioned.capture.source.rawFields.lithology).toBe('Qal');
  });

  it('maps an adapter quarantine candidate without rewriting adapter output', () => {
    const adapterResult = {
      status: SourceAdapterResultStatus.QUARANTINED,
      diagnostics: [{ code: 'UNKNOWN_ENUM_VALUE', field: 'lithology' }],
      raw: {
        id: 'raw-1',
        sourceResourceId: 'res-1',
        sourceRecordId: 'provider-9',
        sourceVersionRef: 'schema-1',
        rawFields: { lithology: 'MadeUpRock' },
      },
      provenance: {
        sourceResourceId: 'res-1',
        adapterId: 'adapter:test',
        adapterVersion: VERSION,
        rawSourceRecordId: 'raw-1',
        derivationKind: 'NORMALIZED_FROM' as const,
        manufacturesTruth: false as const,
      },
      governanceReceiptId: 'gov-1',
      coverage: {
        state: 'COVERAGE_GAP' as const,
        recordCoverage: 'UNKNOWN' as const,
        resultCount: 0,
      },
      truthClockCandidate: { retrievedAt: '2026-09-22T00:00:00.000Z' },
      candidates: [
        {
          kind: SourceAdapterOutputKind.QUARANTINE_CANDIDATE,
          admission: 'CANDIDATE' as const,
          verified: false as const,
        },
      ],
      confirmedAbsence: false,
      successfulRetrievalImpliesCurrency: false as const,
      succeeded: [],
      failed: [],
      unknown: [],
      safeToContinue: false,
      authority: {
        sourceAuthorities: ['COMMUNITY_REPORT' as const],
        claimedAuthority: 'PRIMARY_AUTHORITY' as const,
        accepted: false,
      },
      failureCode: 'AUTHORITY_ELEVATION_ATTEMPT' as const,
    } satisfies SourceAdapterResult;
    const before = structuredClone(adapterResult.raw.rawFields);
    const quarantined = quarantineFromAdapterResult(adapterResult, 'q-adapter');
    expect(adapterResult.raw.rawFields).toEqual(before);
    expect(quarantined.capture.adapter?.adapterId).toBe('adapter:test');
    expect(quarantined.capture.adapter?.adapterVersion).toEqual(VERSION);
    expect(quarantined.capture.source.sourceVersionRef).toBe('schema-1');
    expect(quarantined.capture.diagnostics[0]?.code).toBe('UNKNOWN_ENUM_VALUE');
    expect(quarantined.capture.candidate?.admission).toBe('CANDIDATE');
    expect(quarantined.confirmedAbsence).toBe(false);
  });

  it('blocks downstream use for unknown or prohibited governance without rewriting the receipt', () => {
    const unknown = record({
      status: EvidenceQuarantineStatus.GOVERNANCE_BLOCKED,
      capture: {
        ...record().capture,
        status: EvidenceQuarantineStatus.GOVERNANCE_BLOCKED,
        reasons: [{ code: EvidenceQuarantineReasonCode.GOVERNANCE_UNKNOWN }],
        governance: { receiptId: 'gov-unknown', resourceId: 'res-1', decision: 'UNKNOWN' },
      },
    });
    const prohibited = record({
      id: 'q-prohibited',
      status: EvidenceQuarantineStatus.GOVERNANCE_BLOCKED,
      capture: {
        ...unknown.capture,
        reasons: [{ code: EvidenceQuarantineReasonCode.GOVERNANCE_PROHIBITED }],
        governance: { receiptId: 'gov-no', resourceId: 'res-1', decision: 'PROHIBITED' },
      },
    });
    expect(quarantineAuthorizesUse()).toBe(false);
    expect(unknown.capture.governance?.decision).toBe('UNKNOWN');
    expect(prohibited.capture.governance?.decision).toBe('PROHIBITED');
    const later = recordQuarantineResolution(unknown, {
      timestamp: '2026-09-22T14:00:00.000Z',
      kind: EvidenceQuarantineResolutionKind.GOVERNANCE_RESOLVED,
      why: 'a newer receipt exists elsewhere',
      governanceReceiptId: 'gov-later',
    });
    expect(later.capture.governance?.receiptId).toBe('gov-unknown');
    expect(later.resolutions[0]?.governanceReceiptId).toBe('gov-later');
  });

  it('keeps temporal and coverage ambiguity without proving absence or rewriting the clock', () => {
    const temporal = record({
      status: EvidenceQuarantineStatus.TEMPORAL_AMBIGUITY,
      capture: {
        ...record().capture,
        status: EvidenceQuarantineStatus.TEMPORAL_AMBIGUITY,
        reasons: [{ code: EvidenceQuarantineReasonCode.TEMPORAL_MEANING_UNKNOWN }],
        source: { sourceResourceId: 'res-1', rawFields: { when: '2025' } },
        truthClock: { presence: 'UNKNOWN', rawTemporalValue: '2025' },
      },
    });
    const resolved = recordQuarantineResolution(temporal, {
      timestamp: '2026-09-22T15:00:00.000Z',
      kind: EvidenceQuarantineResolutionKind.TEMPORAL_SEMANTICS_RESOLVED,
      why: 'source note says publication year',
    });
    expect(resolved.capture.truthClock).toEqual({ presence: 'UNKNOWN', rawTemporalValue: '2025' });
    expect(temporal.capture.source.rawFields.when).toBe('2025');

    const coverage = record({
      status: EvidenceQuarantineStatus.COVERAGE_AMBIGUITY,
      capture: {
        ...record().capture,
        status: EvidenceQuarantineStatus.COVERAGE_AMBIGUITY,
        reasons: [{ code: EvidenceQuarantineReasonCode.COVERAGE_UNKNOWN }],
        coverage: {
          state: 'UNKNOWN',
          recordCoverage: 'UNKNOWN',
          geometryCoverage: 'PARTIAL',
          resultCount: 0,
        },
      },
    });
    expect(coverage.capture.coverage?.recordCoverage).toBe('UNKNOWN');
    expect(coverage.capture.coverage?.geometryCoverage).toBe('PARTIAL');
    expect(quarantineEstablishesConfirmedAbsence()).toBe(false);
    expect(
      confirmedAbsenceEstablished({ state: 'MISSING', recordCoverage: 'UNKNOWN', resultCount: 0 })
    ).toBe(false);
  });

  it('keeps an authority elevation attempt visible and does not verify a candidate', () => {
    const conflict = record({
      status: EvidenceQuarantineStatus.AUTHORITY_CONFLICT,
      capture: {
        ...record().capture,
        status: EvidenceQuarantineStatus.AUTHORITY_CONFLICT,
        reasons: [{ code: EvidenceQuarantineReasonCode.AUTHORITY_ELEVATION_ATTEMPT }],
        attemptedAuthority: { claimed: 'PRIMARY_AUTHORITY', accepted: false },
      },
    });
    expect(conflict.capture.attemptedAuthority?.accepted).toBe(false);
    expect(conflict.capture.attemptedAuthority?.claimed).toBe('PRIMARY_AUTHORITY');
    const ready = applyQuarantineDisposition(conflict, {
      kind: EvidenceQuarantineDispositionKind.ADMIT_CANDIDATE,
      timestamp: '2026-09-22T16:00:00.000Z',
      actorRef: 'reviewer-1',
    });
    expect(quarantineAdmitsEvidence()).toBe(false);
    expect(quarantineMarksVerified()).toBe(false);
    expect(ready.capture.candidate?.verified).toBe(false);
    expect(ready.admitted).toBe(false);
  });

  it('retains provenance and does not invent it when the context is missing', () => {
    expect(record().capture.provenance?.activityId).toBe('act-1');
    const missing = record({
      status: EvidenceQuarantineStatus.PROVENANCE_INCOMPLETE,
      capture: {
        ...record().capture,
        status: EvidenceQuarantineStatus.PROVENANCE_INCOMPLETE,
        reasons: [{ code: EvidenceQuarantineReasonCode.PROVENANCE_CONTEXT_MISSING }],
        provenance: undefined,
      },
    });
    expect(missing.capture.provenance).toBeUndefined();
    expect(quarantineManufacturesProvenance()).toBe(false);
  });

  it('appends history, rejects terminal transitions, and supports dispositions', () => {
    const initial = record();
    const reviewed = appendQuarantineHistory(initial, {
      timestamp: '2026-09-22T12:30:00.000Z',
      toStatus: EvidenceQuarantineStatus.MANUAL_REVIEW_REQUIRED,
      actorRef: 'SYSTEM',
      reason: 'queue for review',
    });
    expect(reviewed.history).toHaveLength(2);
    expect(reviewed.history[0]?.toStatus).toBe(EvidenceQuarantineStatus.SEMANTICALLY_UNMAPPED);
    expect(reviewed.status).toBe(EvidenceQuarantineStatus.MANUAL_REVIEW_REQUIRED);
    expect(initial.status).toBe(EvidenceQuarantineStatus.SEMANTICALLY_UNMAPPED);
    const resolved = recordQuarantineResolution(reviewed, {
      timestamp: '2026-09-22T13:00:00.000Z',
      kind: EvidenceQuarantineResolutionKind.MAPPED_WITH_DECLARED_LOSS,
      why: 'one column dropped by contract',
    });
    expect(() =>
      appendQuarantineHistory(resolved, {
        timestamp: '2026-09-22T13:30:00.000Z',
        toStatus: EvidenceQuarantineStatus.PENDING_REVIEW,
        reason: 'reopen',
      })
    ).toThrow(/transition/i);

    const kept = applyQuarantineDisposition(initial, {
      kind: EvidenceQuarantineDispositionKind.KEEP_QUARANTINED,
      timestamp: '2026-09-22T12:10:00.000Z',
    });
    const reprocess = applyQuarantineDisposition(initial, {
      kind: EvidenceQuarantineDispositionKind.RETURN_FOR_REPROCESSING,
      timestamp: '2026-09-22T12:11:00.000Z',
    });
    const rejected = applyQuarantineDisposition(initial, {
      kind: EvidenceQuarantineDispositionKind.REJECT,
      timestamp: '2026-09-22T12:12:00.000Z',
    });
    const superseded = applyQuarantineDisposition(initial, {
      kind: EvidenceQuarantineDispositionKind.SUPERSEDE,
      timestamp: '2026-09-22T12:13:00.000Z',
      supersessionRef: 'q-2',
    });
    expect(kept.status).toBe(EvidenceQuarantineStatus.SEMANTICALLY_UNMAPPED);
    expect(reprocess.dispositions.map((item) => item.kind)).toContain('RETURN_FOR_REPROCESSING');
    expect(rejected.status).toBe(EvidenceQuarantineStatus.REJECTED);
    expect(superseded.status).toBe(EvidenceQuarantineStatus.SUPERSEDED);
    expect(superseded.capture.source.rawFields.lithology).toBe('MadeUpRock');
    expect(superseded.id).toBe('q-1');
  });

  it('links reprocessing and duplicate dismissal without rewriting the original event', () => {
    const initial = record();
    const linked = linkQuarantineReprocessing(initial, {
      timestamp: '2026-09-23T00:00:00.000Z',
      previousAdapterVersion: VERSION,
      newAdapterVersion: { major: 1, minor: 1, patch: 0 },
      newCandidateRef: 'candidate-2',
    });
    expect(initial.reprocessing).toHaveLength(0);
    expect(initial.history).toHaveLength(1);
    expect(linked.reprocessing[0]?.newCandidateRef).toBe('candidate-2');
    expect(linked.reprocessing[0]?.newAdapterVersion).toEqual({ major: 1, minor: 1, patch: 0 });
    expect(linked.capture.reasons[0]?.code).toBe('UNKNOWN_ENUM_VALUE');
    expect(linked.history[0]?.toStatus).toBe(EvidenceQuarantineStatus.SEMANTICALLY_UNMAPPED);

    const suspected = setDuplicateAssessment(initial, {
      state: 'SUSPECTED',
      candidateDuplicateOf: ['q-other'],
      matchingSignals: ['same-provider-record-id'],
    });
    expect(suspected.duplicate?.state).toBe('SUSPECTED');
    expect(suspected.capture.source.rawFields).toEqual(initial.capture.source.rawFields);
    const dismissed = setDuplicateAssessment(suspected, {
      state: 'DISMISSED',
      candidateDuplicateOf: ['q-other'],
      matchingSignals: ['same-provider-record-id'],
    });
    expect(dismissed.duplicate?.state).toBe('DISMISSED');
    expect(dismissed.id).toBe(initial.id);
    expect(suspected.id).toBe(initial.id);
  });

  it('registers evidence quarantine as STABLE 1.0.0 and leaves other stable versions in place', () => {
    const registry = createBuildingBlockRegistry();
    const block = getLatestStableBuildingBlock(registry, 'rockhounding:evidence-quarantine');
    expect(block?.lifecycleStatus).toBe('STABLE');
    expect(block?.version).toEqual(VERSION);
    expect(
      getBuildingBlock(registry, 'rockhounding:evidence-quarantine', {
        major: 0,
        minor: 1,
        patch: 0,
      })?.lifecycleStatus
    ).toBe('DRAFT');
    expect(
      getLatestStableBuildingBlock(registry, SOURCE_ADAPTER_CONTRACT_BLOCK_ID)?.version
    ).toEqual(VERSION);
    expect(getLatestStableBuildingBlock(registry, UGES_BLOCK_ID)?.version).toEqual({
      major: 1,
      minor: 1,
      patch: 0,
    });
    expect(
      getLatestStableBuildingBlock(registry, GEOLOGICAL_LAYER_REGISTRY_BLOCK_ID)?.version
    ).toEqual(VERSION);
    expect(getLatestStableBuildingBlock(registry, RESOURCE_CATALOG_BLOCK_ID)?.version).toEqual(
      VERSION
    );
    expect(getLatestStableBuildingBlock(registry, SOURCE_GOVERNANCE_BLOCK_ID)?.version).toEqual(
      VERSION
    );
    expect(getLatestStableBuildingBlock(registry, OBSERVATION_BLOCK_ID)?.version).toEqual(VERSION);
    expect(getLatestStableBuildingBlock(registry, SAMPLE_BLOCK_ID)?.version).toEqual(VERSION);
    expect(getLatestStableBuildingBlock(registry, SAMPLING_EVENT_BLOCK_ID)?.version).toEqual(
      VERSION
    );
    expect(getLatestStableBuildingBlock(registry, PROVENANCE_ACTIVITY_BLOCK_ID)?.version).toEqual(
      VERSION
    );
    expect(getLatestStableBuildingBlock(registry, TRUTH_CLOCK_BLOCK_ID)?.version).toEqual(VERSION);
    expect(
      block?.dependencies.every(
        (dependency) =>
          dependency.kind === BuildingBlockRelationshipKind.REFERENCES ||
          dependency.kind === BuildingBlockRelationshipKind.PROJECTS_TO
      )
    ).toBe(true);
    const doc = readFileSync(
      resolve(__dirname, '../../../docs/FIELD_PLATFORM_COORDINATOR.md'),
      'utf8'
    );
    expect(doc).toContain('rockhounding:evidence-quarantine');
    expect(doc).toContain('ROCKHOUNDING_OFFLINE_FIXTURE_ADAPTERS_R1');
    expect(doc).toContain('.cursor/');
  });
});
