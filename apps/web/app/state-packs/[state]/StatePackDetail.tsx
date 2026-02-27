'use client';

/**
 * State Pack Detail Client Component
 * Build Document Step 11: Show details for a single state pack
 */

import type { StatePackDetail } from '@/lib/api';

interface StatePackDetailProps {
  pack: StatePackDetail;
}

export function StatePackDetail({ pack }: StatePackDetailProps) {
  /**
   * Get full state name from code
   */
  function getStateName(code: string): string {
    const stateNames: Record<string, string> = {
      AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
      CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
      HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
      KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
      MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
      MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
      NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
      OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
      SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
      VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
    };
    return stateNames[code] || code;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-8 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">{pack.state}</h1>
            <p className="text-xl text-gray-600 mt-1">{getStateName(pack.state)}</p>
          </div>
          <div className="text-6xl">📦</div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Version</p>
            <p className="text-2xl font-bold text-gray-900">
              {pack.version}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Last Updated</p>
            <p className="text-2xl font-bold text-gray-900">
              {new Date(pack.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="mt-4 bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Checksum</p>
          <p className="text-sm font-mono text-gray-900 break-all">{pack.checksum}</p>
        </div>

        {/* Download Button */}
        <div className="mt-6">
          <a
            href={pack.dataUrl}
            download={`${pack.state}.json`}
            className="block w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg text-center"
          >
            📥 Download {pack.state}.json
          </a>
        </div>
      </div>

      {/* What's Included */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">What's Included</h2>
        <div className="space-y-3 text-gray-700">
          <div className="flex items-start">
            <span className="text-green-600 font-bold mr-3">✓</span>
            <div>
              <strong>Locations:</strong> All approved rockhounding locations in {getStateName(pack.state)}, 
              including coordinates (lat/lon), difficulty, legal tags, access models, and kid-friendly status
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-green-600 font-bold mr-3">✓</span>
            <div>
              <strong>Rulesets:</strong> Legal information and regulations for locations in this state
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-green-600 font-bold mr-3">✓</span>
            <div>
              <strong>Materials:</strong> Types of rocks, minerals, and fossils found at each location
            </div>
          </div>
        </div>
      </div>

      {/* What's NOT Included */}
      <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">What's NOT Included</h2>
        <div className="space-y-3 text-gray-700">
          <div className="flex items-start">
            <span className="text-yellow-600 font-bold mr-3">✗</span>
            <div>
              <strong>Map tiles:</strong> This pack is vector-only. Use the online map for visual maps.
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-yellow-600 font-bold mr-3">✗</span>
            <div>
              <strong>Photos:</strong> Location photos are not included in offline packs.
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-yellow-600 font-bold mr-3">✗</span>
            <div>
              <strong>Private observations:</strong> Only public data is included.
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-yellow-600 font-bold mr-3">✗</span>
            <div>
              <strong>Staging data:</strong> Only approved locations are included.
            </div>
          </div>
        </div>
      </div>

      {/* How to Use */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">How to Use Offline</h2>
        <ol className="space-y-3 text-gray-700 list-decimal list-inside">
          <li>
            <strong>Download the pack:</strong> Click the download button above to save the JSON file
          </li>
          <li>
            <strong>Transfer to your device:</strong> Copy the file to your phone, tablet, or GPS device
          </li>
          <li>
            <strong>Use a compatible app:</strong> Open the JSON file in a mapping app that supports custom data layers
          </li>
          <li>
            <strong>Navigate offline:</strong> Use the location coordinates (lat/lon) to navigate without internet
          </li>
        </ol>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> State packs are updated nightly. Download fresh packs before each trip 
            to ensure you have the latest location data.
          </p>
        </div>
      </div>

      {/* JSON Structure Preview */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">JSON Structure</h2>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "state": "${pack.state}",
  "generated_at": "2024-01-01T00:00:00Z",
  "locations": [
    {
      "id": "uuid",
      "name": "Location Name",
      "lat": 37.7749,
      "lon": -122.4194,
      "legal_tag": "public_land",
      "access_model": "free_public",
      "difficulty": 3,
      "kid_friendly": true,
      "status": "approved"
    }
  ],
  "rulesets": [
    {
      "id": "uuid",
      "legal_tag": "public_land",
      "body": "Legal information..."
    }
  ],
  "materials": [
    {
      "id": "uuid",
      "name": "Quartz",
      "category": "minerals"
    }
  ],
  "metadata": {
    "version": "1.0",
    "location_count": 150,
    "ruleset_count": 5,
    "material_count": 20
  }
}`}
        </pre>
      </div>
    </div>
  );
}
