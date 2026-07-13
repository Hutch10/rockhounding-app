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
  const status = pin.access_status ?? 'unknown';

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

  // The actual visual pin
  const visualPin = document.createElement('div');
  const size = simplified ? 20 : 30;
  const ringWidth = simplified ? 2 : 3;

  visualPin.style.width = `${size}px`;
  visualPin.style.height = `${size}px`;
  visualPin.style.boxSizing = 'border-box';
  visualPin.style.boxShadow = '0 2px 6px rgba(0,0,0,0.45)';

  // Channel 1: Color
  visualPin.style.backgroundColor = getAccessFillColor(status);

  // Channel 2 & 3: Border Color and Style (Trust)
  if (trust === 'verified') {
    visualPin.style.border = `${ringWidth}px solid var(--mineral-teal, #0d9488)`;
  } else if (trust === 'community') {
    visualPin.style.border = `${ringWidth}px dashed var(--sandstone, #d97706)`;
  } else {
    visualPin.style.border = `${ringWidth}px dotted var(--slate-800, #1e293b)`;
  }

  // Channel 4: Shape (Access Status)
  if (status === 'prohibited') {
    visualPin.style.borderRadius = '2px'; // Square
  } else if (status === 'restricted' || status === 'caution') {
    visualPin.style.borderRadius = '8px'; // Rounded Rect
  } else {
    visualPin.style.borderRadius = '50%'; // Circle
  }

  el.appendChild(visualPin);
}

export function getAccessFillColor(accessStatus: string): string {
  return ACCESS_FILL[accessStatus] ?? ACCESS_FILL.unknown ?? '#475569';
}

export function getTrustRingColor(trustCategory: string): string {
  return TRUST_RING_COLORS[parseTrustCategory(trustCategory)];
}
