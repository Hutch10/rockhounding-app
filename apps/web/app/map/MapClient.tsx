'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import type { LocationV1 } from '@rockhounding/shared';
import type { SiteType } from '@rockhounding/shared/fee-site-support';
// eslint-disable-next-line import/default -- mapbox-gl default export is valid at runtime
import mapboxgl, { type Map as MapboxMap, type Marker } from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { PinPopup } from './components/PinPopup';
import { SiteTypeFilterBar } from './components/SiteTypeFilterBar';
import { useMapPins } from './hooks/useMapPins';
import { applyPinStyles } from './lib/pinRenderer';
import type { MapConfig } from './types';
import { ZOOM_THRESHOLDS } from './types';

interface MapClientProps {
  config: MapConfig;
  onPinSelect?: (pin: LocationV1) => void;
}

export function MapClient({ config, onPinSelect }: MapClientProps): JSX.Element {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapboxMap | null>(null);
  const [mapConfigError, setMapConfigError] = useState<string | null>(null);
  const [siteTypes, setSiteTypes] = useState<SiteType[]>([]);
  const markersRef = useRef<Marker[]>([]);
  const onPinSelectRef = useRef(onPinSelect);
  onPinSelectRef.current = onPinSelect;

  const { pins, loading, error } = useMapPins({ map, siteTypes });

  useEffect(() => {
    if (mapContainer.current == null) {
      return;
    }

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (mapboxToken == null || mapboxToken === '') {
      setMapConfigError(
        'Map unavailable: set NEXT_PUBLIC_MAPBOX_TOKEN in apps/web/.env.local and restart the dev server.'
      );
      return;
    }

    setMapConfigError(null);

    mapboxgl.accessToken = mapboxToken;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: config.initialCenter,
      zoom: config.initialZoom,
      minZoom: config.minZoom,
      maxZoom: config.maxZoom,
    });

    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapInstance.addControl(
      new mapboxgl.ScaleControl({ maxWidth: 100, unit: 'imperial' }),
      'bottom-left'
    );

    setMap(mapInstance);

    return () => {
      mapInstance.remove();
    };
  }, [config]);

  useEffect(() => {
    if (map == null) {
      return;
    }

    const zoom = map.getZoom();

    if (zoom < ZOOM_THRESHOLDS.MIN_VISIBLE) {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const simplified = zoom < ZOOM_THRESHOLDS.FULL_PINS;

    pins.forEach((pin: LocationV1) => {
      const el = document.createElement('div');
      applyPinStyles(el, pin, { zoom, simplified });

      el.addEventListener('click', () => {
        onPinSelectRef.current?.(pin);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([pin.longitude ?? 0, pin.latitude ?? 0])
        .addTo(map);

      const popupNode = document.createElement('div');
      const root = createRoot(popupNode);
      root.render(<PinPopup pin={pin} />);

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: '350px',
      }).setDOMContent(popupNode);

      marker.setPopup(popup);
      markersRef.current.push(marker);
    });
  }, [map, pins]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      <div className="absolute top-4 left-4 right-16 z-10 max-w-xl">
        <div className="rounded-2xl bg-white/95 border border-stone-200 shadow-lg p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
            Rocky Atlas · site type
          </p>
          <SiteTypeFilterBar selected={siteTypes} onChange={setSiteTypes} />
          <p className="text-[10px] text-stone-500">
            Fee/Pay-to-Dig filters mapped fee mines. Mapping is not open status or collecting
            permission.
          </p>
        </div>
      </div>

      {loading && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 mt-36">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          <span className="text-sm text-gray-700">Loading locations...</span>
        </div>
      )}

      {mapConfigError != null && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/90 p-6">
          <div className="max-w-md rounded-2xl border border-amber-500/30 bg-zinc-900 px-6 py-4 text-center">
            <p className="font-semibold text-amber-300">Map configuration required</p>
            <p className="mt-2 text-sm text-white/70">{mapConfigError}</p>
          </div>
        </div>
      )}

      {error != null && error !== '' && (
        <div className="absolute top-4 left-4 bg-red-100 border border-red-400 text-red-700 rounded-lg px-4 py-3 max-w-md mt-36">
          <p className="font-semibold">Error loading locations</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {map != null && (
        <div className="absolute bottom-4 right-4 bg-white rounded shadow px-3 py-1 text-xs text-gray-600">
          Zoom: {map.getZoom().toFixed(1)} | Pins: {pins.length}
        </div>
      )}
    </div>
  );
}
