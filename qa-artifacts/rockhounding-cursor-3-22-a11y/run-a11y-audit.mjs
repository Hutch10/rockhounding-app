/**
 * Read-only a11y/responsive audit runner. Writes screenshots + JSON here only.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.AUDIT_BASE || 'http://localhost:3010';
const OUT = __dirname;

const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800, mobile: true },
  { name: '390x844', width: 390, height: 844, mobile: true },
  { name: '412x915', width: 412, height: 915, mobile: true },
  { name: '768x1024', width: 768, height: 1024, mobile: true },
  { name: '1280x800', width: 1280, height: 800, mobile: false },
];

const ROUTES = ['/', '/field', '/map', '/trips', '/collection', '/offline'];

async function measure(page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const meta = document.querySelector('meta[name="viewport"]');
    function sizeOf(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        top: Math.round(r.top),
        left: Math.round(r.left),
        right: Math.round(r.right),
        bottom: Math.round(r.bottom),
        visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none',
        clippedByViewport:
          r.width > 0 &&
          r.height > 0 &&
          (r.right > window.innerWidth + 2 ||
            r.bottom > window.innerHeight + 2 ||
            r.left < -2 ||
            r.top < -2),
        text: (el.getAttribute('aria-label') || el.innerText || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 80),
        tag: el.tagName.toLowerCase(),
        href: el.getAttribute?.('href') || null,
      };
    }

    const glare = document.querySelector('[data-testid="high-glare-toggle"]');
    const quickLog = document.querySelector('[data-testid="field-quick-log-fab"]');
    const moreOpts = document.querySelector('a[aria-label="More options"]');
    const fieldNavCandidates = [
      ...document.querySelectorAll(
        'nav a, [data-testid="main-nav"] a, [data-testid="bottom-nav"] a, header a, a[href="/field"], a[href="/map"], a[href="/trips"], a[href="/collection"], a[href="/"]'
      ),
    ];
    const fieldNav = fieldNavCandidates.map(sizeOf).filter(Boolean);

    const tripLinks = [...document.querySelectorAll('a')]
      .filter((el) => {
        const href = el.getAttribute('href') || '';
        const text = (el.innerText || '').toLowerCase();
        return href.includes('/trips') || text.includes('trip') || text.includes('prepare');
      })
      .map(sizeOf);

    const under48 = [];
    for (const [k, el] of [
      ['glare', glare],
      ['quickLog', quickLog],
      ['moreOptions', moreOpts],
    ]) {
      const s = sizeOf(el);
      if (s && s.visible && (s.w < 48 || s.h < 48)) under48.push({ k, ...s });
    }
    for (const s of [...fieldNav, ...tripLinks]) {
      if (s && s.visible && (s.w < 48 || s.h < 48)) {
        under48.push({ k: `link:${s.text || s.href}`, ...s });
      }
    }

    const bodyText = document.body ? document.body.innerText : '';
    const mapUnavailable = bodyText.match(
      /Map unavailable:[^\n]+|Map configuration required/
    );

    const longLabels = [...document.querySelectorAll('p, span, li, h1, h2, h3, label, button, a')]
      .filter((el) => ((el.innerText || '').trim().length > 45))
      .slice(0, 20)
      .map((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const lh = parseFloat(cs.lineHeight) || 16;
        return {
          text: el.innerText.replace(/\s+/g, ' ').trim().slice(0, 120),
          w: Math.round(r.width),
          h: Math.round(r.height),
          whiteSpace: cs.whiteSpace,
          overflow: cs.overflow,
          textOverflow: cs.textOverflow,
          wraps: Math.round(r.height) > lh * 1.6,
          truncated: cs.textOverflow === 'ellipsis' && cs.overflow === 'hidden',
        };
      });

    const permissionSummary = document.querySelector(
      '[data-testid="field-permission-summary"], [class*="permission"]'
    );
    const tripPrep = [...document.querySelectorAll('h1,h2,h3,p,section')].find((el) =>
      /prepar/i.test(el.innerText || '')
    );

    return {
      url: location.href,
      title: document.title,
      pathname: location.pathname,
      viewportMeta: meta ? meta.getAttribute('content') : null,
      hasMaximumScale1: meta
        ? /maximum-scale\s*=\s*1(\.0)?(\s|,|$)/i.test(meta.getAttribute('content') || '')
        : null,
      inner: { w: window.innerWidth, h: window.innerHeight },
      clientWidth: de.clientWidth,
      scrollWidth: de.scrollWidth,
      overflowX: de.scrollWidth > de.clientWidth + 1,
      highGlarePresent: !!glare,
      primary: {
        glare: sizeOf(glare),
        quickLog: sizeOf(quickLog),
        moreOptions: sizeOf(moreOpts),
      },
      fieldNav,
      tripLinks: tripLinks.slice(0, 12),
      under48,
      mapMsg: mapUnavailable ? mapUnavailable[0] : null,
      mapBodyExact: (() => {
        const m = bodyText.match(
          /Map unavailable: set NEXT_PUBLIC_MAPBOX_TOKEN in apps\/web\/\.env\.local and restart the dev server\./
        );
        return m ? m[0] : null;
      })(),
      longLabels,
      permissionSummaryPresent: !!permissionSummary,
      tripPrepPresent: !!tripPrep,
      bodySnippet: bodyText.replace(/\s+/g, ' ').trim().slice(0, 500),
      redirectedToLogin: location.pathname.startsWith('/login'),
    };
  });
}

function defectsFrom(m, route) {
  const defects = [];
  if (m.redirectedToLogin) {
    defects.push(`AUTH_REDIRECT: middleware sent ${route} to ${m.pathname}${locationSearch(m.url)}`);
  }
  if (m.overflowX) {
    defects.push(`OVERFLOW_X: scrollWidth ${m.scrollWidth} > clientWidth ${m.clientWidth}`);
  }
  if (m.hasMaximumScale1) {
    defects.push(`ZOOM_BLOCK: viewport meta has maximum-scale=1 (${m.viewportMeta})`);
  }
  for (const t of m.under48 || []) {
    defects.push(`TARGET_<48: ${t.k} measured ${t.w}x${t.h} ("${t.text}")`);
  }
  for (const key of ['glare', 'quickLog', 'moreOptions']) {
    const p = m.primary?.[key];
    if (p?.clippedByViewport) {
      defects.push(`CLIPPED: primary ${key} ${p.w}x${p.h} at (${p.left},${p.top})`);
    }
  }
  if (route === '/field' && !m.redirectedToLogin && !m.highGlarePresent) {
    defects.push('MISSING: High-Glare toggle not present on /field');
  }
  // truncated long labels that should wrap
  for (const l of m.longLabels || []) {
    if (l.truncated && /permission|prepar|access|collecting|unavailable/i.test(l.text)) {
      defects.push(`LABEL_TRUNCATED: "${l.text.slice(0, 80)}"`);
    }
  }
  return defects;
}

function locationSearch(url) {
  try {
    return new URL(url).search || '';
  } catch {
    return '';
  }
}

function passFail(defects, m, route) {
  // Mapbox config message is evidence, not failure
  const hard = defects.filter((d) => !d.startsWith('MAPBOX'));
  if (m.redirectedToLogin && ['/field', '/map', '/trips', '/collection', '/'].includes(route)) {
    return { status: 'BLOCKED', note: 'redirected to /login' };
  }
  if (hard.length === 0) return { status: 'PASS', note: '' };
  return { status: 'FAIL', note: hard.join('; ') };
}

const results = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

// focus-visible check once on /field at 390
let focusVisibleResult = null;

for (const vp of VIEWPORTS) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  for (const route of ROUTES) {
    const name = `${route === '/' ? 'home' : route.slice(1)}-${vp.name}`;
    const shot = path.join(OUT, `${name}.png`);
    let m;
    let navError = null;
    try {
      const resp = await page.goto(`${BASE}${route}`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      });
      await page.waitForTimeout(800);
      m = await measure(page);
      m.httpStatus = resp?.status() ?? null;
      await page.screenshot({ path: shot, fullPage: false });
      m.screenshot = path.basename(shot);
    } catch (err) {
      navError = String(err?.message || err);
      m = {
        url: `${BASE}${route}`,
        pathname: route,
        overflowX: null,
        under48: [],
        redirectedToLogin: false,
        error: navError,
      };
    }

    const defects = m.error ? [`NAV_ERROR: ${m.error}`] : defectsFrom(m, route);
    if (m.mapBodyExact) {
      m.mapboxEvidence = m.mapBodyExact;
    } else if (m.mapMsg) {
      m.mapboxEvidence = m.mapMsg;
    }

    const verdict = m.error
      ? { status: 'ERROR', note: m.error }
      : passFail(defects, m, route);

    results.push({
      viewport: vp.name,
      route,
      status: verdict.status,
      defects,
      mapboxEvidence: m.mapboxEvidence || null,
      viewportMeta: m.viewportMeta ?? null,
      hasMaximumScale1: m.hasMaximumScale1 ?? null,
      overflowX: m.overflowX,
      highGlarePresent: m.highGlarePresent ?? null,
      primary: m.primary ?? null,
      under48: m.under48 ?? [],
      redirectedToLogin: m.redirectedToLogin ?? false,
      finalUrl: m.url,
      screenshot: m.screenshot || null,
      bodySnippet: m.bodySnippet || null,
      longLabelsSample: (m.longLabels || []).slice(0, 5),
    });

    // focus-visible sample once
    if (
      !focusVisibleResult &&
      vp.name === '390x844' &&
      route === '/field' &&
      !m.redirectedToLogin &&
      !m.error
    ) {
      try {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(150);
        await page.keyboard.press('Tab');
        await page.waitForTimeout(150);
        focusVisibleResult = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) {
            return { focused: false, tag: null, outline: null };
          }
          const cs = getComputedStyle(el);
          return {
            focused: true,
            tag: el.tagName.toLowerCase(),
            text: (el.getAttribute('aria-label') || el.innerText || '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 60),
            outline: cs.outline,
            outlineWidth: cs.outlineWidth,
            outlineStyle: cs.outlineStyle,
            outlineColor: cs.outlineColor,
            hasFocusVisibleClass: el.classList.contains('focus-visible') ||
              el.matches?.(':focus-visible') === true,
          };
        });
        await page.screenshot({
          path: path.join(OUT, 'focus-tab-field-390x844.png'),
          fullPage: false,
        });
      } catch (e) {
        focusVisibleResult = { error: String(e?.message || e) };
      }
    }
  }
}

await browser.close();

const summary = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  e2eBypassNote:
    'Server started with E2E_BYPASS_AUTH=1 after unauthenticated middleware redirected protected routes to /login.',
  focusVisible: focusVisibleResult,
  sourceChecks: {
    activeViewportExport:
      'apps/web/app/layout.tsx exports viewport without maximumScale (width device-width, initialScale 1, themeColor).',
    legacySrcLayout:
      'apps/web/src/app/layout.tsx still embeds maximum-scale=1 in metadata.viewport string (likely unused if app/ is the active App Router root).',
    reducedMotion:
      'apps/web/app/globals.css defines @media (prefers-reduced-motion: reduce) block (lines ~182-191).',
    focusVisibleCss: 'apps/web/app/globals.css defines :focus-visible outline 3px solid #f59e0b.',
  },
  results,
};

fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ count: results.length, focusVisible: focusVisibleResult }, null, 2));
for (const r of results) {
  console.log(`${r.viewport}\t${r.route}\t${r.status}\t${r.defects.join(' | ') || 'ok'}`);
}
