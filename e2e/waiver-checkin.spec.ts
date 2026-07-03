import { test, expect } from '@playwright/test';
import { createConfirmedStaffUser, deleteTestUser, uniqueTestEmail } from './fixtures/test-user';
import {
  createActiveWaiver,
  deleteWaiver,
  ensureWaiverRequiredForCheckin,
  findMemberId,
  getGymIdForUser,
} from './fixtures/gym-data';
import { staffLogin } from './helpers/staff-login';

test.describe.serial('waiver enforcement on staff check-in', () => {
  const email = uniqueTestEmail('e2e-waiver');
  const password = 'Test-Password-123!';
  let userId: string;
  let gymId: string | null;
  let waiverId: string | null;
  let memberId: string | null;
  let memberFirstName: string;
  let memberFullName: string;

  test.afterAll(async () => {
    if (waiverId) await deleteWaiver(waiverId).catch(() => undefined);
    if (userId) await deleteTestUser(userId);
  });

  test('staff provisions gym and adds a member', async ({ page }) => {
    const user = await createConfirmedStaffUser(email, password);
    userId = user.id;

    await staffLogin(page, email, password);

    gymId = await getGymIdForUser(userId);
    expect(gymId).toBeTruthy();
    await ensureWaiverRequiredForCheckin(gymId!);
    waiverId = await createActiveWaiver(gymId!);

    await page.getByRole('link', { name: 'Members' }).click();
    await page.getByRole('link', { name: 'Add Member' }).click();

    const suffix = Date.now().toString().slice(-6);
    memberFirstName = `Waiver${suffix}`;
    const lastName = `Test${suffix}`;
    memberFullName = `${memberFirstName} ${lastName}`;

    await page.getByPlaceholder('John', { exact: true }).fill(memberFirstName);
    await page.getByPlaceholder('Doe', { exact: true }).fill(lastName);
    await page.getByRole('button', { name: 'Add Member' }).click();
    await expect(page).toHaveURL(/\/members$/);
    await expect(page.getByText(memberFullName)).toBeVisible();

    memberId = await findMemberId(gymId!, memberFirstName, lastName);
    expect(memberId).toBeTruthy();
  });

  test('blocks check-in until the active waiver is signed', async ({ page }) => {
    await staffLogin(page, email, password);

    await page.getByRole('link', { name: 'Check-In' }).click();
    await page.getByPlaceholder('Search by name or email...').fill(memberFirstName);
    await page.getByRole('button', { name: 'Check In' }).click();

    await expect(page.getByText(/waiver signature required/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check In' })).toBeVisible();
  });

  test('allows check-in after staff signs the waiver', async ({ page }) => {
    await staffLogin(page, email, password);

    await page.goto(`/waivers/${memberId}/sign-waiver`);
    await expect(page.getByRole('heading', { name: 'Sign Waiver' })).toBeVisible();
    await page.getByPlaceholder('Type your full name here').fill(memberFullName);
    await page.getByRole('button', { name: 'I Agree & Sign Waiver' }).click();
    await expect(page.getByText(/waiver signed successfully/i)).toBeVisible();

    await page.getByRole('link', { name: 'Check-In' }).click();
    await page.getByPlaceholder('Search by name or email...').fill(memberFirstName);
    await page.getByRole('button', { name: 'Check In' }).click();
    await expect(page.getByRole('button', { name: /Checked In/ })).toBeVisible();
  });
});
