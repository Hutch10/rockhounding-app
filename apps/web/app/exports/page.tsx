/**
 * Exports List Page
 * Build Document Step 10: List user's export jobs
 *
 * Shows:
 * - All export jobs for current user
 * - Status (PENDING/RUNNING/COMPLETE/FAILED)
 * - Download button when COMPLETE
 * - Link to create new export
 */

import { headers } from 'next/headers';
import Link from 'next/link';
import { ExportsList } from './ExportsList';
import { createApiClient } from '@/lib/api';
import type { ExportSummary } from '@/lib/api';

/**
 * Helper to get current user ID (temporary, will use session)
 */
function getCurrentUserId(): string {
  const headersList = headers();
  return headersList.get('x-user-id') || 'demo-user';
}

/**
 * Fetch user's export jobs
 */
async function fetchUserExports(): Promise<ExportSummary[]> {
  const userId = getCurrentUserId();
  const api = createApiClient({
    headers: userId ? { 'x-user-id': userId } : undefined,
  });
  const exports = await api.listExports();
  return exports.items;
}

export default async function ExportsPage() {
  const exports = await fetchUserExports();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Exports</h1>
          <p className="text-gray-600 mt-2">
            Download your rockhounding location data in multiple formats
          </p>
        </div>
        <Link
          href="/exports/new"
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
        >
          + New Export
        </Link>
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

      {/* Exports List */}
      {exports.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No exports yet
          </h2>
          <p className="text-gray-600 mb-6">
            Create your first export to download location data in GeoJSON, KML, or CSV format
          </p>
          <Link
            href="/exports/new"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Create Your First Export
          </Link>
        </div>
      ) : (
        <ExportsList exports={exports} />
      )}

      {/* Info Card */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">About Exports</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>GeoJSON:</strong> Full geometry and properties for GIS software</li>
          <li>• <strong>KML:</strong> Placemarks with descriptions for Google Earth</li>
          <li>• <strong>CSV:</strong> Tabular data for spreadsheets and analysis</li>
          <li>• Export jobs are processed in the background</li>
          <li>• Download links expire after 1 hour (create new export if needed)</li>
          <li>• Private observations are excluded from exports</li>
        </ul>
      </div>
    </div>
  );
}
