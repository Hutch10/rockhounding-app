/**
 * Building Block Registry R1
 *
 * Persistence-free catalog of independently versioned domain contracts.
 * The registry points at owning contracts; it does not redefine their
 * scientific, legal, geological, or permission semantics.
 */

import { z } from 'zod';

export const BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION = 1;

export const UGES_BLOCK_ID = 'rockhounding:uges';
export const GEOLOGICAL_LAYER_REGISTRY_BLOCK_ID = 'rockhounding:geological-layer-registry';
export const RESOURCE_CATALOG_BLOCK_ID = 'rockhounding:resource-catalog';
export const SOURCE_GOVERNANCE_BLOCK_ID = 'rockhounding:source-governance-contract';
export const OBSERVATION_BLOCK_ID = 'rockhounding:observation';
export const SAMPLE_BLOCK_ID = 'rockhounding:sample';
export const SAMPLING_EVENT_BLOCK_ID = 'rockhounding:sampling-event';
export const PROVENANCE_ACTIVITY_BLOCK_ID = 'rockhounding:provenance-activity';
export const TRUTH_CLOCK_BLOCK_ID = 'rockhounding:truth-clock';
export const SOURCE_ADAPTER_CONTRACT_BLOCK_ID = 'rockhounding:source-adapter-contract';
export const EVIDENCE_QUARANTINE_BLOCK_ID = 'rockhounding:evidence-quarantine';
export const EVIDENCE_ADMISSION_BLOCK_ID = 'rockhounding:evidence-admission';
export const DECISION_EVIDENCE_CONTRACT_BLOCK_ID = 'rockhounding:decision-evidence-contract';
export const DECISION_SNAPSHOT_BLOCK_ID = 'rockhounding:decision-snapshot';
export const DECISION_EVALUATOR_BLOCK_ID = 'rockhounding:decision-evaluator';
export const DECISION_RECEIPT_BLOCK_ID = 'rockhounding:decision-receipt';

export type BuildingBlockId = string;

export const BuildingBlockVersionSchema = z.object({
  major: z.number().int().nonnegative(),
  minor: z.number().int().nonnegative(),
  patch: z.number().int().nonnegative(),
});

export type BuildingBlockVersion = z.infer<typeof BuildingBlockVersionSchema>;

export function formatBuildingBlockVersion(version: BuildingBlockVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

export function compareBuildingBlockVersions(
  left: BuildingBlockVersion,
  right: BuildingBlockVersion
): number {
  if (left.major !== right.major) {
    return left.major - right.major;
  }
  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }
  return left.patch - right.patch;
}

export const BuildingBlockLifecycleStatus = {
  DRAFT: 'DRAFT',
  EXPERIMENTAL: 'EXPERIMENTAL',
  CANDIDATE: 'CANDIDATE',
  STABLE: 'STABLE',
  DEPRECATED: 'DEPRECATED',
  RETIRED: 'RETIRED',
} as const;

export type BuildingBlockLifecycleStatus =
  (typeof BuildingBlockLifecycleStatus)[keyof typeof BuildingBlockLifecycleStatus];

export const BuildingBlockLifecycleStatusSchema = z.enum([
  'DRAFT',
  'EXPERIMENTAL',
  'CANDIDATE',
  'STABLE',
  'DEPRECATED',
  'RETIRED',
]);

export const BuildingBlockCategorySchema = z.enum([
  'ASSERTION_SCHEMA',
  'LAYER_METADATA',
  'RESOURCE_METADATA',
  'SOURCE_USE_POLICY',
  'ARCHITECTURE_REGISTRY',
  'OBSERVATION_MODEL',
  'SAMPLE_MODEL',
  'PROVENANCE_MODEL',
  'TEMPORAL_MODEL',
  'AVAILABILITY_MODEL',
  'DECISION_MODEL',
  'DISCLOSURE_MODEL',
  'PROCESS_CONTRACT',
  'ADMISSION_CONTRACT',
]);

export type BuildingBlockCategory = z.infer<typeof BuildingBlockCategorySchema>;

export const BuildingBlockBoundarySchema = BuildingBlockCategorySchema;
export type BuildingBlockBoundary = BuildingBlockCategory;

export const BuildingBlockRelationshipKind = {
  REQUIRES: 'REQUIRES',
  OPTIONAL: 'OPTIONAL',
  EXTENDS: 'EXTENDS',
  PROJECTS_TO: 'PROJECTS_TO',
  REFERENCES: 'REFERENCES',
} as const;

export type BuildingBlockRelationshipKind =
  (typeof BuildingBlockRelationshipKind)[keyof typeof BuildingBlockRelationshipKind];

export const BuildingBlockRelationshipKindSchema = z.enum([
  'REQUIRES',
  'OPTIONAL',
  'EXTENDS',
  'PROJECTS_TO',
  'REFERENCES',
]);

export const BuildingBlockVersionRequirementMode = {
  EXACT: 'EXACT',
  SAME_MAJOR: 'SAME_MAJOR',
  AT_LEAST: 'AT_LEAST',
  COMPATIBLE_WITH_DECLARED_RANGE: 'COMPATIBLE_WITH_DECLARED_RANGE',
} as const;

export type BuildingBlockVersionRequirementMode =
  (typeof BuildingBlockVersionRequirementMode)[keyof typeof BuildingBlockVersionRequirementMode];

export const BuildingBlockVersionRequirementModeSchema = z.enum([
  'EXACT',
  'SAME_MAJOR',
  'AT_LEAST',
  'COMPATIBLE_WITH_DECLARED_RANGE',
]);

export const BuildingBlockVersionRequirementSchema = z
  .object({
    mode: BuildingBlockVersionRequirementModeSchema,
    version: BuildingBlockVersionSchema.optional(),
    range: z
      .object({
        min: BuildingBlockVersionSchema,
        max: BuildingBlockVersionSchema.optional(),
      })
      .optional(),
  })
  .superRefine((requirement, ctx) => {
    if (
      requirement.mode !== BuildingBlockVersionRequirementMode.COMPATIBLE_WITH_DECLARED_RANGE &&
      requirement.version === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'version is required for this requirement mode',
        path: ['version'],
      });
    }
    if (
      requirement.mode === BuildingBlockVersionRequirementMode.COMPATIBLE_WITH_DECLARED_RANGE &&
      requirement.range === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'range is required for COMPATIBLE_WITH_DECLARED_RANGE',
        path: ['range'],
      });
    }
  });

export type BuildingBlockVersionRequirement = z.infer<typeof BuildingBlockVersionRequirementSchema>;

export const BuildingBlockDependencySchema = z.object({
  kind: BuildingBlockRelationshipKindSchema,
  targetBuildingBlockId: z.string().min(1).max(128),
  versionRequirement: BuildingBlockVersionRequirementSchema,
  notes: z.string().min(1).max(500).optional(),
});

export type BuildingBlockDependency = z.infer<typeof BuildingBlockDependencySchema>;

export const BuildingBlockCompatibilitySchema = z.object({
  targetBuildingBlockId: z.string().min(1).max(128),
  targetVersion: BuildingBlockVersionSchema,
  notes: z.string().min(1).max(500).optional(),
});

export type BuildingBlockCompatibility = z.infer<typeof BuildingBlockCompatibilitySchema>;

export const BuildingBlockConformanceProfileSchema = z.object({
  schemaValidation: z.boolean(),
  semanticValidation: z.boolean(),
  requiredTests: z.array(z.string().min(1).max(256)).max(64),
  requiredDocumentation: z.array(z.string().min(1).max(256)).max(32),
  requiredInvariants: z.array(z.string().min(1).max(256)).max(32),
});

export type BuildingBlockConformanceProfile = z.infer<typeof BuildingBlockConformanceProfileSchema>;

export const BuildingBlockValidatorDescriptorSchema = z.object({
  kind: z.enum([
    'TYPE_GUARD',
    'SCHEMA_VALIDATOR',
    'SEMANTIC_VALIDATOR',
    'TEST_SUITE',
    'STATIC_ANALYSIS',
    'DOCUMENTATION_REVIEW',
  ]),
  ref: z.string().min(1).max(256),
});

export type BuildingBlockValidatorDescriptor = z.infer<
  typeof BuildingBlockValidatorDescriptorSchema
>;

export const BuildingBlockExampleDescriptorSchema = z.object({
  kind: z.enum(['VALID', 'INVALID', 'ADVERSARIAL', 'MIGRATION', 'INTEGRATION']),
  ref: z.string().min(1).max(256),
});

export type BuildingBlockExampleDescriptor = z.infer<typeof BuildingBlockExampleDescriptorSchema>;

export const BuildingBlockImplementationDescriptorSchema = z.object({
  packageName: z.string().min(1).max(128),
  modulePath: z.string().min(1).max(512),
  exportSubpath: z.string().min(1).max(256).optional(),
  language: z.string().min(1).max(64).optional(),
  status: z.enum(['IMPLEMENTED', 'TESTED', 'PARTIAL', 'NONE']),
});

export type BuildingBlockImplementationDescriptor = z.infer<
  typeof BuildingBlockImplementationDescriptorSchema
>;

export const BuildingBlockDeprecationSchema = z.object({
  deprecatedAt: z.string().datetime({ offset: true }).optional(),
  replacementBuildingBlockId: z.string().min(1).max(128).optional(),
  replacementVersion: BuildingBlockVersionSchema.optional(),
  reason: z.string().min(1).max(1000).optional(),
  migrationReference: z.string().min(1).max(512).optional(),
  migrationGuideRef: z.string().min(1).max(512).optional(),
  losslessMigrationKnown: z.enum(['YES', 'NO', 'UNKNOWN']),
  reversibleMigrationKnown: z.enum(['YES', 'NO', 'UNKNOWN']),
});

export type BuildingBlockDeprecation = z.infer<typeof BuildingBlockDeprecationSchema>;

function dependencyKey(dependency: BuildingBlockDependency): string {
  return [
    dependency.kind,
    dependency.targetBuildingBlockId,
    dependency.versionRequirement.mode,
    dependency.versionRequirement.version === undefined
      ? ''
      : formatBuildingBlockVersion(dependency.versionRequirement.version),
    dependency.versionRequirement.range === undefined
      ? ''
      : `${formatBuildingBlockVersion(dependency.versionRequirement.range.min)}-${
          dependency.versionRequirement.range.max === undefined
            ? ''
            : formatBuildingBlockVersion(dependency.versionRequirement.range.max)
        }`,
  ].join('|');
}

export const BuildingBlockDefinitionSchema = z
  .object({
    id: z.string().min(1).max(128),
    schemaVersion: z.literal(BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION),
    name: z.string().min(1).max(256),
    version: BuildingBlockVersionSchema,
    category: BuildingBlockCategorySchema,
    lifecycleStatus: BuildingBlockLifecycleStatusSchema,
    purpose: z.string().min(1).max(1000),
    boundary: BuildingBlockBoundarySchema,
    documentationRef: z.string().min(1).max(512),
    dependencies: z.array(BuildingBlockDependencySchema).max(32).default([]),
    compatibility: z.array(BuildingBlockCompatibilitySchema).max(32).default([]),
    validators: z.array(BuildingBlockValidatorDescriptorSchema).max(16).default([]),
    examples: z.array(BuildingBlockExampleDescriptorSchema).max(32).default([]),
    conformance: BuildingBlockConformanceProfileSchema,
    implementation: BuildingBlockImplementationDescriptorSchema.optional(),
    deprecation: BuildingBlockDeprecationSchema.optional(),
  })
  .superRefine((definition, ctx) => {
    if (
      definition.lifecycleStatus === BuildingBlockLifecycleStatus.STABLE &&
      definition.implementation === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'STABLE building blocks require an implementation descriptor',
        path: ['implementation'],
      });
    }

    const seen = new Set<string>();
    for (const [index, dependency] of definition.dependencies.entries()) {
      if (dependency.targetBuildingBlockId === definition.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Direct self-dependency is not allowed',
          path: ['dependencies', index],
        });
      }
      const key = dependencyKey(dependency);
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate equivalent dependencies are not allowed',
          path: ['dependencies', index],
        });
      }
      seen.add(key);
    }
  });

export type BuildingBlockDefinition = z.infer<typeof BuildingBlockDefinitionSchema>;

export function validateBuildingBlockDefinition(input: unknown): BuildingBlockDefinition {
  return BuildingBlockDefinitionSchema.parse(input);
}

function cloneDefinition(definition: BuildingBlockDefinition): BuildingBlockDefinition {
  return structuredClone(definition);
}

function versionKey(id: string, version: BuildingBlockVersion): string {
  return `${id}@${formatBuildingBlockVersion(version)}`;
}

function sortDefinitions(
  definitions: readonly BuildingBlockDefinition[]
): BuildingBlockDefinition[] {
  return [...definitions].sort((left, right) => {
    const idCompare = left.id.localeCompare(right.id);
    if (idCompare !== 0) {
      return idCompare;
    }
    return compareBuildingBlockVersions(left.version, right.version);
  });
}

function versionSatisfies(
  candidate: BuildingBlockVersion,
  requirement: BuildingBlockVersionRequirement
): boolean {
  if (requirement.mode === BuildingBlockVersionRequirementMode.EXACT) {
    return (
      requirement.version !== undefined &&
      compareBuildingBlockVersions(candidate, requirement.version) === 0
    );
  }
  if (requirement.mode === BuildingBlockVersionRequirementMode.SAME_MAJOR) {
    return requirement.version !== undefined && candidate.major === requirement.version.major;
  }
  if (requirement.mode === BuildingBlockVersionRequirementMode.AT_LEAST) {
    return (
      requirement.version !== undefined &&
      compareBuildingBlockVersions(candidate, requirement.version) >= 0
    );
  }
  if (requirement.range === undefined) {
    return false;
  }
  const minOk = compareBuildingBlockVersions(candidate, requirement.range.min) >= 0;
  if (requirement.range.max === undefined) {
    return minOk;
  }
  return minOk && compareBuildingBlockVersions(candidate, requirement.range.max) <= 0;
}

function detectRequireCycles(definitions: readonly BuildingBlockDefinition[]): void {
  const adjacency = new Map<string, string[]>();
  for (const definition of definitions) {
    const from = definition.id;
    const targets = definition.dependencies
      .filter(
        (dependency) =>
          dependency.kind === BuildingBlockRelationshipKind.REQUIRES ||
          dependency.kind === BuildingBlockRelationshipKind.EXTENDS
      )
      .map((dependency) => dependency.targetBuildingBlockId);
    adjacency.set(from, [...(adjacency.get(from) ?? []), ...targets]);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (node: string): void => {
    if (visited.has(node)) {
      return;
    }
    if (visiting.has(node)) {
      throw new Error(`Building-block dependency cycle detected at ${node}`);
    }
    visiting.add(node);
    for (const next of adjacency.get(node) ?? []) {
      visit(next);
    }
    visiting.delete(node);
    visited.add(node);
  };

  for (const node of adjacency.keys()) {
    visit(node);
  }
}

export type BuildingBlockRegistry = {
  readonly schemaVersion: typeof BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION;
  getBuildingBlock: (
    id: BuildingBlockId,
    version?: BuildingBlockVersion
  ) => BuildingBlockDefinition | undefined;
  listBuildingBlocks: () => BuildingBlockDefinition[];
  listBuildingBlockVersions: (id: BuildingBlockId) => BuildingBlockVersion[];
  getLatestStableBuildingBlock: (id: BuildingBlockId) => BuildingBlockDefinition | undefined;
  listBuildingBlocksByCategory: (category: BuildingBlockCategory) => BuildingBlockDefinition[];
  listBuildingBlocksByLifecycle: (
    status: BuildingBlockLifecycleStatus
  ) => BuildingBlockDefinition[];
  listDependencies: (
    id: BuildingBlockId,
    version: BuildingBlockVersion
  ) => BuildingBlockDependency[];
  listDependents: (
    id: BuildingBlockId,
    version?: BuildingBlockVersion
  ) => BuildingBlockDefinition[];
};

export function createBuildingBlockRegistry(
  definitions: readonly BuildingBlockDefinition[] = BUILTIN_BUILDING_BLOCK_DEFINITIONS
): BuildingBlockRegistry {
  const parsed = definitions.map((definition) => validateBuildingBlockDefinition(definition));
  const keys = parsed.map((definition) => versionKey(definition.id, definition.version));
  if (new Set(keys).size !== keys.length) {
    throw new Error('Duplicate building-block id+version is not allowed');
  }
  detectRequireCycles(parsed);

  const byKey = new Map(
    parsed.map((definition) => [
      versionKey(definition.id, definition.version),
      cloneDefinition(definition),
    ])
  );
  const byId = new Map<string, BuildingBlockDefinition[]>();
  for (const definition of parsed) {
    const list = byId.get(definition.id) ?? [];
    list.push(cloneDefinition(definition));
    byId.set(definition.id, list);
  }
  for (const list of byId.values()) {
    list.sort((left, right) => compareBuildingBlockVersions(left.version, right.version));
  }

  return {
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    getBuildingBlock(
      id: BuildingBlockId,
      version?: BuildingBlockVersion
    ): BuildingBlockDefinition | undefined {
      if (version !== undefined) {
        const found = byKey.get(versionKey(id, version));
        return found === undefined ? undefined : cloneDefinition(found);
      }
      const versions = byId.get(id);
      if (versions === undefined || versions.length === 0) {
        return undefined;
      }
      return cloneDefinition(versions[versions.length - 1]!);
    },
    listBuildingBlocks(): BuildingBlockDefinition[] {
      return sortDefinitions([...byKey.values()]).map(cloneDefinition);
    },
    listBuildingBlockVersions(id: BuildingBlockId): BuildingBlockVersion[] {
      return (byId.get(id) ?? []).map((definition) => ({ ...definition.version }));
    },
    getLatestStableBuildingBlock(id: BuildingBlockId): BuildingBlockDefinition | undefined {
      const stable = (byId.get(id) ?? []).filter(
        (definition) => definition.lifecycleStatus === BuildingBlockLifecycleStatus.STABLE
      );
      if (stable.length === 0) {
        return undefined;
      }
      return cloneDefinition(stable[stable.length - 1]!);
    },
    listBuildingBlocksByCategory(category: BuildingBlockCategory): BuildingBlockDefinition[] {
      return sortDefinitions(
        [...byKey.values()].filter((definition) => definition.category === category)
      ).map(cloneDefinition);
    },
    listBuildingBlocksByLifecycle(status: BuildingBlockLifecycleStatus): BuildingBlockDefinition[] {
      return sortDefinitions(
        [...byKey.values()].filter((definition) => definition.lifecycleStatus === status)
      ).map(cloneDefinition);
    },
    listDependencies(
      id: BuildingBlockId,
      version: BuildingBlockVersion
    ): BuildingBlockDependency[] {
      const found = byKey.get(versionKey(id, version));
      return found === undefined
        ? []
        : found.dependencies.map((dependency) => structuredClone(dependency));
    },
    listDependents(id: BuildingBlockId, version?: BuildingBlockVersion): BuildingBlockDefinition[] {
      const dependents = [...byKey.values()].filter((definition) =>
        definition.dependencies.some((dependency) => {
          if (dependency.targetBuildingBlockId !== id) {
            return false;
          }
          if (version === undefined) {
            return true;
          }
          return versionSatisfies(version, dependency.versionRequirement);
        })
      );
      return sortDefinitions(dependents).map(cloneDefinition);
    },
  };
}

export function validateBuildingBlockRegistry(
  definitions: readonly BuildingBlockDefinition[]
): BuildingBlockRegistry {
  return createBuildingBlockRegistry(definitions);
}

export function getBuildingBlock(
  registry: BuildingBlockRegistry,
  id: BuildingBlockId,
  version?: BuildingBlockVersion
): BuildingBlockDefinition | undefined {
  return registry.getBuildingBlock(id, version);
}

export function listBuildingBlocks(registry: BuildingBlockRegistry): BuildingBlockDefinition[] {
  return registry.listBuildingBlocks();
}

export function listBuildingBlockVersions(
  registry: BuildingBlockRegistry,
  id: BuildingBlockId
): BuildingBlockVersion[] {
  return registry.listBuildingBlockVersions(id);
}

export function getLatestStableBuildingBlock(
  registry: BuildingBlockRegistry,
  id: BuildingBlockId
): BuildingBlockDefinition | undefined {
  return registry.getLatestStableBuildingBlock(id);
}

export function listBuildingBlocksByCategory(
  registry: BuildingBlockRegistry,
  category: BuildingBlockCategory
): BuildingBlockDefinition[] {
  return registry.listBuildingBlocksByCategory(category);
}

export function listBuildingBlocksByLifecycle(
  registry: BuildingBlockRegistry,
  status: BuildingBlockLifecycleStatus
): BuildingBlockDefinition[] {
  return registry.listBuildingBlocksByLifecycle(status);
}

export function listDependencies(
  registry: BuildingBlockRegistry,
  id: BuildingBlockId,
  version: BuildingBlockVersion
): BuildingBlockDependency[] {
  return registry.listDependencies(id, version);
}

export function listDependents(
  registry: BuildingBlockRegistry,
  id: BuildingBlockId,
  version?: BuildingBlockVersion
): BuildingBlockDefinition[] {
  return registry.listDependents(id, version);
}

export function isCompatibilityDeclared(
  registry: BuildingBlockRegistry,
  query: {
    fromId: BuildingBlockId;
    fromVersion: BuildingBlockVersion;
    toId: BuildingBlockId;
    toVersion: BuildingBlockVersion;
  }
): boolean {
  const from = registry.getBuildingBlock(query.fromId, query.fromVersion);
  if (from === undefined) {
    return false;
  }
  return from.compatibility.some(
    (entry) =>
      entry.targetBuildingBlockId === query.toId &&
      compareBuildingBlockVersions(entry.targetVersion, query.toVersion) === 0
  );
}

export type BuildingBlockConformanceEvidence = {
  testsPassed?: string[];
  docsPresent?: string[];
};

export function evaluateBuildingBlockConformanceEvidence(
  definition: BuildingBlockDefinition,
  evidence: BuildingBlockConformanceEvidence
): { satisfied: boolean } {
  const testsPassed = new Set(evidence.testsPassed ?? []);
  const docsPresent = new Set(evidence.docsPresent ?? []);
  const testsOk = definition.conformance.requiredTests.every((test) => testsPassed.has(test));
  const docsOk = definition.conformance.requiredDocumentation.every((doc) => docsPresent.has(doc));
  return { satisfied: testsOk && docsOk };
}

const IMPLEMENTED = {
  packageName: '@rockhounding/shared',
  language: 'TypeScript',
  status: 'TESTED' as const,
};

function draftBlock(
  id: string,
  name: string,
  category: BuildingBlockCategory,
  purpose: string
): BuildingBlockDefinition {
  return validateBuildingBlockDefinition({
    id,
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    name,
    version: { major: 0, minor: 1, patch: 0 },
    category,
    lifecycleStatus: BuildingBlockLifecycleStatus.DRAFT,
    purpose,
    boundary: category,
    documentationRef: 'docs/BUILDING_BLOCK_REGISTRY.md',
    conformance: {
      schemaValidation: false,
      semanticValidation: false,
      requiredTests: [],
      requiredDocumentation: ['docs/BUILDING_BLOCK_REGISTRY.md'],
      requiredInvariants: ['not-stable'],
    },
  });
}

export const BUILTIN_BUILDING_BLOCK_DEFINITIONS: readonly BuildingBlockDefinition[] = [
  validateBuildingBlockDefinition({
    id: UGES_BLOCK_ID,
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    name: 'Universal Geological Evidence Schema',
    version: { major: 1, minor: 1, patch: 0 },
    category: 'ASSERTION_SCHEMA',
    lifecycleStatus: BuildingBlockLifecycleStatus.STABLE,
    purpose: 'Provenance-first evidence assertion contract for geological and access claims.',
    boundary: 'ASSERTION_SCHEMA',
    documentationRef: 'docs/UNIVERSAL_GEOLOGICAL_EVIDENCE_SCHEMA.md',
    compatibility: [],
    validators: [
      { kind: 'SCHEMA_VALIDATOR', ref: 'EvidenceAssertionSchema' },
      {
        kind: 'TEST_SUITE',
        ref: 'packages/shared/src/universal-geological-evidence-schema.test.ts',
      },
    ],
    examples: [{ kind: 'VALID', ref: 'domain examples A-G' }],
    conformance: {
      schemaValidation: true,
      semanticValidation: true,
      requiredTests: ['packages/shared/src/universal-geological-evidence-schema.test.ts'],
      requiredDocumentation: ['docs/UNIVERSAL_GEOLOGICAL_EVIDENCE_SCHEMA.md'],
      requiredInvariants: [
        'certainty-excludes-HIGH',
        'permission-status-separate-from-certainty',
        'does-not-authorize-collection',
      ],
    },
    implementation: {
      ...IMPLEMENTED,
      modulePath: 'packages/shared/src/universal-geological-evidence-schema.ts',
      exportSubpath: '@rockhounding/shared/uges',
    },
  }),
  validateBuildingBlockDefinition({
    id: GEOLOGICAL_LAYER_REGISTRY_BLOCK_ID,
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    name: 'Geological Layer Registry',
    version: { major: 1, minor: 0, patch: 0 },
    category: 'LAYER_METADATA',
    lifecycleStatus: BuildingBlockLifecycleStatus.STABLE,
    purpose: 'Catalog of geological/geospatial layer definitions and capabilities.',
    boundary: 'LAYER_METADATA',
    documentationRef: 'docs/GEOLOGICAL_LAYER_REGISTRY.md',
    dependencies: [
      {
        kind: BuildingBlockRelationshipKind.REQUIRES,
        targetBuildingBlockId: UGES_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.SAME_MAJOR,
          version: { major: 1, minor: 1, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: RESOURCE_CATALOG_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
    ],
    compatibility: [
      {
        targetBuildingBlockId: UGES_BLOCK_ID,
        targetVersion: { major: 1, minor: 1, patch: 0 },
      },
    ],
    validators: [
      { kind: 'SCHEMA_VALIDATOR', ref: 'GeologicalLayerDefinitionSchema' },
      { kind: 'TEST_SUITE', ref: 'packages/shared/src/geological-layer-registry.test.ts' },
    ],
    examples: [{ kind: 'VALID', ref: 'BUILTIN_GEOLOGICAL_LAYER_DEFINITIONS' }],
    conformance: {
      schemaValidation: true,
      semanticValidation: true,
      requiredTests: ['packages/shared/src/geological-layer-registry.test.ts'],
      requiredDocumentation: ['docs/GEOLOGICAL_LAYER_REGISTRY.md'],
      requiredInvariants: ['layer-does-not-authorize-collection'],
    },
    implementation: {
      ...IMPLEMENTED,
      modulePath: 'packages/shared/src/geological-layer-registry.ts',
      exportSubpath: '@rockhounding/shared/geological-layer-registry',
    },
  }),
  validateBuildingBlockDefinition({
    id: RESOURCE_CATALOG_BLOCK_ID,
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    name: 'Resource Catalog',
    version: { major: 1, minor: 0, patch: 0 },
    category: 'RESOURCE_METADATA',
    lifecycleStatus: BuildingBlockLifecycleStatus.STABLE,
    purpose: 'Discoverable resource metadata for datasets, APIs, documents, and related origins.',
    boundary: 'RESOURCE_METADATA',
    documentationRef: 'docs/RESOURCE_CATALOG.md',
    dependencies: [
      {
        kind: BuildingBlockRelationshipKind.PROJECTS_TO,
        targetBuildingBlockId: UGES_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.SAME_MAJOR,
          version: { major: 1, minor: 1, patch: 0 },
        },
      },
    ],
    compatibility: [
      {
        targetBuildingBlockId: UGES_BLOCK_ID,
        targetVersion: { major: 1, minor: 1, patch: 0 },
      },
    ],
    validators: [
      { kind: 'SCHEMA_VALIDATOR', ref: 'ResourceRecordSchema' },
      { kind: 'TEST_SUITE', ref: 'packages/shared/src/resource-catalog.test.ts' },
    ],
    examples: [{ kind: 'VALID', ref: 'BUILTIN_RESOURCE_RECORDS' }],
    conformance: {
      schemaValidation: true,
      semanticValidation: true,
      requiredTests: ['packages/shared/src/resource-catalog.test.ts'],
      requiredDocumentation: ['docs/RESOURCE_CATALOG.md'],
      requiredInvariants: ['resource-does-not-generate-assertion'],
    },
    implementation: {
      ...IMPLEMENTED,
      modulePath: 'packages/shared/src/resource-catalog.ts',
      exportSubpath: '@rockhounding/shared/resource-catalog',
    },
  }),
  validateBuildingBlockDefinition({
    id: SOURCE_GOVERNANCE_BLOCK_ID,
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    name: 'Source Governance Contract',
    version: { major: 1, minor: 0, patch: 0 },
    category: 'SOURCE_USE_POLICY',
    lifecycleStatus: BuildingBlockLifecycleStatus.STABLE,
    purpose: 'Admission and restriction policy for cataloged sources and declared uses.',
    boundary: 'SOURCE_USE_POLICY',
    documentationRef: 'docs/SOURCE_GOVERNANCE_CONTRACT.md',
    dependencies: [
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: RESOURCE_CATALOG_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
    ],
    compatibility: [
      {
        targetBuildingBlockId: RESOURCE_CATALOG_BLOCK_ID,
        targetVersion: { major: 1, minor: 0, patch: 0 },
      },
    ],
    validators: [
      { kind: 'SCHEMA_VALIDATOR', ref: 'SourceGovernanceRecordSchema' },
      { kind: 'TEST_SUITE', ref: 'packages/shared/src/source-governance-contract.test.ts' },
    ],
    examples: [{ kind: 'VALID', ref: 'BUILTIN_SOURCE_GOVERNANCE_RECORDS' }],
    conformance: {
      schemaValidation: true,
      semanticValidation: true,
      requiredTests: ['packages/shared/src/source-governance-contract.test.ts'],
      requiredDocumentation: ['docs/SOURCE_GOVERNANCE_CONTRACT.md'],
      requiredInvariants: [
        'does-not-elevate-authority',
        'does-not-authorize-collection',
        'does-not-generate-assertions',
      ],
    },
    implementation: {
      ...IMPLEMENTED,
      modulePath: 'packages/shared/src/source-governance-contract.ts',
      exportSubpath: '@rockhounding/shared/source-governance-contract',
    },
  }),
  validateBuildingBlockDefinition({
    id: OBSERVATION_BLOCK_ID,
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    name: 'Observation',
    version: { major: 1, minor: 0, patch: 0 },
    category: 'OBSERVATION_MODEL',
    lifecycleStatus: BuildingBlockLifecycleStatus.STABLE,
    purpose: 'Direct field and instrument observations, results, and observed properties.',
    boundary: 'OBSERVATION_MODEL',
    documentationRef: 'docs/OBSERVATION_SAMPLE_MODEL.md',
    dependencies: [
      {
        kind: BuildingBlockRelationshipKind.PROJECTS_TO,
        targetBuildingBlockId: UGES_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.SAME_MAJOR,
          version: { major: 1, minor: 1, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: RESOURCE_CATALOG_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
    ],
    compatibility: [
      {
        targetBuildingBlockId: UGES_BLOCK_ID,
        targetVersion: { major: 1, minor: 1, patch: 0 },
      },
    ],
    validators: [
      { kind: 'SCHEMA_VALIDATOR', ref: 'ObservationSchema' },
      { kind: 'TEST_SUITE', ref: 'packages/shared/src/observation-sample-model.test.ts' },
    ],
    examples: [{ kind: 'VALID', ref: 'minimal valid observation' }],
    conformance: {
      schemaValidation: true,
      semanticValidation: true,
      requiredTests: ['packages/shared/src/observation-sample-model.test.ts'],
      requiredDocumentation: ['docs/OBSERVATION_SAMPLE_MODEL.md'],
      requiredInvariants: [
        'observation-is-not-uges-assertion',
        'raw-observation-not-overwritten',
        'model-generated-is-not-direct',
      ],
    },
    implementation: {
      ...IMPLEMENTED,
      modulePath: 'packages/shared/src/observation-sample-model.ts',
      exportSubpath: '@rockhounding/shared/observation-sample-model',
    },
  }),
  validateBuildingBlockDefinition({
    id: SAMPLE_BLOCK_ID,
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    name: 'Sample / Specimen',
    version: { major: 1, minor: 0, patch: 0 },
    category: 'SAMPLE_MODEL',
    lifecycleStatus: BuildingBlockLifecycleStatus.STABLE,
    purpose: 'Physical specimen identity, external identifiers, and sample lineage.',
    boundary: 'SAMPLE_MODEL',
    documentationRef: 'docs/OBSERVATION_SAMPLE_MODEL.md',
    dependencies: [
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: SAMPLING_EVENT_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
    ],
    validators: [
      { kind: 'SCHEMA_VALIDATOR', ref: 'SampleSchema' },
      { kind: 'TEST_SUITE', ref: 'packages/shared/src/observation-sample-model.test.ts' },
    ],
    examples: [{ kind: 'VALID', ref: 'museum specimen without sampling event' }],
    conformance: {
      schemaValidation: true,
      semanticValidation: true,
      requiredTests: ['packages/shared/src/observation-sample-model.test.ts'],
      requiredDocumentation: ['docs/OBSERVATION_SAMPLE_MODEL.md'],
      requiredInvariants: [
        'sample-is-not-observation',
        'fossil-does-not-imply-lawful-collection',
        'lineage-self-reference-rejected',
      ],
    },
    implementation: {
      ...IMPLEMENTED,
      modulePath: 'packages/shared/src/observation-sample-model.ts',
      exportSubpath: '@rockhounding/shared/observation-sample-model',
    },
  }),
  validateBuildingBlockDefinition({
    id: SAMPLING_EVENT_BLOCK_ID,
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    name: 'Sampling Event',
    version: { major: 1, minor: 0, patch: 0 },
    category: 'OBSERVATION_MODEL',
    lifecycleStatus: BuildingBlockLifecycleStatus.STABLE,
    purpose: 'Act of obtaining physical samples from a feature or material source.',
    boundary: 'OBSERVATION_MODEL',
    documentationRef: 'docs/OBSERVATION_SAMPLE_MODEL.md',
    dependencies: [
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: SAMPLE_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
    ],
    validators: [
      { kind: 'SCHEMA_VALIDATOR', ref: 'SamplingEventSchema' },
      { kind: 'TEST_SUITE', ref: 'packages/shared/src/observation-sample-model.test.ts' },
    ],
    examples: [{ kind: 'VALID', ref: 'sampling event with empty resultingSampleIds' }],
    conformance: {
      schemaValidation: true,
      semanticValidation: true,
      requiredTests: ['packages/shared/src/observation-sample-model.test.ts'],
      requiredDocumentation: ['docs/OBSERVATION_SAMPLE_MODEL.md'],
      requiredInvariants: ['sampling-event-is-not-sample', 'does-not-authorize-collection'],
    },
    implementation: {
      ...IMPLEMENTED,
      modulePath: 'packages/shared/src/observation-sample-model.ts',
      exportSubpath: '@rockhounding/shared/observation-sample-model',
    },
  }),
  draftBlock(
    OBSERVATION_BLOCK_ID,
    'Observation',
    'OBSERVATION_MODEL',
    'Historical DRAFT placeholder retained for identity continuity. Use STABLE 1.0.0.'
  ),
  draftBlock(
    SAMPLE_BLOCK_ID,
    'Sample / Specimen',
    'SAMPLE_MODEL',
    'Historical DRAFT placeholder retained for identity continuity. Use STABLE 1.0.0.'
  ),
  draftBlock(
    SAMPLING_EVENT_BLOCK_ID,
    'Sampling Event',
    'OBSERVATION_MODEL',
    'Historical DRAFT placeholder retained for identity continuity. Use STABLE 1.0.0.'
  ),
  validateBuildingBlockDefinition({
    id: PROVENANCE_ACTIVITY_BLOCK_ID,
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    name: 'Provenance Activity',
    version: { major: 1, minor: 0, patch: 0 },
    category: 'PROVENANCE_MODEL',
    lifecycleStatus: BuildingBlockLifecycleStatus.STABLE,
    purpose: 'Lineage of entities, activities, and agents. Does not establish truth or authority.',
    boundary: 'PROVENANCE_MODEL',
    documentationRef: 'docs/PROVENANCE_ACTIVITY_KERNEL.md',
    dependencies: [
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: OBSERVATION_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: SAMPLE_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: RESOURCE_CATALOG_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.PROJECTS_TO,
        targetBuildingBlockId: UGES_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.SAME_MAJOR,
          version: { major: 1, minor: 1, patch: 0 },
        },
      },
    ],
    validators: [
      { kind: 'SCHEMA_VALIDATOR', ref: 'ProvenanceActivitySchema' },
      { kind: 'TEST_SUITE', ref: 'packages/shared/src/provenance-activity-kernel.test.ts' },
    ],
    examples: [{ kind: 'VALID', ref: 'field observation, sampling, retrieval, AI analysis' }],
    conformance: {
      schemaValidation: true,
      semanticValidation: true,
      requiredTests: ['packages/shared/src/provenance-activity-kernel.test.ts'],
      requiredDocumentation: ['docs/PROVENANCE_ACTIVITY_KERNEL.md'],
      requiredInvariants: [
        'provenance-does-not-establish-truth',
        'authority-not-elevated-by-processing',
        'source-lineage-distinct-from-processing',
      ],
    },
    implementation: {
      ...IMPLEMENTED,
      modulePath: 'packages/shared/src/provenance-activity-kernel.ts',
      exportSubpath: '@rockhounding/shared/provenance-activity-kernel',
    },
  }),
  draftBlock(
    PROVENANCE_ACTIVITY_BLOCK_ID,
    'Provenance Activity',
    'PROVENANCE_MODEL',
    'Historical DRAFT placeholder retained for identity continuity. Use STABLE 1.0.0.'
  ),
  validateBuildingBlockDefinition({
    id: TRUTH_CLOCK_BLOCK_ID,
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    name: 'Truth Clock / Evidence Availability',
    version: { major: 1, minor: 0, patch: 0 },
    category: 'TEMPORAL_MODEL',
    lifecycleStatus: BuildingBlockLifecycleStatus.STABLE,
    purpose:
      'Temporal truth context, freshness, revalidation, and evidence availability. Does not establish truth or permission.',
    boundary: 'TEMPORAL_MODEL',
    documentationRef: 'docs/TRUTH_CLOCK_AVAILABILITY.md',
    dependencies: [
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: RESOURCE_CATALOG_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: OBSERVATION_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: PROVENANCE_ACTIVITY_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.PROJECTS_TO,
        targetBuildingBlockId: UGES_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.SAME_MAJOR,
          version: { major: 1, minor: 1, patch: 0 },
        },
      },
    ],
    validators: [
      { kind: 'SCHEMA_VALIDATOR', ref: 'TruthClockSchema' },
      { kind: 'TEST_SUITE', ref: 'packages/shared/src/truth-clock-availability.test.ts' },
    ],
    examples: [{ kind: 'VALID', ref: 'retrieval versus source currency' }],
    conformance: {
      schemaValidation: true,
      semanticValidation: true,
      requiredTests: ['packages/shared/src/truth-clock-availability.test.ts'],
      requiredDocumentation: ['docs/TRUTH_CLOCK_AVAILABILITY.md'],
      requiredInvariants: [
        'freshness-is-not-truth',
        'retrieved-at-is-not-source-updated',
        'zero-results-do-not-prove-absence',
        'does-not-authorize-use',
      ],
    },
    implementation: {
      ...IMPLEMENTED,
      modulePath: 'packages/shared/src/truth-clock-availability.ts',
      exportSubpath: '@rockhounding/shared/truth-clock-availability',
    },
  }),
  draftBlock(
    TRUTH_CLOCK_BLOCK_ID,
    'Truth Clock',
    'TEMPORAL_MODEL',
    'Historical DRAFT placeholder retained for identity continuity. Use STABLE 1.0.0.'
  ),
  validateBuildingBlockDefinition({
    id: SOURCE_ADAPTER_CONTRACT_BLOCK_ID,
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    name: 'Source Adapter Contract',
    version: { major: 1, minor: 0, patch: 0 },
    category: 'PROCESS_CONTRACT',
    lifecycleStatus: BuildingBlockLifecycleStatus.STABLE,
    purpose:
      'Translation boundary from supplied source material into candidate entities. Does not fetch, authorize, or admit evidence.',
    boundary: 'PROCESS_CONTRACT',
    documentationRef: 'docs/SOURCE_ADAPTER_CONTRACT.md',
    dependencies: [
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: RESOURCE_CATALOG_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: SOURCE_GOVERNANCE_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: TRUTH_CLOCK_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: PROVENANCE_ACTIVITY_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: OBSERVATION_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: SAMPLE_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: SAMPLING_EVENT_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.PROJECTS_TO,
        targetBuildingBlockId: UGES_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.SAME_MAJOR,
          version: { major: 1, minor: 1, patch: 0 },
        },
      },
    ],
    validators: [
      { kind: 'SCHEMA_VALIDATOR', ref: 'SourceAdapterDefinitionSchema' },
      { kind: 'TEST_SUITE', ref: 'packages/shared/src/source-adapter-contract.test.ts' },
    ],
    examples: [{ kind: 'VALID', ref: 'authority ceiling and raw preservation' }],
    conformance: {
      schemaValidation: true,
      semanticValidation: true,
      requiredTests: ['packages/shared/src/source-adapter-contract.test.ts'],
      requiredDocumentation: ['docs/SOURCE_ADAPTER_CONTRACT.md'],
      requiredInvariants: [
        'adapter-is-not-authority',
        'raw-fields-are-not-mutated',
        'authority-is-not-elevated',
        'zero-results-do-not-prove-absence',
      ],
    },
    implementation: {
      ...IMPLEMENTED,
      modulePath: 'packages/shared/src/source-adapter-contract.ts',
      exportSubpath: '@rockhounding/shared/source-adapter-contract',
    },
  }),
  draftBlock(
    SOURCE_ADAPTER_CONTRACT_BLOCK_ID,
    'Source Adapter Contract',
    'PROCESS_CONTRACT',
    'Historical DRAFT placeholder retained for identity continuity. Use STABLE 1.0.0.'
  ),
  validateBuildingBlockDefinition({
    id: EVIDENCE_QUARANTINE_BLOCK_ID,
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    name: 'Evidence Quarantine',
    version: { major: 1, minor: 0, patch: 0 },
    category: 'PROCESS_CONTRACT',
    lifecycleStatus: BuildingBlockLifecycleStatus.STABLE,
    purpose:
      'Truth-preserving holding state for material that cannot safely enter canonical evidence flow. Does not admit, verify, or authorize.',
    boundary: 'PROCESS_CONTRACT',
    documentationRef: 'docs/EVIDENCE_QUARANTINE.md',
    dependencies: [
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: SOURCE_ADAPTER_CONTRACT_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: RESOURCE_CATALOG_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: SOURCE_GOVERNANCE_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: TRUTH_CLOCK_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
      {
        kind: BuildingBlockRelationshipKind.REFERENCES,
        targetBuildingBlockId: PROVENANCE_ACTIVITY_BLOCK_ID,
        versionRequirement: {
          mode: BuildingBlockVersionRequirementMode.AT_LEAST,
          version: { major: 1, minor: 0, patch: 0 },
        },
      },
    ],
    validators: [
      { kind: 'SCHEMA_VALIDATOR', ref: 'EvidenceQuarantineRecordSchema' },
      { kind: 'TEST_SUITE', ref: 'packages/shared/src/evidence-quarantine.test.ts' },
    ],
    examples: [{ kind: 'VALID', ref: 'unknown enum preserved without a guessed value' }],
    conformance: {
      schemaValidation: true,
      semanticValidation: true,
      requiredTests: ['packages/shared/src/evidence-quarantine.test.ts'],
      requiredDocumentation: ['docs/EVIDENCE_QUARANTINE.md'],
      requiredInvariants: [
        'quarantine-does-not-drop-or-accept',
        'raw-capture-is-immutable',
        'resolution-does-not-verify',
        'absence-is-not-inferred',
      ],
    },
    implementation: {
      ...IMPLEMENTED,
      modulePath: 'packages/shared/src/evidence-quarantine.ts',
      exportSubpath: '@rockhounding/shared/evidence-quarantine',
    },
  }),
  draftBlock(
    EVIDENCE_QUARANTINE_BLOCK_ID,
    'Evidence Quarantine',
    'PROCESS_CONTRACT',
    'Historical DRAFT placeholder retained for identity continuity. Use STABLE 1.0.0.'
  ),
  validateBuildingBlockDefinition({
    id: EVIDENCE_ADMISSION_BLOCK_ID,
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    name: 'Evidence Admission',
    version: { major: 1, minor: 0, patch: 0 },
    category: 'PROCESS_CONTRACT',
    lifecycleStatus: BuildingBlockLifecycleStatus.STABLE,
    purpose:
      'Purpose-specific gate for whether candidate evidence may support a defined question. Does not decide a field action, rewrite certainty, or authorize collection.',
    boundary: 'PROCESS_CONTRACT',
    documentationRef: 'docs/EVIDENCE_ADMISSION_ENGINE.md',
    dependencies: [
      UGES_BLOCK_ID,
      TRUTH_CLOCK_BLOCK_ID,
      PROVENANCE_ACTIVITY_BLOCK_ID,
      SOURCE_GOVERNANCE_BLOCK_ID,
      SOURCE_ADAPTER_CONTRACT_BLOCK_ID,
      EVIDENCE_QUARANTINE_BLOCK_ID,
      OBSERVATION_BLOCK_ID,
      SAMPLE_BLOCK_ID,
    ].map((targetBuildingBlockId) => ({
      kind: BuildingBlockRelationshipKind.REFERENCES,
      targetBuildingBlockId,
      versionRequirement: {
        mode: BuildingBlockVersionRequirementMode.AT_LEAST,
        version:
          targetBuildingBlockId === UGES_BLOCK_ID
            ? { major: 1, minor: 1, patch: 0 }
            : { major: 1, minor: 0, patch: 0 },
      },
    })),
    validators: [
      { kind: 'SCHEMA_VALIDATOR', ref: 'EvidenceAdmissionRequestSchema' },
      { kind: 'TEST_SUITE', ref: 'packages/shared/src/evidence-admission.test.ts' },
    ],
    examples: [{ kind: 'VALID', ref: 'geological candidate admitted only for geological context' }],
    conformance: {
      schemaValidation: true,
      semanticValidation: true,
      requiredTests: ['packages/shared/src/evidence-admission.test.ts'],
      requiredDocumentation: ['docs/EVIDENCE_ADMISSION_ENGINE.md'],
      requiredInvariants: [
        'admission-is-purpose-specific',
        'admission-does-not-decide-the-field-action',
        'authority-stays-in-domain',
        'quarantine-disposition-is-not-admission',
      ],
    },
    implementation: {
      ...IMPLEMENTED,
      modulePath: 'packages/shared/src/evidence-admission.ts',
      exportSubpath: '@rockhounding/shared/evidence-admission',
    },
  }),
  draftBlock(
    EVIDENCE_ADMISSION_BLOCK_ID,
    'Evidence Admission',
    'PROCESS_CONTRACT',
    'Historical DRAFT placeholder retained for identity continuity. Use STABLE 1.0.0.'
  ),
  validateBuildingBlockDefinition({
    id: DECISION_EVIDENCE_CONTRACT_BLOCK_ID,
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    name: 'Decision Evidence Contract',
    version: { major: 1, minor: 0, patch: 0 },
    category: 'PROCESS_CONTRACT',
    lifecycleStatus: BuildingBlockLifecycleStatus.STABLE,
    purpose:
      'Specifies the admitted evidence a decision class requires before evaluation. Completeness is not a permission, access, closure, or safety result.',
    boundary: 'PROCESS_CONTRACT',
    documentationRef: 'docs/DECISION_EVIDENCE_CONTRACTS.md',
    dependencies: [
      EVIDENCE_ADMISSION_BLOCK_ID,
      TRUTH_CLOCK_BLOCK_ID,
      PROVENANCE_ACTIVITY_BLOCK_ID,
      UGES_BLOCK_ID,
      OBSERVATION_BLOCK_ID,
      SAMPLE_BLOCK_ID,
    ].map((targetBuildingBlockId) => ({
      kind: BuildingBlockRelationshipKind.REFERENCES,
      targetBuildingBlockId,
      versionRequirement: {
        mode: BuildingBlockVersionRequirementMode.AT_LEAST,
        version:
          targetBuildingBlockId === UGES_BLOCK_ID
            ? { major: 1, minor: 1, patch: 0 }
            : { major: 1, minor: 0, patch: 0 },
      },
    })),
    validators: [
      { kind: 'SCHEMA_VALIDATOR', ref: 'DecisionEvidenceContractSchema' },
      { kind: 'TEST_SUITE', ref: 'packages/shared/src/decision-evidence-contracts.test.ts' },
    ],
    examples: [
      { kind: 'VALID', ref: 'collection permission completeness without a permission result' },
    ],
    conformance: {
      schemaValidation: true,
      semanticValidation: true,
      requiredTests: ['packages/shared/src/decision-evidence-contracts.test.ts'],
      requiredDocumentation: ['docs/DECISION_EVIDENCE_CONTRACTS.md'],
      requiredInvariants: [
        'completeness-is-not-outcome',
        'admitted-evidence-only',
        'domain-isolation',
        'no-silent-incompleteness',
      ],
    },
    implementation: {
      ...IMPLEMENTED,
      modulePath: 'packages/shared/src/decision-evidence-contracts.ts',
      exportSubpath: '@rockhounding/shared/decision-evidence-contracts',
    },
  }),
  draftBlock(
    DECISION_EVIDENCE_CONTRACT_BLOCK_ID,
    'Decision Evidence Contract',
    'PROCESS_CONTRACT',
    'Historical DRAFT placeholder retained for identity continuity. Use STABLE 1.0.0.'
  ),
  draftBlock(
    'rockhounding:evidence-availability',
    'Evidence Availability',
    'AVAILABILITY_MODEL',
    'Planned evidence availability state. Not implemented in R1.'
  ),
  validateBuildingBlockDefinition({
    id: DECISION_SNAPSHOT_BLOCK_ID,
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    name: 'Decision Snapshot',
    version: { major: 1, minor: 0, patch: 0 },
    category: 'DECISION_MODEL',
    lifecycleStatus: BuildingBlockLifecycleStatus.STABLE,
    purpose:
      'Freezes the evidence, contract version, gaps, contradictions, and time used to prepare a decision. Does not produce a decision outcome.',
    boundary: 'DECISION_MODEL',
    documentationRef: 'docs/DECISION_SNAPSHOT.md',
    dependencies: [
      DECISION_EVIDENCE_CONTRACT_BLOCK_ID,
      EVIDENCE_ADMISSION_BLOCK_ID,
      TRUTH_CLOCK_BLOCK_ID,
      PROVENANCE_ACTIVITY_BLOCK_ID,
    ].map((targetBuildingBlockId) => ({
      kind: BuildingBlockRelationshipKind.REFERENCES,
      targetBuildingBlockId,
      versionRequirement: {
        mode: BuildingBlockVersionRequirementMode.AT_LEAST,
        version: { major: 1, minor: 0, patch: 0 },
      },
    })),
    validators: [
      { kind: 'SCHEMA_VALIDATOR', ref: 'DecisionSnapshotSchema' },
      { kind: 'TEST_SUITE', ref: 'packages/shared/src/decision-snapshot.test.ts' },
    ],
    examples: [{ kind: 'VALID', ref: 'field visit readiness context frozen without an outcome' }],
    conformance: {
      schemaValidation: true,
      semanticValidation: true,
      requiredTests: ['packages/shared/src/decision-snapshot.test.ts'],
      requiredDocumentation: ['docs/DECISION_SNAPSHOT.md'],
      requiredInvariants: [
        'snapshot-pins-exact-contract-version',
        'snapshot-does-not-emit-an-outcome',
        'historical-snapshot-is-immutable',
        'integrity-hash-is-not-a-signature',
      ],
    },
    implementation: {
      ...IMPLEMENTED,
      modulePath: 'packages/shared/src/decision-snapshot.ts',
      exportSubpath: '@rockhounding/shared/decision-snapshot',
    },
  }),
  draftBlock(
    DECISION_SNAPSHOT_BLOCK_ID,
    'Decision Snapshot',
    'DECISION_MODEL',
    'Historical DRAFT placeholder retained for identity continuity. Use STABLE 1.0.0.'
  ),
  validateBuildingBlockDefinition({
    id: DECISION_EVALUATOR_BLOCK_ID,
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    name: 'Decision Evaluator',
    version: { major: 1, minor: 0, patch: 0 },
    category: 'DECISION_MODEL',
    lifecycleStatus: BuildingBlockLifecycleStatus.STABLE,
    purpose:
      'Produces a decision outcome from a valid snapshot and an exact synthetic rule set. Does not query live providers.',
    boundary: 'DECISION_MODEL',
    documentationRef: 'docs/DECISION_EVALUATOR.md',
    dependencies: [
      DECISION_SNAPSHOT_BLOCK_ID,
      DECISION_EVIDENCE_CONTRACT_BLOCK_ID,
      EVIDENCE_ADMISSION_BLOCK_ID,
      TRUTH_CLOCK_BLOCK_ID,
      PROVENANCE_ACTIVITY_BLOCK_ID,
    ].map((targetBuildingBlockId) => ({
      kind: BuildingBlockRelationshipKind.REFERENCES,
      targetBuildingBlockId,
      versionRequirement: {
        mode: BuildingBlockVersionRequirementMode.AT_LEAST,
        version: { major: 1, minor: 0, patch: 0 },
      },
    })),
    validators: [
      { kind: 'SCHEMA_VALIDATOR', ref: 'DecisionEvaluationResultSchema' },
      { kind: 'TEST_SUITE', ref: 'packages/shared/src/decision-evaluator.test.ts' },
    ],
    examples: [{ kind: 'VALID', ref: 'synthetic collection prohibition yields prohibited' }],
    conformance: {
      schemaValidation: true,
      semanticValidation: true,
      requiredTests: ['packages/shared/src/decision-evaluator.test.ts'],
      requiredDocumentation: ['docs/DECISION_EVALUATOR.md'],
      requiredInvariants: [
        'evaluator-consumes-a-snapshot',
        'evaluator-fails-closed',
        'synthetic-rules-only',
        'outcome-is-not-uges-certainty',
      ],
    },
    implementation: {
      ...IMPLEMENTED,
      modulePath: 'packages/shared/src/decision-evaluator.ts',
      exportSubpath: '@rockhounding/shared/decision-evaluator',
    },
  }),
  validateBuildingBlockDefinition({
    id: DECISION_RECEIPT_BLOCK_ID,
    schemaVersion: BUILDING_BLOCK_REGISTRY_SCHEMA_VERSION,
    name: 'Decision Receipt',
    version: { major: 1, minor: 0, patch: 0 },
    category: 'DECISION_MODEL',
    lifecycleStatus: BuildingBlockLifecycleStatus.STABLE,
    purpose:
      'Freezes the outcome, rule-set version, and evaluator version produced from a Decision Snapshot. Does not re-evaluate.',
    boundary: 'DECISION_MODEL',
    documentationRef: 'docs/DECISION_RECEIPT.md',
    dependencies: [
      DECISION_EVALUATOR_BLOCK_ID,
      DECISION_SNAPSHOT_BLOCK_ID,
      DECISION_EVIDENCE_CONTRACT_BLOCK_ID,
      PROVENANCE_ACTIVITY_BLOCK_ID,
    ].map((targetBuildingBlockId) => ({
      kind: BuildingBlockRelationshipKind.REFERENCES,
      targetBuildingBlockId,
      versionRequirement: {
        mode: BuildingBlockVersionRequirementMode.AT_LEAST,
        version: { major: 1, minor: 0, patch: 0 },
      },
    })),
    validators: [
      { kind: 'SCHEMA_VALIDATOR', ref: 'DecisionReceiptSchema' },
      { kind: 'TEST_SUITE', ref: 'packages/shared/src/decision-receipt.test.ts' },
    ],
    examples: [
      { kind: 'VALID', ref: 'synthetic collection outcome frozen without rewriting the snapshot' },
    ],
    conformance: {
      schemaValidation: true,
      semanticValidation: true,
      requiredTests: ['packages/shared/src/decision-receipt.test.ts'],
      requiredDocumentation: ['docs/DECISION_RECEIPT.md'],
      requiredInvariants: [
        'receipt-pins-snapshot-hash',
        'receipt-does-not-reevaluate',
        'historical-receipt-is-immutable',
        'integrity-hash-is-not-a-signature',
      ],
    },
    implementation: {
      ...IMPLEMENTED,
      modulePath: 'packages/shared/src/decision-receipt.ts',
      exportSubpath: '@rockhounding/shared/decision-receipt',
    },
  }),
];
