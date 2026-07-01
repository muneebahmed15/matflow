import { test, expect } from '@playwright/test';
import { createConfirmedStaffUser, deleteTestUser, uniqueTestEmail } from './fixtures/test-user';

test.describe.serial('golden path: onboarding through check-in', () => {
  const email = uniqueTestEmail('e2e-golden');
  const password = 'Test-Password-123!';
  let userId: string;
  let memberName: string;

  test.afterAll(async () => {
    if (userId) await deleteTestUser(userId);
  });

  test('staff logs in and a gym is auto-provisioned', async ({ page }) => {
    const user = await createConfirmedStaffUser(email, password);
    userId = user.id;

    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('link', { name: 'Members' })).toBeVisible();
  });

  test('staff adds a new member', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole('link', { name: 'Members' }).click();
    await expect(page).toHaveURL(/\/members$/);
    await page.getByRole('link', { name: 'Add Member' }).click();
    await expect(page).toHaveURL(/\/members\/new/);

    const suffix = Date.now().toString().slice(-6);
    memberName = `Test${suffix} Fixture${suffix}`;
    await page.getByPlaceholder('John', { exact: true }).fill(`Test${suffix}`);
    await page.getByPlaceholder('Doe', { exact: true }).fill(`Fixture${suffix}`);
    await page.getByRole('button', { name: 'Add Member' }).click();

    await expect(page).toHaveURL(/\/members$/);
    await expect(page.getByText(memberName)).toBeVisible();
  });

  test('staff checks the member in and sees them in the attendance log', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole('link', { name: 'Check-In' }).click();
    await expect(page).toHaveURL(/\/attendance\/check-in/);

    const [firstName] = memberName.split(' ');
    await page.getByPlaceholder('Search by name or email...').fill(firstName);
    await page.getByRole('button', { name: 'Check In' }).click();
    await expect(page.getByRole('button', { name: /Checked In/ })).toBeVisible();

    await page.getByRole('link', { name: 'Attendance Log' }).click();
    await expect(page).toHaveURL(/\/attendance\/log/);
    await expect(page.getByText(memberName)).toBeVisible();
  });
});
