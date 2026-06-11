import { LocationV1Schema } from '@rockhounding/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { LocationDetailClient, type LocationDetailV1 } from './LocationDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

const LocationDetailResponseSchema = z.object({
  data: LocationV1Schema.extend({
    permit_summary: z.string().nullable().optional(),
    collecting_summary: z.string().nullable().optional(),
    materials: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          abundance: z.string().nullable(),
        })
      )
      .optional(),
  }),
});

async function fetchLocation(id: string): Promise<LocationDetailV1 | null> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const response = await fetch(`${base}/api/v1/locations/${id}`, { cache: 'no-store' });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch location: ${response.statusText}`);
  }

  const json: unknown = await response.json();
  const parsed = LocationDetailResponseSchema.parse(json);
  return parsed.data as LocationDetailV1;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const parsed = ParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { title: 'Location Not Found' };
  }

  try {
    const location = await fetchLocation(parsed.data.id);
    if (location == null) {
      return { title: 'Location Not Found' };
    }
    return {
      title: `${location.name} - Rockhounding Location`,
      description: location.description ?? `Details for ${location.name}`,
    };
  } catch {
    return { title: 'Location Details' };
  }
}

export default async function LocationDetailPage(props: PageProps): Promise<JSX.Element> {
  const params = await props.params;
  const parsed = ParamsSchema.safeParse(params);

  if (!parsed.success) {
    notFound();
  }

  const location = await fetchLocation(parsed.data.id);
  if (location == null) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 max-w-lg mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{location.name}</h1>
        {location.description != null && location.description !== '' ? (
          <p className="text-sm text-gray-600 mt-1">{location.description}</p>
        ) : null}
      </header>
      <LocationDetailClient location={location} />
    </main>
  );
}
