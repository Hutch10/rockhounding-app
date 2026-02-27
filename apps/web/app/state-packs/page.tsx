/**
 * State Packs List Page
 * Build Document Step 11: List all available state packs
 *
 * Shows:
 * - All available state packs
 * - Download buttons with signed URLs
 * - Pack size and last updated date
 */

import Link from 'next/link';
import { StatePackList } from './StatePackList';

import { createApiClient } from '@/lib/api';
import type { StatePackSummary } from '@/lib/api';

/**
 * Fetch all state packs
 */
async function fetchStatePacks(): Promise<StatePackSummary[]> {
  const api = createApiClient();
  return api.listStatePacks();
}

export default async function StatePacksPage() {
  const packs = await fetchStatePacks();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Offline State Packs</h1>
        <p className="text-gray-600 mt-2">
          Download vector data for offline rockhounding adventures
        </p>
      </div>

      {/* Back to Map */}
      <div className="mb-6">
        <Link
          href="/map"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Map
        </Link>
      </div>

      {/* Info Card */}
      <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">About State Packs</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Vector-only JSON:</strong> Locations, rulesets, and materials (no map tiles)</li>
          <li>• <strong>Approved locations only:</strong> All locations have been reviewed and approved</li>
          <li>• <strong>Updated nightly:</strong> Packs are regenerated automatically</li>
          <li>• <strong>Offline-ready:</strong> Download and use without internet connection</li>
          <li>• <strong>Private observations excluded:</strong> Only public data included</li>
        </ul>
      </div>

      {/* State Packs List */}
      {packs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No state packs available yet
          </h2>
          <p className="text-gray-600">
            State packs are generated nightly. Check back soon!
          </p>
        </div>
      ) : (
        <StatePackList packs={packs} />
      )}

      {/* Usage Guide */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">How to Use State Packs</h3>
        <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
          <li>Download the JSON pack for your target state</li>
          <li>Save the file to your device (phone, tablet, laptop)</li>
          <li>Use a compatible app or tool to view the data offline</li>
          <li>Each pack contains:
            <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
              <li>All approved locations (id, name, lat, lon, difficulty, etc.)</li>
              <li>Relevant rulesets (legal information for locations)</li>
              <li>Referenced materials (what you can find at each location)</li>
            </ul>
          </li>
        </ol>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> State packs do NOT include map tiles or photos. For full map functionality, use the online map viewer.
          </p>
        </div>
      </div>
    </div>
  );
}
