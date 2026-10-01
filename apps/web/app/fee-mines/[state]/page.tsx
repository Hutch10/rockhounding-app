import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import {
  FeeSiteAdmissionStatus,
  SiteType,
  isPubliclyDiscoverableAdmission,
  locationHasSiteRole,
  parseFeeSiteEnvelope,
} from '@rockhounding/shared/fee-site-support';

interface PageProps {
  params: Promise<{ state: string }>;
}

const STATE_RE = /^[a-z]{2}$/i;

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { state } = await props.params;
  const code = state.toUpperCase();
  return {
    title: `Fee Mines in ${code} · Rocky Atlas`,
    description: `Admitted fee-mine / pay-to-dig sites in ${code}. Unpublished leads are not listed.`,
  };
}

type ListedFeeSite = {
  id: string;
  name: string;
  operatingStatus: string | null;
};

async function loadAdmittedFeeMinesForState(stateCode: string): Promise<ListedFeeSite[]> {
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
    if ((metadata?.state ?? '').toString().toUpperCase() !== stateCode) continue;
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
    listed.push({
      id: String(row.id),
      name: String(row.name),
      operatingStatus:
        envelope?.operatingStatus ??
        (typeof rawFee?.operatingStatus === 'string' ? rawFee.operatingStatus : null),
    });
  }

  return listed.sort((a, b) => a.name.localeCompare(b.name));
}

export default async function FeeMinesStatePage(props: PageProps): Promise<JSX.Element> {
  const { state } = await props.params;
  if (!STATE_RE.test(state)) {
    notFound();
  }
  const code = state.toUpperCase();
  const sites = await loadAdmittedFeeMinesForState(code);

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">Rocky Atlas</p>
        <h1 className="text-3xl font-bold text-stone-900">Fee Mines · {code}</h1>
        <p className="text-sm text-stone-600 rounded-xl border border-amber-200 bg-amber-50 p-4">
          Admitted/published fee mines for {code} only ({sites.length}). This route will not invent
          nationwide listings.
        </p>
        {sites.length === 0 ? (
          <p className="text-sm text-stone-600">
            No admitted fee-mine records are published for {code} yet.
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
                  {site.operatingStatus ? (
                    <span className="mt-1 block text-xs text-stone-500">
                      {site.operatingStatus}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/fee-mines" className="text-sm text-blue-700 hover:underline">
          ← All fee mines
        </Link>
      </div>
    </main>
  );
}
