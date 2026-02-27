import type { Metadata } from 'next';

import { MapClient } from './MapClient';
import type { MapConfig } from './types';

/**
 * Map page - Server component wrapper
 * Build Document: Show rockhounding locations on a map with thin pins
 *
 * Features:
 * - Loads only thin pins (no full detail)
 * - Progressive disclosure by zoom level
 * - Legal gating UI
 */

export const metadata: Metadata = {
  title: 'Map - Rockhounding Locations',
  description: 'Interactive map of rockhounding locations across the United States',
};

const MAP_CONFIG: MapConfig = {
  initialCenter: [-98.5795, 39.8283], // Center of continental US
  initialZoom: 4,
  minZoom: 3,
  maxZoom: 18,
};

export default function MapPage(): JSX.Element {
  return (
    <main className="h-screen w-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 text-white px-6 py-4 shadow-lg z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Rockhounding Map</h1>
            <p className="text-sm text-gray-300">
              Discover legal rockhounding locations nationwide
            </p>
          </div>
          <div className="text-sm text-gray-300">
            <p className="mb-1">
              <span className="inline-block w-3 h-3 rounded-full bg-green-600 mr-2"></span>
              Legal Public Land
            </p>
            <p className="mb-1">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-600 mr-2"></span>
              Fee Site
            </p>
            <p>
              <span className="inline-block w-3 h-3 rounded-full bg-gray-600 mr-2"></span>
              Gray Area / Research
            </p>
          </div>
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        <MapClient config={MAP_CONFIG} />
      </div>
    </main>
  );
}
