import { test, expect, type Page } from '@playwright/test';
import {
  createConfirmedStaffUser,
  deleteTestUser,
  uniqueTestEmail,
} from './fixtures/test-user';
import {
  completeGymSetupForE2E,
  findLeadByEmail,
  getGymIdForUser,
  getGymSlug,
  setWebsiteEnabled,
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

test.describe('public website', () => {
  test('home loads for an enabled gym', async ({ page }) => {
    const email = uniqueTestEmail('e2e-public-home');
    const password = 'Test-Password-123!';
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

      await page.goto(`/g/${slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Book Free Trial' })).toBeVisible();
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test('disabled gym returns not found', async ({ page }) => {
    const email = uniqueTestEmail('e2e-public-404');
    const password = 'Test-Password-123!';
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

      await setWebsiteEnabled(gymId, false);
      const response = await page.goto(`/g/${slug}`);
      expect(response?.status()).toBe(404);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test('trial form creates a lead', async ({ page }) => {
    const email = uniqueTestEmail('e2e-public-trial-staff');
    const password = 'Test-Password-123!';
    const leadEmail = uniqueTestEmail('e2e-trial-lead');
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

      await page.goto(`/g/${slug}/trial`);
      await page.getByPlaceholder('First name').fill('Trial');
      await page.getByPlaceholder('Last name').fill('Lead');
      await page.getByPlaceholder('Email').fill(leadEmail);
      await page.getByRole('button', { name: /book my free trial/i }).click();

      await expect(page.getByText(/thank you|booked|received/i)).toBeVisible({ timeout: 10000 });

      const lead = await findLeadByEmail(gymId, leadEmail);
      expect(lead).toBeTruthy();
    } finally {
      await deleteTestUser(user.id);
    }
  });
});
