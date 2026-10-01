import type { MetadataRoute } from 'next';

/**
 * SEO robots for Rocky Atlas web release.
 * Disallow obvious internal/admin/API surfaces.
 * Host follows NEXT_PUBLIC_SITE_URL (localhost default) — rockyatlas.com is not
 * attached until OWNER_GATE_PRODUCTION.
 */
function siteHost(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return undefined;
  try {
    return new URL(raw).host;
  } catch {
    return undefined;
  }
}

export default function robots(): MetadataRoute.Robots {
  const host = siteHost();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/dashboard/', '/api/', '/auth/', '/offline'],
      },
    ],
    ...(host ? { host } : {}),
  };
}
