import { test, expect } from '@playwright/test';

test.describe('TEST-007 offline sync and access gating', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 45.5152, longitude: -122.6784 });
  });

  test('CB-E3 / KR-001 online: prohibited site blocks Quick Log', async ({ page }) => {
    await page.route('**/api/v1/access/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          legalState: 'prohibited',
          advisoryLevel: 'critical',
          parcel_info: null,
          evidence: {
            boundaryMatch: 'region',
            appliedRule: null,
            conflicts: [],
            reasonCodes: ['PROHIBITED_ZONE'],
          },
        }),
      });
    });

    await page.goto('/field');
    await page.getByTestId('field-quick-log-fab').click();
    await expect(page.getByTestId('quick-add-prohibited-banner')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('quick-add-submit')).toBeDisabled();
    await expect(page.getByTestId('quick-add-submit')).toHaveText(/logging disabled/i);
  });

  test('CB-E2 / KR-001 offline: Quick Log allowed when access check unavailable', async ({
    page,
    context,
  }) => {
    await page.goto('/field');
    await context.setOffline(true);

    await expect(page.getByTestId('field-connectivity-pill')).toContainText(/offline/i, {
      timeout: 10_000,
    });

    await page.getByTestId('field-quick-log-fab').click();
    await expect(page.getByTestId('quick-add-form')).toBeVisible();
    await expect(page.getByTestId('quick-add-prohibited-banner')).toHaveCount(0);
    await expect(page.getByTestId('quick-add-submit')).toBeEnabled();
    await expect(page.getByText(/offline — queued locally/i)).toBeVisible();
  });

  test('CB-E2: map Quick Log entry opens modal online', async ({ page }) => {
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

    await page.goto('/map');
    await page.getByRole('button', { name: /log find/i }).click({ timeout: 60_000 });
    await expect(page.getByTestId('quick-add-form')).toBeVisible();
  });
});
