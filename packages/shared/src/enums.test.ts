import { describe, expect, it } from 'vitest';

import { LegalTag, SourceTier, Status, Visibility } from './enums';

describe('LegalTag enum', () => {
  it('should contain all required values from Build Document', () => {
    expect(LegalTag.LEGAL_PUBLIC).toBe('LEGAL_PUBLIC');
    expect(LegalTag.LEGAL_FEE_SITE).toBe('LEGAL_FEE_SITE');
    expect(LegalTag.LEGAL_CLUB_SUPERVISED).toBe('LEGAL_CLUB_SUPERVISED');
    expect(LegalTag.GRAY_AREA).toBe('GRAY_AREA');
    expect(LegalTag.RESEARCH_ONLY).toBe('RESEARCH_ONLY');
  });

  it('should have exactly 5 values', () => {
    const values = Object.values(LegalTag);
    expect(values).toHaveLength(5);
  });

  it('should have all uppercase snake_case keys', () => {
    const keys = Object.keys(LegalTag);
    keys.forEach((key) => {
      expect(key).toMatch(/^[A-Z_]+$/);
    });
  });
});

describe('SourceTier enum', () => {
  it('should contain all required values from Build Document', () => {
    expect(SourceTier.OFFICIAL).toBe('OFFICIAL');
    expect(SourceTier.OPERATOR).toBe('OPERATOR');
    expect(SourceTier.SECONDARY).toBe('SECONDARY');
    expect(SourceTier.COMMUNITY_STAGED).toBe('COMMUNITY_STAGED');
  });

  it('should have exactly 4 values', () => {
    const values = Object.values(SourceTier);
    expect(values).toHaveLength(4);
  });

  it('should have all uppercase snake_case keys', () => {
    const keys = Object.keys(SourceTier);
    keys.forEach((key) => {
      expect(key).toMatch(/^[A-Z_]+$/);
    });
  });
});

describe('Status enum', () => {
  it('should contain all required values from Build Document', () => {
    expect(Status.OPEN).toBe('OPEN');
    expect(Status.SEASONAL).toBe('SEASONAL');
    expect(Status.CLOSED).toBe('CLOSED');
    expect(Status.UNKNOWN).toBe('UNKNOWN');
    expect(Status.RESEARCH_REQUIRED).toBe('RESEARCH_REQUIRED');
  });

  it('should have exactly 5 values', () => {
    const values = Object.values(Status);
    expect(values).toHaveLength(5);
  });

  it('should have all uppercase snake_case keys', () => {
    const keys = Object.keys(Status);
    keys.forEach((key) => {
      expect(key).toMatch(/^[A-Z_]+$/);
    });
  });
});

describe('Visibility enum', () => {
  it('should contain all required values from Build Document', () => {
    expect(Visibility.PRIVATE).toBe('PRIVATE');
    expect(Visibility.SHARED_LINK).toBe('SHARED_LINK');
    expect(Visibility.TEAM).toBe('TEAM');
  });

  it('should have exactly 3 values', () => {
    const values = Object.values(Visibility);
    expect(values).toHaveLength(3);
  });

  it('should have all uppercase snake_case keys', () => {
    const keys = Object.keys(Visibility);
    keys.forEach((key) => {
      expect(key).toMatch(/^[A-Z_]+$/);
    });
  });
});
