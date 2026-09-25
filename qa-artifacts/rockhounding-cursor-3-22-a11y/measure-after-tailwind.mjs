/**
 * Measure computed touch targets after Tailwind wiring.
 * Writes qa-artifacts/rockhounding-cursor-3-22-a11y/after-tailwind-measurements.json
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.A11Y_BASE_URL ?? 'http://127.0.0.1:3010';
const OUT_DIR = path.resolve('qa-artifacts/rockhounding-cursor-3-22-a11y');
const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1280x800', width: 1280, height: 800 },
];

async function measure(page, selector, label) {
  const loc = page.locator(selector).first();
  if ((await loc.count()) === 0) {
    return { label, selector, present: false };
  }
  const box = await loc.boundingBox();
  const styles = await loc.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      minHeight: cs.minHeight,
      minWidth: cs.minWidth,
      height: cs.height,
      width: cs.width,
      display: cs.display,
      position: cs.position,
      outline: cs.outline,
    };
  });
  return {
    label,
    selector,
    present: true,
    boundingBox: box,
    computed: styles,
    meets48:
      box != null && box.width >= 48 && box.height >= 48
        ? true
        : false,
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const results = {
    base: BASE,
    capturedAt: new Date().toISOString(),
    beforeReference: {
      glare: { w: 37, h: 19 },
      moreOptions: { w: 24, h: 20 },
      nav: { h: 20 },
      quickLog: { w: 160, h: 56 },
      source: 'qa-artifacts/rockhounding-cursor-3-22-a11y/RESULTS.md',
    },
    viewports: {},
  };

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/field`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(800);

    const glare = await measure(page, '[data-testid="high-glare-toggle"]', 'high-glare');
    const more = await measure(page, 'a[aria-label="More options"]', 'more-options');
    const fab = await measure(page, '[data-testid="field-quick-log-fab"]', 'quick-log');
    const gps = await measure(page, '[data-testid="field-gps-strip"]', 'gps-strip');

    // Tab focus check
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focusedOutline = await page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return null;
      const cs = getComputedStyle(el);
      return { tag: el.tagName, testId: el.getAttribute('data-testid'), outline: cs.outline, outlineWidth: cs.outlineWidth };
    });

    // Toggle high glare and sample a surface
    if (glare.present) {
      await page.locator('[data-testid="high-glare-toggle"]').click();
      await page.waitForTimeout(200);
    }
    const highGlareOn = await page.evaluate(() => document.documentElement.dataset.highGlare === 'on');

    // Check min-h-12 utility exists in stylesheet
    const utilityProbe = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.className = 'min-h-12 min-w-12';
      probe.style.position = 'absolute';
      probe.style.left = '-9999px';
      document.body.appendChild(probe);
      const cs = getComputedStyle(probe);
      const out = { minHeight: cs.minHeight, minWidth: cs.minWidth };
      probe.remove();
      return out;
    });

    results.viewports[vp.name] = {
      glare,
      more,
      fab,
      gps,
      focusedOutline,
      highGlareOn,
      utilityProbe,
    };

    await page.screenshot({
      path: path.join(OUT_DIR, `after-tailwind-field-${vp.name}.png`),
      fullPage: false,
    });

    // Home nav target
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(500);
    const navHome = await measure(
      page,
      'nav[aria-label="Main navigation"] a[href="/"]',
      'nav-home'
    );
    results.viewports[vp.name].navHome = navHome;

    await context.close();
  }

  const outPath = path.join(OUT_DIR, 'after-tailwind-measurements.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
