import type { MetadataRoute } from 'next';

/**
 * Public sitemap for Rocky Atlas web release.
 * Uses NEXT_PUBLIC_SITE_URL (or localhost) — do not hardcode rockyatlas.com as live.
 * Domain cutover remains OWNER_GATE_PRODUCTION only.
 */
const LAUNCH_STATES = ['nc', 'ar', 'ca', 'mt', 'me'] as const;

function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteOrigin();
  const now = new Date();

  const staticPaths = [
    '/',
    '/map',
    '/fee-mines',
    '/partner',
    '/login',
    '/field',
    '/finds',
    '/offline',
  ] as const;

  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'weekly' : 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }));

  for (const state of LAUNCH_STATES) {
    entries.push(
      {
        url: `${base}/state/${state}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      },
      {
        url: `${base}/fee-mines/${state}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      }
    );
  }

  return entries;
}
