/**
 * Provenance Activity Kernel R1
 *
 * Production change that would fail these tests: rewriting history on
 * correction, elevating authority through AI synthesis, collapsing source
 * lineage into processing lineage, or treating provenance as truth.
 */

import { describe, expect, it } from 'vitest';

import {
  BuildingBlockLifecycleStatus,
  GEOLOGICAL_LAYER_REGISTRY_BLOCK_ID,
  OBSERVATION_BLOCK_ID,
  RESOURCE_CATALOG_BLOCK_ID,
  SAMPLE_BLOCK_ID,
  SOURCE_GOVERNANCE_BLOCK_ID,
  UGES_BLOCK_ID,
  createBuildingBlockRegistry,
  getBuildingBlock,
  getLatestStableBuildingBlock,
} from './building-block-registry';
import { EvidenceAuthorityClass, EvidenceCertainty } from './universal-geological-evidence-schema';

import {
  PROVENANCE_SCHEMA_VERSION,
  ProvenanceActivityType,
  ProvenanceAgentRole,
  ProvenanceAgentType,
  ProvenanceDerivationKind,
  ProvenanceEntityType,
  ProvenanceLineageClass,
  ProvenanceRelationship,
  claimedAuthorityIsElevated,
  getActivitiesGeneratingEntity,
  getActivitiesUsingEntity,
  getDerivedEntities,
  getInputEntitiesForActivity,
  getOutputEntitiesForActivity,
  getProcessingAncestors,
  getSourceAncestors,
  hashProvenanceActivity,
  provenanceAuthorizesUse,
  provenanceSetsUgesTruth,
  traceEntityLineage,
  validateProvenanceActivity,
  validateProvenanceGraph,
  validateProvenanceHashDescriptor,
  type ProvenanceActivity,
  type ProvenanceGraph,
} from './provenance-activity-kernel';

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-01T01:00:00.000Z';

function entity(
  entityId: string,
  entityType: ProvenanceActivity['used'][number]['entityType'] = ProvenanceEntityType.OTHER
) {
  return { entityId, entityType };
}

function activity(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: 'act-1',
    schemaVersion: PROVENANCE_SCHEMA_VERSION,
    activityType: ProvenanceActivityType.MANUAL_ENTRY,
    lineageClass: ProvenanceLineageClass.PROCESS,
    used: [],
    generated: [],
    associatedAgents: [],
    parameters: [],
    ...overrides,
  };
}

function graph(
  activities: ProvenanceActivity[],
  derivations: ProvenanceGraph['derivations'] = []
): ProvenanceGraph {
  return { schemaVersion: PROVENANCE_SCHEMA_VERSION, activities, derivations };
}

describe('activity', () => {
  it('accepts a valid activity', () => {
    const parsed = validateProvenanceActivity(activity());
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.activityType).toBe(ProvenanceActivityType.MANUAL_ENTRY);
  });

  it('allows zero inputs', () => {
    const parsed = validateProvenanceActivity(activity({ used: [] }));
    expect(parsed.used).toEqual([]);
  });

  it('accepts multiple inputs and outputs', () => {
    const parsed = validateProvenanceActivity(
      activity({
        used: [entity('a'), entity('b'), entity('c')],
        generated: [entity('out-1'), entity('out-2')],
      })
    );
    expect(parsed.used).toHaveLength(3);
    expect(parsed.generated).toHaveLength(2);
  });

  it('rejects duplicate activity IDs in a graph', () => {
    const first = validateProvenanceActivity(activity({ id: 'dup' }));
    const second = validateProvenanceActivity(activity({ id: 'dup' }));
    expect(() => validateProvenanceGraph(graph([first, second]))).toThrow(/duplicate/i);
  });

  it('rejects endedAt before startedAt', () => {
    expect(() => validateProvenanceActivity(activity({ startedAt: T1, endedAt: T0 }))).toThrow();
  });

  it('allows equal timestamps', () => {
    const parsed = validateProvenanceActivity(activity({ startedAt: T0, endedAt: T0 }));
    expect(parsed.startedAt).toBe(parsed.endedAt);
  });

  it('allows future timestamps and missing timestamps', () => {
    const future = validateProvenanceActivity(activity({ startedAt: '2099-01-01T00:00:00.000Z' }));
    const missing = validateProvenanceActivity(activity());
    expect(future.startedAt).toBe('2099-01-01T00:00:00.000Z');
    expect(missing.startedAt).toBeUndefined();
    expect(missing.endedAt).toBeUndefined();
  });
});

describe('entity references and agents', () => {
  it('accepts an entity reference with building-block version metadata', () => {
    const parsed = validateProvenanceActivity(
      activity({
        generated: [
          {
            entityId: 'obs-1',
            entityType: ProvenanceEntityType.OBSERVATION,
            buildingBlockId: OBSERVATION_BLOCK_ID,
            buildingBlockVersion: { major: 1, minor: 0, patch: 0 },
            externalRef: 'provider-row-9',
            versionRef: 'v3',
          },
        ],
      })
    );
    expect(parsed.generated[0]?.buildingBlockVersion).toEqual({ major: 1, minor: 0, patch: 0 });
    expect(parsed.generated[0]?.externalRef).toBe('provider-row-9');
  });

  it('allows an unknown external entity reference', () => {
    const parsed = validateProvenanceActivity(
      activity({
        used: [
          {
            entityId: 'provider-unknown-1',
            entityType: ProvenanceEntityType.OTHER,
            externalRef: 'https://example.invalid/record',
          },
        ],
      })
    );
    expect(parsed.used[0]?.entityId).toBe('provider-unknown-1');
  });

  it('rejects a malformed entity reference', () => {
    expect(() =>
      validateProvenanceActivity(activity({ used: [{ entityType: 'OTHER' }] }))
    ).toThrow();
  });

  it('accepts person, software, AI, and UNKNOWN agents without implying authority', () => {
    const parsed = validateProvenanceActivity(
      activity({
        associatedAgents: [
          {
            agentId: 'person-1',
            agentType: ProvenanceAgentType.PERSON,
            role: ProvenanceAgentRole.OBSERVER,
          },
          {
            agentId: 'soft-1',
            agentType: ProvenanceAgentType.SOFTWARE,
            role: ProvenanceAgentRole.SOFTWARE_EXECUTOR,
          },
          {
            agentId: 'model-1',
            agentType: ProvenanceAgentType.AI_MODEL,
            role: ProvenanceAgentRole.MODEL_EXECUTOR,
          },
          {
            agentId: 'unk-1',
            agentType: ProvenanceAgentType.UNKNOWN,
            role: ProvenanceAgentRole.OTHER,
          },
        ],
      })
    );
    expect(parsed.associatedAgents).toHaveLength(4);
    expect(provenanceSetsUgesTruth(parsed)).toBe(false);
    expect('authorityClass' in parsed).toBe(false);
  });
});

describe('derivation, correction, and cycles', () => {
  it('supports direct copy, normalization, and distinct model derivation', () => {
    const direct = {
      kind: ProvenanceDerivationKind.DIRECT_COPY,
      relationship: ProvenanceRelationship.DERIVES,
      lineageClass: ProvenanceLineageClass.SOURCE,
      generated: entity('copy', ProvenanceEntityType.DOCUMENT),
      used: entity('pub', ProvenanceEntityType.DOCUMENT),
    };
    const normalized = {
      ...direct,
      kind: ProvenanceDerivationKind.NORMALIZED_FROM,
      lineageClass: ProvenanceLineageClass.PROCESS,
      generated: entity('norm', ProvenanceEntityType.DERIVED_PRODUCT),
    };
    const modeled = {
      ...direct,
      kind: ProvenanceDerivationKind.MODEL_DERIVED_FROM,
      generated: entity('model-out', ProvenanceEntityType.MODEL_OUTPUT),
    };
    const parsed = validateProvenanceGraph(
      graph([], [direct, normalized, modeled] as ProvenanceGraph['derivations'])
    );
    expect(parsed.derivations.map((item) => item.kind)).toEqual([
      ProvenanceDerivationKind.DIRECT_COPY,
      ProvenanceDerivationKind.MODEL_DERIVED_FROM,
      ProvenanceDerivationKind.NORMALIZED_FROM,
    ]);
  });

  it('rejects direct self-derivation and duplicate derivations', () => {
    const self = {
      kind: ProvenanceDerivationKind.DERIVED_FROM,
      relationship: ProvenanceRelationship.DERIVES,
      lineageClass: ProvenanceLineageClass.PROCESS,
      generated: entity('same'),
      used: entity('same'),
    };
    expect(() => validateProvenanceGraph(graph([], [self]))).toThrow(/self/i);
    const edge = {
      kind: ProvenanceDerivationKind.DERIVED_FROM,
      relationship: ProvenanceRelationship.DERIVES,
      lineageClass: ProvenanceLineageClass.PROCESS,
      generated: entity('child'),
      used: entity('parent'),
    };
    expect(() => validateProvenanceGraph(graph([], [edge, edge]))).toThrow(/duplicate/i);
  });

  it('rejects derivation cycles', () => {
    const edge = (generated: string, used: string) => ({
      kind: ProvenanceDerivationKind.DERIVED_FROM,
      relationship: ProvenanceRelationship.DERIVES,
      lineageClass: ProvenanceLineageClass.PROCESS,
      generated: entity(generated),
      used: entity(used),
    });
    expect(() => validateProvenanceGraph(graph([], [edge('a', 'b'), edge('b', 'a')]))).toThrow(
      /cycle/i
    );
  });

  it('preserves the original entity under correction and supersession', () => {
    const original = entity('assertion-a', ProvenanceEntityType.UGES_ASSERTION);
    const corrected = entity('assertion-b', ProvenanceEntityType.UGES_ASSERTION);
    const parsed = validateProvenanceGraph(
      graph(
        [],
        [
          {
            kind: ProvenanceDerivationKind.CORRECTED_FROM,
            relationship: ProvenanceRelationship.CORRECTS,
            lineageClass: ProvenanceLineageClass.PROCESS,
            generated: corrected,
            used: original,
          },
          {
            kind: ProvenanceDerivationKind.SUPERSEDED_FROM,
            relationship: ProvenanceRelationship.SUPERSEDES,
            lineageClass: ProvenanceLineageClass.PROCESS,
            generated: entity('assertion-c', ProvenanceEntityType.UGES_ASSERTION),
            used: original,
          },
        ]
      )
    );
    expect(parsed.derivations.every((item) => item.used.entityId === 'assertion-a')).toBe(true);
    expect(parsed.derivations.map((item) => item.generated.entityId)).toEqual([
      'assertion-b',
      'assertion-c',
    ]);
  });
});

describe('observation, sample, and resource integration', () => {
  it('records field observation, sampling, split, and lab analysis without changing identities', () => {
    const field = validateProvenanceActivity(
      activity({
        id: 'act-field',
        activityType: ProvenanceActivityType.FIELD_OBSERVATION,
        lineageClass: ProvenanceLineageClass.PROCESS,
        generated: [entity('obs-1', ProvenanceEntityType.OBSERVATION)],
      })
    );
    const sampling = validateProvenanceActivity(
      activity({
        id: 'act-sample',
        activityType: ProvenanceActivityType.SAMPLING,
        lineageClass: ProvenanceLineageClass.PROCESS,
        generated: [
          entity('se-1', ProvenanceEntityType.SAMPLING_EVENT),
          entity('spec-parent', ProvenanceEntityType.SAMPLE),
        ],
      })
    );
    const split = validateProvenanceActivity(
      activity({
        id: 'act-split',
        activityType: ProvenanceActivityType.TRANSFORMATION,
        lineageClass: ProvenanceLineageClass.PROCESS,
        used: [entity('spec-parent', ProvenanceEntityType.SAMPLE)],
        generated: [
          entity('spec-a1', ProvenanceEntityType.SAMPLE),
          entity('spec-a2', ProvenanceEntityType.SAMPLE),
        ],
      })
    );
    const lab = validateProvenanceActivity(
      activity({
        id: 'act-lab',
        activityType: ProvenanceActivityType.LAB_ANALYSIS,
        lineageClass: ProvenanceLineageClass.PROCESS,
        used: [entity('spec-a1', ProvenanceEntityType.SAMPLE)],
        generated: [entity('obs-lab', ProvenanceEntityType.OBSERVATION)],
      })
    );
    const parsed = validateProvenanceGraph(graph([field, sampling, split, lab]));
    expect(getOutputEntitiesForActivity(parsed, 'act-field').map((item) => item.entityId)).toEqual([
      'obs-1',
    ]);
    expect(getInputEntitiesForActivity(parsed, 'act-split').map((item) => item.entityId)).toEqual([
      'spec-parent',
    ]);
    expect(split.used[0]?.entityId).toBe('spec-parent');
    expect(lab.generated[0]?.entityType).toBe(ProvenanceEntityType.OBSERVATION);
  });

  it('traces a retrieved resource through normalization without rewriting the resource', () => {
    const retrieval = validateProvenanceActivity(
      activity({
        id: 'act-retrieve',
        activityType: ProvenanceActivityType.SOURCE_RETRIEVAL,
        lineageClass: ProvenanceLineageClass.SOURCE,
        used: [entity('res-usgs', ProvenanceEntityType.RESOURCE_RECORD)],
        generated: [entity('import-1', ProvenanceEntityType.DERIVED_PRODUCT)],
      })
    );
    const normalize = validateProvenanceActivity(
      activity({
        id: 'act-norm',
        activityType: ProvenanceActivityType.NORMALIZATION,
        lineageClass: ProvenanceLineageClass.PROCESS,
        used: [entity('import-1', ProvenanceEntityType.DERIVED_PRODUCT)],
        generated: [entity('feature-1', ProvenanceEntityType.DERIVED_PRODUCT)],
      })
    );
    const parsed = validateProvenanceGraph(
      graph(
        [retrieval, normalize],
        [
          {
            kind: ProvenanceDerivationKind.DIRECT_COPY,
            relationship: ProvenanceRelationship.DERIVES,
            lineageClass: ProvenanceLineageClass.SOURCE,
            generated: entity('import-1', ProvenanceEntityType.DERIVED_PRODUCT),
            used: entity('res-usgs', ProvenanceEntityType.RESOURCE_RECORD),
          },
          {
            kind: ProvenanceDerivationKind.NORMALIZED_FROM,
            relationship: ProvenanceRelationship.DERIVES,
            lineageClass: ProvenanceLineageClass.PROCESS,
            generated: entity('feature-1', ProvenanceEntityType.DERIVED_PRODUCT),
            used: entity('import-1', ProvenanceEntityType.DERIVED_PRODUCT),
          },
        ]
      )
    );
    expect(getSourceAncestors(parsed, 'feature-1').map((item) => item.entityId)).toContain(
      'res-usgs'
    );
    expect(getProcessingAncestors(parsed, 'feature-1').map((item) => item.entityId)).toContain(
      'import-1'
    );
    expect(getProcessingAncestors(parsed, 'feature-1').map((item) => item.entityId)).not.toContain(
      'res-usgs'
    );
  });
});

describe('authority, governance, and UGES boundary', () => {
  it('does not elevate community evidence to PRIMARY_AUTHORITY through AI synthesis', () => {
    expect(
      claimedAuthorityIsElevated(
        [EvidenceAuthorityClass.USER_OBSERVATION, EvidenceAuthorityClass.COMMUNITY_REPORT],
        EvidenceAuthorityClass.PRIMARY_AUTHORITY
      )
    ).toBe(true);
    expect(
      claimedAuthorityIsElevated(
        [EvidenceAuthorityClass.USER_OBSERVATION],
        EvidenceAuthorityClass.USER_OBSERVATION
      )
    ).toBe(false);
  });

  it('does not set certainty, confidence, or permission', () => {
    const parsed = validateProvenanceActivity(
      activity({
        activityType: ProvenanceActivityType.AI_ANALYSIS,
        generated: [entity('hyp-1', ProvenanceEntityType.MODEL_OUTPUT)],
      })
    );
    expect(provenanceSetsUgesTruth(parsed)).toBe(false);
    expect(Object.values(EvidenceCertainty)).not.toContain('PROHIBITED');
    expect(JSON.stringify(parsed)).not.toContain('certainty');
    expect(JSON.stringify(parsed)).not.toContain('COLLECTING_PERMISSION');
  });

  it('may reference a governance receipt without authorizing use', () => {
    const parsed = validateProvenanceActivity(
      activity({
        activityType: ProvenanceActivityType.SOURCE_RETRIEVAL,
        lineageClass: ProvenanceLineageClass.SOURCE,
        governanceReceiptId: 'gov-receipt-1',
      })
    );
    expect(parsed.governanceReceiptId).toBe('gov-receipt-1');
    expect(provenanceAuthorizesUse(parsed)).toBe(false);
  });
});

describe('hashing and AI metadata', () => {
  it('accepts a SHA-256 descriptor and rejects a malformed hash', () => {
    const descriptor = validateProvenanceHashDescriptor({
      algorithm: 'SHA-256',
      value: 'a'.repeat(64),
      scope: 'canonical-activity-v1',
    });
    expect(descriptor.algorithm).toBe('SHA-256');
    expect(() =>
      validateProvenanceHashDescriptor({
        algorithm: 'SHA-256',
        value: 'nope',
        scope: 'canonical-activity-v1',
      })
    ).toThrow();
  });

  it('hashes canonical activities stably and changes when a material input changes', async () => {
    const base = validateProvenanceActivity(
      activity({
        id: 'hash-me',
        used: [entity('in-1')],
        generated: [entity('out-1')],
        notes: 'volatile note',
        startedAt: T0,
      })
    );
    const same = validateProvenanceActivity({ ...base, notes: 'different note' });
    const changed = validateProvenanceActivity({
      ...base,
      used: [entity('in-2')],
    });
    const first = await hashProvenanceActivity(base);
    const second = await hashProvenanceActivity(same);
    const third = await hashProvenanceActivity(changed);
    expect(first.value).toBe(second.value);
    expect(third.value).not.toBe(first.value);
    expect(first.value).toMatch(/^[a-f0-9]{64}$/);
  });

  it('distinguishes AI_ANALYSIS from MODEL_ANALYSIS without chain-of-thought', () => {
    const ai = validateProvenanceActivity(
      activity({
        id: 'act-ai',
        activityType: ProvenanceActivityType.AI_ANALYSIS,
        ai: { modelName: 'portable-model', provider: 'example', evidenceBundleHash: 'abc' },
        chainOfThought: 'must not persist',
      })
    );
    const model = validateProvenanceActivity(
      activity({ id: 'act-model', activityType: ProvenanceActivityType.MODEL_ANALYSIS })
    );
    expect(ai.activityType).not.toBe(model.activityType);
    expect(ai.ai?.modelName).toBe('portable-model');
    expect(ai).not.toHaveProperty('chainOfThought');
    const bare = validateProvenanceActivity(
      activity({ id: 'act-ai-min', activityType: ProvenanceActivityType.AI_ANALYSIS })
    );
    expect(bare.ai).toBeUndefined();
  });

  it('rejects NaN parameters', () => {
    expect(() =>
      validateProvenanceActivity(
        activity({
          parameters: [{ name: 'slope', type: 'NUMBER', value: Number.NaN }],
        })
      )
    ).toThrow();
  });
});

describe('lineage queries', () => {
  function chain(): ProvenanceGraph {
    const dem = entity('dem', ProvenanceEntityType.RESOURCE_RECORD);
    const slope = entity('slope', ProvenanceEntityType.DERIVED_PRODUCT);
    const exposure = entity('exposure', ProvenanceEntityType.MODEL_OUTPUT);
    const activities = [
      validateProvenanceActivity(
        activity({
          id: 'act-dem',
          activityType: ProvenanceActivityType.SOURCE_RETRIEVAL,
          lineageClass: ProvenanceLineageClass.SOURCE,
          used: [entity('pub', ProvenanceEntityType.DOCUMENT)],
          generated: [dem],
        })
      ),
      validateProvenanceActivity(
        activity({
          id: 'act-slope',
          activityType: ProvenanceActivityType.GIS_ANALYSIS,
          lineageClass: ProvenanceLineageClass.PROCESS,
          used: [dem],
          generated: [slope],
        })
      ),
      validateProvenanceActivity(
        activity({
          id: 'act-exposure',
          activityType: ProvenanceActivityType.MODEL_ANALYSIS,
          lineageClass: ProvenanceLineageClass.PROCESS,
          used: [slope],
          generated: [exposure],
        })
      ),
      validateProvenanceActivity(
        activity({
          id: 'act-ai-share',
          activityType: ProvenanceActivityType.AI_ANALYSIS,
          lineageClass: ProvenanceLineageClass.PROCESS,
          used: [dem],
          generated: [entity('ai-view', ProvenanceEntityType.MODEL_OUTPUT)],
        })
      ),
    ];
    const derivations = [
      {
        kind: ProvenanceDerivationKind.DERIVED_FROM,
        relationship: ProvenanceRelationship.DERIVES,
        lineageClass: ProvenanceLineageClass.SOURCE,
        generated: dem,
        used: entity('pub', ProvenanceEntityType.DOCUMENT),
      },
      {
        kind: ProvenanceDerivationKind.DERIVED_FROM,
        relationship: ProvenanceRelationship.DERIVES,
        lineageClass: ProvenanceLineageClass.SOURCE,
        generated: entity('site-b', ProvenanceEntityType.DOCUMENT),
        used: entity('pub', ProvenanceEntityType.DOCUMENT),
      },
      {
        kind: ProvenanceDerivationKind.DERIVED_FROM,
        relationship: ProvenanceRelationship.DERIVES,
        lineageClass: ProvenanceLineageClass.SOURCE,
        generated: entity('site-c', ProvenanceEntityType.DOCUMENT),
        used: entity('pub', ProvenanceEntityType.DOCUMENT),
      },
      {
        kind: ProvenanceDerivationKind.TRANSFORMED_FROM,
        relationship: ProvenanceRelationship.DERIVES,
        lineageClass: ProvenanceLineageClass.PROCESS,
        generated: slope,
        used: dem,
      },
      {
        kind: ProvenanceDerivationKind.MODEL_DERIVED_FROM,
        relationship: ProvenanceRelationship.DERIVES,
        lineageClass: ProvenanceLineageClass.PROCESS,
        generated: exposure,
        used: slope,
      },
    ];
    return validateProvenanceGraph(graph(activities, derivations));
  }

  it('returns deterministic generating and consuming activities', () => {
    const parsed = chain();
    expect(getActivitiesGeneratingEntity(parsed, 'slope').map((item) => item.id)).toEqual([
      'act-slope',
    ]);
    expect(getActivitiesUsingEntity(parsed, 'dem').map((item) => item.id)).toEqual([
      'act-ai-share',
      'act-slope',
    ]);
  });

  it('returns source and processing ancestors separately and is mutation-safe', () => {
    const parsed = chain();
    const sources = getSourceAncestors(parsed, 'exposure');
    const processing = getProcessingAncestors(parsed, 'exposure');
    expect(sources.map((item) => item.entityId)).toEqual(['dem', 'pub']);
    expect(processing.map((item) => item.entityId)).toEqual(['dem', 'slope']);
    sources[0]!.entityId = 'MUTATED';
    expect(getSourceAncestors(parsed, 'exposure')[0]?.entityId).not.toBe('MUTATED');
    const traced = traceEntityLineage(parsed, 'exposure');
    expect(traced.source.map((item) => item.entityId)).toContain('pub');
    expect(traced.processing.map((item) => item.entityId)).toContain('slope');
  });

  it('shares one upstream publication across derivative documents', () => {
    const parsed = chain();
    expect(getSourceAncestors(parsed, 'site-b').map((item) => item.entityId)).toEqual(['pub']);
    expect(getSourceAncestors(parsed, 'site-c').map((item) => item.entityId)).toEqual(['pub']);
    expect(getDerivedEntities(parsed, 'pub').map((item) => item.entityId)).toEqual([
      'dem',
      'site-b',
      'site-c',
    ]);
  });

  it('does not infinite-loop when asked to trace a cyclic input that failed validation', () => {
    const edge = (generated: string, used: string) => ({
      kind: ProvenanceDerivationKind.DERIVED_FROM,
      relationship: ProvenanceRelationship.DERIVES,
      lineageClass: ProvenanceLineageClass.SOURCE,
      generated: entity(generated),
      used: entity(used),
    });
    const cyclic = {
      schemaVersion: PROVENANCE_SCHEMA_VERSION,
      activities: [],
      derivations: [edge('a', 'b'), edge('b', 'a')],
    } as ProvenanceGraph;
    expect(
      getSourceAncestors(cyclic, 'a')
        .map((item) => item.entityId)
        .sort()
    ).toEqual(['a', 'b']);
  });
});

describe('building block promotion', () => {
  it('promotes provenance-activity to STABLE 1.0.0 and keeps DRAFT 0.1.0', () => {
    const registry = createBuildingBlockRegistry();
    expect(
      getLatestStableBuildingBlock(registry, 'rockhounding:provenance-activity')?.version
    ).toEqual({ major: 1, minor: 0, patch: 0 });
    expect(
      getBuildingBlock(registry, 'rockhounding:provenance-activity', {
        major: 0,
        minor: 1,
        patch: 0,
      })?.lifecycleStatus
    ).toBe(BuildingBlockLifecycleStatus.DRAFT);
  });

  it('leaves existing stable foundation versions unchanged', () => {
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
    expect(getLatestStableBuildingBlock(registry, SAMPLE_BLOCK_ID)?.version).toEqual({
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
