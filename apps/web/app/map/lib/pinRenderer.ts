import type { LocationV1 } from '@rockhounding/shared';
import { isFeeMineFromMetadata } from '@rockhounding/shared/fee-site-support';

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

export type PinMarkerShape = 'diamond-fee-mine' | 'square' | 'rounded-rect' | 'circle';

/** Shape channel — fee mines use diamond so distinction is not color alone. */
export function resolvePinMarkerShape(pin: LocationV1): PinMarkerShape {
  if (isFeeMineFromMetadata((pin.metadata ?? {}) as Record<string, unknown>)) {
    return 'diamond-fee-mine';
  }
  const status = pin.access_status ?? 'unknown';
  if (status === 'prohibited') return 'square';
  if (status === 'restricted' || status === 'caution') return 'rounded-rect';
  return 'circle';
}

export function buildFeeMinePinAriaLabel(pin: LocationV1): string {
  const status = pin.access_status ?? 'unknown';
  if (isFeeMineFromMetadata((pin.metadata ?? {}) as Record<string, unknown>)) {
    return `${pin.name}. Fee mine / pay-to-dig. Recorded access status ${status}. Mapping is not collecting permission or open status.`;
  }
  return `${pin.name}. Recorded access status ${status}. This pin is not collecting permission.`;
}

/**
 * GIS-003: Pin fill = access_status; ring = trust_category.
 * Fee mines add a diamond shape channel (not color alone).
 */
export function applyPinStyles(el: HTMLElement, pin: LocationV1, options: PinStyleOptions): void {
  const trust = parseTrustCategory(pin.metadata?.trust_category);
  const status = pin.access_status ?? 'unknown';
  const feeMine = isFeeMineFromMetadata((pin.metadata ?? {}) as Record<string, unknown>);
  const shape = resolvePinMarkerShape(pin);

  const simplified = options.simplified === true || options.zoom < 10;

  // 48px minimum touch target
  el.className = 'rockhound-pin';
  el.style.width = '48px';
  el.style.height = '48px';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.cursor = 'pointer';
  el.dataset.trustCategory = trust;
  el.dataset.accessStatus = status;
  el.dataset.siteType = feeMine ? 'FEE_MINE' : 'OTHER';
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  el.setAttribute('aria-label', buildFeeMinePinAriaLabel(pin));

  const visualPin = document.createElement('div');
  const size = simplified ? 20 : 30;
  const ringWidth = simplified ? 2 : 3;

  visualPin.style.width = `${size}px`;
  visualPin.style.height = `${size}px`;
  visualPin.style.boxSizing = 'border-box';
  visualPin.style.boxShadow = '0 2px 6px rgba(0,0,0,0.45)';
  visualPin.style.backgroundColor = getAccessFillColor(status);

  if (trust === 'verified') {
    visualPin.style.border = `${ringWidth}px solid var(--mineral-teal, #0d9488)`;
  } else if (trust === 'community') {
    visualPin.style.border = `${ringWidth}px dashed var(--sandstone, #d97706)`;
  } else {
    visualPin.style.border = `${ringWidth}px dotted var(--slate-800, #1e293b)`;
  }

  if (shape === 'diamond-fee-mine') {
    visualPin.style.borderRadius = '2px';
    visualPin.style.transform = 'rotate(45deg)';
    visualPin.dataset.markerShape = 'diamond-fee-mine';
  } else if (shape === 'square') {
    visualPin.style.borderRadius = '2px';
  } else if (shape === 'rounded-rect') {
    visualPin.style.borderRadius = '8px';
  } else {
    visualPin.style.borderRadius = '50%';
  }

  el.appendChild(visualPin);
}

export function getAccessFillColor(accessStatus: string): string {
  return ACCESS_FILL[accessStatus] ?? ACCESS_FILL.unknown ?? '#475569';
}

export function getTrustRingColor(trustCategory: string): string {
  return TRUST_RING_COLORS[parseTrustCategory(trustCategory)];
}
