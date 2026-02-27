import type { ThinLocationPin } from '../types';
import {
  ACCESS_MODEL_COLORS,
  DIFFICULTY_COLORS,
  LEGAL_TAG_COLORS,
} from '../types';

/**
 * Pin popup component
 * Build Document UI Rules:
 * - Always show 3 badges: legal_tag, access_model, difficulty
 * - GRAY_AREA / RESEARCH_ONLY → Show "Observe/Verify Only" banner
 *
 * Does NOT show full detail (Step 7)
 */

interface PinPopupProps {
  pin: ThinLocationPin;
}

export function PinPopup({ pin }: PinPopupProps): JSX.Element {
  const isRestrictedCollecting =
    pin.legal_tag === 'GRAY_AREA' || pin.legal_tag === 'RESEARCH_ONLY';

  const legalColor =
    LEGAL_TAG_COLORS[pin.legal_tag as keyof typeof LEGAL_TAG_COLORS] || 'bg-gray-600';

  const accessColor =
    ACCESS_MODEL_COLORS[pin.access_model as keyof typeof ACCESS_MODEL_COLORS] ||
    'bg-gray-500';

  const difficultyColor = pin.difficulty
    ? DIFFICULTY_COLORS[pin.difficulty as keyof typeof DIFFICULTY_COLORS] || 'bg-gray-400'
    : 'bg-gray-300';

  return (
    <div className="min-w-[250px] max-w-[300px]">
      {/* Observe/Verify banner for restricted areas */}
      {isRestrictedCollecting && (
        <div className="mb-2 rounded bg-yellow-100 border border-yellow-400 p-2 text-sm">
          <p className="font-semibold text-yellow-800">⚠️ Observe/Verify Only</p>
          <p className="text-yellow-700 text-xs">
            Collection not confirmed legal. Research required.
          </p>
        </div>
      )}

      {/* Location name */}
      <h3 className="text-lg font-semibold mb-2">{pin.name}</h3>

      {/* 3 Required badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        {/* 1. Legal status badge */}
        <span
          className={`${legalColor} text-white text-xs px-2 py-1 rounded font-medium`}
        >
          {pin.legal_tag.replace(/_/g, ' ')}
        </span>

        {/* 2. Access model badge */}
        <span
          className={`${accessColor} text-white text-xs px-2 py-1 rounded font-medium`}
        >
          {pin.access_model.replace(/_/g, ' ')}
        </span>

        {/* 3. Difficulty badge */}
        <span
          className={`${difficultyColor} text-white text-xs px-2 py-1 rounded font-medium`}
        >
          {pin.difficulty ? `Difficulty ${pin.difficulty}` : 'Difficulty Unknown'}
        </span>
      </div>

      {/* Status and kid-friendly indicators */}
      <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
        <span className="capitalize">{pin.status.toLowerCase().replace('_', ' ')}</span>
        {pin.kid_friendly && (
          <>
            <span>•</span>
            <span>👨‍👩‍👧‍👦 Kid Friendly</span>
          </>
        )}
      </div>

      {/* View details link (Step 7) */}
      <a
        href={`/location/${pin.id}`}
        className="block w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium text-center"
      >
        View Full Details →
      </a>

      {/* Coordinates (for debugging) */}
      <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
        {pin.lat.toFixed(4)}, {pin.lon.toFixed(4)}
      </div>
    </div>
  );
}
