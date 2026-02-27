'use client';

/**
 * Observation Form Component
 * Build Document Rule: Create field observations
 *
 * Features:
 * - Location selector (search by ID or name)
 * - Title (required)
 * - Notes (optional)
 * - Tags (optional)
 * - Redirects to /observations/:id on success
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ObservationForm() {
  const router = useRouter();

  const [locationId, setLocationId] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!locationId.trim()) {
      setError('Please enter a valid location ID');
      setIsLoading(false);
      return;
    }

    if (!title.trim()) {
      setError('Title is required');
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        locationId: locationId.trim(),
        title: title.trim(),
        notes: notes.trim() || undefined,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      const response = await fetch('/api/observations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user-123',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create observation');
      }

      router.push(`/observations/${data.observation.id}`);
    } catch (err) {
      console.error('Failed to create observation:', err);
      setError(err instanceof Error ? err.message : 'Failed to create observation');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Location ID */}
      <div>
        <label htmlFor="locationId" className="block text-sm font-medium text-gray-700 mb-2">
          Location ID <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          id="locationId"
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          placeholder="Enter location ID"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Visit the map to find location IDs, or check your previous observations
        </p>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Title <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short summary of your observation"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          Field Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe your observations (optional)"
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
          Tags (optional)
        </label>
        <input
          type="text"
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="comma,separated,tags"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Add keywords to help categorize your observation.
        </p>
      </div>

      {/* Submit */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isLoading || !locationId || !title}
          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-colors"
        >
          {isLoading ? 'Creating...' : 'Create Observation'}
        </button>
        <a
          href="/map"
          className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold text-lg transition-colors text-center"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
