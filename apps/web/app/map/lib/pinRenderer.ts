import type { LocationV1 } from '@rockhounding/shared';

import { parseTrustCategory, TRUST_RING_COLORS } from '@/lib/trust/types';

/** Access fill colors — sunlight-readable */
const ACCESS_FILL: Record<string, string> = {
  allowed: '#059669',
  caution: '#d97706',
  restricted: '#ea580c',
  prohibited: '#e11d48',
  unknown: '#475569',
};

export interface PinStyleOptions {
  zoom: number;
  simplified?: boolean;
}

/**
 * GIS-003: Pin fill = access_status; ring = trust_category.
 */
export function applyPinStyles(el: HTMLElement, pin: LocationV1, options: PinStyleOptions): void {
  const trust = parseTrustCategory(pin.metadata?.trust_category);
  const ringColor = TRUST_RING_COLORS[trust];
  const status = pin.access_status ?? 'unknown';
  const fillColor: string = ACCESS_FILL[status] ?? ACCESS_FILL.unknown ?? '#475569';

  const simplified = options.simplified === true || options.zoom < 10;
  const size = simplified ? 20 : 30;
  const ringWidth = simplified ? 2 : 3;

  el.className = 'rockhound-pin';
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = '50%';
  el.style.cursor = 'pointer';
  el.style.backgroundColor = fillColor;
  el.style.border = `${ringWidth}px solid ${ringColor}`;
  el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.45)';
  el.style.boxSizing = 'border-box';
  el.dataset.trustCategory = trust;
  el.dataset.accessStatus = status;
}

export function getAccessFillColor(accessStatus: string): string {
  return ACCESS_FILL[accessStatus] ?? ACCESS_FILL.unknown ?? '#475569';
}

export function getTrustRingColor(trustCategory: string): string {
  return TRUST_RING_COLORS[parseTrustCategory(trustCategory)];
}
