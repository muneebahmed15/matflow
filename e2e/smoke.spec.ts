import { test, expect } from '@playwright/test'

test.describe('public smoke tests', () => {
  test('home page renders hero and signup CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /train hard/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /get started free/i })).toBeVisible()
  })

  test('staff login page renders form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    await expect(page.getByPlaceholder('Email address')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible()
  })

  test('member portal login page renders form', async ({ page }) => {
    await page.goto('/portal/login')
    await expect(page.getByRole('heading', { name: 'Member Portal' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Admin login →' })).toHaveAttribute('href', '/login')
  })
})
