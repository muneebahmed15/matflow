import { test, expect } from '@playwright/test';
import { createPortalMemberFixture } from './fixtures/portal-member';

test.describe('portal golden path', () => {
  test('member logs in and views attendance', async ({ page }) => {
    const fixture = await createPortalMemberFixture();

    try {
      await page.goto('/portal/login');
      await page.getByPlaceholder('your@email.com').fill(fixture.email);
      await page.getByPlaceholder('••••••••').fill(fixture.password);
      await page.getByRole('button', { name: 'Sign In' }).click();

      await expect(page).toHaveURL(/\/portal/);
      await page.goto('/portal/attendance');
      await expect(page.getByRole('heading', { name: 'My Attendance' })).toBeVisible();
      await expect(page.getByText(/no check-ins yet|this month/i)).toBeVisible();
    } finally {
      await fixture.cleanup();
    }
  });
});
