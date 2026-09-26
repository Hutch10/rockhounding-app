import { expect, test } from '@playwright/test';

test.describe('Collection empty-state acceptance', () => {
  test('CB-COL: /collection renders empty gallery without server exception', async ({ page }) => {
    await page.goto('/collection');
    await expect(page.getByTestId('collection-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Collection' })).toBeVisible();
    await expect(page.getByText(/empty collection is a valid state/i)).toBeVisible();
    await expect(page.getByTestId('collection-open-finds')).toBeVisible();
  });

  test('CB-COL: discovery ledger link opens /finds without crash shell', async ({ page }) => {
    await page.goto('/collection');
    await page.getByTestId('collection-open-finds').click();
    await expect(page).toHaveURL(/\/finds/);
    await expect(page.getByRole('heading', { name: /Discovery Ledger/i })).toBeVisible();
    await expect(page.getByText(/Application error|Digest:/i)).toHaveCount(0);
  });
});
