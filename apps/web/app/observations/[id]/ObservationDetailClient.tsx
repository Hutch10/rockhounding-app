'use client';

/**
 * Observation Detail Client Component
 * Build Document Rule: Display observation details
 *
 * Shows:
 * - Title and notes
 * - Tags
 * - Created_at / updated_at
 * - Location info
 */

import type { ObservationWithDetails } from '@/app/api/observations/types';

interface ObservationDetailClientProps {
  observation: ObservationWithDetails;
}

export function ObservationDetailClient({ observation }: ObservationDetailClientProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{observation.title}</h2>
        {observation.notes && (
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {observation.notes}
          </p>
        )}
      </div>

      {/* Tags */}
      {observation.tags.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {observation.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Location Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Location</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Location Name:</span>
            <span className="text-gray-900 font-medium">
              {observation.locationName || `Location #${observation.locationId}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Location ID:</span>
            <span className="text-gray-900">{observation.locationId}</span>
          </div>
          <div className="mt-4">
            <a
              href={`/location/${observation.locationId}`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              View Location Details →
            </a>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Metadata</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Observation ID:</span>
            <span className="text-gray-900 font-mono">{observation.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Created:</span>
            <span className="text-gray-900">
              {new Date(observation.createdAt).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Last Updated:</span>
            <span className="text-gray-900">
              {new Date(observation.updatedAt).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">User ID:</span>
            <span className="text-gray-900 font-mono">{observation.userId}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <a
          href="/observations/new"
          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-center"
        >
          + New Observation
        </a>
        <a
          href={`/location/${observation.locationId}`}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-center"
        >
          View Location
        </a>
      </div>
    </div>
  );
}
