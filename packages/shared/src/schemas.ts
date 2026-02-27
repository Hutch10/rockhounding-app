import { z } from 'zod';

import { LegalTag, SourceTier, Status, Visibility } from './enums';

/**
 * Zod schema for LegalTag enum
 * Validates legal status values at runtime
 */
export const LegalTagSchema = z.nativeEnum(LegalTag);

/**
 * Zod schema for SourceTier enum
 * Validates data source tier at runtime
 */
export const SourceTierSchema = z.nativeEnum(SourceTier);

/**
 * Zod schema for Status enum
 * Validates location operational status at runtime
 */
export const StatusSchema = z.nativeEnum(Status);

/**
 * Zod schema for Visibility enum
 * Validates content visibility level at runtime
 */
export const VisibilitySchema = z.nativeEnum(Visibility);

/**
 * Type inference helpers
 * Extract TypeScript types from Zod schemas
 */
export type LegalTagType = z.infer<typeof LegalTagSchema>;
export type SourceTierType = z.infer<typeof SourceTierSchema>;
export type StatusType = z.infer<typeof StatusSchema>;
export type VisibilityType = z.infer<typeof VisibilitySchema>;
