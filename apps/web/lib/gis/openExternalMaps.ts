interface FuzzyCoords {
  lat: number;
  lon: number;
}

/**
 * GIS-007: Open external maps with fuzzy coordinates for canon sites.
 * Never uses exact coordinates for public navigation.
 */
export function openExternalMaps(fuzzyLocation: FuzzyCoords | null | undefined): void {
  if (fuzzyLocation == null) {
    return;
  }

  const { lat, lon } = fuzzyLocation;
  const label = encodeURIComponent('Rockhound site area');
  const coords = `${lat},${lon}`;

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);

  let url: string;

  if (isIOS) {
    url = `maps://?q=${label}&ll=${coords}`;
  } else if (isAndroid) {
    url = `geo:${coords}?q=${coords}(${label})`;
  } else {
    url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
