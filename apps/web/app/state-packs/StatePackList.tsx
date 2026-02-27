'use client';

/**
 * State Pack List Client Component
 * Build Document Step 11: Display state packs with download buttons
 */

import Link from 'next/link';
import type { StatePackSummary } from '@/lib/api';

interface StatePackListProps {
  packs: StatePackSummary[];
}

export function StatePackList({ packs }: StatePackListProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {packs.map((pack) => (
        <div
          key={pack.state}
          className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-lg transition-shadow"
        >
          {/* State Info */}
          <div className="mb-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {pack.state}
            </h3>
            <p className="text-gray-600">{getStateName(pack.state)}</p>
          </div>

          {/* Metadata */}
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <div className="flex justify-between">
              <span>Version:</span>
              <span className="font-medium text-gray-900">
                {pack.version}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Updated:</span>
              <span className="font-medium text-gray-900">
                {new Date(pack.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Link
              href={`/state-packs/${pack.state}`}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm text-center"
            >
              View Details
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
