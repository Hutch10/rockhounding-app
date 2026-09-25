'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'rockhound-high-glare';

function applyHighGlare(enabled: boolean): void {
  document.documentElement.dataset.highGlare = enabled ? 'on' : 'off';
}

export function HighGlareBoot(): null {
  useEffect(() => {
    applyHighGlare(window.localStorage.getItem(STORAGE_KEY) === 'on');
  }, []);
  return null;
}

export function HighGlareToggle(): JSX.Element {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(document.documentElement.dataset.highGlare === 'on');
  }, []);

  function toggle(): void {
    const next = !enabled;
    applyHighGlare(next);
    window.localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off');
    setEnabled(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      data-testid="high-glare-toggle"
      className="min-h-12 min-w-12 rounded-full border border-white/20 bg-black/70 px-3 text-xs font-bold uppercase tracking-wide text-white"
    >
      {enabled ? 'Glare on' : 'Glare'}
    </button>
  );
}
