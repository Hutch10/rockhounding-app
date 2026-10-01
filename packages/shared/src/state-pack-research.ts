/**
 * First-five STATE PACK research contracts.
 * Research-only: never implies Production publish or weakened admission.
 * Reuses SiteType / OperatingStatus / MaterialCertainty / FeeSiteSourceAuthority.
 */

import { z } from 'zod';

import {
  FeeSiteSourceAuthoritySchema,
  MaterialCertaintySchema,
  OperatingStatusSchema,
  SiteTypeSchema,
} from './fee-site-support';
import { PilotClaimability } from './real-operator-pilot-cohort';
import { EvidencePermissionStatusSchema } from './universal-geological-evidence-schema';

/** Research pipeline — HOLD is pack-only (not a Production publish path). */
export const StatePackAdmissionStatus = {
  DISCOVERED: 'DISCOVERED',
  RESEARCHING: 'RESEARCHING',
  EVIDENCE_SUFFICIENT: 'EVIDENCE_SUFFICIENT',
  ADMITTED: 'ADMITTED',
  HOLD: 'HOLD',
  REJECTED: 'REJECTED',
} as const;

export type StatePackAdmissionStatus =
  (typeof StatePackAdmissionStatus)[keyof typeof StatePackAdmissionStatus];

export const StatePackAdmissionStatusSchema = z.enum([
  'DISCOVERED',
  'RESEARCHING',
  'EVIDENCE_SUFFICIENT',
  'ADMITTED',
  'HOLD',
  'REJECTED',
]);

export const StatePackReadiness = {
  NOT_STARTED: 'NOT_STARTED',
  RESEARCHING: 'RESEARCHING',
  CORE_READY: 'CORE_READY',
  DEEP_READY: 'DEEP_READY',
  STALE: 'STALE',
  REVALIDATION_REQUIRED: 'REVALIDATION_REQUIRED',
} as const;

export type StatePackReadiness = (typeof StatePackReadiness)[keyof typeof StatePackReadiness];

export const StatePackReadinessSchema = z.enum([
  'NOT_STARTED',
  'RESEARCHING',
  'CORE_READY',
  'DEEP_READY',
  'STALE',
  'REVALIDATION_REQUIRED',
]);

export const StatePackClaimabilitySchema = z.enum([
  'CLAIMABLE',
  'CLAIMABLE_WITH_REVIEW',
  'PLATFORM_MANAGED',
  'NOT_CLAIMABLE',
  'UNKNOWN',
]);

export const StatePackCandidateSchema = z.object({
  name: z.string().min(1),
  siteType: SiteTypeSchema,
  secondarySiteTypes: z.array(SiteTypeSchema).default([]),
  operatorOrAgency: z.string().min(1),
  location: z.string().min(1),
  source: z.string().min(1),
  sourceAuthority: FeeSiteSourceAuthoritySchema,
  accessState: EvidencePermissionStatusSchema,
  collectState: EvidencePermissionStatusSchema,
  routeState: EvidencePermissionStatusSchema,
  operatingStatus: OperatingStatusSchema,
  materials: z.array(z.string()).default([]),
  materialCertainty: MaterialCertaintySchema,
  freshness: z.string().min(1),
  claimability: StatePackClaimabilitySchema,
  admissionStatus: StatePackAdmissionStatusSchema,
  notes: z.string().optional(),
});

export type StatePackCandidate = z.infer<typeof StatePackCandidateSchema>;

export const StateLegalSourceInventorySchema = z.object({
  geologicalSurvey: z.string().min(1),
  publicLandCollectingRules: z.string().min(1),
  stateParkRules: z.string().min(1),
  majorAgencyRules: z.array(z.string()).min(1),
  permitRequirements: z.string().min(1),
  majorClosuresRestrictions: z.array(z.string()).default([]),
  feeSiteOperatorSources: z.array(z.string()).default([]),
  majorHazards: z.array(z.string()).default([]),
  freshnessPolicy: z.string().min(1),
});

export type StateLegalSourceInventory = z.infer<typeof StateLegalSourceInventorySchema>;

export const StatePackSchema = z
  .object({
    stateCode: z.enum(['NC', 'AR', 'CA', 'MT', 'ME']),
    readiness: StatePackReadinessSchema,
    batchLimitNote: z.string().min(1),
    legal: StateLegalSourceInventorySchema,
    candidates: z.array(StatePackCandidateSchema).min(10).max(20),
    publishBlocked: z.literal(true),
    notes: z.string().optional(),
  })
  .superRefine((pack, ctx) => {
    if (
      pack.candidates.some((c) => c.admissionStatus === 'ADMITTED' && pack.publishBlocked !== true)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ADMITTED research candidates still require publishBlocked=true in this gate',
      });
    }
  });

export type StatePack = z.infer<typeof StatePackSchema>;

export const FIRST_FIVE_STATE_CODES = ['NC', 'AR', 'CA', 'MT', 'ME'] as const;

export type FirstFiveStateCode = (typeof FIRST_FIVE_STATE_CODES)[number];

/** Invariants shared across all first-five packs — no state-specific shadow architecture. */
export const STATE_PACK_NORMALIZATION_CONTRACT = {
  siteTypes: SiteTypeSchema.options,
  admissionPipeline: StatePackAdmissionStatusSchema.options,
  claimability: StatePackClaimabilitySchema.options,
  sourceAuthority: FeeSiteSourceAuthoritySchema.options,
  materialCertainty: MaterialCertaintySchema.options,
  operatingStatus: OperatingStatusSchema.options,
  accessAxes: EvidencePermissionStatusSchema.options,
  readiness: StatePackReadinessSchema.options,
  pilotClaimabilityOverlap: Object.values(PilotClaimability),
} as const;

export function summarizeStatePack(pack: StatePack): {
  total: number;
  byAdmission: Record<string, number>;
  bySiteType: Record<string, number>;
  feeMines: number;
  publicCollecting: number;
  shopsResources: number;
  museumsClubs: number;
  heldRejected: number;
} {
  const byAdmission: Record<string, number> = {};
  const bySiteType: Record<string, number> = {};
  for (const c of pack.candidates) {
    byAdmission[c.admissionStatus] = (byAdmission[c.admissionStatus] ?? 0) + 1;
    bySiteType[c.siteType] = (bySiteType[c.siteType] ?? 0) + 1;
  }
  const feeMines = pack.candidates.filter((c) => c.siteType === 'FEE_MINE').length;
  const publicCollecting = pack.candidates.filter(
    (c) => c.siteType === 'PUBLIC_COLLECTING' || c.siteType === 'PERMIT_REQUIRED'
  ).length;
  const shopsResources = pack.candidates.filter(
    (c) => c.siteType === 'ROCK_SHOP' || c.siteType === 'IDENTIFICATION_RESOURCE'
  ).length;
  const museumsClubs = pack.candidates.filter(
    (c) => c.siteType === 'MUSEUM' || c.siteType === 'CLUB_SITE'
  ).length;
  const heldRejected = pack.candidates.filter(
    (c) => c.admissionStatus === 'HOLD' || c.admissionStatus === 'REJECTED'
  ).length;
  return {
    total: pack.candidates.length,
    byAdmission,
    bySiteType,
    feeMines,
    publicCollecting,
    shopsResources,
    museumsClubs,
    heldRejected,
  };
}

export function assertNoShadowArchitecture(packs: StatePack[]): string[] {
  const issues: string[] = [];
  for (const pack of packs) {
    for (const c of pack.candidates) {
      if (!(SiteTypeSchema.options as string[]).includes(c.siteType)) {
        issues.push(`${pack.stateCode}: unknown siteType ${c.siteType}`);
      }
      if (!(StatePackAdmissionStatusSchema.options as string[]).includes(c.admissionStatus)) {
        issues.push(`${pack.stateCode}: unknown admission ${c.admissionStatus}`);
      }
    }
    if (pack.publishBlocked !== true) {
      issues.push(`${pack.stateCode}: publishBlocked must be true`);
    }
  }
  return issues;
}
