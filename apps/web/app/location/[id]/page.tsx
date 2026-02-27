import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import type { FullLocationDetailResponse } from '@/app/api/locations/[id]/types';
import { LocationDetailClient } from './LocationDetailClient';

/**
 * Location Detail Page - Server Component
 * Build Document: Full detail view for a single location
 *
 * Features:
 * - Fetches full location detail (NOT thin pins)
 * - Server-side rendering for SEO
 * - Legal gating UI for restricted areas
 * - "Why?" link to primary ruleset
 * - Materials, rulesets, sources lists
 */

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const { id } = params;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/locations/${id}`,
      {
        cache: 'no-store', // Always fetch fresh data for metadata
      }
    );

    if (!response.ok) {
      return {
        title: 'Location Not Found',
      };
    }

    const data: FullLocationDetailResponse = await response.json();
    const { location } = data;

    return {
      title: `${location.name} - Rockhounding Location`,
      description:
        location.description || `Details for ${location.name} rockhounding location`,
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Location Details',
    };
  }
}

export default async function LocationDetailPage(props: PageProps) {
  const params = await props.params;
  const { id } = params;

  // Validate ID format
  if (!/^\d+$/.test(id)) {
    notFound();
  }

  // Fetch full location detail from API
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/locations/${id}`,
      {
        cache: 'no-store', // Server component, always fetch fresh
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        notFound();
      }
      throw new Error(`Failed to fetch location: ${response.statusText}`);
    }

    const data: FullLocationDetailResponse = await response.json();
    const { location } = data;

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
            <h1 className="text-3xl font-bold">{location.name}</h1>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <LocationDetailClient location={location} />
        </div>
      </main>
    );
  } catch (error) {
    console.error('Error fetching location:', error);
    throw error; // Let Next.js error boundary handle it
  }
}
