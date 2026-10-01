'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import {
  PartnerClaimBasis,
  PartnerEditableField,
  PartnerTenancyRole,
  type PartnerSiteClaim,
} from '@rockhounding/shared/partner-tenancy';

/**
 * Minimal operator dashboard — My Sites / claim / operational updates.
 * No analytics or payment features.
 */
export default function PartnerDashboardPage(): JSX.Element {
  const [claims, setClaims] = useState<PartnerSiteClaim[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [siteId, setSiteId] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [evidence, setEvidence] = useState('');
  const [claimBasis, setClaimBasis] = useState<string>(PartnerClaimBasis.OPERATOR_DIRECT);

  const [updateSiteId, setUpdateSiteId] = useState('');
  const [updateField, setUpdateField] = useState<string>(PartnerEditableField.hours);
  const [updateValue, setUpdateValue] = useState('');

  const refresh = useCallback(async () => {
    setError(null);
    const res = await fetch('/api/v1/partner/claims', { credentials: 'include' });
    if (res.status === 401) {
      setError('Sign in required to manage partner sites.');
      setClaims([]);
      return;
    }
    if (!res.ok) {
      setError('Failed to load claims');
      return;
    }
    const data = (await res.json()) as { claims: PartnerSiteClaim[] };
    setClaims(data.claims);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submitClaim(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const res = await fetch('/api/v1/partner/claims', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_id: siteId.trim(),
        organization_name: organizationName.trim() || undefined,
        requested_role: PartnerTenancyRole.SITE_OPERATOR,
        claim_basis: claimBasis,
        evidence: evidence.trim(),
      }),
    });
    const data = (await res.json()) as { error?: string; claim?: PartnerSiteClaim };
    if (!res.ok) {
      setError(data.error ?? 'Claim failed');
      return;
    }
    setMessage('Claim submitted — status PENDING until moderator verification.');
    setEvidence('');
    await refresh();
  }

  async function submitUpdate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/v1/partner/sites/${updateSiteId.trim()}/update`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field: updateField,
        value: updateValue,
      }),
    });
    const data = (await res.json()) as { error?: string; ok?: boolean };
    if (!res.ok) {
      setError(data.error ?? 'Update failed');
      return;
    }
    setMessage('Update recorded with OPERATOR_DIRECT provenance.');
    setUpdateValue('');
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 text-stone-900">
      <p className="text-xs uppercase tracking-wide text-stone-500">Partner</p>
      <h1 className="mt-1 text-2xl font-semibold">My Sites</h1>
      <p className="mt-2 text-sm text-stone-600">
        Claim and maintain hours, pricing, contact, and operator rules for sites you operate.
        Geology, legal access, and trust indicators stay platform-controlled.
      </p>
      <section
        className="mt-4 rounded border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700"
        aria-labelledby="operator-help-heading"
      >
        <h2 id="operator-help-heading" className="font-medium text-stone-900">
          What Operator Confirmed means
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            After verification you may edit allowlisted business fields (hours, pricing, contact,
            temporary closures, amenities, and similar).
          </li>
          <li>
            You cannot edit geology certainty, independent legal access, other users&apos; finds,
            trust status, or provenance history.
          </li>
          <li>
            &ldquo;Operator Confirmed&rdquo; means verified business information only — not geology
            verification, legal certification, or platform endorsement.
          </li>
        </ul>
      </section>

      <p className="mt-4 text-sm">
        <Link href="/map" className="underline">
          Back to map
        </Link>
      </p>

      {error ? (
        <p
          className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}

      <section className="mt-8" aria-labelledby="claim-status-heading">
        <h2 id="claim-status-heading" className="text-lg font-medium">
          Claim Status
        </h2>
        {claims.length === 0 ? (
          <p className="mt-2 text-sm text-stone-600">No claims yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {claims.map((c) => (
              <li key={c.claim_id} className="border-b border-stone-200 py-2 text-sm">
                <span className="font-medium">{c.organization_name ?? c.site_id}</span>
                <span className="ml-2 text-stone-500">{c.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="claim-heading">
        <h2 id="claim-heading" className="text-lg font-medium">
          Claim This Site
        </h2>
        <form className="mt-3 space-y-3" onSubmit={(e) => void submitClaim(e)}>
          <label className="block text-sm">
            Site ID
            <input
              className="mt-1 w-full border border-stone-300 px-3 py-2"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Business / organization name
            <input
              className="mt-1 w-full border border-stone-300 px-3 py-2"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Claim basis
            <select
              className="mt-1 w-full border border-stone-300 px-3 py-2"
              value={claimBasis}
              onChange={(e) => setClaimBasis(e.target.value)}
            >
              {Object.values(PartnerClaimBasis).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Evidence
            <textarea
              className="mt-1 w-full border border-stone-300 px-3 py-2"
              rows={3}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <button type="submit" className="bg-stone-900 px-4 py-2 text-sm text-white">
            Submit claim
          </button>
        </form>
      </section>

      <section className="mt-10" aria-labelledby="update-heading">
        <h2 id="update-heading" className="text-lg font-medium">
          Update Hours / Pricing / Contact / Rules
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Requires a VERIFIED claim. Mark temporarily closed via temporary_closure field.
        </p>
        <form className="mt-3 space-y-3" onSubmit={(e) => void submitUpdate(e)}>
          <label className="block text-sm">
            Site ID
            <input
              className="mt-1 w-full border border-stone-300 px-3 py-2"
              value={updateSiteId}
              onChange={(e) => setUpdateSiteId(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Field
            <select
              className="mt-1 w-full border border-stone-300 px-3 py-2"
              value={updateField}
              onChange={(e) => setUpdateField(e.target.value)}
            >
              {Object.values(PartnerEditableField).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Value
            <input
              className="mt-1 w-full border border-stone-300 px-3 py-2"
              value={updateValue}
              onChange={(e) => setUpdateValue(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="bg-stone-900 px-4 py-2 text-sm text-white">
            Submit correction
          </button>
        </form>
      </section>
    </main>
  );
}
