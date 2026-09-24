'use client';

import { useEffect, useState } from 'react';

import type { GeologicalContextView } from './LocationDetailClient';

function geologyMessage(state: GeologicalContextView['state']): string {
  switch (state) {
    case 'SUCCESS':
      return 'USGS geological map context for this site.';
    case 'NO_SGMC_POLYGON_RETURNED':
      return 'No SGMC map unit was returned for this location.';
    case 'OUTSIDE_PROVIDER_COVERAGE':
      return 'SGMC geological context is not available for this region.';
    case 'PARTIAL_UNSAFE':
      return 'SGMC returned an incomplete page. Geological context is not shown as complete.';
    case 'DISCLOSURE_WITHHELD':
      return 'Map geometry is withheld.';
    default:
      return 'Geological context temporarily unavailable.';
  }
}

export function GeologicalContextPending(): JSX.Element {
  return (
    <section
      aria-label="Geological context"
      aria-busy="true"
      className="rounded-xl border border-stone-300 bg-stone-50 p-3"
    >
      <h2 className="text-sm font-bold text-stone-900">Geological context</h2>
      <p className="mt-1 text-sm text-stone-800" role="status">
        Geological context is loading.
      </p>
    </section>
  );
}

export function GeologicalContextPanel({ view }: { view: GeologicalContextView }): JSX.Element {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    setOffline(navigator.onLine === false);
  }, []);
  const message = offline
    ? 'Geological context is unavailable offline.'
    : geologyMessage(view.state);
  const showUnits = !offline && view.state === 'SUCCESS';

  return (
    <section
      aria-label="Geological context"
      className="rounded-xl border border-stone-300 bg-stone-50 p-3"
    >
      <h2 className="text-sm font-bold text-stone-900">Geological context</h2>
      <p className="mt-1 text-sm text-stone-800">{message}</p>
      <p className="mt-1 text-xs text-stone-700">
        This is map context only. It does not say whether collecting, access, or travel is allowed.
        It is not stored for offline use.
      </p>
      {showUnits
        ? view.units.map((unit) => (
            <p
              key={`${unit.unitName}-${unit.ageMin}`}
              className="mt-2 break-words text-sm text-stone-900"
            >
              Map unit: {unit.unitName}. Lithology: {unit.lithology}. Geologic age: {unit.ageMin} to{' '}
              {unit.ageMax}.
            </p>
          ))
        : null}
      {!offline && view.attribution != null ? (
        <p className="mt-2 break-words text-xs text-stone-700">
          Source: {view.attribution.source}, {view.attribution.product}, DOI {view.attribution.doi}.
          Rockhounding is not a USGS product.
          {view.compilationYear != null ? ` Source compilation: ${view.compilationYear}.` : ''}
          {view.retrievedAt != null ? ` Retrieved for this request: ${view.retrievedAt}.` : ''}
        </p>
      ) : null}
    </section>
  );
}
