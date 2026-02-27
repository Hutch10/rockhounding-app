import type { Metadata } from 'next';

import { ObservationForm } from './ObservationForm';

/**
 * New Observation Page - Server Component
 * Build Document Rule: Professional geologist field observations
 *
 * Features:
 * - Form to create new observation
 * - Private by default (RLS enforced)
 * - Links to locations and materials
 */

export const metadata: Metadata = {
  title: 'New Observation - Field Notes',
  description: 'Record a new field observation for a rockhounding location',
};

export default function NewObservationPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white px-6 py-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <a
            href="/map"
            className="text-sm text-gray-300 hover:text-white mb-2 inline-block"
          >
            ← Back to Map
          </a>
          <h1 className="text-3xl font-bold">New Field Observation</h1>
          <p className="text-gray-300 mt-1">
            Record your field notes for a location
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <ObservationForm />
        </div>
      </div>
    </main>
  );
}
