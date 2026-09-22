/**
 * Offline Fixture Adapters R1
 *
 * Production change that would fail these tests: contacting a live provider,
 * guessing an unknown code or an ambiguous date, fabricating a sampling event,
 * elevating authority, or treating a candidate as admitted evidence.
 */

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  BUILTIN_BUILDING_BLOCK_DEFINITIONS,
  BuildingBlockLifecycleStatus,
  EVIDENCE_QUARANTINE_BLOCK_ID,
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
  createBuildingBlockRegistry,
  getLatestStableBuildingBlock,
} from './building-block-registry';
import { EvidenceQuarantineStatus } from './evidence-quarantine';
import { getProcessingAncestors, getSourceAncestors } from './provenance-activity-kernel';
import {
  SourceAdapterResultStatus,
  operationImplies,
  projectAuthorityChain,
} from './source-adapter-contract';

import {
  FIXTURE_GEOLOGY_ADAPTER_ID,
  FIXTURE_OBSERVATION_ADAPTER_ID,
  FIXTURE_SAMPLE_ADAPTER_ID,
  fixtureAdaptersContactNetwork,
  fixtureInvokesDecisionSnapshot,
  fixtureInvokesEvidenceAdmission,
  fixtureLiveIngestionPath,
  getFixtureAdapterDefinitions,
  listFixtureAdapterCases,
  replayFixtureCatalog,
  runFixtureAdapterCase,
  validateFixtureAdapterCase,
} from './offline-fixture-adapters';

const PUBLISHED = '2018-06-01T00:00:00.000Z';
const RETRIEVED = '2026-09-22T12:00:00.000Z';

function caseById(id: string) {
  const found = listFixtureAdapterCases().find((fixtureCase) => fixtureCase.id === id);
  if (found === undefined) {
    throw new Error(`Missing fixture case ${id}`);
  }
  return found;
}

describe('fixture infrastructure', () => {
  it('validates every catalog fixture case', () => {
    const cases = listFixtureAdapterCases();
    expect(cases.length).toBeGreaterThanOrEqual(8);
    for (const fixtureCase of cases) {
      expect(validateFixtureAdapterCase(fixtureCase).id).toBe(fixtureCase.id);
    }
  });

  it('does not mutate fixture input', async () => {
    const before = listFixtureAdapterCases();
    const snapshot = structuredClone(before);
    await replayFixtureCatalog();
    expect(listFixtureAdapterCases()).toEqual(snapshot);
    expect(() => {
      const geology = caseById('fixture-geology-clean');
      geology.input.raw.rawFields['unit_code'] = 'changed';
    }).toThrow();
  });

  it('validates adapter definitions', () => {
    const definitions = getFixtureAdapterDefinitions();
    expect(definitions.map((definition) => definition.id)).toEqual([
      FIXTURE_GEOLOGY_ADAPTER_ID,
      FIXTURE_OBSERVATION_ADAPTER_ID,
      FIXTURE_SAMPLE_ADAPTER_ID,
    ]);
    for (const definition of definitions) {
      expect(definition.deterministic).toBe(true);
      expect(definition.supportedSourceVersions).toEqual(['1']);
      expect(definition.limitations.length).toBeGreaterThan(0);
    }
  });

  it('rejects an unsupported fixture schema', () => {
    expect(() => validateFixtureAdapterCase({ schemaVersion: 99 })).toThrow();
  });

  it('replays the catalog deterministically', async () => {
    const first = await replayFixtureCatalog();
    const second = await replayFixtureCatalog();
    expect(second.map((run) => run.outcomeStatus)).toEqual(first.map((run) => run.outcomeStatus));
    expect(second.map((run) => run.activityHash)).toEqual(first.map((run) => run.activityHash));
    expect(second.map((run) => run.adapterResult)).toEqual(first.map((run) => run.adapterResult));
    expect(first.every((run) => run.checks.every((check) => check.passed))).toBe(true);
  });
});

describe('geology fixture', () => {
  it('preserves Qal, normalizes the concept, and retains the source label', async () => {
    const run = await runFixtureAdapterCase(caseById('fixture-geology-clean'));
    expect(run.outcomeStatus).toBe('SUCCESS');
    expect(run.adapterResult.raw?.rawFields['unit_code']).toBe('Qal');
    expect(run.adapterResult.normalized?.normalizedFields['unit_code']).toEqual({
      sourceLabel: 'Qal',
      normalizedConcept: 'quaternary-alluvium',
    });
    expect(run.adapterResult.normalized?.normalizedFields['unit_name']).toBe('Alluvium');
  });

  it('does not admit evidence and points provenance at the fixture source', async () => {
    const run = await runFixtureAdapterCase(caseById('fixture-geology-clean'));
    const uges = run.adapterResult.candidates.find(
      (candidate) => candidate.kind === 'UGES_ASSERTION_CANDIDATE'
    );
    expect(uges?.admission).toBe('CANDIDATE');
    expect(uges?.verified).toBe(false);
    expect(uges?.certainty).toBeUndefined();
    expect(uges?.confidence).toBeUndefined();
    expect(fixtureInvokesEvidenceAdmission()).toBe(false);
    expect(run.adapterResult.provenance?.sourceResourceId).toBe('res-fixture-geology');
    expect(run.adapterResult.provenance?.adapterId).toBe(FIXTURE_GEOLOGY_ADAPTER_ID);
    expect(run.adapterResult.provenance?.manufacturesTruth).toBe(false);
  });
});

describe('observation fixture', () => {
  it('emits a DIRECT observation and does not fabricate material or a UGES assertion', async () => {
    const run = await runFixtureAdapterCase(caseById('fixture-observation-hardness'));
    expect(run.outcomeStatus).toBe('SUCCESS');
    expect(run.adapterResult.candidates.map((candidate) => candidate.kind)).toEqual([
      'OBSERVATION_CANDIDATE',
    ]);
    expect(run.adapterResult.candidates[0]?.origin).toBe('DIRECT');
    expect(run.adapterResult.raw?.rawFields['hardness_test']).toBe('scratches glass');
    expect(run.adapterResult.normalized?.normalizedFields['material']).toBeUndefined();
    expect(run.adapterResult.normalized?.normalizedFields['identification']).toBeUndefined();
    expect(
      run.adapterResult.candidates.some(
        (candidate) => candidate.kind === 'UGES_ASSERTION_CANDIDATE'
      )
    ).toBe(false);
  });
});

describe('sample fixture', () => {
  it('emits a sample, keeps the provider id distinct, and does not invent a sampling event', async () => {
    const run = await runFixtureAdapterCase(caseById('fixture-sample-specimen'));
    expect(run.outcomeStatus).toBe('SUCCESS');
    expect(run.adapterResult.candidates.map((candidate) => candidate.kind)).toEqual([
      'SAMPLE_CANDIDATE',
    ]);
    expect(run.adapterResult.raw?.sourceRecordId).toBe('fixture-specimen-001');
    expect(run.adapterResult.canonicalCandidateId).not.toBe('fixture-specimen-001');
    expect(run.adapterResult.succeeded).not.toContain('SAMPLING_EVENT_CANDIDATE');
    expect(run.adapterResult.succeeded).not.toContain('OBSERVATION_CANDIDATE');
    expect(
      run.adapterResult.diagnostics.some((item) => item.code === 'SAMPLING_PROVENANCE_ABSENT')
    ).toBe(true);
    expect(run.adapterResult.normalized?.normalizedFields['material_label']).toBe('quartz vein');
  });
});

describe('truth clock', () => {
  it('keeps publishedAt distinct from retrievedAt and leaves sourceUpdatedAt absent', async () => {
    const run = await runFixtureAdapterCase(caseById('fixture-geology-clean'));
    expect(run.adapterResult.truthClockCandidate?.publishedAt).toBe(PUBLISHED);
    expect(run.adapterResult.truthClockCandidate?.retrievedAt).toBe(RETRIEVED);
    expect(run.adapterResult.truthClockCandidate?.publishedAt).not.toBe(
      run.adapterResult.truthClockCandidate?.retrievedAt
    );
    expect(run.adapterResult.truthClockCandidate?.sourceUpdatedAt).toBeUndefined();
  });

  it('does not guess an ambiguous year and quarantines it', async () => {
    const run = await runFixtureAdapterCase(caseById('fixture-temporal-ambiguity'));
    expect(run.adapterResult.raw?.rawFields['date']).toBe('2025');
    expect(run.adapterResult.truthClockCandidate?.phenomenonTime).toBeUndefined();
    expect(run.adapterResult.truthClockCandidate?.publishedAt).toBeUndefined();
    expect(run.adapterResult.truthClockCandidate?.effectiveFrom).toBeUndefined();
    expect(run.outcomeStatus).toBe('QUARANTINED');
    expect(run.quarantineRecord?.status).toBe(EvidenceQuarantineStatus.TEMPORAL_AMBIGUITY);
    expect(run.quarantineRecord?.capture.reasons.map((reason) => reason.code)).toContain(
      'TEMPORAL_MEANING_UNKNOWN'
    );
    expect(run.quarantineRecord?.admitted).toBe(false);
  });
});

describe('coverage and absence', () => {
  it('does not treat zero rows with partial or unknown coverage as absence', async () => {
    for (const id of ['fixture-zero-partial', 'fixture-zero-unknown-coverage'] as const) {
      const run = await runFixtureAdapterCase(caseById(id));
      expect(run.adapterResult.confirmedAbsence).toBe(false);
      expect(run.adapterResult.candidates).toEqual([]);
      expect(run.adapterResult.coverage?.resultCount).toBe(0);
    }
    expect(
      (await runFixtureAdapterCase(caseById('fixture-zero-partial'))).adapterResult.coverage
        ?.recordCoverage
    ).toBe('PARTIAL');
    expect(
      (await runFixtureAdapterCase(caseById('fixture-zero-unknown-coverage'))).adapterResult
        .coverage?.recordCoverage
    ).toBe('UNKNOWN');
  });

  it('represents complete coverage without admitting evidence', async () => {
    const run = await runFixtureAdapterCase(caseById('fixture-coverage-complete'));
    expect(run.adapterResult.coverage?.recordCoverage).toBe('COMPLETE');
    expect(run.adapterResult.confirmedAbsence).toBe(false);
    expect(run.adapterResult.candidates.every((candidate) => candidate.verified !== true)).toBe(
      true
    );
    expect(fixtureInvokesEvidenceAdmission()).toBe(false);
  });
});

describe('governance', () => {
  it('allows translation only when the required operation is allowed', async () => {
    const allowed = await runFixtureAdapterCase(caseById('fixture-geology-clean'));
    expect(allowed.adapterResult.status).toBe(SourceAdapterResultStatus.SUCCESS);
    expect(allowed.adapterResult.governanceReceiptId).toBe('gov-fixture-transform');

    const unknown = await runFixtureAdapterCase(caseById('fixture-governance-unknown'));
    expect(unknown.outcomeStatus).toBe('FAILED');
    expect(unknown.adapterResult.failureCode).toBe('GOVERNANCE_UNRESOLVED');
    expect(unknown.adapterResult.candidates).toEqual([]);
    expect(unknown.quarantineRecord?.capture.source.rawFields['unit_code']).toBe('Qal');
    expect(unknown.quarantineRecord?.admitted).toBe(false);

    const prohibited = await runFixtureAdapterCase(caseById('fixture-governance-prohibited'));
    expect(prohibited.outcomeStatus).toBe('FAILED');
    expect(prohibited.adapterResult.failureCode).toBe('GOVERNANCE_NOT_ALLOWED');
    expect(prohibited.adapterResult.candidates).toEqual([]);
    expect(prohibited.quarantineRecord?.capture.reasons.map((reason) => reason.code)).toContain(
      'GOVERNANCE_PROHIBITED'
    );

    const readOnly = await runFixtureAdapterCase(caseById('fixture-governance-read-only'));
    expect(readOnly.adapterResult.failureCode).toBe('GOVERNANCE_NOT_ALLOWED');
    expect(readOnly.adapterResult.candidates).toEqual([]);
    expect(operationImplies('READ', 'TRANSFORM')).toBe(false);
  });
});

describe('authority', () => {
  it('retains source authority and quarantines an elevation attempt', async () => {
    const clean = await runFixtureAdapterCase(caseById('fixture-geology-clean'));
    expect(clean.adapterResult.authority?.sourceAuthorities).toEqual(['SECONDARY_AUTHORITY']);
    expect(clean.adapterResult.authority?.claimedAuthority).toBe('SECONDARY_AUTHORITY');
    expect(clean.adapterResult.authority?.accepted).toBe(true);

    const attack = await runFixtureAdapterCase(caseById('fixture-authority-elevation'));
    expect(attack.outcomeStatus).toBe('QUARANTINED');
    expect(attack.adapterResult.failureCode).toBe('AUTHORITY_ELEVATION_ATTEMPT');
    expect(attack.adapterResult.authority?.accepted).toBe(false);
    expect(attack.quarantineRecord?.status).toBe(EvidenceQuarantineStatus.AUTHORITY_CONFLICT);
    expect(attack.quarantineRecord?.capture.source.rawFields['unit_code']).toBe('Qal');
    expect(attack.quarantineRecord?.admitted).toBe(false);
  });

  it('does not accumulate authority across a multi-stage transformation', async () => {
    const run = await runFixtureAdapterCase(caseById('fixture-geology-multistage'));
    expect(run.outcomeStatus).toBe('SUCCESS');
    expect(run.stageResults).toHaveLength(2);
    expect(
      run.stageResults?.every(
        (result) => result.authority?.claimedAuthority === 'SECONDARY_AUTHORITY'
      )
    ).toBe(true);
    expect(
      projectAuthorityChain(['SECONDARY_AUTHORITY'], ['SECONDARY_AUTHORITY', 'SECONDARY_AUTHORITY'])
        .accepted
    ).toBe(true);
    const candidateId = run.stageResults?.[1]?.canonicalCandidateId;
    expect(candidateId).toBeDefined();
    expect(
      getSourceAncestors(run.provenanceGraph!, candidateId!).map((entity) => entity.entityId)
    ).toContain('fixture-geology-001');
    expect(
      getProcessingAncestors(run.provenanceGraph!, candidateId!).map((entity) => entity.entityId)
    ).toContain('norm:raw-geology-001');
    expect(
      run.provenanceGraph?.activities.map((activity) => activity.process?.processVersion)
    ).toEqual(['1.0.0', '1.0.0']);
  });
});

describe('unknown semantics and source version', () => {
  it('preserves an unknown enum and quarantines a required unknown', async () => {
    const run = await runFixtureAdapterCase(caseById('fixture-unknown-enum'));
    expect(run.adapterResult.raw?.rawFields['lithology_code']).toBe('ZX-UNKNOWN');
    expect(run.adapterResult.normalized?.normalizedFields['lithology_code']).toBeUndefined();
    expect(run.outcomeStatus).toBe('QUARANTINED');
    expect(run.quarantineRecord?.capture.reasons.map((reason) => reason.code)).toContain(
      'UNKNOWN_ENUM_VALUE'
    );
    expect(run.quarantineRecord?.status).toBe(EvidenceQuarantineStatus.SEMANTICALLY_UNMAPPED);
    expect(run.quarantineRecord?.admitted).toBe(false);
    expect(run.quarantineRecord?.capture.candidate?.verified).not.toBe(true);
  });

  it('partial-succeeds an optional unmapped field without guessing it', async () => {
    const run = await runFixtureAdapterCase(caseById('fixture-optional-unmapped'));
    expect(run.outcomeStatus).toBe('PARTIAL_SUCCESS');
    expect(run.adapterResult.status).toBe(SourceAdapterResultStatus.PARTIAL_SUCCESS);
    expect(run.adapterResult.raw?.rawFields['observer_note']).toBe('unmapped note');
    expect(run.adapterResult.normalized?.normalizedFields['observer_note']).toBeUndefined();
    expect(run.adapterResult.normalized?.normalizedFields['unit_code']).toEqual({
      sourceLabel: 'Qal',
      normalizedConcept: 'quaternary-alluvium',
    });
  });

  it('processes version 1 and quarantines version 99', async () => {
    const supported = await runFixtureAdapterCase(caseById('fixture-geology-clean'));
    expect(supported.adapterResult.raw?.sourceVersionRef).toBe('1');
    expect(supported.outcomeStatus).toBe('SUCCESS');

    const unsupported = await runFixtureAdapterCase(caseById('fixture-unsupported-version'));
    expect(unsupported.adapterResult.failureCode).toBe('UNSUPPORTED_SOURCE_VERSION');
    expect(unsupported.outcomeStatus).toBe('QUARANTINED');
    expect(unsupported.quarantineRecord?.status).toBe(
      EvidenceQuarantineStatus.SOURCE_VERSION_UNSUPPORTED
    );
    expect(unsupported.quarantineRecord?.capture.source.rawFields['unit_code']).toBe('Qal');
    expect(unsupported.quarantineRecord?.capture.adapter?.adapterId).toBe(
      FIXTURE_GEOLOGY_ADAPTER_ID
    );
    expect(unsupported.adapterResult.candidates).toEqual([]);
    expect(unsupported.quarantineRecord?.admitted).toBe(false);
  });
});

describe('provenance and determinism', () => {
  it('retains adapter version and traces raw input to normalized output', async () => {
    const run = await runFixtureAdapterCase(caseById('fixture-geology-clean'));
    expect(run.adapterResult.provenance?.adapterVersion).toEqual({ major: 1, minor: 0, patch: 0 });
    expect(run.adapterResult.provenance?.rawSourceRecordId).toBe('raw-geology-001');
    expect(run.adapterResult.provenance?.normalizedRecordId).toBe('norm:raw-geology-001');
    expect(run.provenanceGraph?.activities[0]?.process?.processId).toBe(FIXTURE_GEOLOGY_ADAPTER_ID);
    expect(run.activityHash).toMatch(/^[a-f0-9]{64}$/);
    expect(run.adapterResult.provenance?.manufacturesTruth).toBe(false);
  });

  it('changes output when the fixture changes and records an adapter version override', async () => {
    const original = await runFixtureAdapterCase(caseById('fixture-geology-clean'));
    const changed = structuredClone(caseById('fixture-geology-clean'));
    changed.input.raw.rawFields['unit_name'] = 'Fan deposits';
    const rerun = await runFixtureAdapterCase(changed);
    expect(rerun.adapterResult.normalized?.normalizedFields['unit_name']).toBe('Fan deposits');
    expect(rerun.adapterResult.normalized?.normalizedFields['unit_name']).not.toBe(
      original.adapterResult.normalized?.normalizedFields['unit_name']
    );

    const versioned = await runFixtureAdapterCase(caseById('fixture-geology-clean'), {
      adapterVersion: { major: 1, minor: 0, patch: 9 },
    });
    expect(versioned.adapterResult.provenance?.adapterVersion).toEqual({
      major: 1,
      minor: 0,
      patch: 9,
    });
    expect(versioned.activityHash).not.toBe(original.activityHash);
  });
});

describe('boundaries', () => {
  it('has no network, provider, credential, admission, or live ingestion path', () => {
    const source = readFileSync(new URL('./offline-fixture-adapters.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/\baxios\b/);
    expect(source).not.toMatch(/https?:\/\//);
    expect(source).not.toMatch(/\bXMLHttpRequest\b/);
    expect(source).not.toMatch(/process\.env/);
    expect(source.toLowerCase()).not.toMatch(
      /\busgs\b|\bblm\b|\bnws\b|\bnasa\b|\bmacrostrat\b|\bmindat\b/
    );
    expect(fixtureAdaptersContactNetwork()).toBe(false);
    expect(fixtureInvokesEvidenceAdmission()).toBe(false);
    expect(fixtureInvokesDecisionSnapshot()).toBe(false);
    expect(fixtureLiveIngestionPath()).toBe(false);
  });

  it('keeps the closed stable contracts queryable', () => {
    const stable = [
      [UGES_BLOCK_ID, { major: 1, minor: 1, patch: 0 }],
      [GEOLOGICAL_LAYER_REGISTRY_BLOCK_ID, { major: 1, minor: 0, patch: 0 }],
      [RESOURCE_CATALOG_BLOCK_ID, { major: 1, minor: 0, patch: 0 }],
      [SOURCE_GOVERNANCE_BLOCK_ID, { major: 1, minor: 0, patch: 0 }],
      [OBSERVATION_BLOCK_ID, { major: 1, minor: 0, patch: 0 }],
      [SAMPLE_BLOCK_ID, { major: 1, minor: 0, patch: 0 }],
      [SAMPLING_EVENT_BLOCK_ID, { major: 1, minor: 0, patch: 0 }],
      [PROVENANCE_ACTIVITY_BLOCK_ID, { major: 1, minor: 0, patch: 0 }],
      [TRUTH_CLOCK_BLOCK_ID, { major: 1, minor: 0, patch: 0 }],
      [SOURCE_ADAPTER_CONTRACT_BLOCK_ID, { major: 1, minor: 0, patch: 0 }],
      [EVIDENCE_QUARANTINE_BLOCK_ID, { major: 1, minor: 0, patch: 0 }],
    ] as const;
    const registry = createBuildingBlockRegistry(BUILTIN_BUILDING_BLOCK_DEFINITIONS);
    for (const [id, version] of stable) {
      const block = getLatestStableBuildingBlock(registry, id);
      expect(block?.lifecycleStatus).toBe(BuildingBlockLifecycleStatus.STABLE);
      expect(block?.version).toEqual(version);
    }
  });
});
