/**
 * Evidence Admission Engine R1
 *
 * Production change that would fail these tests: admitting evidence because
 * it exists, is recent, or comes from a strong source; elevating authority
 * through admission; or turning admission into a field decision.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
  getLatestStableBuildingBlock,
  validateBuildingBlockRegistry,
} from './building-block-registry';
import { EvidenceCertainty, EvidenceConfidenceLevel } from './universal-geological-evidence-schema';
import { runFixtureAdapterCase } from './offline-fixture-adapters';

import {
  EVIDENCE_ADMISSION_BLOCK_ID,
  EvidenceAdmissionDecisionStatus,
  admissionCreatesProhibited,
  admissionEquatesAdapterSuccess,
  admissionEquatesQuarantineDisposition,
  admissionInfersRoleFromAuthority,
  admissionRewritesCertainty,
  admissionRewritesConfidence,
  admissionSelectsFieldAction,
  evaluateEvidenceAdmission,
  type EvidenceAdmissionCandidate,
  type EvidenceAdmissionPolicy,
  type EvidenceAdmissionRequest,
} from './evidence-admission';

const WHEN = '2026-09-22T18:00:00.000Z';

function policy(overrides: Partial<EvidenceAdmissionPolicy> = {}): EvidenceAdmissionPolicy {
  return {
    id: 'policy-geology-context',
    version: { major: 1, minor: 0, patch: 0 },
    schemaVersion: 1,
    purpose: 'GEOLOGICAL_CONTEXT',
    domain: 'GEOLOGY',
    allowedRoles: ['DISCOVERY', 'CORROBORATING', 'DECISION'],
    minimumAuthority: 'SECONDARY_AUTHORITY',
    temporalRequirement: 'CURRENT_REQUIRED',
    coverageRequirement: {
      record: 'COMPLETE_REQUIRED',
      geometry: 'COMPLETE_REQUIRED',
      temporal: 'NOT_APPLICABLE',
    },
    provenanceRequirement: 'BASIC',
    contradictionPolicy: 'REQUIRE_NO_UNRESOLVED_CONFLICT',
    allowQuarantined: false,
    quarantineOutcome: 'QUARANTINED',
    requiresPermittedUse: false,
    limitations: ['admission is not a field decision'],
    ...overrides,
  };
}

function candidate(
  overrides: Partial<EvidenceAdmissionCandidate> = {}
): EvidenceAdmissionCandidate {
  return {
    id: 'candidate-1',
    kind: 'GEOLOGICAL_FEATURE_CANDIDATE',
    role: 'DISCOVERY',
    supportedPurposes: ['GEOLOGICAL_CONTEXT', 'DISCOVERY_SEARCH', 'HISTORICAL_REVIEW'],
    authority: [{ domain: 'GEOLOGY', authorityClass: 'SECONDARY_AUTHORITY' }],
    temporal: { fitness: 'FIT', freshness: 'CURRENT', effectiveAtDecisionTime: true },
    coverage: { record: 'COMPLETE', geometry: 'COMPLETE', temporal: 'COMPLETE', resultCount: 1 },
    quarantine: { state: 'NONE', disposition: 'NONE' },
    provenance: { state: 'BASIC' },
    governance: { decision: 'ALLOWED' },
    independence: { upstreamLineageIds: ['lineage-a'] },
    contradiction: { state: 'NONE' },
    availability: 'AVAILABLE',
    ...overrides,
  };
}

function request(
  evidence: EvidenceAdmissionCandidate,
  admissionPolicy: EvidenceAdmissionPolicy,
  id = 'req-1'
): EvidenceAdmissionRequest {
  return { id, evaluatedAt: WHEN, candidate: evidence, policy: admissionPolicy };
}

function decide(evidence: EvidenceAdmissionCandidate, admissionPolicy: EvidenceAdmissionPolicy) {
  return evaluateEvidenceAdmission(request(evidence, admissionPolicy));
}

describe('basic admission', () => {
  it('evaluates deterministically and leaves the candidate unchanged', () => {
    const evidence = candidate();
    const before = structuredClone(evidence);
    const first = decide(evidence, policy());
    const second = decide(evidence, policy());
    expect(first.status).toBe(EvidenceAdmissionDecisionStatus.ADMITTED);
    expect(second).toEqual(first);
    expect(evidence).toEqual(before);
    expect(Object.isFrozen(first.receipt)).toBe(true);
    expect(() => {
      (first.receipt as { decision?: string }).decision = 'REJECTED';
    }).toThrow();
  });

  it('does not change a rejected candidate or its receipt inputs', () => {
    const evidence = candidate({ role: 'DISCOVERY' });
    const before = structuredClone(evidence);
    const result = decide(evidence, policy({ allowedRoles: ['DECISION'] }));
    expect(result.status).toBe(EvidenceAdmissionDecisionStatus.REJECTED);
    expect(evidence).toEqual(before);
    expect(result.receipt.policyVersion).toEqual({ major: 1, minor: 0, patch: 0 });
    expect(result.receipt.domain).toBe('GEOLOGY');
    expect(result.receipt.purpose).toBe('GEOLOGICAL_CONTEXT');
    expect(result.receipt.reasons.map((reason) => reason.code)).toContain('ROLE_NOT_ALLOWED');
    expect(result.receipt.limitations).toContain('admission is not a field decision');
  });
});

describe('role and domain', () => {
  it('accepts discovery for a discovery policy and rejects it where decision is required', () => {
    expect(decide(candidate(), policy({ allowedRoles: ['DISCOVERY'] })).status).toBe('ADMITTED');
    expect(decide(candidate(), policy({ allowedRoles: ['DECISION'] })).status).toBe('REJECTED');
    expect(
      decide(
        candidate({ role: 'CORROBORATING' }),
        policy({ allowedRoles: ['AUTHORITATIVE_DECISION'] })
      ).status
    ).toBe('REJECTED');
    expect(
      decide(
        candidate({ role: 'AUTHORITATIVE_DECISION' }),
        policy({ allowedRoles: ['AUTHORITATIVE_DECISION'] })
      ).status
    ).toBe('ADMITTED');
    const strong = candidate({
      role: 'DISCOVERY',
      authority: [{ domain: 'GEOLOGY', authorityClass: 'PRIMARY_AUTHORITY' }],
    });
    expect(decide(strong, policy({ allowedRoles: ['DECISION'] })).status).toBe('REJECTED');
    expect(admissionInfersRoleFromAuthority()).toBe(false);
  });

  it('keeps authority inside the requested domain', () => {
    expect(decide(candidate(), policy()).status).toBe('ADMITTED');
    const geologyOnly = candidate({
      supportedPurposes: ['COLLECTION_PERMISSION', 'GEOLOGICAL_CONTEXT'],
      authority: [{ domain: 'GEOLOGY', authorityClass: 'PRIMARY_AUTHORITY' }],
      temporal: { fitness: 'FIT', freshness: 'CURRENT', effectiveAtDecisionTime: true },
    });
    expect(
      decide(
        geologyOnly,
        policy({
          purpose: 'COLLECTION_PERMISSION',
          domain: 'COLLECTION_RULE',
          minimumAuthority: 'PRIMARY_AUTHORITY',
        })
      ).status
    ).toBe('REJECTED');
    expect(
      decide(
        candidate({
          authority: [{ domain: 'ROAD_TRAIL_ACCESS', authorityClass: 'PRIMARY_AUTHORITY' }],
        }),
        policy()
      ).status
    ).toBe('REJECTED');
    expect(
      decide(
        candidate({
          supportedPurposes: ['GEOLOGICAL_CONTEXT'],
          authority: [{ domain: 'COLLECTION_RULE', authorityClass: 'PRIMARY_AUTHORITY' }],
        }),
        policy({
          domain: 'MINERAL_ESTATE',
          purpose: 'GEOLOGICAL_CONTEXT',
          minimumAuthority: 'PRIMARY_AUTHORITY',
        })
      ).status
    ).toBe('REJECTED');
  });
});

describe('purpose, time, and coverage', () => {
  it('admits geological context and historical review, and rejects stale site access', () => {
    const record = candidate({
      supportedPurposes: ['GEOLOGICAL_CONTEXT', 'SITE_ACCESS', 'HISTORICAL_REVIEW'],
      temporal: { fitness: 'NOT_FIT', freshness: 'STALE', effectiveAtDecisionTime: false },
      authority: [
        { domain: 'GEOLOGY', authorityClass: 'SECONDARY_AUTHORITY' },
        { domain: 'LAND_MANAGEMENT', authorityClass: 'SECONDARY_AUTHORITY' },
      ],
    });
    expect(decide(record, policy({ temporalRequirement: 'HISTORICAL_ACCEPTABLE' })).status).toBe(
      'ADMITTED'
    );
    expect(
      decide(
        record,
        policy({
          purpose: 'SITE_ACCESS',
          domain: 'LAND_MANAGEMENT',
          temporalRequirement: 'CURRENT_REQUIRED',
        })
      ).status
    ).toBe('REJECTED');
    expect(
      decide(
        record,
        policy({
          purpose: 'HISTORICAL_REVIEW',
          temporalRequirement: 'HISTORICAL_ACCEPTABLE',
        })
      ).status
    ).toBe('ADMITTED');
    const specimen = candidate({
      kind: 'SAMPLE_CANDIDATE',
      supportedPurposes: ['COLLECTION_PERMISSION', 'SPECIMEN_IDENTIFICATION'],
      authority: [{ domain: 'SPECIMEN_IDENTIFICATION', authorityClass: 'PRIMARY_AUTHORITY' }],
      provenance: { state: 'FULL' },
    });
    expect(
      decide(
        specimen,
        policy({
          purpose: 'COLLECTION_PERMISSION',
          domain: 'COLLECTION_RULE',
          minimumAuthority: 'PRIMARY_AUTHORITY',
        })
      ).status
    ).toBe('REJECTED');
  });

  it('applies temporal requirements from the supplied fitness evaluation', () => {
    expect(
      decide(candidate({ temporal: { fitness: 'NOT_FIT', freshness: 'STALE' } }), policy()).status
    ).toBe('REJECTED');
    expect(
      decide(
        candidate({ temporal: { fitness: 'NOT_FIT', freshness: 'STALE' } }),
        policy({ temporalRequirement: 'HISTORICAL_ACCEPTABLE' })
      ).status
    ).toBe('ADMITTED');
    expect(
      decide(
        candidate({
          temporal: { fitness: 'REVALIDATION_REQUIRED', freshness: 'REVALIDATION_REQUIRED' },
        }),
        policy({ temporalRequirement: 'REVALIDATION_ALLOWED' })
      ).status
    ).toBe('ADMITTED_WITH_LIMITATIONS');
    expect(
      decide(
        candidate({ temporal: { fitness: 'UNKNOWN', freshness: 'UNKNOWN' } }),
        policy({ temporalRequirement: 'CURRENT_REQUIRED' })
      ).status
    ).toBe('INSUFFICIENT_INFORMATION');
  });

  it('enforces coverage and refuses absence from a partial zero result', () => {
    expect(decide(candidate(), policy()).status).toBe('ADMITTED');
    expect(
      decide(
        candidate({
          coverage: {
            record: 'PARTIAL',
            geometry: 'COMPLETE',
            temporal: 'COMPLETE',
            resultCount: 1,
          },
        }),
        policy()
      ).status
    ).toBe('REJECTED');
    expect(
      decide(
        candidate({
          coverage: {
            record: 'UNKNOWN',
            geometry: 'COMPLETE',
            temporal: 'COMPLETE',
            resultCount: 1,
          },
        }),
        policy()
      ).status
    ).toBe('REJECTED');
    expect(
      decide(
        candidate({
          coverage: { record: 'PARTIAL', geometry: 'PARTIAL', temporal: 'UNKNOWN', resultCount: 1 },
        }),
        policy({
          coverageRequirement: {
            record: 'PARTIAL_ALLOWED',
            geometry: 'PARTIAL_ALLOWED',
            temporal: 'UNKNOWN_ALLOWED',
          },
        })
      ).status
    ).toBe('ADMITTED');
    const zero = candidate({
      role: 'NEGATIVE',
      supportedPurposes: ['ABSENCE_INFERENCE'],
      coverage: { record: 'PARTIAL', geometry: 'PARTIAL', temporal: 'UNKNOWN', resultCount: 0 },
      negative: {
        searchEffort: 'UNKNOWN',
        detectability: 'UNKNOWN',
        sourceSuitable: false,
        temporalApplicable: false,
        querySucceeded: true,
      },
    });
    expect(
      decide(zero, policy({ purpose: 'ABSENCE_INFERENCE', allowedRoles: ['NEGATIVE'] })).status
    ).toBe('REJECTED');
    expect(
      decide(
        candidate({
          role: 'NEGATIVE',
          supportedPurposes: ['ABSENCE_INFERENCE'],
          coverage: { record: 'UNKNOWN', geometry: 'UNKNOWN', temporal: 'UNKNOWN', resultCount: 0 },
        }),
        policy({
          purpose: 'ABSENCE_INFERENCE',
          allowedRoles: ['NEGATIVE'],
          coverageRequirement: {
            record: 'UNKNOWN_ALLOWED',
            geometry: 'UNKNOWN_ALLOWED',
            temporal: 'UNKNOWN_ALLOWED',
          },
        })
      ).status
    ).toBe('REJECTED');
  });
});

describe('quarantine, provenance, governance, independence, contradiction', () => {
  it('blocks quarantined evidence and still evaluates a resolved record', () => {
    expect(
      decide(candidate({ quarantine: { state: 'QUARANTINED', disposition: 'NONE' } }), policy())
        .status
    ).toBe('QUARANTINED');
    expect(
      decide(
        candidate({ quarantine: { state: 'RESOLVED', disposition: 'ADMIT_CANDIDATE' } }),
        policy()
      ).status
    ).toBe('ADMITTED');
    expect(
      decide(
        candidate({ quarantine: { state: 'QUARANTINED', disposition: 'ADMIT_CANDIDATE' } }),
        policy()
      ).status
    ).toBe('QUARANTINED');
    expect(admissionEquatesQuarantineDisposition()).toBe(false);
  });

  it('applies explicit provenance requirements', () => {
    expect(decide(candidate({ provenance: { state: 'BASIC' } }), policy()).status).toBe('ADMITTED');
    expect(
      decide(
        candidate({ provenance: { state: 'BASIC' } }),
        policy({ provenanceRequirement: 'SOURCE_TRACEABLE' })
      ).status
    ).toBe('REJECTED');
    expect(
      decide(
        candidate({ provenance: { state: 'SOURCE_TRACEABLE' } }),
        policy({ provenanceRequirement: 'PROCESS_TRACEABLE' })
      ).status
    ).toBe('REJECTED');
    expect(
      decide(
        candidate({ provenance: { state: 'SOURCE_TRACEABLE' } }),
        policy({ provenanceRequirement: 'FULL_REQUIRED' })
      ).status
    ).toBe('REJECTED');
    expect(
      decide(
        candidate({ provenance: { state: 'SOURCE_TRACEABLE' } }),
        policy({ provenanceRequirement: 'SOURCE_TRACEABLE' })
      ).status
    ).toBe('ADMITTED');
    expect(
      decide(
        candidate({ provenance: { state: 'FULL' } }),
        policy({ provenanceRequirement: 'PROCESS_TRACEABLE' })
      ).status
    ).toBe('ADMITTED');
  });

  it('keeps governance separate from fitness', () => {
    const allowedButWrongRole = decide(
      candidate({ governance: { decision: 'ALLOWED' } }),
      policy({ requiresPermittedUse: true, allowedRoles: ['DECISION'] })
    );
    expect(allowedButWrongRole.status).toBe('REJECTED');
    expect(
      decide(
        candidate({ governance: { decision: 'PROHIBITED' } }),
        policy({ requiresPermittedUse: true })
      ).status
    ).toBe('REJECTED');
    expect(
      decide(
        candidate({ governance: { decision: 'UNKNOWN' } }),
        policy({ requiresPermittedUse: true })
      ).status
    ).toBe('INSUFFICIENT_INFORMATION');
  });

  it('counts upstream lineages and does not score independence', () => {
    const two = candidate({ independence: { upstreamLineageIds: ['gov-report', 'field-survey'] } });
    expect(decide(two, policy({ independenceMinimum: 2 })).status).toBe('ADMITTED');
    const copies = candidate({
      independence: { upstreamLineageIds: ['gov-report', 'gov-report', 'gov-report'] },
    });
    expect(decide(copies, policy({ independenceMinimum: 2 })).status).toBe('REJECTED');
    expect(
      decide(
        candidate({ independence: { upstreamLineageIds: [] } }),
        policy({ independenceMinimum: 1 })
      ).status
    ).toBe('INSUFFICIENT_INFORMATION');
    const result = decide(two, policy({ independenceMinimum: 2 }));
    expect(result).not.toHaveProperty('independenceScore');
    expect(JSON.stringify(result)).not.toMatch(/independenceScore|compositeScore/);
  });

  it('surfaces contradiction instead of choosing a source', () => {
    const conflicted = candidate({ contradiction: { state: 'UNRESOLVED' } });
    expect(decide(conflicted, policy()).status).toBe('CONFLICTED');
    expect(decide(conflicted, policy({ contradictionPolicy: 'ALLOW_CONFLICT' })).status).toBe(
      'ADMITTED_WITH_LIMITATIONS'
    );
    expect(
      decide(conflicted, policy({ contradictionPolicy: 'REQUIRE_AUTHORITATIVE_RESOLUTION' })).status
    ).toBe('CONFLICTED');
    expect(JSON.stringify(decide(conflicted, policy()))).not.toMatch(/preferredSource/);
    expect(admissionSelectsFieldAction()).toBe(false);
  });
});

describe('uges, observation, sample, and fixtures', () => {
  it('does not rewrite UGES or treat verification as collection permission', () => {
    const verified = candidate({
      supportedPurposes: ['COLLECTION_PERMISSION', 'GEOLOGICAL_CONTEXT'],
      uges: { certainty: EvidenceCertainty.VERIFIED, confidence: EvidenceConfidenceLevel.HIGH },
    });
    const before = structuredClone(verified);
    const rejected = decide(
      verified,
      policy({
        purpose: 'COLLECTION_PERMISSION',
        domain: 'COLLECTION_RULE',
        minimumAuthority: 'PRIMARY_AUTHORITY',
      })
    );
    expect(rejected.status).toBe('REJECTED');
    expect(verified).toEqual(before);
    const supported = candidate({
      role: 'CORROBORATING',
      uges: { certainty: EvidenceCertainty.SUPPORTED, confidence: EvidenceConfidenceLevel.MEDIUM },
    });
    const admitted = decide(supported, policy({ allowedRoles: ['CORROBORATING'] }));
    expect(admitted.status).toBe('ADMITTED');
    expect(supported.uges?.certainty).toBe(EvidenceCertainty.SUPPORTED);
    expect(supported.uges?.confidence).toBe(EvidenceConfidenceLevel.MEDIUM);
    expect(admissionRewritesCertainty()).toBe(false);
    expect(admissionRewritesConfidence()).toBe(false);
    expect(admissionCreatesProhibited()).toBe(false);
  });

  it('admits corroboration and specimen context without domain leakage', () => {
    const observation = candidate({
      id: 'obs-1',
      kind: 'OBSERVATION_CANDIDATE',
      role: 'CORROBORATING',
      supportedPurposes: ['GEOLOGICAL_CONTEXT'],
      authority: [{ domain: 'FIELD_OBSERVATION', authorityClass: 'USER_OBSERVATION' }],
    });
    const admitted = decide(
      observation,
      policy({
        allowedRoles: ['CORROBORATING'],
        minimumAuthority: 'USER_OBSERVATION',
        domain: 'FIELD_OBSERVATION',
      })
    );
    expect(admitted.status).toBe('ADMITTED');
    expect(admitted.receipt.evidenceRole).toBe('CORROBORATING');
    expect(admitted.receipt.authorityState).toBe('USER_OBSERVATION');
    const sample = candidate({
      kind: 'SAMPLE_CANDIDATE',
      role: 'DECISION',
      supportedPurposes: ['SPECIMEN_IDENTIFICATION'],
      authority: [{ domain: 'SPECIMEN_IDENTIFICATION', authorityClass: 'SECONDARY_AUTHORITY' }],
      provenance: { state: 'FULL' },
    });
    expect(
      decide(
        sample,
        policy({
          purpose: 'SPECIMEN_IDENTIFICATION',
          domain: 'SPECIMEN_IDENTIFICATION',
          allowedRoles: ['DECISION'],
        })
      ).status
    ).toBe('ADMITTED');
    expect(
      decide(
        sample,
        policy({
          purpose: 'COLLECTION_PERMISSION',
          domain: 'COLLECTION_RULE',
          allowedRoles: ['DECISION'],
          minimumAuthority: 'PRIMARY_AUTHORITY',
        })
      ).status
    ).toBe('REJECTED');
  });

  it('evaluates fixture candidates without treating adapter success as admission', async () => {
    const clean = await runFixtureAdapterCase(
      (await import('./offline-fixture-adapters'))
        .listFixtureAdapterCases()
        .find((item) => item.id === 'fixture-geology-clean')!
    );
    expect(clean.adapterResult.status).toBe('SUCCESS');
    const fixtureCandidate = candidate({
      id: clean.adapterResult.canonicalCandidateId ?? 'fixture-candidate',
      kind: 'GEOLOGICAL_FEATURE_CANDIDATE',
      adapterStatus: 'SUCCESS',
    });
    expect(decide(fixtureCandidate, policy()).status).toBe('ADMITTED');
    expect(
      decide(
        fixtureCandidate,
        policy({
          purpose: 'COLLECTION_PERMISSION',
          domain: 'COLLECTION_RULE',
          minimumAuthority: 'PRIMARY_AUTHORITY',
        })
      ).status
    ).toBe('REJECTED');
    expect(
      decide(fixtureCandidate, policy({ allowedRoles: ['AUTHORITATIVE_DECISION'] })).status
    ).toBe('REJECTED');
    expect(admissionEquatesAdapterSuccess()).toBe(false);
    const quarantined = candidate({
      quarantine: { state: 'QUARANTINED', disposition: 'ADMIT_CANDIDATE' },
      adapterStatus: 'QUARANTINED',
    });
    expect(decide(quarantined, policy()).status).toBe('QUARANTINED');
  });
});

describe('registry and coordinator', () => {
  it('registers evidence admission as STABLE 1.0.0 without moving other contracts', () => {
    const registry = validateBuildingBlockRegistry(BUILTIN_BUILDING_BLOCK_DEFINITIONS);
    expect(registry.listBuildingBlocks().length).toBeGreaterThan(0);
    const block = getLatestStableBuildingBlock(registry, EVIDENCE_ADMISSION_BLOCK_ID);
    expect(block?.lifecycleStatus).toBe(BuildingBlockLifecycleStatus.STABLE);
    expect(block?.version).toEqual({ major: 1, minor: 0, patch: 0 });
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
    for (const [id, version] of stable) {
      expect(getLatestStableBuildingBlock(registry, id)?.version).toEqual(version);
    }
    const source = readFileSync(new URL('./evidence-admission.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/\bevaluateFreshness\b/);
    const doc = readFileSync(
      resolve(__dirname, '../../../docs/FIELD_PLATFORM_COORDINATOR.md'),
      'utf8'
    );
    expect(doc).toContain('ROCKHOUNDING_OFFLINE_FIXTURE_ADAPTERS_R1');
    expect(doc).toContain('ROCKHOUNDING_DECISION_EVIDENCE_CONTRACTS_R1');
    expect(doc).toContain('Live ingestion stays closed');
    expect(doc).toContain('.cursor/');
  });
});
