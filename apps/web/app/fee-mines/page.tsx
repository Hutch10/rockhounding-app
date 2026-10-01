import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import {
  FeeSiteAdmissionStatus,
  SiteType,
  isPubliclyDiscoverableAdmission,
  locationHasSiteRole,
  parseFeeSiteEnvelope,
} from '@rockhounding/shared/fee-site-support';

export const metadata: Metadata = {
  title: 'Fee Mines / Pay-to-Dig · Rocky Atlas',
  description:
    'Governed fee-mine discovery for Rocky Atlas. Only admitted and published records appear.',
};

export const dynamic = 'force-dynamic';

type ListedFeeSite = {
  id: string;
  name: string;
  state: string | null;
  operatingStatus: string | null;
};

async function loadAdmittedFeeMines(): Promise<ListedFeeSite[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (url == null || url === '' || key == null || key === '') {
    return [];
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.from('locations').select('id, name, metadata').limit(200);

  if (error || data == null) {
    return [];
  }

  const listed: ListedFeeSite[] = [];
  for (const row of data) {
    const metadata =
      row.metadata != null && typeof row.metadata === 'object'
        ? (row.metadata as Record<string, unknown>)
        : null;
    const envelope = parseFeeSiteEnvelope(metadata ?? undefined);
    const rawFee =
      metadata?.fee_site != null && typeof metadata.fee_site === 'object'
        ? (metadata.fee_site as Record<string, unknown>)
        : null;
    const admission =
      (envelope?.admissionStatus as FeeSiteAdmissionStatus | undefined) ??
      (typeof rawFee?.admissionStatus === 'string'
        ? (rawFee.admissionStatus as FeeSiteAdmissionStatus)
        : null);
    if (admission == null || !isPubliclyDiscoverableAdmission(admission)) continue;

    const isFee =
      locationHasSiteRole(envelope, SiteType.FEE_MINE) ||
      rawFee?.siteType === SiteType.FEE_MINE ||
      metadata?.site_type === SiteType.FEE_MINE;
    if (!isFee) continue;

    const state =
      typeof metadata?.state === 'string' && metadata.state.trim() !== ''
        ? metadata.state.toUpperCase()
        : null;
    listed.push({
      id: String(row.id),
      name: String(row.name),
      state,
      operatingStatus:
        envelope?.operatingStatus ??
        (typeof rawFee?.operatingStatus === 'string' ? rawFee.operatingStatus : null),
    });
  }

  return listed.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Public discovery for admitted FEE_MINE records only.
 * Does not invent nationwide completeness.
 */
export default async function FeeMinesIndexPage(): Promise<JSX.Element> {
  const sites = await loadAdmittedFeeMines();
  const states = [...new Set(sites.map((s) => s.state).filter(Boolean))] as string[];

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">Rocky Atlas</p>
        <h1 className="text-3xl font-bold text-stone-900">Fee Mines / Pay-to-Dig</h1>
        <p className="text-stone-700">
          Find the ground. Know the rules. Record the find. Fee mines are a first-class site type on
          the canonical map — not a separate app.
        </p>
        <p className="text-sm text-stone-600 rounded-xl border border-amber-200 bg-amber-50 p-4">
          Launch listing is limited to admitted published fee mines in the current cohort (
          {sites.length} shown). This is not a nationwide inventory. Mapped ≠ open; advertised
          materials ≠ verified geology.
        </p>
        {sites.length === 0 ? (
          <p className="text-sm text-stone-600">
            No admitted public fee-mine records are published yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {sites.map((site) => (
              <li key={site.id}>
                <Link
                  href={`/location/${site.id}`}
                  className="block rounded-xl border border-stone-200 bg-white px-4 py-3 hover:border-stone-400"
                >
                  <span className="font-semibold text-stone-900">{site.name}</span>
                  <span className="mt-1 block text-xs text-stone-500">
                    {[site.state, site.operatingStatus].filter(Boolean).join(' · ')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {states.length > 0 ? (
          <p className="text-sm text-stone-600">
            States with admitted fee mines:{' '}
            {states.map((code, i) => (
              <span key={code}>
                {i > 0 ? ', ' : ''}
                <Link
                  href={`/fee-mines/${code.toLowerCase()}`}
                  className="text-blue-700 hover:underline"
                >
                  {code}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/map?site_type=FEE_MINE"
            className="min-h-12 inline-flex items-center px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-bold"
          >
            Open map (Fee/Pay-to-Dig filter)
          </Link>
          <Link
            href="/map"
            className="min-h-12 inline-flex items-center px-4 py-2 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm font-bold"
          >
            All sites
          </Link>
        </div>
      </div>
    </main>
  );
}
