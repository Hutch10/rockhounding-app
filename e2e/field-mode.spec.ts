import { test, expect } from '@playwright/test';

test.describe('FE-010 Field Mode shell', () => {
  test('CB-F1: enters Field Mode in one tap from Home', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Field' })
      .click();
    await expect(page).toHaveURL(/\/field/);
    await expect(page.getByTestId('field-mode-shell')).toBeVisible();
  });

  test('CB-F2/F3/F5: GPS strip, Quick Log FAB, 44px targets', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 33.4484, longitude: -112.074 });

    await page.route('**/api/v1/locations?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], count: 0 }),
      });
    });

    await page.goto('/field');
    await expect(page.getByTestId('field-gps-strip')).toBeVisible();
    const fab = page.getByTestId('field-quick-log-fab');
    await fab.scrollIntoViewIfNeeded();
    await expect(fab).toBeVisible();
    const box = await fab.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  });

  test('CB-F4: nearest site card renders when GPS and locations available', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 33.4484, longitude: -112.074 });

    await page.route('**/api/v1/locations?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              name: 'Quartz Ridge Test Site',
              description: null,
              latitude: 33.45,
              longitude: -112.08,
              fuzzy_location: null,
              access_status: 'allowed',
              difficulty_rating: 2,
              is_verified: true,
              metadata: { trust_category: 'verified' },
            },
          ],
          count: 1,
        }),
      });
    });

    await page.goto('/field');
    await expect(page.getByText('Quartz Ridge Test Site')).toBeVisible({ timeout: 15_000 });
  });
});
