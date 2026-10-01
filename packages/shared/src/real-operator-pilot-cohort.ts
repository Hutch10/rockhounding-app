/**
 * Real-operator pilot cohort R1 — 7 diverse U.S. sites for local-only proof.
 * Does not fabricate operator accounts. Does not write Production.
 */

import {
  AccessModel,
  FeeAccessModel,
  FeeSiteAdmissionStatus,
  FeeSiteSourceAuthority,
  MaterialCertainty,
  MaterialOccurrenceType,
  MaterialOriginClass,
  OperatingStatus,
  OperatorClaimState,
  SiteType,
  CollectingMethod,
  type FeeSiteMetadataEnvelope,
  FeeSiteMetadataEnvelopeSchema,
  evaluateFeeSitePublicationReadiness,
} from './fee-site-support';

export const PilotClaimability = {
  CLAIMABLE: 'CLAIMABLE',
  CLAIMABLE_WITH_REVIEW: 'CLAIMABLE_WITH_REVIEW',
  PLATFORM_MANAGED: 'PLATFORM_MANAGED',
  NOT_CLAIMABLE: 'NOT_CLAIMABLE',
} as const;

export type PilotClaimability = (typeof PilotClaimability)[keyof typeof PilotClaimability];

export type RealOperatorPilotSite = {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  modelSlot: string;
  claimability: PilotClaimability;
  access_status: string;
  description: string;
  metadata: {
    state: string;
    synthetic: false;
    pilot_cohort: 'real-operator-pilot-r1';
    site_type: string;
    access_model: string;
    claimability: PilotClaimability;
    fee_site: FeeSiteMetadataEnvelope;
  };
};

const RETRIEVED = '2026-10-01T16:00:00.000Z';

function envelope(partial: Partial<FeeSiteMetadataEnvelope>): FeeSiteMetadataEnvelope {
  return FeeSiteMetadataEnvelopeSchema.parse({
    admissionStatus: FeeSiteAdmissionStatus.ADMITTED,
    lastVerifiedAt: RETRIEVED,
    ...partial,
  });
}

export const REAL_OPERATOR_PILOT_COHORT: readonly RealOperatorPilotSite[] = [
  {
    id: 'a1000001-0000-4000-8000-00000000c0ee',
    name: 'Cowee Gift Shop & Mason Mountain Mine',
    state: 'NC',
    latitude: 35.2483,
    longitude: -83.396,
    modelSlot: 'private_fee_mine_shop_id',
    claimability: PilotClaimability.CLAIMABLE_WITH_REVIEW,
    access_status: 'caution',
    description:
      'Private fee dig with gift shop and find identification support. Listing inclusion permission recorded separately from geology.',
    metadata: {
      state: 'NC',
      synthetic: false,
      pilot_cohort: 'real-operator-pilot-r1',
      site_type: SiteType.FEE_MINE,
      access_model: AccessModel.FEE_SITE,
      claimability: PilotClaimability.CLAIMABLE_WITH_REVIEW,
      fee_site: envelope({
        siteType: SiteType.FEE_MINE,
        secondarySiteTypes: [SiteType.ROCK_SHOP, SiteType.IDENTIFICATION_RESOURCE],
        accessModel: AccessModel.FEE_SITE,
        operatingStatus: OperatingStatus.SEASONAL,
        accessAxes: {
          visit: 'ALLOWED',
          collect: 'ALLOWED',
          route: 'ALLOWED',
          operatingStatus: OperatingStatus.SEASONAL,
        },
        feeProfile: {
          operatorName: 'Cowee Gift Shop & Mason Mountain Mine',
          operatorClaimState: OperatorClaimState.UNCLAIMED,
          feeAccessModel: FeeAccessModel.PAY_TO_DIG,
          pricingSummary:
            'Native dig pile: adults $40; ages 6–12 $20; under 6 free w/ paid adult (operator site 2026-10-01). Not guaranteed current.',
          pricingVerifiedAt: RETRIEVED,
          reservationRequired: 'NO',
          walkInStatus: 'ACCEPTED',
          seasonality: 'Mar 4–Oct 31 Wed–Sat 9–5 (2026); closed Jan–Feb',
          hours: 'Wed–Sat 9am–5pm (summer/fall 2026 schedule)',
          familyBeginnerSuitability: 'SUITABLE',
          contactDetails: '828-421-1457 · info@masonmtnmine.com · 5315 Bryson City Rd, Franklin NC',
          amenities: ['gift shop', 'find identification support', 'flume'],
          waiverRequired: 'UNKNOWN',
          ageRestrictions: 'Children must be accompanied by paid adult on dig pile',
          toolPolicy: 'UNKNOWN',
          accessibilityNotes: 'UNKNOWN',
        },
        collectingContext: {
          method: CollectingMethod.SCREENING,
          materialOrigin: MaterialOriginClass.NATURAL,
          keepTakeHomeAllowed: 'YES',
          quantityRestrictions: 'Unlimited buckets on native dig pile (operator)',
          toolRestrictions: 'UNKNOWN',
        },
        materialClaims: [
          {
            materialName: 'Ruby',
            occurrenceType: MaterialOccurrenceType.OPERATOR_ADVERTISED,
            certainty: MaterialCertainty.REPORTED,
            originClass: MaterialOriginClass.NATURAL,
          },
          {
            materialName: 'Sapphire',
            occurrenceType: MaterialOccurrenceType.OPERATOR_ADVERTISED,
            certainty: MaterialCertainty.REPORTED,
            originClass: MaterialOriginClass.NATURAL,
          },
          {
            materialName: 'Rhodolite Garnet',
            occurrenceType: MaterialOccurrenceType.OPERATOR_ADVERTISED,
            certainty: MaterialCertainty.REPORTED,
            originClass: MaterialOriginClass.NATURAL,
          },
        ],
        sources: [
          {
            authorityClass: FeeSiteSourceAuthority.OPERATOR_PUBLIC,
            url: 'https://masonmtnmine.com/',
            retrievedAt: RETRIEVED,
          },
          {
            authorityClass: FeeSiteSourceAuthority.OPERATOR_DIRECT,
            reference:
              'OPERATOR_DIRECT inclusion permission — listing only; no logo/photo/endorsement/private-info; see qa-artifacts/rockhounding-first-operator-onboarding-r1/01-direct-contact-provenance.json',
            retrievedAt: RETRIEVED,
          },
        ],
      }),
    },
  },
  {
    id: 'a1000002-0000-4000-8000-00000000c7a7',
    name: 'Crater of Diamonds State Park',
    state: 'AR',
    latitude: 34.0339,
    longitude: -93.6727,
    modelSlot: 'government_platform_managed',
    claimability: PilotClaimability.PLATFORM_MANAGED,
    access_status: 'caution',
    description:
      'Arkansas State Park pay-to-dig diamond search area. Platform-managed public institution.',
    metadata: {
      state: 'AR',
      synthetic: false,
      pilot_cohort: 'real-operator-pilot-r1',
      site_type: SiteType.FEE_MINE,
      access_model: AccessModel.FEE_SITE,
      claimability: PilotClaimability.PLATFORM_MANAGED,
      fee_site: envelope({
        siteType: SiteType.FEE_MINE,
        accessModel: AccessModel.FEE_SITE,
        operatingStatus: OperatingStatus.OPEN_CONFIRMED,
        accessAxes: {
          visit: 'ALLOWED',
          collect: 'ALLOWED',
          route: 'ALLOWED',
          operatingStatus: OperatingStatus.OPEN_CONFIRMED,
        },
        feeProfile: {
          operatorName: 'Arkansas State Parks — Crater of Diamonds State Park',
          operatorClaimState: OperatorClaimState.UNCLAIMED,
          feeAccessModel: FeeAccessModel.PAY_TO_DIG,
          pricingSummary:
            'Search area: 13+ $15; 6–12 $7; under 6 free (official AR pages 2026-10-01). Not guaranteed without re-check.',
          pricingVerifiedAt: RETRIEVED,
          reservationRequired: 'NO',
          walkInStatus: 'ACCEPTED',
          seasonality:
            'Year-round except New Year’s Day, Thanksgiving, Christmas Eve, Christmas Day',
          hours: 'Search 8am–4pm; facilities 8am–5pm',
          familyBeginnerSuitability: 'SUITABLE',
          contactDetails: 'CraterofDiamonds@arkansas.com · 870-285-3113',
          amenities: ['visitor center', 'gift shop', 'tool rentals'],
          waiverRequired: 'UNKNOWN',
          ageRestrictions: 'Admission by age tier',
          toolPolicy: 'Hand tools only; no motorized mining tools',
          accessibilityNotes: 'UNKNOWN',
        },
        collectingContext: {
          method: CollectingMethod.SURFACE_COLLECTING,
          materialOrigin: MaterialOriginClass.NATURAL,
          keepTakeHomeAllowed: 'YES',
          quantityRestrictions: 'Up to 5 gallons sifted gravel/day (park rules)',
          toolRestrictions: 'No ladders or motor-driven tools',
        },
        materialClaims: [
          {
            materialName: 'Diamond',
            occurrenceType: MaterialOccurrenceType.PRIMARY,
            certainty: MaterialCertainty.SUPPORTED,
            originClass: MaterialOriginClass.NATURAL,
            lastVerifiedAt: RETRIEVED,
            notes: 'Government + survey supported; not lab-chain VERIFIED',
          },
        ],
        sources: [
          {
            authorityClass: FeeSiteSourceAuthority.GOVERNMENT,
            url: 'https://www.arkansas.com/state-parks/explore/parks/crater-of-diamonds-state-park',
            retrievedAt: RETRIEVED,
          },
        ],
      }),
    },
  },
  {
    id: 'a1000003-0000-4000-8000-000000000cea',
    name: 'Oceanview Mine',
    state: 'CA',
    latitude: 33.365,
    longitude: -117.076,
    modelSlot: 'appointment_only_fee_mine',
    claimability: PilotClaimability.CLAIMABLE_WITH_REVIEW,
    access_status: 'caution',
    description:
      'Reservation-required Pala district dig. Operator discloses possible supplemented gems — MIXED origin.',
    metadata: {
      state: 'CA',
      synthetic: false,
      pilot_cohort: 'real-operator-pilot-r1',
      site_type: SiteType.FEE_MINE,
      access_model: AccessModel.FEE_SITE,
      claimability: PilotClaimability.CLAIMABLE_WITH_REVIEW,
      fee_site: envelope({
        siteType: SiteType.FEE_MINE,
        accessModel: AccessModel.FEE_SITE,
        operatingStatus: OperatingStatus.APPOINTMENT_REQUIRED,
        accessAxes: {
          visit: 'RESTRICTED',
          collect: 'ALLOWED',
          route: 'RESTRICTED',
          operatingStatus: OperatingStatus.APPOINTMENT_REQUIRED,
        },
        feeProfile: {
          operatorName: 'Oceanview Mine, LLC',
          operatorClaimState: OperatorClaimState.UNCLAIMED,
          feeAccessModel: FeeAccessModel.APPOINTMENT_ONLY,
          pricingSummary:
            'Calendar dig ~$75 adults 12+; children discounted; CASH at gate (operator 2026-10-01). Confirm on booking calendar.',
          pricingVerifiedAt: RETRIEVED,
          reservationRequired: 'YES',
          walkInStatus: 'NOT_ACCEPTED',
          seasonality: 'Scheduled dig days Thu/Sat/Sun pending weather',
          hours: 'See dig calendar; typically ~4 hour dig window',
          familyBeginnerSuitability: 'LIMITED',
          contactDetails: 'digforgems@gmail.com · digforgems.com booking',
          amenities: ['screening stations', 'jeep tour', 'gift shop'],
          waiverRequired: 'YES',
          ageRestrictions: 'Children supervised; infants free with adult',
          toolPolicy: 'Tools provided',
          accessibilityNotes: 'Mountain dig — rough terrain',
        },
        collectingContext: {
          method: CollectingMethod.MIXED,
          materialOrigin: MaterialOriginClass.MIXED,
          keepTakeHomeAllowed: 'YES',
          quantityRestrictions: 'Keep finds + one 5-gal screened bucket (operator)',
          toolRestrictions: 'UNKNOWN',
        },
        materialClaims: [
          {
            materialName: 'Tourmaline',
            occurrenceType: MaterialOccurrenceType.OPERATOR_ADVERTISED,
            certainty: MaterialCertainty.REPORTED,
            originClass: MaterialOriginClass.MIXED,
            notes: 'Operator: mine dumps sometimes supplemented with worldwide gems',
          },
          {
            materialName: 'Kunzite',
            occurrenceType: MaterialOccurrenceType.OPERATOR_ADVERTISED,
            certainty: MaterialCertainty.REPORTED,
            originClass: MaterialOriginClass.MIXED,
          },
        ],
        sources: [
          {
            authorityClass: FeeSiteSourceAuthority.OPERATOR_PUBLIC,
            url: 'https://digforgems.com/oceanview-mine-book/',
            retrievedAt: RETRIEVED,
          },
        ],
      }),
    },
  },
  {
    id: 'a1000004-0000-4000-8000-00000000c4e7',
    name: 'Cherokee Ruby & Sapphire Mine',
    state: 'NC',
    latitude: 35.2727,
    longitude: -83.3512,
    modelSlot: 'seasonal_family_fee_mine',
    claimability: PilotClaimability.CLAIMABLE_WITH_REVIEW,
    access_status: 'caution',
    description:
      'Family-oriented Cowee Valley fee mine. Season/weather conflict across sources — operating status OPEN_REPORTED.',
    metadata: {
      state: 'NC',
      synthetic: false,
      pilot_cohort: 'real-operator-pilot-r1',
      site_type: SiteType.FEE_MINE,
      access_model: AccessModel.FEE_SITE,
      claimability: PilotClaimability.CLAIMABLE_WITH_REVIEW,
      fee_site: envelope({
        siteType: SiteType.FEE_MINE,
        accessModel: AccessModel.FEE_SITE,
        operatingStatus: OperatingStatus.OPEN_REPORTED,
        accessAxes: {
          visit: 'ALLOWED',
          collect: 'ALLOWED',
          route: 'ALLOWED',
          operatingStatus: OperatingStatus.OPEN_REPORTED,
        },
        feeProfile: {
          operatorName: 'Cherokee Ruby & Sapphire Mine',
          operatorClaimState: OperatorClaimState.UNCLAIMED,
          feeAccessModel: FeeAccessModel.PAY_TO_DIG,
          pricingSummary:
            '~$30/person; age 6 and under free with paid miner (operator fees page 2026-10-01). Not guaranteed current.',
          pricingVerifiedAt: RETRIEVED,
          reservationRequired: 'NO',
          walkInStatus: 'ACCEPTED',
          seasonality:
            'Weather permitting; operator lists year-round/daily hours; secondary tourism pages claim May–Oct — CONFLICT recorded',
          hours: 'Typically 10am–4pm; 9am summer (operator)',
          familyBeginnerSuitability: 'SUITABLE',
          contactDetails: '828-349-2941 · cherokeerubymine@gmail.com',
          amenities: ['flume', 'group programs'],
          waiverRequired: 'UNKNOWN',
          ageRestrictions: 'Age 6 and under free with paid miner',
          toolPolicy: 'UNKNOWN',
          accessibilityNotes: 'UNKNOWN',
        },
        collectingContext: {
          method: CollectingMethod.SCREENING,
          materialOrigin: MaterialOriginClass.NATURAL,
          keepTakeHomeAllowed: 'YES',
          quantityRestrictions: 'UNKNOWN',
          toolRestrictions: 'UNKNOWN',
        },
        materialClaims: [
          {
            materialName: 'Ruby',
            occurrenceType: MaterialOccurrenceType.OPERATOR_ADVERTISED,
            certainty: MaterialCertainty.REPORTED,
            originClass: MaterialOriginClass.NATURAL,
            notes: 'Operator: unsalted / not enriched',
          },
          {
            materialName: 'Sapphire',
            occurrenceType: MaterialOccurrenceType.OPERATOR_ADVERTISED,
            certainty: MaterialCertainty.REPORTED,
            originClass: MaterialOriginClass.NATURAL,
          },
        ],
        sources: [
          {
            authorityClass: FeeSiteSourceAuthority.OPERATOR_PUBLIC,
            url: 'https://cherokeerubymine.com/',
            retrievedAt: RETRIEVED,
          },
        ],
      }),
    },
  },
  {
    id: 'a1000005-0000-4000-8000-00000000e770',
    name: 'Emerald Hollow Mine',
    state: 'NC',
    latitude: 35.904,
    longitude: -81.091,
    modelSlot: 'mixed_native_enriched',
    claimability: PilotClaimability.CLAIMABLE_WITH_REVIEW,
    access_status: 'caution',
    description:
      'Public prospecting mine with native soil buckets and optional enriched buckets — MIXED origin.',
    metadata: {
      state: 'NC',
      synthetic: false,
      pilot_cohort: 'real-operator-pilot-r1',
      site_type: SiteType.FEE_MINE,
      access_model: AccessModel.FEE_SITE,
      claimability: PilotClaimability.CLAIMABLE_WITH_REVIEW,
      fee_site: envelope({
        siteType: SiteType.FEE_MINE,
        accessModel: AccessModel.FEE_SITE,
        operatingStatus: OperatingStatus.OPEN_REPORTED,
        accessAxes: {
          visit: 'ALLOWED',
          collect: 'ALLOWED',
          route: 'ALLOWED',
          operatingStatus: OperatingStatus.OPEN_REPORTED,
        },
        feeProfile: {
          operatorName: 'Emerald Hollow Mine',
          operatorClaimState: OperatorClaimState.UNCLAIMED,
          feeAccessModel: FeeAccessModel.PAY_TO_DIG,
          pricingSummary:
            'Adult permit $30; child 4–14 $10; 55+/vet/military $27; enriched buckets extra (operator 2026-10-01).',
          pricingVerifiedAt: RETRIEVED,
          reservationRequired: 'NO',
          walkInStatus: 'ACCEPTED',
          seasonality: 'Year-round hours; weather/attendance may close early',
          hours: 'Mon–Thu 8:30–5; Fri–Sun 8:30–6',
          familyBeginnerSuitability: 'SUITABLE',
          contactDetails: '828-635-1126 · info@emeraldhollowmine.com',
          amenities: ['sluiceway', 'creek dig', 'lapidary'],
          waiverRequired: 'UNKNOWN',
          ageRestrictions: 'Permits required for dig areas including non-participants',
          toolPolicy: 'Tools included with permit',
          accessibilityNotes: 'UNKNOWN',
        },
        collectingContext: {
          method: CollectingMethod.MIXED,
          materialOrigin: MaterialOriginClass.MIXED,
          keepTakeHomeAllowed: 'YES',
          quantityRestrictions: 'UNKNOWN',
          toolRestrictions: 'UNKNOWN',
        },
        materialClaims: [
          {
            materialName: 'Emerald',
            occurrenceType: MaterialOccurrenceType.OPERATOR_ADVERTISED,
            certainty: MaterialCertainty.REPORTED,
            originClass: MaterialOriginClass.MIXED,
            notes: 'Native soil buckets + optional enriched buckets',
          },
        ],
        sources: [
          {
            authorityClass: FeeSiteSourceAuthority.OPERATOR_PUBLIC,
            url: 'https://www.emeraldhollowmine.com/',
            retrievedAt: RETRIEVED,
          },
        ],
      }),
    },
  },
  {
    id: 'a1000006-0000-4000-8000-000000009e70',
    name: 'The Gem Shop, Inc.',
    state: 'WI',
    latitude: 43.296,
    longitude: -87.987,
    modelSlot: 'rock_shop_resource',
    claimability: PilotClaimability.CLAIMABLE_WITH_REVIEW,
    access_status: 'unknown',
    description:
      'Retail rock shop and rock yard — not an in-situ mine locality. Identification/shopping resource.',
    metadata: {
      state: 'WI',
      synthetic: false,
      pilot_cohort: 'real-operator-pilot-r1',
      site_type: SiteType.ROCK_SHOP,
      access_model: AccessModel.UNKNOWN,
      claimability: PilotClaimability.CLAIMABLE_WITH_REVIEW,
      fee_site: envelope({
        siteType: SiteType.ROCK_SHOP,
        accessModel: AccessModel.UNKNOWN,
        operatingStatus: OperatingStatus.OPEN_REPORTED,
        accessAxes: {
          visit: 'ALLOWED',
          collect: 'PROHIBITED',
          route: 'ALLOWED',
          operatingStatus: OperatingStatus.OPEN_REPORTED,
        },
        feeProfile: {
          operatorName: 'The Gem Shop, Inc.',
          operatorClaimState: OperatorClaimState.UNCLAIMED,
          feeAccessModel: FeeAccessModel.OTHER,
          pricingSummary: 'Retail pricing — not fee-mine admission',
          reservationRequired: 'NO',
          walkInStatus: 'ACCEPTED',
          seasonality: 'Open year-round except listed holidays',
          hours: 'Mon–Fri 9:30–6; Sat 9:30–5; Sun 1–5',
          familyBeginnerSuitability: 'SUITABLE',
          contactDetails:
            '262-377-4666 · mail@thegemshop.com · W64N723 Washington Ave, Cedarburg WI',
          amenities: ['rock yard', 'basement rough', 'lapidary retail'],
          waiverRequired: 'NO',
          ageRestrictions: 'UNKNOWN',
          toolPolicy: 'N/A retail',
          accessibilityNotes: 'UNKNOWN',
        },
        collectingContext: {
          method: CollectingMethod.UNKNOWN,
          materialOrigin: MaterialOriginClass.UNKNOWN,
          keepTakeHomeAllowed: 'YES',
          quantityRestrictions: 'Purchased retail material',
          toolRestrictions: 'N/A',
        },
        materialClaims: [],
        sources: [
          {
            authorityClass: FeeSiteSourceAuthority.OPERATOR_PUBLIC,
            url: 'https://thegemshop.com/',
            retrievedAt: RETRIEVED,
          },
        ],
      }),
    },
  },
  {
    id: 'a1000007-0000-4000-8000-00000000f05e',
    name: 'Museum of North Carolina Minerals',
    state: 'NC',
    latitude: 35.852,
    longitude: -82.051,
    modelSlot: 'museum_resource',
    claimability: PilotClaimability.PLATFORM_MANAGED,
    access_status: 'unknown',
    description:
      'NPS Blue Ridge Parkway museum / visitor center. Educational resource — not a collecting site.',
    metadata: {
      state: 'NC',
      synthetic: false,
      pilot_cohort: 'real-operator-pilot-r1',
      site_type: SiteType.MUSEUM,
      access_model: AccessModel.UNKNOWN,
      claimability: PilotClaimability.PLATFORM_MANAGED,
      fee_site: envelope({
        siteType: SiteType.MUSEUM,
        accessModel: AccessModel.UNKNOWN,
        operatingStatus: OperatingStatus.SEASONAL,
        accessAxes: {
          visit: 'ALLOWED',
          collect: 'PROHIBITED',
          route: 'ALLOWED',
          operatingStatus: OperatingStatus.SEASONAL,
        },
        feeProfile: {
          operatorName: 'National Park Service — Blue Ridge Parkway',
          operatorClaimState: OperatorClaimState.UNCLAIMED,
          feeAccessModel: FeeAccessModel.OTHER,
          pricingSummary: 'Museum visit — confirm current NPS fee policy',
          reservationRequired: 'NO',
          walkInStatus: 'ACCEPTED',
          seasonality: 'Closed winter Nov 3–Apr 24; 2026 reopen not announced on NPS page',
          hours: 'Sun/Wed–Sat 10am–5pm; Mon–Tue closed (in-season)',
          familyBeginnerSuitability: 'SUITABLE',
          contactDetails: '828-765-2761 · Milepost 331 Blue Ridge Parkway',
          amenities: ['exhibits', 'visitor center', 'park store'],
          waiverRequired: 'NO',
          ageRestrictions: 'UNKNOWN',
          toolPolicy: 'N/A',
          accessibilityNotes: 'UNKNOWN',
        },
        collectingContext: {
          method: CollectingMethod.UNKNOWN,
          materialOrigin: MaterialOriginClass.UNKNOWN,
          keepTakeHomeAllowed: 'NO',
          quantityRestrictions: 'No collecting',
          toolRestrictions: 'N/A',
        },
        materialClaims: [],
        sources: [
          {
            authorityClass: FeeSiteSourceAuthority.GOVERNMENT,
            url: 'https://www.nps.gov/blri/planyourvisit/museum-of-north-carolina-minerals-mp-331.htm',
            retrievedAt: RETRIEVED,
          },
        ],
      }),
    },
  },
] as const;

export function isPartnerClaimSurfaceAllowed(claimability: PilotClaimability): boolean {
  return (
    claimability === PilotClaimability.CLAIMABLE ||
    claimability === PilotClaimability.CLAIMABLE_WITH_REVIEW
  );
}

export function assertPilotCohortPublicationReady(): {
  ok: boolean;
  failures: Array<{ id: string; reasons: string[] }>;
} {
  const failures: Array<{ id: string; reasons: string[] }> = [];
  for (const site of REAL_OPERATOR_PILOT_COHORT) {
    const fs = site.metadata.fee_site;
    const resourceOnly =
      fs.siteType === SiteType.ROCK_SHOP ||
      fs.siteType === SiteType.MUSEUM ||
      fs.siteType === SiteType.IDENTIFICATION_RESOURCE;
    const result = evaluateFeeSitePublicationReadiness({
      identifiableSite: true,
      sufficientCoordinates: true,
      identifiableOperator: true,
      currentOperationEvidence: true,
      collectingActivityConfirmed: !resourceOnly,
      accessTermsSufficientlyKnown: true,
      unresolvedMisleadingContradiction: false,
      admissionStatus: FeeSiteAdmissionStatus.ADMITTED,
      siteType: fs.siteType,
    });
    if (!result.publishable) {
      failures.push({ id: site.id, reasons: result.reasons });
    }
  }
  return { ok: failures.length === 0, failures };
}
