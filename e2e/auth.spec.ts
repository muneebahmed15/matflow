import { test, expect } from '@playwright/test';
import {
  createConfirmedStaffUser,
  deleteTestUser,
  deleteTestUserByEmail,
  uniqueTestEmail,
} from './fixtures/test-user';

test.describe('auth flows', () => {
  test('signup shows the email-confirmation screen on success', async ({ page }) => {
    const email = uniqueTestEmail('e2e-signup');

    try {
      await page.goto('/signup');
      await page.getByPlaceholder('First name').fill('E2E');
      await page.getByPlaceholder('Last name').fill('Signup');
      await page.getByPlaceholder('Email address').fill(email);
      await page.getByPlaceholder('Password').fill('Test-Password-123!');
      await page.getByRole('button', { name: 'Create Free Account' }).click();

      await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible();
      await expect(page.getByText(email)).toBeVisible();
    } finally {
      await deleteTestUserByEmail(email);
    }
  });

  test('login rejects invalid credentials with a visible error', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(uniqueTestEmail('e2e-nope'));
    await page.getByPlaceholder('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page.getByText(/invalid/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('login succeeds for a confirmed user and reaches the dashboard', async ({ page }) => {
    const email = uniqueTestEmail('e2e-login');
    const password = 'Test-Password-123!';
    const user = await createConfirmedStaffUser(email, password);

    try {
      await page.goto('/login');
      await page.getByPlaceholder('Email address').fill(email);
      await page.getByPlaceholder('Password').fill(password);
      await page.getByRole('button', { name: 'Log In' }).click();

      await expect(page).toHaveURL(/\/dashboard/);
    } finally {
      await deleteTestUser(user.id);
    }
  });
});
