import { test, expect, type Page } from '@playwright/test';
import {
  createConfirmedStaffUser,
  deleteTestUser,
  uniqueTestEmail,
} from './fixtures/test-user';
import {
  completeGymSetupForE2E,
  createShopProduct,
  getGymIdForUser,
  getGymSlug,
  setStoreEnabled,
} from './fixtures/gym-data';

async function ensureStaffGym(page: Page, userId: string): Promise<string> {
  let gymId = await getGymIdForUser(userId);
  if (!gymId) {
    await page.goto('/onboarding');
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForURL(/\/setup/, { timeout: 15000 });
    gymId = await getGymIdForUser(userId);
  }
  if (!gymId) throw new Error('Failed to provision gym for e2e test user');
  await completeGymSetupForE2E(gymId);
  return gymId;
}

test.describe('public shop checkout', () => {
  test('add to cart and start checkout (test mode)', async ({ page }) => {
    const email = uniqueTestEmail('e2e-shop-staff');
    const password = 'Test-Password-123!';
    const buyerEmail = uniqueTestEmail('e2e-shop-buyer');
    const user = await createConfirmedStaffUser(email, password);

    try {
      await page.goto('/login');
      await page.getByPlaceholder('Email address').fill(email);
      await page.getByPlaceholder('Password').fill(password);
      await page.getByRole('button', { name: 'Log In' }).click();

      const gymId = await ensureStaffGym(page, user.id);
      const slug = await getGymSlug(gymId);
      expect(slug).toBeTruthy();
      if (!slug) return;

      await setStoreEnabled(gymId, true);
      const product = await createShopProduct(gymId, {
        name: 'E2E Test Gi',
        priceCents: 8900,
        inventoryCount: 5,
      });

      await page.route('**/api/public/shop/checkout', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ url: 'https://checkout.stripe.com/c/pay/e2e-test-session' }),
        });
      });

      await page.goto(`/g/${slug}/shop`);
      await page.getByRole('button', { name: 'Add to Cart' }).first().click();
      await expect(page.getByText('Cart (1)')).toBeVisible();

      await page.getByPlaceholder('Email for receipt').fill(buyerEmail);
      await page.getByRole('button', { name: /checkout with stripe/i }).click();

      await page.waitForURL(/checkout\.stripe\.com/, { timeout: 10000 });
      expect(page.url()).toContain('checkout.stripe.com');

      // Ensure checkout payload included our product
      const cartRaw = await page.evaluate((key) => localStorage.getItem(key), `matflow-cart-${slug}`);
      expect(cartRaw).toContain(product.id);
    } finally {
      await deleteTestUser(user.id);
    }
  });
});
