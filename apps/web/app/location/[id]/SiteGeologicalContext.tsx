import { loadSiteGeologicalContext } from '@rockhounding/shared/usgs-sgmc-production-context';

import { GeologicalContextPanel } from './GeologicalContextPanel';
import type { LocationDetailV1 } from './LocationDetailClient';

export async function SiteGeologicalContext({
  location,
}: {
  location: LocationDetailV1;
}): Promise<JSX.Element | null> {
  const context = await loadSiteGeologicalContext({
    latitude: location.latitude,
    longitude: location.longitude,
    retrievedAt: new Date().toISOString(),
  });
  if (context == null) return null;
  return (
    <GeologicalContextPanel
      view={{
        state: context.state,
        units: context.units,
        attribution:
          context.attribution == null
            ? null
            : {
                source: context.attribution.source,
                product: context.attribution.product,
                doi: context.attribution.doi,
              },
        compilationYear: context.compilationYear,
        retrievedAt: context.retrievedAt,
      }}
    />
  );
}
