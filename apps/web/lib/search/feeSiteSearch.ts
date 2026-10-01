import {
  OperatingStatus,
  SiteType,
  isPubliclyDiscoverableAdmission,
  locationHasSiteRole,
  locationSiteRoles,
  parseFeeSiteEnvelope,
  type FeeSiteAdmissionStatus,
  type FeeSiteMetadataEnvelope,
} from '@rockhounding/shared/fee-site-support';

export type FeeSiteSearchHints = {
  text?: string;
  siteTypes?: SiteType[];
  materials?: string[];
  state?: string;
  openOrSeasonal?: boolean;
  beginnerFriendly?: boolean;
  familyCollecting?: boolean;
};

/**
 * Canonical search filter helper (no LLM). Combines text + site type + materials
 * + seasonal/open hints against a fee_site metadata envelope + location fields.
 */
export function matchesFeeSiteSearch(
  input: {
    name: string;
    description?: string | null;
    state?: string | null;
    metadata?: Record<string, unknown> | null;
    materialNames?: string[];
  },
  hints: FeeSiteSearchHints
): boolean {
  const envelope = parseFeeSiteEnvelope(input.metadata ?? undefined);
  const haystack = `${input.name} ${input.description ?? ''}`.toLowerCase();

  if (hints.text != null && hints.text.trim() !== '') {
    const q = hints.text.toLowerCase();
    const feeTerms =
      q.includes('fee') ||
      q.includes('pay-to-dig') ||
      q.includes('pay to dig') ||
      q.includes('gem mine');
    if (feeTerms) {
      if (!locationHasSiteRole(envelope, SiteType.FEE_MINE) && !haystack.includes(q)) {
        return false;
      }
    } else if (!haystack.includes(q)) {
      return false;
    }
  }

  if (hints.siteTypes != null && hints.siteTypes.length > 0) {
    const roles = locationSiteRoles(envelope);
    if (!hints.siteTypes.some((t) => roles.includes(t))) return false;
  }

  if (hints.state != null && hints.state !== '') {
    if ((input.state ?? '').toUpperCase() !== hints.state.toUpperCase()) return false;
  }

  if (hints.materials != null && hints.materials.length > 0) {
    const names = new Set(
      [
        ...(input.materialNames ?? []),
        ...(envelope?.materialClaims ?? []).map((c) => c.materialName),
      ].map((n) => n.toLowerCase())
    );
    if (!hints.materials.some((m) => names.has(m.toLowerCase()))) return false;
  }

  if (hints.openOrSeasonal === true) {
    const status = envelope?.operatingStatus ?? OperatingStatus.UNKNOWN;
    if (
      status !== OperatingStatus.OPEN_CONFIRMED &&
      status !== OperatingStatus.OPEN_REPORTED &&
      status !== OperatingStatus.SEASONAL
    ) {
      return false;
    }
  }

  if (hints.beginnerFriendly === true || hints.familyCollecting === true) {
    const suit = envelope?.feeProfile?.familyBeginnerSuitability;
    if (suit !== 'SUITABLE' && suit !== 'LIMITED') return false;
  }

  return true;
}

export function isSearchablePublishedFeeSite(envelope: FeeSiteMetadataEnvelope | null): boolean {
  if (envelope == null) return false;
  return isPubliclyDiscoverableAdmission(envelope.admissionStatus as FeeSiteAdmissionStatus);
}
