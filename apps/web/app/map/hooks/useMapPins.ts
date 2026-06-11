import type { LocationV1 } from '@rockhounding/shared';
import { LocationsListResponseSchema } from '@rockhounding/shared';
import type { Map as MapboxMap } from 'mapbox-gl';
import { useCallback, useEffect, useState } from 'react';

import type { MapLocationPin } from '../types';
import { ZOOM_THRESHOLDS } from '../types';
import { bboxFromMap } from '../utils/bboxFromMap';

interface UseMapPinsOptions {
  map: MapboxMap | null;
  debounceMs?: number;
  minZoom?: number;
}

interface UseMapPinsResult {
  pins: MapLocationPin[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * FE-004: Fetch thin pins from V1 locations API with debounced bbox.
 */
export function useMapPins({
  map,
  debounceMs = 300,
  minZoom = ZOOM_THRESHOLDS.MIN_VISIBLE,
}: UseMapPinsOptions): UseMapPinsResult {
  const [pins, setPins] = useState<MapLocationPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPins = useCallback(async (): Promise<void> => {
    if (map == null) {
      return;
    }

    const zoom = map.getZoom();

    if (zoom < minZoom) {
      setPins([]);
      return;
    }

    const bounds = map.getBounds();
    if (bounds == null) return;
    const bbox = bboxFromMap(bounds);

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/locations?bbox=${bbox}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch locations: ${response.statusText}`);
      }

      const json: unknown = await response.json();
      const data = LocationsListResponseSchema.parse(json);
      setPins(data.data as LocationV1[]);
    } catch (err) {
      console.error('Error fetching map pins:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPins([]);
    } finally {
      setLoading(false);
    }
  }, [map, minZoom]);

  useEffect(() => {
    if (map == null) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;

    const handleMapMove = (): void => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        void fetchPins();
      }, debounceMs);
    };

    void fetchPins();

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
    refetch: () => {
      void fetchPins();
    },
  };
}
