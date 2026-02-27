import type { Map as MapboxMap } from 'mapbox-gl';
import { useCallback, useEffect, useState } from 'react';

import type { LocationsResponse } from '../../api/locations/types';
import type { ThinLocationPin } from '../types';
import { bboxFromMap } from '../utils/bboxFromMap';

/**
 * Hook for fetching thin pins from the map viewport
 * Build Document: NEVER fetch full-detail data during panning
 *
 * Features:
 * - Debounced fetching (150ms)
 * - Automatic bbox calculation from map bounds
 * - Loading and error states
 * - Progressive disclosure by zoom level
 */

interface UseMapPinsOptions {
  map: MapboxMap | null;
  debounceMs?: number;
  minZoom?: number;
}

interface UseMapPinsResult {
  pins: ThinLocationPin[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMapPins({
  map,
  debounceMs = 150,
  minZoom = 6,
}: UseMapPinsOptions): UseMapPinsResult {
  const [pins, setPins] = useState<ThinLocationPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPins = useCallback(async (): Promise<void> => {
    if (!map) {
      return;
    }

    const zoom = map.getZoom();

    // Build Document: Below zoom 6, show nothing
    if (zoom < minZoom) {
      setPins([]);
      return;
    }

    const bounds = map.getBounds();
    if (!bounds) return;
    const bbox = bboxFromMap(bounds as any);

    setLoading(true);
    setError(null);

    try {
      // Build Document Rule #2: Fetch ONLY thin pins with bbox
      const response = await fetch(`/api/locations?bbox=${bbox}`, {
        cache: 'no-store', // Live map data, no caching
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch locations: ${response.statusText}`);
      }

      const data: LocationsResponse = await response.json();
      setPins(data.data);
    } catch (err) {
      console.error('Error fetching map pins:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPins([]);
    } finally {
      setLoading(false);
    }
  }, [map, minZoom]);

  // Debounced fetch on map move/zoom
  useEffect(() => {
    if (!map) {
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const handleMapMove = (): void => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        void fetchPins();
      }, debounceMs);
    };

    // Initial fetch
    void fetchPins();

    // Listen to map events
    map.on('moveend', handleMapMove);
    map.on('zoomend', handleMapMove);

    return () => {
      clearTimeout(timeoutId);
      map.off('moveend', handleMapMove);
      map.off('zoomend', handleMapMove);
    };
  }, [map, fetchPins, debounceMs]);

  return {
    pins,
    loading,
    error,
    refetch: fetchPins,
  };
}
