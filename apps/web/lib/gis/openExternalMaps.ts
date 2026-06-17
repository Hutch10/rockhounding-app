interface FuzzyCoords {
  lat: number;
  lon: number;
}

export type MapsPlatform = 'ios' | 'android' | 'desktop';

/**
 * GIS-007: Build external maps URL from fuzzy coordinates only.
 * Never accepts exact user GPS — callers must pass site fuzzy_location.
 */
export function buildExternalMapsUrl(
  fuzzyLocation: FuzzyCoords,
  platform: MapsPlatform = 'desktop'
): string {
  const { lat, lon } = fuzzyLocation;
  const label = encodeURIComponent('Rockhound site area');
  const coords = `${lat},${lon}`;

  if (platform === 'ios') {
    return `maps://?q=${label}&ll=${coords}`;
  }
  if (platform === 'android') {
    return `geo:${coords}?q=${coords}(${label})`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

function detectPlatform(userAgent: string): MapsPlatform {
  if (/iPad|iPhone|iPod/.test(userAgent)) return 'ios';
  if (/Android/.test(userAgent)) return 'android';
  return 'desktop';
}

/**
 * GIS-007: Open external maps with fuzzy coordinates for canon sites.
 * Never uses exact coordinates for public navigation.
 */
export function openExternalMaps(fuzzyLocation: FuzzyCoords | null | undefined): void {
  if (fuzzyLocation == null) {
    return;
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const url = buildExternalMapsUrl(fuzzyLocation, detectPlatform(ua));
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
