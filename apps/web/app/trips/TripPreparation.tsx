'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const ROWS = [
  {
    id: 'legal',
    label: 'Legal',
    detail: 'Unresolved. A trip plan is not collecting permission or entry authorization.',
  },
  {
    id: 'route',
    label: 'Route',
    detail: 'Unresolved. Route availability is not site legality.',
  },
  {
    id: 'safety',
    label: 'Safety',
    detail: 'Unresolved. This screen is not a safety determination.',
  },
  {
    id: 'offline',
    label: 'Offline readiness',
    detail:
      'Unresolved. A connection state is not a current cache, and a cache is not current authority.',
  },
  {
    id: 'closure',
    label: 'Closure revalidation',
    detail: 'Not current. A past closure change is not collecting permission.',
  },
] as const;

export function TripPreparation(): JSX.Element {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
  }, []);

  return (
    <main
      className="mx-auto min-h-screen max-w-lg bg-zinc-950 p-4 text-white"
      data-testid="trip-preparation"
    >
      <h1 className="text-xl font-black uppercase">Trip preparation</h1>
      <p className="mt-2 text-sm text-white/70">
        Each readiness row stays unresolved until a separate current record exists. Departure is not
        ready.
      </p>
      <p className="mt-3 text-sm">
        Connection observed on this device: {online ? 'online' : 'offline'}. That observation is not
        offline readiness.
      </p>
      <ul className="mt-4 space-y-3">
        {ROWS.map((row) => (
          <li key={row.id} className="rounded-xl border border-white/15 p-3">
            <h2 className="text-sm font-bold">{row.label}</h2>
            <p className="mt-1 text-sm text-white/80">{row.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-semibold">Go / No-Go: not ready</p>
      <Link
        href="/field"
        className="mt-6 inline-flex min-h-12 items-center text-sm font-bold text-amber-300"
      >
        Open field map
      </Link>
    </main>
  );
}
