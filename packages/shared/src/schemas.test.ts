import { describe, expect, it } from 'vitest';

import { LegalTag, SourceTier, Status, Visibility } from './enums';
import {
  LegalTagSchema,
  LegalTagType,
  SourceTierSchema,
  SourceTierType,
  StatusSchema,
  StatusType,
  VisibilitySchema,
  VisibilityType,
} from './schemas';

describe('LegalTagSchema', () => {
  it('should accept all valid LegalTag values', () => {
    expect(LegalTagSchema.parse(LegalTag.LEGAL_PUBLIC)).toBe('LEGAL_PUBLIC');
    expect(LegalTagSchema.parse(LegalTag.LEGAL_FEE_SITE)).toBe('LEGAL_FEE_SITE');
    expect(LegalTagSchema.parse(LegalTag.LEGAL_CLUB_SUPERVISED)).toBe('LEGAL_CLUB_SUPERVISED');
    expect(LegalTagSchema.parse(LegalTag.GRAY_AREA)).toBe('GRAY_AREA');
    expect(LegalTagSchema.parse(LegalTag.RESEARCH_ONLY)).toBe('RESEARCH_ONLY');
  });

  it('should accept valid string values', () => {
    expect(LegalTagSchema.parse('LEGAL_PUBLIC')).toBe('LEGAL_PUBLIC');
    expect(LegalTagSchema.parse('GRAY_AREA')).toBe('GRAY_AREA');
  });

  it('should reject invalid values', () => {
    expect(() => LegalTagSchema.parse('INVALID')).toThrow();
    expect(() => LegalTagSchema.parse('legal_public')).toThrow();
    expect(() => LegalTagSchema.parse('')).toThrow();
    expect(() => LegalTagSchema.parse(null)).toThrow();
    expect(() => LegalTagSchema.parse(undefined)).toThrow();
    expect(() => LegalTagSchema.parse(123)).toThrow();
  });

  it('should infer correct TypeScript type', () => {
    const value: LegalTagType = LegalTag.LEGAL_PUBLIC;
    expect(value).toBe('LEGAL_PUBLIC');
  });
});

describe('SourceTierSchema', () => {
  it('should accept all valid SourceTier values', () => {
    expect(SourceTierSchema.parse(SourceTier.OFFICIAL)).toBe('OFFICIAL');
    expect(SourceTierSchema.parse(SourceTier.OPERATOR)).toBe('OPERATOR');
    expect(SourceTierSchema.parse(SourceTier.SECONDARY)).toBe('SECONDARY');
    expect(SourceTierSchema.parse(SourceTier.COMMUNITY_STAGED)).toBe('COMMUNITY_STAGED');
  });

  it('should accept valid string values', () => {
    expect(SourceTierSchema.parse('OFFICIAL')).toBe('OFFICIAL');
    expect(SourceTierSchema.parse('COMMUNITY_STAGED')).toBe('COMMUNITY_STAGED');
  });

  it('should reject invalid values', () => {
    expect(() => SourceTierSchema.parse('INVALID')).toThrow();
    expect(() => SourceTierSchema.parse('official')).toThrow();
    expect(() => SourceTierSchema.parse('')).toThrow();
    expect(() => SourceTierSchema.parse(null)).toThrow();
    expect(() => SourceTierSchema.parse(undefined)).toThrow();
  });

  it('should infer correct TypeScript type', () => {
    const value: SourceTierType = SourceTier.OFFICIAL;
    expect(value).toBe('OFFICIAL');
  });
});

describe('StatusSchema', () => {
  it('should accept all valid Status values', () => {
    expect(StatusSchema.parse(Status.OPEN)).toBe('OPEN');
    expect(StatusSchema.parse(Status.SEASONAL)).toBe('SEASONAL');
    expect(StatusSchema.parse(Status.CLOSED)).toBe('CLOSED');
    expect(StatusSchema.parse(Status.UNKNOWN)).toBe('UNKNOWN');
    expect(StatusSchema.parse(Status.RESEARCH_REQUIRED)).toBe('RESEARCH_REQUIRED');
  });

  it('should accept valid string values', () => {
    expect(StatusSchema.parse('OPEN')).toBe('OPEN');
    expect(StatusSchema.parse('RESEARCH_REQUIRED')).toBe('RESEARCH_REQUIRED');
  });

  it('should reject invalid values', () => {
    expect(() => StatusSchema.parse('INVALID')).toThrow();
    expect(() => StatusSchema.parse('open')).toThrow();
    expect(() => StatusSchema.parse('')).toThrow();
    expect(() => StatusSchema.parse(null)).toThrow();
    expect(() => StatusSchema.parse(undefined)).toThrow();
  });

  it('should infer correct TypeScript type', () => {
    const value: StatusType = Status.OPEN;
    expect(value).toBe('OPEN');
  });
});

describe('VisibilitySchema', () => {
  it('should accept all valid Visibility values', () => {
    expect(VisibilitySchema.parse(Visibility.PRIVATE)).toBe('PRIVATE');
    expect(VisibilitySchema.parse(Visibility.SHARED_LINK)).toBe('SHARED_LINK');
    expect(VisibilitySchema.parse(Visibility.TEAM)).toBe('TEAM');
  });

  it('should accept valid string values', () => {
    expect(VisibilitySchema.parse('PRIVATE')).toBe('PRIVATE');
    expect(VisibilitySchema.parse('SHARED_LINK')).toBe('SHARED_LINK');
  });

  it('should reject invalid values', () => {
    expect(() => VisibilitySchema.parse('INVALID')).toThrow();
    expect(() => VisibilitySchema.parse('private')).toThrow();
    expect(() => VisibilitySchema.parse('PUBLIC')).toThrow();
    expect(() => VisibilitySchema.parse('')).toThrow();
    expect(() => VisibilitySchema.parse(null)).toThrow();
    expect(() => VisibilitySchema.parse(undefined)).toThrow();
  });

  it('should infer correct TypeScript type', () => {
    const value: VisibilityType = Visibility.PRIVATE;
    expect(value).toBe('PRIVATE');
  });
});
