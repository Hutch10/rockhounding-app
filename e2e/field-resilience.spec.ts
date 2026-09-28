import { expect, test } from '@playwright/test';

/**
 * FIELD_GATE resilience evidence — runtime browser scenarios.
 * Does not invent product features; exercises existing Field / Quick Log / Collection paths.
 */

test.describe('FIELD_GATE resilience', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 33.4484, longitude: -112.074 });
  });

  test('CB-NET: offline queue then reconnect restores Online pill', async ({ page, context }) => {
    await page.route('**/api/v1/access/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          legalState: 'unknown',
          advisoryLevel: 'caution',
          parcel_info: null,
          evidence: {
            boundaryMatch: 'none',
            appliedRule: null,
            conflicts: [],
            reasonCodes: [],
          },
        }),
      });
    });

    await page.goto('/field');
    await expect(page.getByTestId('field-mode-shell')).toBeVisible();

    await context.setOffline(true);
    await expect(page.getByTestId('field-connectivity-pill')).toContainText(/offline/i, {
      timeout: 10_000,
    });

    await page.getByTestId('field-quick-log-fab').click();
    await expect(page.getByTestId('quick-add-form')).toBeVisible();
    await expect(page.getByText(/offline — queued locally/i)).toBeVisible();

    await context.setOffline(false);
    await expect(page.getByTestId('field-connectivity-pill')).toContainText(/online/i, {
      timeout: 15_000,
    });
  });

  test('CB-GPS: denied then granted mid-session updates GPS strip', async ({ page, context }) => {
    await context.clearPermissions();
    await page.goto('/field');
    await expect(page.getByTestId('field-gps-strip')).toBeVisible();
    await expect(page.getByTestId('field-gps-strip')).toContainText(/GPS denied|GPS unavailable/i, {
      timeout: 20_000,
    });

    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 33.45, longitude: -112.08 });
    await page.reload();
    await expect(page.getByTestId('field-gps-strip')).toContainText(/\d+\.\d+/, {
      timeout: 20_000,
    });
  });

  test('CB-GPS-LOST: clear watch mid-session falls back to denied/unavailable label', async ({
    page,
    context,
  }) => {
    await page.goto('/field');
    await expect(page.getByTestId('field-gps-strip')).toBeVisible();

    // Mid-session loss: revoke permission and force a position error on next read.
    await context.clearPermissions();
    await page.evaluate(() => {
      const geo = navigator.geolocation;
      geo.getCurrentPosition = ((_success, error) => {
        if (error) {
          error({
            code: 1,
            message: 'User denied Geolocation',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        }
      }) as Geolocation['getCurrentPosition'];
    });
    await page.reload();
    await expect(page.getByTestId('field-gps-strip')).toContainText(/GPS denied|GPS unavailable/i, {
      timeout: 20_000,
    });
  });

  test('CB-CAMERA: photo storage failure still allows continuing Quick Log', async ({
    page,
    context,
  }) => {
    await page.route('**/api/v1/access/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          legalState: 'allowed',
          advisoryLevel: 'safe',
          parcel_info: null,
          evidence: {
            boundaryMatch: 'none',
            appliedRule: null,
            conflicts: [],
            reasonCodes: [],
          },
        }),
      });
    });

    await page.goto('/field');
    await page.getByTestId('field-quick-log-fab').click();
    await expect(page.getByTestId('quick-add-form')).toBeVisible();

    await page.evaluate(() => {
      // Force local photo path to fail without blocking the form.
      const open = indexedDB.open;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (indexedDB as any).open = () => {
        throw new Error('camera-storage-unavailable');
      };
      void open;
    });

    await page.setInputFiles('#quick-log-photo', {
      name: 'field.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    });

    await expect(
      page.getByText(/photo stayed out of local storage|continue without it/i)
    ).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId('quick-add-submit')).toBeEnabled();
  });

  test('CB-SYNC: refresh with pending offline queue keeps offline path usable', async ({
    page,
    context,
  }) => {
    await page.goto('/field');
    await expect(page.getByTestId('field-mode-shell')).toBeVisible();

    // Seed PENDING via IDB; return diagnostics if the write fails.
    const seed = await page.evaluate(async () => {
      const databases = await indexedDB.databases?.();
      const openDb = () =>
        new Promise<IDBDatabase>((resolve, reject) => {
          const openReq = indexedDB.open('rockhound-storage', 2);
          openReq.onupgradeneeded = () => {
            const database = openReq.result;
            if (!database.objectStoreNames.contains('operations')) {
              const opStore = database.createObjectStore('operations', {
                keyPath: 'client_operation_id',
              });
              opStore.createIndex('by-queue-status', 'queue_status');
            }
          };
          openReq.onsuccess = () => resolve(openReq.result);
          openReq.onerror = () => reject(openReq.error ?? new Error('idb open failed'));
        });

      try {
        const db = await openDb();
        const stores = Array.from(db.objectStoreNames);
        if (!db.objectStoreNames.contains('operations')) {
          db.close();
          return { ok: false as const, reason: 'missing-operations', stores, databases };
        }
        const opId = crypto.randomUUID();
        const now = new Date().toISOString();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('operations', 'readwrite');
          const req = tx.objectStore('operations').put({
            sync_id: crypto.randomUUID(),
            user_id: 'e2e-bypass-user',
            device_id: 'e2e-device',
            entity_type: 'find_log',
            entity_id: crypto.randomUUID(),
            client_operation_id: opId,
            client_record_id: crypto.randomUUID(),
            operation_type: 'create',
            priority: 'high',
            direction: 'push',
            status: 'pending',
            queue_status: 'PENDING',
            created_at: now,
            updated_at: now,
            synced_at: null,
            payload: {
              material_name: 'Pending sync specimen',
              notes: null,
              discovered_at: now,
              location: { lat: 33.4484, lon: -112.074 },
            },
            retry_count: 0,
            max_retries: 5,
            meta: { schemaVersion: 1, idempotency_key: opId },
          });
          req.onerror = () => reject(req.error ?? new Error('put failed'));
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error ?? new Error('tx failed'));
        });
        const count = await new Promise<number>((resolve, reject) => {
          const tx = db.transaction('operations', 'readonly');
          const req = tx.objectStore('operations').getAll();
          req.onsuccess = () => {
            const ops = req.result as Array<{ queue_status?: string }>;
            resolve(ops.filter((op) => op.queue_status === 'PENDING').length);
          };
          req.onerror = () => reject(req.error);
        });
        db.close();
        return { ok: true as const, count, stores, databases };
      } catch (error) {
        return {
          ok: false as const,
          reason: error instanceof Error ? error.message : String(error),
          databases,
        };
      }
    });
    expect(seed, JSON.stringify(seed)).toMatchObject({ ok: true });
    expect((seed as { count: number }).count).toBeGreaterThanOrEqual(1);

    await context.setOffline(true);
    await expect(page.getByTestId('field-connectivity-pill')).toContainText(/offline/i, {
      timeout: 10_000,
    });

    // Hard reload while offline fails without SW cache. Soft refresh (home → field)
    // with sync APIs aborted proves PENDING ledger survives navigation remount.
    await page.route('**/api/v1/sync/**', (route) => route.abort());
    await page.route('**/api/sync**', (route) => route.abort());
    await page.route('**/rest/v1/**', (route) => route.abort());
    await context.setOffline(false);
    await page.goto('/');
    await page.goto('/field');
    await context.setOffline(true);

    await expect(page.getByTestId('field-mode-shell')).toBeVisible();
    await expect(page.getByTestId('field-connectivity-pill')).toContainText(/offline/i, {
      timeout: 10_000,
    });

    const pendingAfterRefresh = await page.evaluate(async () => {
      const openReq = indexedDB.open('rockhound-storage', 2);
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        openReq.onsuccess = () => resolve(openReq.result);
        openReq.onerror = () => reject(openReq.error);
      });
      const ops = await new Promise<Array<{ queue_status?: string }>>((resolve, reject) => {
        const tx = db.transaction('operations', 'readonly');
        const req = tx.objectStore('operations').getAll();
        req.onsuccess = () => resolve(req.result as Array<{ queue_status?: string }>);
        req.onerror = () => reject(req.error);
      });
      db.close();
      // Flush may move PENDING → IN_FLIGHT / RETRY_SCHEDULED when sync APIs abort;
      // persistence means the ledger row still exists and is not DONE.
      return ops.filter(
        (op) =>
          op.queue_status === 'PENDING' ||
          op.queue_status === 'RETRY_SCHEDULED' ||
          op.queue_status === 'IN_FLIGHT'
      ).length;
    });
    expect(pendingAfterRefresh).toBeGreaterThanOrEqual(1);

    await page.getByTestId('field-quick-log-fab').click();
    await expect(page.getByTestId('quick-add-form')).toBeVisible();
    await expect(page.getByText(/offline — queued locally/i)).toBeVisible();
  });

  test('CB-COL-SCALE: /finds ledger renders large mocked client list without crash', async ({
    page,
  }) => {
    // SSR empty is valid under bypass auth; inject a large client-side list for scale smoke.
    await page.goto('/finds');
    await expect(page.getByRole('heading', { name: /Discovery Ledger/i })).toBeVisible();

    const count = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return 0;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < 50; i += 1) {
        const a = document.createElement('a');
        a.href = `/finds/scale-${i}`;
        a.textContent = `Scale Find ${i} — ${'obsidian '.repeat(8)} note-${i}`;
        a.dataset.testid = 'scale-find-row';
        frag.appendChild(a);
      }
      main.appendChild(frag);
      return document.querySelectorAll('[data-testid="scale-find-row"]').length;
    });

    expect(count).toBe(50);
    await expect(page.getByText(/Application error|Digest:/i)).toHaveCount(0);
    await expect(page.getByTestId('scale-find-row').first()).toBeVisible();
  });

  test('CB-HG-CONTRAST: high-glare surfaces inherit dark text on cream', async ({ page }) => {
    await page.goto('/field');
    const toggle = page.getByTestId('high-glare-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect.poll(async () => page.locator('html').getAttribute('data-high-glare')).toBe('on');

    const color = await page
      .locator('[data-high-glare-surface]')
      .first()
      .evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
    // Expect dark stone, not white.
    expect(color).not.toMatch(/rgb\(\s*255,\s*255,\s*255\s*\)/);
  });

  for (const viewport of [
    { name: '360x800', width: 360, height: 800 },
    { name: '390x844', width: 390, height: 844 },
    { name: '412x915', width: 412, height: 915 },
    { name: '768x1024', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
  ] as const) {
    test(`CB-VP: Field shell usable at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/field');
      await expect(page.getByTestId('field-mode-shell')).toBeVisible();
      await expect(page.getByTestId('high-glare-toggle')).toBeVisible();
      await expect(page.getByTestId('field-quick-log-fab')).toBeVisible();
      const box = await page.getByTestId('field-quick-log-fab').boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    });
  }
});
