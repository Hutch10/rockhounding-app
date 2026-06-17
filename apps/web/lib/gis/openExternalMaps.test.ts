import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { buildExternalMapsUrl, openExternalMaps } from './openExternalMaps';

describe('GIS-007 / CB-E4 openExternalMaps', () => {
  const openMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('window', { open: openMock });
    openMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('buildExternalMapsUrl uses fuzzy coords only', () => {
    const url = buildExternalMapsUrl({ lat: 35.51, lon: -120.51 }, 'desktop');
    expect(url).toContain('35.51');
    expect(url).toContain('-120.51');
    expect(url).not.toContain('35.5,-120.5');
  });

  it('does not open when fuzzy location missing', () => {
    openExternalMaps(null);
    expect(openMock).not.toHaveBeenCalled();
  });

  it('opens maps with fuzzy coordinates', () => {
    openExternalMaps({ lat: 35.51, lon: -120.51 });
    expect(openMock).toHaveBeenCalledWith(
      expect.stringContaining('35.51'),
      '_blank',
      'noopener,noreferrer'
    );
  });
});
