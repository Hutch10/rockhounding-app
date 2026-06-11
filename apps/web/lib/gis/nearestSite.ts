import type { LocationV1 } from '@rockhounding/shared';

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance in meters (GIS-004) */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface NearestSiteResult {
  site: LocationV1;
  distanceM: number;
  withinGeofence: boolean;
}

export function findNearestSite(
  sites: LocationV1[],
  userLat: number,
  userLon: number,
  geofenceM = 500
): NearestSiteResult | null {
  if (sites.length === 0) {
    return null;
  }

  let best: NearestSiteResult | null = null;

  for (const site of sites) {
    const siteLat = site.latitude ?? 0;
    const siteLon = site.longitude ?? 0;
    const distanceM = haversineMeters(userLat, userLon, siteLat, siteLon);
    if (best == null || distanceM < best.distanceM) {
      best = {
        site,
        distanceM,
        withinGeofence: distanceM <= geofenceM,
      };
    }
  }

  return best;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
