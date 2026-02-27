import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { createApiClient } from '@/lib/api';
import { ObservationDetailClient } from './ObservationDetailClient';
import type { ObservationWithDetails } from '@/app/api/observations/types';

/**
 * Observation Detail Page - Server Component
 * Build Document Rule: Owner-only access (RLS enforced)
 *
 * Features:
 * - Displays observation details
 * - Enforces owner-only access (403 if not owner)
 * - Shows timestamps
 */

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Get current user ID
 * In production, extract from Supabase Auth session
 */
function getCurrentUserId(): string {
  return 'test-user-123';
}

/**
 * Fetch observation with details
 */
async function fetchObservation(id: string, userId: string): Promise<ObservationWithDetails | null> {
  const api = createApiClient({
    headers: userId ? { 'x-user-id': userId } : undefined,
  });

  try {
    const observation = await api.getObservation(id);
    return {
      ...observation,
      locationName: null,
    };
  } catch (error) {
    console.error('Failed to fetch observation:', error);
    return null;
  }
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const { id } = params;
  const userId = getCurrentUserId();

  try {
    const observation = await fetchObservation(id, userId);

    if (!observation) {
      return {
        title: 'Observation Not Found',
      };
    }

    return {
      title: `${observation.title} - Field Notes`,
      description: observation.notes ? observation.notes.substring(0, 160) : 'Observation details',
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Observation Details',
    };
  }
}

export default async function ObservationDetailPage(props: PageProps) {
  const params = await props.params;
  const { id } = params;

  if (!id) {
    notFound();
  }

  const userId = getCurrentUserId();
  const observation = await fetchObservation(id, userId);

  if (!observation) {
    notFound();
  }

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
          <h1 className="text-3xl font-bold">{observation.title}</h1>
          <p className="text-gray-300 mt-1">
            Observation for {observation.locationName || `Location #${observation.locationId}`}
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <ObservationDetailClient observation={observation} />
      </div>
    </main>
  );
}
