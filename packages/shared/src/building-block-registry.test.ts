/**
 * Building Block Registry R1
 *
 * Production change that would fail these tests: inferring compatibility from
 * major version, substituting v2 for an exact v1 dependency, treating deprecated
 * as latest stable, or redefining UGES/governance semantics in registry metadata.
 */

import { describe, expect, it } from 'vitest';

import { EvidenceCertainty } from './universal-geological-evidence-schema';
import {
  BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
  BuildingBlockLifecycleStatus,
  BuildingBlockRelationshipKind,
  BuildingBlockVersionRequirementMode,
  GEOLOGICAL_LAYER_REGISTRY_BLOCK_ID,
  RESOURCE_CATALOG_BLOCK_ID,
  SOURCE_GOVERNANCE_BLOCK_ID,
  UGES_BLOCK_ID,
  BUILTIN_BUILDING_BLOCK_DEFINITIONS,
  createBuildingBlockRegistry,
  evaluateBuildingBlockConformanceEvidence,
  formatBuildingBlockVersion,
  getBuildingBlock,
  getLatestStableBuildingBlock,
  isCompatibilityDeclared,
  listBuildingBlockVersions,
  listBuildingBlocks,
  listBuildingBlocksByCategory,
  listBuildingBlocksByLifecycle,
  listDependencies,
  listDependents,
  validateBuildingBlockDefinition,
  type BuildingBlockDefinition,
} from './building-block-registry';

function version(major: number, minor = 0, patch = 0): BuildingBlockDefinition['version'] {
  return { major, minor, patch };
}

function validBlock(
  overrides: Partial<BuildingBlockDefinition> & Pick<BuildingBlockDefinition, 'id' | 'version'>
): BuildingBlockDefinition {
  const lifecycle = overrides.lifecycleStatus ?? BuildingBlockLifecycleStatus.STABLE;
  return {
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    name: 'Test block',
    category: 'ARCHITECTURE_REGISTRY',
    lifecycleStatus: lifecycle,
    purpose: 'Test architectural contract',
    boundary: 'ARCHITECTURE_REGISTRY',
    documentationRef: 'docs/BUILDING_BLOCK_REGISTRY.md',
    dependencies: [],
    compatibility: [],
    validators: [{ kind: 'SCHEMA_VALIDATOR', ref: 'TestSchema' }],
    examples: [{ kind: 'VALID', ref: 'valid-example' }],
    conformance: {
      schemaValidation: true,
      semanticValidation: true,
      requiredTests: ['test-a'],
      requiredDocumentation: ['docs/test.md'],
      requiredInvariants: ['identity-stable'],
    },
    implementation:
      lifecycle === BuildingBlockLifecycleStatus.STABLE
        ? {
            packageName: '@rockhounding/shared',
            modulePath: 'packages/shared/src/building-block-registry.ts',
            exportSubpath: '@rockhounding/shared/building-block-registry',
            status: 'IMPLEMENTED',
          }
        : undefined,
    ...overrides,
  };
}

describe('Building Block Registry schema version', () => {
  it('pins schemaVersion to 1', () => {
    expect(BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION).toBe(1);
    expect(
      validateBuildingBlockDefinition(validBlock({ id: 'rockhounding:test', version: version(1) }))
        .schemaVersion
    ).toBe(1);
  });
});

describe('valid definition and identity', () => {
  it('accepts a valid building block', () => {
    const parsed = validateBuildingBlockDefinition(
      validBlock({ id: 'rockhounding:test', version: version(1, 0, 0) })
    );
    expect(parsed.id).toBe('rockhounding:test');
    expect(formatBuildingBlockVersion(parsed.version)).toBe('1.0.0');
  });

  it('keeps stable ID distinct from implementation path', () => {
    const parsed = validateBuildingBlockDefinition(
      validBlock({
        id: 'rockhounding:uges',
        version: version(1, 1, 0),
        implementation: {
          packageName: '@rockhounding/shared',
          modulePath: 'packages/shared/src/moved-uges.ts',
          exportSubpath: '@rockhounding/shared/uges',
          status: 'IMPLEMENTED',
        },
      })
    );
    expect(parsed.id).toBe('rockhounding:uges');
    expect(parsed.id).not.toBe(parsed.implementation?.modulePath);
  });

  it('rejects invalid lifecycle state', () => {
    expect(() =>
      validateBuildingBlockDefinition({
        ...validBlock({ id: 'rockhounding:bad-life', version: version(1) }),
        lifecycleStatus: 'PASS',
      })
    ).toThrow();
  });

  it('rejects STABLE blocks without an implementation descriptor', () => {
    expect(() =>
      validateBuildingBlockDefinition(
        validBlock({
          id: 'rockhounding:stable-no-impl',
          version: version(1),
          lifecycleStatus: BuildingBlockLifecycleStatus.STABLE,
          implementation: undefined,
        })
      )
    ).toThrow();
  });
});

describe('registry construction and versions', () => {
  it('rejects duplicate id+version', () => {
    expect(() =>
      createBuildingBlockRegistry([
        validBlock({ id: 'rockhounding:dup', version: version(1) }),
        validBlock({ id: 'rockhounding:dup', version: version(1), name: 'Other' }),
      ])
    ).toThrow(/duplicate/i);
  });

  it('allows the same ID at multiple versions', () => {
    const registry = createBuildingBlockRegistry([
      validBlock({ id: 'rockhounding:multi', version: version(1, 0, 0) }),
      validBlock({ id: 'rockhounding:multi', version: version(2, 0, 0) }),
    ]);
    expect(
      listBuildingBlockVersions(registry, 'rockhounding:multi').map(formatBuildingBlockVersion)
    ).toEqual(['1.0.0', '2.0.0']);
  });

  it('lists blocks in deterministic id then version order', () => {
    const registry = createBuildingBlockRegistry([
      validBlock({ id: 'rockhounding:z', version: version(1) }),
      validBlock({ id: 'rockhounding:a', version: version(2) }),
      validBlock({ id: 'rockhounding:a', version: version(1) }),
    ]);
    expect(
      listBuildingBlocks(registry).map(
        (block) => `${block.id}@${formatBuildingBlockVersion(block.version)}`
      )
    ).toEqual(['rockhounding:a@1.0.0', 'rockhounding:a@2.0.0', 'rockhounding:z@1.0.0']);
  });
});

describe('dependencies', () => {
  it('rejects direct self-dependency and duplicate equivalent dependencies', () => {
    expect(() =>
      validateBuildingBlockDefinition(
        validBlock({
          id: 'rockhounding:self',
          version: version(1),
          dependencies: [
            {
              kind: BuildingBlockRelationshipKind.REQUIRES,
              targetBuildingBlockId: 'rockhounding:self',
              versionRequirement: {
                mode: BuildingBlockVersionRequirementMode.EXACT,
                version: version(1),
              },
            },
          ],
        })
      )
    ).toThrow();
    expect(() =>
      validateBuildingBlockDefinition(
        validBlock({
          id: 'rockhounding:dup-dep',
          version: version(1),
          dependencies: [
            {
              kind: BuildingBlockRelationshipKind.OPTIONAL,
              targetBuildingBlockId: 'rockhounding:uges',
              versionRequirement: {
                mode: BuildingBlockVersionRequirementMode.SAME_MAJOR,
                version: version(1, 1, 0),
              },
            },
            {
              kind: BuildingBlockRelationshipKind.OPTIONAL,
              targetBuildingBlockId: 'rockhounding:uges',
              versionRequirement: {
                mode: BuildingBlockVersionRequirementMode.SAME_MAJOR,
                version: version(1, 1, 0),
              },
            },
          ],
        })
      )
    ).toThrow();
  });

  it('rejects malformed version requirements', () => {
    expect(() =>
      validateBuildingBlockDefinition(
        validBlock({
          id: 'rockhounding:bad-req',
          version: version(1),
          dependencies: [
            {
              kind: BuildingBlockRelationshipKind.REQUIRES,
              targetBuildingBlockId: 'rockhounding:uges',
              versionRequirement: {
                mode: BuildingBlockVersionRequirementMode.EXACT,
              },
            },
          ],
        })
      )
    ).toThrow();
    expect(() =>
      validateBuildingBlockDefinition(
        validBlock({
          id: 'rockhounding:neg',
          version: { major: -1, minor: 0, patch: 0 },
        })
      )
    ).toThrow();
  });

  it('round-trips exact and optional dependencies', () => {
    const parsed = validateBuildingBlockDefinition(
      validBlock({
        id: 'rockhounding:deps',
        version: version(1),
        dependencies: [
          {
            kind: BuildingBlockRelationshipKind.REQUIRES,
            targetBuildingBlockId: 'rockhounding:uges',
            versionRequirement: {
              mode: BuildingBlockVersionRequirementMode.EXACT,
              version: version(1, 1, 0),
            },
          },
          {
            kind: BuildingBlockRelationshipKind.OPTIONAL,
            targetBuildingBlockId: 'rockhounding:resource-catalog',
            versionRequirement: {
              mode: BuildingBlockVersionRequirementMode.AT_LEAST,
              version: version(1, 0, 0),
            },
          },
        ],
      })
    );
    expect(parsed.dependencies[0]?.kind).toBe(BuildingBlockRelationshipKind.REQUIRES);
    expect(parsed.dependencies[0]?.versionRequirement.mode).toBe(
      BuildingBlockVersionRequirementMode.EXACT
    );
    expect(parsed.dependencies[1]?.kind).toBe(BuildingBlockRelationshipKind.OPTIONAL);
  });
});

describe('dependency and dependent lookup', () => {
  it('filters dependencies and dependents deterministically and does not substitute versions', () => {
    const registry = createBuildingBlockRegistry([
      validBlock({ id: 'rockhounding:uges-like', version: version(1, 0, 0) }),
      validBlock({ id: 'rockhounding:uges-like', version: version(2, 0, 0) }),
      validBlock({
        id: 'rockhounding:consumer',
        version: version(1, 0, 0),
        dependencies: [
          {
            kind: BuildingBlockRelationshipKind.REQUIRES,
            targetBuildingBlockId: 'rockhounding:uges-like',
            versionRequirement: {
              mode: BuildingBlockVersionRequirementMode.EXACT,
              version: version(1, 0, 0),
            },
          },
        ],
      }),
    ]);
    const deps = listDependencies(registry, 'rockhounding:consumer', version(1, 0, 0));
    expect(deps).toHaveLength(1);
    expect(deps[0]?.versionRequirement.version).toEqual(version(1, 0, 0));
    expect(
      listDependents(registry, 'rockhounding:uges-like', version(1, 0, 0)).map((b) => b.id)
    ).toEqual(['rockhounding:consumer']);
    expect(listDependents(registry, 'rockhounding:uges-like', version(2, 0, 0))).toEqual([]);
  });
});

describe('compatibility', () => {
  it('requires explicit compatibility and does not infer v2 from v1', () => {
    const registry = createBuildingBlockRegistry([
      validBlock({
        id: 'rockhounding:a',
        version: version(1),
        compatibility: [
          {
            targetBuildingBlockId: 'rockhounding:b',
            targetVersion: version(1),
          },
        ],
      }),
      validBlock({ id: 'rockhounding:b', version: version(1) }),
      validBlock({ id: 'rockhounding:b', version: version(2) }),
    ]);
    expect(
      isCompatibilityDeclared(registry, {
        fromId: 'rockhounding:a',
        fromVersion: version(1),
        toId: 'rockhounding:b',
        toVersion: version(1),
      })
    ).toBe(true);
    expect(
      isCompatibilityDeclared(registry, {
        fromId: 'rockhounding:a',
        fromVersion: version(1),
        toId: 'rockhounding:b',
        toVersion: version(2),
      })
    ).toBe(false);
  });
});

describe('lifecycle, deprecation, and latest stable', () => {
  it('preserves deprecated and retired definitions and does not treat them as latest stable', () => {
    const registry = createBuildingBlockRegistry([
      validBlock({
        id: 'rockhounding:clock',
        version: version(1, 0, 0),
        lifecycleStatus: BuildingBlockLifecycleStatus.STABLE,
      }),
      validBlock({
        id: 'rockhounding:clock',
        version: version(1, 1, 0),
        lifecycleStatus: BuildingBlockLifecycleStatus.DEPRECATED,
        deprecation: {
          reason: 'Use 1.0.0 until replacement is stable',
          replacementBuildingBlockId: 'rockhounding:clock',
          replacementVersion: version(1, 0, 0),
          losslessMigrationKnown: 'UNKNOWN',
          reversibleMigrationKnown: 'UNKNOWN',
        },
      }),
      validBlock({
        id: 'rockhounding:legacy',
        version: version(0, 9, 0),
        lifecycleStatus: BuildingBlockLifecycleStatus.RETIRED,
      }),
    ]);
    expect(
      getBuildingBlock(registry, 'rockhounding:clock', version(1, 1, 0))?.lifecycleStatus
    ).toBe(BuildingBlockLifecycleStatus.DEPRECATED);
    expect(
      formatBuildingBlockVersion(
        getLatestStableBuildingBlock(registry, 'rockhounding:clock')!.version
      )
    ).toBe('1.0.0');
    expect(
      getBuildingBlock(registry, 'rockhounding:legacy', version(0, 9, 0))?.lifecycleStatus
    ).toBe(BuildingBlockLifecycleStatus.RETIRED);
    expect(getLatestStableBuildingBlock(registry, 'rockhounding:legacy')).toBeUndefined();
  });

  it('allows unresolved replacement references in R1', () => {
    const parsed = validateBuildingBlockDefinition(
      validBlock({
        id: 'rockhounding:old',
        version: version(1),
        lifecycleStatus: BuildingBlockLifecycleStatus.DEPRECATED,
        deprecation: {
          reason: 'Replacement not registered yet',
          replacementBuildingBlockId: 'rockhounding:not-registered',
          losslessMigrationKnown: 'UNKNOWN',
          reversibleMigrationKnown: 'UNKNOWN',
        },
      })
    );
    expect(parsed.deprecation?.replacementBuildingBlockId).toBe('rockhounding:not-registered');
  });

  it('does not mistake DRAFT/EXPERIMENTAL future blocks for STABLE', () => {
    const parsed = validateBuildingBlockDefinition(
      validBlock({
        id: 'rockhounding:observation',
        version: version(0, 1, 0),
        lifecycleStatus: BuildingBlockLifecycleStatus.DRAFT,
        implementation: undefined,
      })
    );
    expect(parsed.lifecycleStatus).not.toBe(BuildingBlockLifecycleStatus.STABLE);
  });
});

describe('conformance vs implementation status', () => {
  it('lifecycle STABLE does not imply test PASS evidence', () => {
    const block = validateBuildingBlockDefinition(
      validBlock({ id: 'rockhounding:conf', version: version(1) })
    );
    expect(block.lifecycleStatus).toBe(BuildingBlockLifecycleStatus.STABLE);
    expect(
      evaluateBuildingBlockConformanceEvidence(block, { testsPassed: [], docsPresent: [] })
        .satisfied
    ).toBe(false);
  });

  it('implementation descriptor does not imply semantic conformance', () => {
    const block = validateBuildingBlockDefinition(
      validBlock({
        id: 'rockhounding:impl',
        version: version(1),
        implementation: {
          packageName: '@rockhounding/shared',
          modulePath: 'packages/shared/src/building-block-registry.ts',
          status: 'IMPLEMENTED',
        },
      })
    );
    expect(block.implementation?.status).toBe('IMPLEMENTED');
    expect(
      evaluateBuildingBlockConformanceEvidence(block, {
        testsPassed: ['test-a'],
        docsPresent: [],
      }).satisfied
    ).toBe(false);
  });
});

describe('immutability', () => {
  it('does not mutate built-in definitions via returned lists', () => {
    const registry = createBuildingBlockRegistry(BUILTIN_BUILDING_BLOCK_DEFINITIONS);
    const listed = listBuildingBlocks(registry);
    const originalId = listed[0]?.id;
    listed[0]!.name = 'MUTATED';
    listed[0]!.dependencies.push({
      kind: BuildingBlockRelationshipKind.REFERENCES,
      targetBuildingBlockId: 'rockhounding:injected',
      versionRequirement: {
        mode: BuildingBlockVersionRequirementMode.AT_LEAST,
        version: version(1),
      },
    });
    expect(registry.getBuildingBlock(originalId!, listed[0]!.version)?.name).not.toBe('MUTATED');
    expect(BUILTIN_BUILDING_BLOCK_DEFINITIONS[0]?.name).not.toBe('MUTATED');
  });
});

describe('foundation registration without semantic takeover', () => {
  it('registers UGES, Geological Layer Registry, Resource Catalog, and Source Governance', () => {
    const registry = createBuildingBlockRegistry();
    expect(getLatestStableBuildingBlock(registry, UGES_BLOCK_ID)?.lifecycleStatus).toBe(
      BuildingBlockLifecycleStatus.STABLE
    );
    expect(getLatestStableBuildingBlock(registry, GEOLOGICAL_LAYER_REGISTRY_BLOCK_ID)?.id).toBe(
      GEOLOGICAL_LAYER_REGISTRY_BLOCK_ID
    );
    expect(getLatestStableBuildingBlock(registry, RESOURCE_CATALOG_BLOCK_ID)?.id).toBe(
      RESOURCE_CATALOG_BLOCK_ID
    );
    expect(getLatestStableBuildingBlock(registry, SOURCE_GOVERNANCE_BLOCK_ID)?.id).toBe(
      SOURCE_GOVERNANCE_BLOCK_ID
    );
  });

  it('does not redefine UGES certainty, confidence, or source-governance decisions', () => {
    const registry = createBuildingBlockRegistry();
    const uges = getLatestStableBuildingBlock(registry, UGES_BLOCK_ID);
    expect(JSON.stringify(uges)).not.toContain('PROHIBITED');
    expect(Object.values(EvidenceCertainty)).not.toContain('HIGH');
    expect(uges?.boundary).toBe('ASSERTION_SCHEMA');
    const gov = getLatestStableBuildingBlock(registry, SOURCE_GOVERNANCE_BLOCK_ID);
    expect(gov?.boundary).toBe('SOURCE_USE_POLICY');
    expect(gov?.purpose.toLowerCase()).not.toContain('authorize collection');
  });

  it('keeps unimplemented future blocks non-STABLE when registered', () => {
    const registry = createBuildingBlockRegistry();
    const drafts = listBuildingBlocksByLifecycle(registry, BuildingBlockLifecycleStatus.DRAFT);
    expect(drafts.some((block) => block.id === 'rockhounding:provenance-activity')).toBe(true);
    expect(
      drafts.every((block) => block.lifecycleStatus !== BuildingBlockLifecycleStatus.STABLE)
    ).toBe(true);
    expect(
      listBuildingBlocksByCategory(registry, 'PROVENANCE_MODEL').every(
        (block) => block.lifecycleStatus !== BuildingBlockLifecycleStatus.STABLE
      )
    ).toBe(true);
  });
});
