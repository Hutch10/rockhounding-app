'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import mapboxgl, { type Map as MapboxMap, type Marker } from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { PinPopup } from './components/PinPopup';
import { useMapPins } from './hooks/useMapPins';
import type { MapConfig } from './types';
import { ZOOM_THRESHOLDS } from './types';

/**
 * Map client component
 * Build Document: Mapbox GL JS (abstracted so MapLibre can replace later)
 *
 * Features:
 * - Thin pins only (no full detail)
 * - Progressive disclosure by zoom level
 * - Debounced fetching on viewport change
 * - 3 badges per pin popup
 */

interface MapClientProps {
  config: MapConfig;
}

export function MapClient({ config }: MapClientProps): JSX.Element {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapboxMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  const { pins, loading, error } = useMapPins({ map });

  // Initialize Mapbox
  useEffect(() => {
    if (!mapContainer.current) {
      return;
    }

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!mapboxToken) {
      console.error('Missing NEXT_PUBLIC_MAPBOX_TOKEN environment variable');
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: config.initialCenter,
      zoom: config.initialZoom,
      minZoom: config.minZoom,
      maxZoom: config.maxZoom,
    });

    // Add navigation controls
    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add scale control
    mapInstance.addControl(
      new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: 'imperial',
      }),
      'bottom-left'
    );

    setMap(mapInstance);

    return () => {
      mapInstance.remove();
    };
  }, [config]);

  // Update markers when pins change
  useEffect(() => {
    if (!map) {
      return;
    }

    const zoom = map.getZoom();

    // Progressive disclosure: below zoom 6, show nothing
    if (zoom < ZOOM_THRESHOLDS.MIN_VISIBLE) {
      // Clear all markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      return;
    }

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    pins.forEach((pin) => {
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.cursor = 'pointer';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      // Color marker by legal status
      if (pin.legal_tag === 'LEGAL_PUBLIC') {
        el.style.backgroundColor = '#16a34a'; // green
      } else if (pin.legal_tag === 'LEGAL_FEE_SITE') {
        el.style.backgroundColor = '#2563eb'; // blue
      } else if (pin.legal_tag === 'LEGAL_CLUB_SUPERVISED') {
        el.style.backgroundColor = '#ca8a04'; // yellow
      } else if (pin.legal_tag === 'GRAY_AREA') {
        el.style.backgroundColor = '#6b7280'; // gray
      } else if (pin.legal_tag === 'RESEARCH_ONLY') {
        el.style.backgroundColor = '#dc2626'; // red
      } else {
        el.style.backgroundColor = '#9ca3af'; // default gray
      }

      // Progressive disclosure: simplified display at lower zooms
      if (zoom < ZOOM_THRESHOLDS.FULL_PINS) {
        el.style.width = '20px';
        el.style.height = '20px';
      }

      const marker = new mapboxgl.Marker(el)
        .setLngLat([pin.lon, pin.lat])
        .addTo(map);

      // Create popup with React component
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
      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-700">Loading locations...</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-4 left-4 bg-red-100 border border-red-400 text-red-700 rounded-lg px-4 py-3 max-w-md">
          <p className="font-semibold">Error loading locations</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Zoom level indicator (dev) */}
      {map && (
        <div className="absolute bottom-4 right-4 bg-white rounded shadow px-3 py-1 text-xs text-gray-600">
          Zoom: {map.getZoom().toFixed(1)} | Pins: {pins.length}
        </div>
      )}
    </div>
  );
}
