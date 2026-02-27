'use client';

/**
 * Location Detail Client Component
 * Build Document: Legal gating UI + full detail display
 *
 * Features:
 * - 3 badges (legal_tag, access_model, difficulty)
 * - Legal gating banner for GRAY_AREA/RESEARCH_ONLY
 * - "Why?" link to primary ruleset
 * - Materials, rulesets, sources lists
 * - Description and full location details
 * - No map rendering (map is Step 6 only)
 * - Disables collection UI for restricted areas
 */

import { LegalTag } from '@rockhounding/shared';
import type { FullLocationDetail } from '@/app/api/locations/[id]/types';

// Badge colors (matching map pins)
const LEGAL_TAG_COLORS: Record<LegalTag, string> = {
  [LegalTag.LEGAL_PUBLIC]: 'bg-green-600 text-white',
  [LegalTag.LEGAL_FEE_SITE]: 'bg-blue-600 text-white',
  [LegalTag.LEGAL_CLUB_SUPERVISED]: 'bg-yellow-600 text-white',
  [LegalTag.GRAY_AREA]: 'bg-gray-600 text-white',
  [LegalTag.RESEARCH_ONLY]: 'bg-red-600 text-white',
};

const LEGAL_TAG_LABELS: Record<LegalTag, string> = {
  [LegalTag.LEGAL_PUBLIC]: 'Legal Public',
  [LegalTag.LEGAL_FEE_SITE]: 'Legal Fee Site',
  [LegalTag.LEGAL_CLUB_SUPERVISED]: 'Legal Club Supervised',
  [LegalTag.GRAY_AREA]: 'Gray Area',
  [LegalTag.RESEARCH_ONLY]: 'Research Only',
};

interface LocationDetailClientProps {
  location: FullLocationDetail;
}

export function LocationDetailClient({ location }: LocationDetailClientProps) {
  // Legal gating: Check if location is restricted
  const isRestricted =
    location.legal_tag === LegalTag.GRAY_AREA ||
    location.legal_tag === LegalTag.RESEARCH_ONLY;

  // Find primary ruleset for "Why?" link
  const primaryRuleset = location.rulesets.find(
    (r) => r.id === location.primary_ruleset_id
  );

  return (
    <div className="space-y-6">
      {/* Legal Gating Banner */}
      {isRestricted && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-bold text-yellow-800">
                ⚠️ Observe/Verify Only
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                This location has a{' '}
                <strong>{LEGAL_TAG_LABELS[location.legal_tag]}</strong> status.
                Collecting samples may be prohibited or require special permission.
                Always verify current regulations before collecting.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3 Badges */}
      <div className="flex flex-wrap gap-3">
        {/* Badge 1: Legal Status */}
        <span
          className={`px-4 py-2 rounded-full text-sm font-semibold ${LEGAL_TAG_COLORS[location.legal_tag]}`}
        >
          {LEGAL_TAG_LABELS[location.legal_tag]}
        </span>

        {/* Badge 2: Access Model */}
        <span className="px-4 py-2 rounded-full text-sm font-semibold bg-purple-100 text-purple-800">
          {location.access_model}
        </span>

        {/* Badge 3: Difficulty */}
        <span className="px-4 py-2 rounded-full text-sm font-semibold bg-orange-100 text-orange-800">
          Difficulty: {'★'.repeat(location.difficulty)}
          {'☆'.repeat(5 - location.difficulty)}
        </span>

        {/* Kid Friendly Badge */}
        {location.kid_friendly && (
          <span className="px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800">
            Kid Friendly
          </span>
        )}
      </div>

      {/* Description */}
      {location.description && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{location.description}</p>
        </div>
      )}

      {/* Coordinates */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Location</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold text-gray-600">Latitude:</span>{' '}
            <span className="text-gray-900">{location.lat.toFixed(6)}°</span>
          </div>
          <div>
            <span className="font-semibold text-gray-600">Longitude:</span>{' '}
            <span className="text-gray-900">{location.lon.toFixed(6)}°</span>
          </div>
        </div>
      </div>

      {/* Materials */}
      {location.materials.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Materials Found Here
          </h2>
          {isRestricted && (
            <p className="text-sm text-yellow-700 mb-3 italic">
              Note: Collecting these materials may be restricted at this location.
            </p>
          )}
          <ul className="grid grid-cols-2 gap-2">
            {location.materials.map((material) => (
              <li
                key={material.id}
                className="flex items-center text-gray-700 text-sm"
              >
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                <span className="font-medium">{material.name}</span>
                <span className="text-gray-500 ml-2 text-xs">
                  ({material.category})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rulesets & Legal Information */}
      {location.rulesets.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Legal Regulations
          </h2>

          {/* Primary Ruleset with "Why?" Link */}
          {primaryRuleset && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-blue-900">
                    {primaryRuleset.name}
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    {primaryRuleset.authority}
                  </p>
                  {primaryRuleset.summary && (
                    <p className="text-sm text-gray-700 mt-2">
                      {primaryRuleset.summary}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-blue-600 font-semibold">
                      PRIMARY RULESET
                    </span>
                    <span className="text-xs text-gray-500">
                      (Legal Confidence: {location.legal_confidence}%)
                    </span>
                  </div>
                </div>
                {primaryRuleset.url && (
                  <a
                    href={primaryRuleset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold whitespace-nowrap"
                  >
                    Why? →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Additional Rulesets */}
          {location.rulesets.filter((r) => r.id !== location.primary_ruleset_id)
            .length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">
                Additional Regulations:
              </h3>
              <ul className="space-y-3">
                {location.rulesets
                  .filter((r) => r.id !== location.primary_ruleset_id)
                  .map((ruleset) => (
                    <li key={ruleset.id} className="border-l-2 border-gray-300 pl-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {ruleset.name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {ruleset.authority}
                          </p>
                          {ruleset.summary && (
                            <p className="text-sm text-gray-700 mt-1">
                              {ruleset.summary}
                            </p>
                          )}
                        </div>
                        {ruleset.url && (
                          <a
                            href={ruleset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium whitespace-nowrap"
                          >
                            Learn More →
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Sources */}
      {location.sources.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Data Sources & Provenance
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm mb-3">
              <span className="font-semibold text-gray-600">Source Tier:</span>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded font-medium">
                {location.source_tier}
              </span>
              {location.verification_date && (
                <span className="text-gray-500">
                  Verified: {new Date(location.verification_date).toLocaleDateString()}
                </span>
              )}
            </div>
            <ul className="space-y-2">
              {location.sources.map((source) => (
                <li key={source.id} className="text-sm text-gray-700">
                  <div className="flex items-start">
                    <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-2 mt-1.5"></span>
                    <div className="flex-1">
                      <p>{source.citation}</p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        {source.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View Source →
                          </a>
                        )}
                        {source.date_accessed && (
                          <span>
                            Accessed: {new Date(source.date_accessed).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Status & Metadata */}
      <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-600">
        <div className="flex justify-between items-center">
          <span>
            Status: <strong className="text-gray-900">{location.status}</strong>
          </span>
          <span>Location ID: {location.id}</span>
        </div>
      </div>

      {/* Disabled Collection UI for Restricted Areas */}
      {isRestricted && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-2">
            <strong>Collection Features Disabled</strong>
          </p>
          <p className="text-sm text-gray-500">
            Due to this location's <strong>{LEGAL_TAG_LABELS[location.legal_tag]}</strong> status,
            sample collection features are disabled. This location is for observation and research only.
          </p>
        </div>
      )}
    </div>
  );
}
