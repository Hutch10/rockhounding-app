/**
 * State Pack Detail Page
 * Build Document Step 11: Show details for a single state pack
 *
 * Shows:
 * - State name
 * - Pack metadata (size, updated_at)
 * - Download button
 * - Usage instructions
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatePackDetail } from './StatePackDetail';

import { createApiClient } from '@/lib/api';
import type { StatePackDetail as StatePackDetailType } from '@/lib/api';

/**
 * Fetch state pack
 */
async function fetchStatePack(state: string): Promise<StatePackDetailType | null> {
  const api = createApiClient();
  try {
    return await api.getStatePack(state.toUpperCase());
  } catch (error) {
    console.error('Failed to fetch state pack:', error);
    return null;
  }
}

export default async function StatePackDetailPage({
  params,
}: {
  params: { state: string };
}) {
  const pack = await fetchStatePack(params.state);

  if (!pack) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/state-packs"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to State Packs
        </Link>
      </div>

      {/* State Pack Detail */}
      <StatePackDetail pack={pack} />
    </div>
  );
}
