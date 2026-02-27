'use client';

/**
 * Export Form Component
 * Build Document Step 10: Form to create new export job
 *
 * Fields:
 * - Export type selector
 * - Optional filters (legal_tag, access_model, difficulty_max, kid_friendly)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ExportType } from '@/lib/api';

export function ExportForm() {
  const router = useRouter();
  const [type, setType] = useState<ExportType>('full');
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle form submission
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user', // Temporary
        },
        body: JSON.stringify({
          type,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create export');
      }

      router.push(`/exports`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create export');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Export Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Export Type *
        </label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'full', label: 'Full Dataset' },
            { value: 'observations', label: 'Observations' },
            { value: 'collections', label: 'Collections' },
            { value: 'materials', label: 'Materials' },
          ] as { value: ExportType; label: string }[]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={`px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
                type === opt.value
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Optional Filters */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">
          Optional Filters
          <span className="text-sm text-gray-500 font-normal ml-2">
            (Leave blank to include all)
          </span>
        </h3>
        
        <div className="space-y-4">
          {/* Legal Tag */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Legal Tag
            </label>
            <select
              value={(filters.legal_tag as string) || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  legal_tag: e.target.value || undefined,
                }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="public_land">Public Land</option>
              <option value="private_permission_required">Private (Permission Required)</option>
              <option value="fee_required">Fee Required</option>
            </select>
          </div>

          {/* Access Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Model
            </label>
            <select
              value={(filters.access_model as string) || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  access_model: e.target.value || undefined,
                }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="free_public">Free Public</option>
              <option value="fee_dig">Fee Dig</option>
              <option value="museum_shop">Museum/Shop</option>
            </select>
          </div>

          {/* Difficulty Max */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Difficulty (1-5)
            </label>
            <input
              type="number"
              min="1"
              max="5"
              placeholder="5"
              value={(filters.difficulty_max as number | undefined) || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  difficulty_max: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Kid Friendly */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="kid_friendly"
              checked={Boolean(filters.kid_friendly)}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  kid_friendly: e.target.checked ? true : undefined,
                }))
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="kid_friendly"
              className="ml-2 text-sm font-medium text-gray-700"
            >
              Kid-friendly locations only
            </label>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Export...' : 'Create Export'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/exports')}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
