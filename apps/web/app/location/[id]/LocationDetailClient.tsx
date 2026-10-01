'use client';

import {
  CollectingMethod,
  MaterialCertainty,
  MaterialOccurrenceType,
  MaterialOriginClass,
  OperatingStatus,
  OperatorClaimState,
  SiteType,
  displayUnknown,
  isFeeMineSiteType,
  normalizeMaterialClaimCertainty,
  operatingStatusLabel,
  parseFeeSiteEnvelope,
  type FeeSiteMetadataEnvelope,
  type SiteMaterialClaim,
} from '@rockhounding/shared/fee-site-support';
import {
  OPERATOR_CONFIRMED_LABEL,
  publicOperatorConfirmedVisible,
} from '@rockhounding/shared/partner-tenancy';
import type { LocationV1 } from '@rockhounding/shared';
import type { ReactNode } from 'react';
import Link from 'next/link';

import {
  AccessBanner,
  isCollectingDisabled,
  normalizeAccessStatus,
} from '@/components/Access/AccessBanner';
import { FieldPermissionSummary } from '@/components/Access/FieldPermissionSummary';
import { TrustBadge, trustFromMetadata } from '@/components/Trust/TrustBadge';
import { openExternalMaps } from '@/lib/gis/openExternalMaps';

export type LocationDetailV1 = LocationV1 & {
  permit_summary?: string | null;
  collecting_summary?: string | null;
  materials?: { id: string; name: string; abundance: string | null }[];
};

export type GeologicalContextView = {
  state:
    | 'SUCCESS'
    | 'PROVIDER_UNAVAILABLE'
    | 'NO_SGMC_POLYGON_RETURNED'
    | 'OUTSIDE_PROVIDER_COVERAGE'
    | 'PARTIAL_UNSAFE'
    | 'DISCLOSURE_WITHHELD'
    | 'BOUNDS_REJECTED';
  units: Array<{ unitName: string; lithology: string; ageMin: string; ageMax: string }>;
  attribution: { source: string; product: string; doi: string } | null;
  compilationYear: 2017 | null;
  retrievedAt: string | null;
};

interface LocationDetailClientProps {
  location: LocationDetailV1;
  geologySection?: ReactNode;
}

function AxisCard({ title, value }: { title: string; value: string }): JSX.Element {
  const display =
    value === 'UNKNOWN' || value === '' || value == null
      ? 'Unknown / Not verified'
      : value === 'ALLOWED'
        ? 'Reported allowed — not a legal grant'
        : value === 'PROHIBITED'
          ? 'Prohibited (recorded)'
          : value === 'RESTRICTED'
            ? 'Restricted (recorded)'
            : value;
  return (
    <div
      className="rounded-xl border border-stone-200 bg-stone-50 p-3 min-h-12"
      data-testid={`axis-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{title}</p>
      <p className="text-sm font-semibold text-stone-900 mt-1">{display}</p>
    </div>
  );
}

function MaterialClaimCard({ claim }: { claim: SiteMaterialClaim }): JSX.Element {
  const certainty = normalizeMaterialClaimCertainty(claim);
  const seeded =
    claim.originClass === MaterialOriginClass.SEEDED ||
    claim.occurrenceType === MaterialOccurrenceType.OPERATOR_ADVERTISED;
  return (
    <div
      className="rounded-xl border border-stone-200 bg-white p-3"
      data-testid="material-claim-card"
    >
      <p className="text-sm font-bold text-stone-900">{claim.materialName}</p>
      <p className="text-xs text-stone-600 mt-1">
        {claim.occurrenceType.replace(/_/g, ' ')} · certainty {certainty}
        {seeded ? ' · not verified native geology' : ''}
      </p>
      {claim.lastVerifiedAt != null ? (
        <p className="text-[10px] text-stone-500 mt-1">Last verified {claim.lastVerifiedAt}</p>
      ) : (
        <p className="text-[10px] text-stone-500 mt-1">Last verified: Unknown / Not verified</p>
      )}
    </div>
  );
}

function FeeMineDetailSections({
  envelope,
  materials,
}: {
  envelope: FeeSiteMetadataEnvelope;
  materials: { id: string; name: string; abundance: string | null }[];
}): JSX.Element {
  const profile = envelope.feeProfile;
  const context = envelope.collectingContext;
  const axes = envelope.accessAxes;
  const claims =
    envelope.materialClaims.length > 0
      ? envelope.materialClaims
      : materials.map((m) => ({
          materialId: m.id,
          materialName: m.name,
          occurrenceType: MaterialOccurrenceType.COMMUNITY_REPORTED,
          certainty: MaterialCertainty.UNRESOLVED,
          originClass: MaterialOriginClass.UNKNOWN,
        }));

  return (
    <div className="space-y-4" data-testid="fee-mine-sections">
      <div className="grid grid-cols-2 gap-2">
        <AxisCard title="VISIT" value={axes?.visit ?? 'UNKNOWN'} />
        <AxisCard title="COLLECT" value={axes?.collect ?? 'UNKNOWN'} />
        <AxisCard title="ROUTE" value={axes?.route ?? 'UNKNOWN'} />
        <AxisCard
          title="OPERATING STATUS"
          value={operatingStatusLabel(envelope.operatingStatus ?? OperatingStatus.UNKNOWN)}
        />
      </div>

      <section>
        <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wide mb-2">
          What you can find
        </h2>
        {claims.length === 0 ? (
          <p className="text-sm text-stone-600">Unknown / Not verified</p>
        ) : (
          <div className="space-y-2">
            {claims.map((claim) => (
              <MaterialClaimCard
                key={`${claim.materialName}-${claim.occurrenceType}`}
                claim={claim}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wide mb-2">
          How collecting works
        </h2>
        <ul className="text-sm text-stone-700 space-y-1">
          <li>Method: {displayUnknown(context?.method ?? CollectingMethod.UNKNOWN)}</li>
          <li>
            Material origin: {displayUnknown(context?.materialOrigin)}
            {context?.method === CollectingMethod.MIXED ||
            context?.method === CollectingMethod.SEEDED_MATERIAL ||
            context?.materialOrigin === MaterialOriginClass.MIXED ||
            context?.materialOrigin === MaterialOriginClass.SEEDED
              ? ' (mixed/seeded paths are not verified native geology)'
              : ''}
          </li>
          <li>Take-home: {displayUnknown(context?.keepTakeHomeAllowed)}</li>
          <li>Quantity: {displayUnknown(context?.quantityRestrictions)}</li>
          <li>Tools: {displayUnknown(context?.toolRestrictions ?? profile?.toolPolicy)}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wide mb-2">
          Price &amp; admission
        </h2>
        <ul className="text-sm text-stone-700 space-y-1">
          <li>Pricing: {displayUnknown(profile?.pricingSummary)}</li>
          <li>
            Pricing verified:{' '}
            {profile?.pricingVerifiedAt != null
              ? profile.pricingVerifiedAt
              : 'Unknown / Not verified'}
          </li>
          <li>Reservation: {displayUnknown(profile?.reservationRequired)}</li>
          <li>Waiver: {displayUnknown(profile?.waiverRequired)}</li>
          <li>Hours: {displayUnknown(profile?.hours)}</li>
          <li>Season: {displayUnknown(profile?.seasonality)}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wide mb-2">
          Field conditions
        </h2>
        <ul className="text-sm text-stone-700 space-y-1">
          <li>
            Amenities:{' '}
            {(profile?.amenities?.length ?? 0) > 0
              ? profile!.amenities.join(', ')
              : 'Unknown / Not verified'}
          </li>
          <li>Accessibility: {displayUnknown(profile?.accessibilityNotes)}</li>
          <li>Family / beginner: {displayUnknown(profile?.familyBeginnerSuitability)}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wide mb-2">
          Trust / sources
        </h2>
        {publicOperatorConfirmedVisible(
          profile?.operatorClaimState ?? OperatorClaimState.UNCLAIMED
        ) ? (
          <p
            className="mb-2 text-sm font-medium text-stone-800"
            data-testid="operator-confirmed-badge"
          >
            {OPERATOR_CONFIRMED_LABEL}
            <span className="mt-0.5 block text-xs font-normal text-stone-500">
              Business information confirmed by a verified site operator — not platform endorsement,
              geology verification, or legal verification.
            </span>
          </p>
        ) : null}
        <ul className="text-sm text-stone-700 space-y-1">
          <li>Operator: {displayUnknown(profile?.operatorName)}</li>
          <li>
            Operator confirmation:{' '}
            {profile?.lastOperatorConfirmationAt != null
              ? profile.lastOperatorConfirmationAt
              : 'Unknown / Not verified'}
          </li>
          <li>
            Last verified:{' '}
            {envelope.lastVerifiedAt != null ? envelope.lastVerifiedAt : 'Unknown / Not verified'}
          </li>
          <li>Admission: {envelope.admissionStatus}</li>
        </ul>
        <p className="text-xs text-stone-500 mt-2">
          A mapped fee mine is not proof it is open, that collecting is allowed, or that advertised
          materials occur naturally.
        </p>
      </section>
    </div>
  );
}

/**
 * FE-006: Site detail Tier-1 — access banner, trust badge, materials, action row.
 * Fee mines get extended Rocky Atlas sections without a parallel app shell.
 */
export function LocationDetailClient({
  location,
  geologySection = null,
}: LocationDetailClientProps): JSX.Element {
  const trust = trustFromMetadata(location.metadata);
  const accessStatus = normalizeAccessStatus(location.access_status);
  const collectingDisabled = isCollectingDisabled(accessStatus);
  const materials = location.materials ?? [];
  const feeEnvelope = parseFeeSiteEnvelope((location.metadata ?? {}) as Record<string, unknown>);
  const isFeeMine = feeEnvelope != null && isFeeMineSiteType(feeEnvelope.siteType);
  const hasFeeEnvelope = feeEnvelope != null;
  const claimability =
    typeof (location.metadata as Record<string, unknown> | null)?.claimability === 'string'
      ? String((location.metadata as Record<string, unknown>).claimability)
      : null;

  return (
    <div className="space-y-4" data-testid="site-detail">
      <AccessBanner accessStatus={accessStatus} />
      <FieldPermissionSummary recordedAccessStatus={accessStatus} />

      <div className="flex flex-wrap items-center gap-2">
        <TrustBadge trustCategory={trust} />
        {isFeeMine ? (
          <span
            className="text-xs font-bold uppercase tracking-wide bg-amber-100 text-amber-950 border border-amber-300 px-3 py-1 rounded-md"
            data-testid="fee-mine-badge"
          >
            Fee Mine / Pay-to-Dig
          </span>
        ) : null}
        {feeEnvelope != null &&
        (feeEnvelope.secondarySiteTypes ?? []).includes(SiteType.ROCK_SHOP) ? (
          <span
            className="text-xs font-semibold text-stone-800 bg-stone-100 border border-stone-300 px-3 py-1 rounded-md"
            data-testid="secondary-rock-shop-badge"
          >
            Rock shop
          </span>
        ) : null}
        {feeEnvelope != null &&
        (feeEnvelope.secondarySiteTypes ?? []).includes(SiteType.IDENTIFICATION_RESOURCE) ? (
          <span
            className="text-xs font-semibold text-teal-900 bg-teal-50 border border-teal-200 px-3 py-1 rounded-md"
            data-testid="secondary-identification-badge"
          >
            Identification help
          </span>
        ) : null}
        {feeEnvelope?.siteType != null &&
        feeEnvelope.siteType !== SiteType.UNKNOWN &&
        !isFeeMine ? (
          <span
            className="text-xs font-semibold text-stone-700 bg-stone-100 px-3 py-1 rounded-md"
            data-testid="site-type-badge"
          >
            {feeEnvelope.siteType.replace(/_/g, ' ')}
          </span>
        ) : null}
        {claimability === 'PLATFORM_MANAGED' || claimability === 'NOT_CLAIMABLE' ? (
          <span
            className="text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 px-3 py-1 rounded-md"
            data-testid="platform-managed-badge"
          >
            Platform-managed
          </span>
        ) : null}
        {claimability === 'CLAIMABLE' || claimability === 'CLAIMABLE_WITH_REVIEW' ? (
          <span
            className="text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md"
            data-testid="operator-claimable-badge"
          >
            Operator-managed listing
          </span>
        ) : null}
        {location.difficulty_rating != null && (
          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            Difficulty {location.difficulty_rating}/5
          </span>
        )}
      </div>

      {hasFeeEnvelope && feeEnvelope != null ? (
        <div className="text-sm text-stone-700 space-y-1" data-testid="fee-site-above-fold">
          <p>
            Operator:{' '}
            <span className="font-semibold">
              {displayUnknown(feeEnvelope.feeProfile?.operatorName)}
            </span>
          </p>
          <p>
            Operating status:{' '}
            <span className="font-semibold">
              {operatingStatusLabel(feeEnvelope.operatingStatus ?? OperatingStatus.UNKNOWN)}
            </span>
          </p>
          <p>
            Last verified:{' '}
            {feeEnvelope.lastVerifiedAt != null
              ? feeEnvelope.lastVerifiedAt
              : 'Unknown / Not verified'}
          </p>
        </div>
      ) : null}

      {location.collecting_summary != null && location.collecting_summary !== '' ? (
        <p className="text-sm text-gray-700">
          Recorded collecting note: {location.collecting_summary}. This note is not collecting
          permission.
        </p>
      ) : null}

      <p className="text-sm text-gray-700">
        {location.permit_summary != null && location.permit_summary !== ''
          ? `Recorded permit note: ${location.permit_summary}. A permit note is not current entry authorization.`
          : 'No permit note is on this record. That absence is not a decision that a permit is unnecessary.'}
      </p>

      {!isFeeMine && materials.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
            Materials
          </h2>
          <div className="flex flex-wrap gap-2">
            {materials.map((m) => (
              <span
                key={m.id}
                className="text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full"
              >
                {m.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasFeeEnvelope && feeEnvelope != null ? (
        <FeeMineDetailSections envelope={feeEnvelope} materials={materials} />
      ) : null}

      {geologySection}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            const fuzzy = location.fuzzy_location;
            if (fuzzy?.lat != null && fuzzy.lon != null) {
              openExternalMaps({ lat: fuzzy.lat, lon: fuzzy.lon });
            }
          }}
          disabled={location.fuzzy_location?.lat == null || location.fuzzy_location.lon == null}
          className="flex-1 min-h-12 min-w-12 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-40"
          title="Opens external maps for coordinates only. Route legality UNKNOWN means this is not approved navigation."
        >
          Directions
        </button>
        <Link
          href={`/trips?locationId=${location.id}`}
          className="flex-1 min-h-12 min-w-12 px-4 py-2 bg-stone-700 text-white rounded-xl text-sm font-bold hover:bg-stone-600 text-center inline-flex items-center justify-center"
        >
          Save Trip
        </Link>
        <Link
          href="/field"
          className="flex-1 min-h-12 min-w-12 px-4 py-2 bg-emerald-800 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 text-center inline-flex items-center justify-center"
        >
          Offline
        </Link>
        {collectingDisabled ? (
          <button
            type="button"
            disabled
            title="Quick Log save is held for this recorded access status. The hold is not a collecting verdict."
            data-testid="quick-log-button"
            className="flex-1 min-h-12 min-w-12 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold opacity-40 cursor-not-allowed"
          >
            Quick Log
          </button>
        ) : (
          <Link
            href={`/field?quickLog=1&locationId=${encodeURIComponent(location.id)}`}
            title="Quick Log records a candidate observation. It does not authorize collecting."
            data-testid="quick-log-button"
            className="flex-1 min-h-12 min-w-12 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500 text-center inline-flex items-center justify-center"
          >
            Quick Log
          </Link>
        )}
      </div>
      <p className="text-[11px] text-stone-600">
        Directions use coordinates only. Unknown route legality is not approved navigation. Mapped
        location is not collecting permission.
      </p>

      {collectingDisabled && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
          Quick Log save is held while the recorded access status is {accessStatus}. That status
          does not decide collecting, and unknown is not treated as allowed.
        </p>
      )}

      <Link href="/map" className="inline-block text-sm text-blue-600 hover:underline">
        ← Back to Map
      </Link>
    </div>
  );
}
