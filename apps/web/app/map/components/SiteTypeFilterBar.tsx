'use client';

import { SITE_TYPE_FILTER_OPTIONS, SiteType } from '@rockhounding/shared/fee-site-support';

interface SiteTypeFilterBarProps {
  selected: SiteType[];
  onChange: (next: SiteType[]) => void;
}

/**
 * Explore/map site-class filter. Compatible with Free/Public, Permit, Fee/Pay-to-Dig, etc.
 * Does not create a second map.
 */
export function SiteTypeFilterBar({ selected, onChange }: SiteTypeFilterBarProps): JSX.Element {
  const toggle = (siteType: SiteType): void => {
    if (selected.includes(siteType)) {
      onChange(selected.filter((s) => s !== siteType));
    } else {
      onChange([...selected, siteType]);
    }
  };

  return (
    <div
      className="flex flex-wrap gap-2"
      data-testid="site-type-filter-bar"
      role="group"
      aria-label="Site type filters"
    >
      {SITE_TYPE_FILTER_OPTIONS.map((opt) => {
        const active = selected.includes(opt.siteType);
        return (
          <button
            key={opt.siteType}
            type="button"
            data-testid={`site-type-filter-${opt.siteType}`}
            aria-pressed={active}
            onClick={() => toggle(opt.siteType)}
            className={`min-h-12 min-w-12 px-3 py-2 rounded-xl text-xs font-bold border ${
              active
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-800 border-stone-300'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
