import { test, expect } from '@playwright/test';
import { login, waitForAPI, API_BASE_URL } from './helpers/test-utils';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display dashboard with Norwegian text', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Check welcome text
    await expect(page.getByText('Velkommen tilbake')).toBeVisible();
  });

  test('should display statistics cards', async ({ page }) => {
    await page.goto('/');

    // Wait for stats API call
    await page.waitForLoadState('networkidle');

    // Check today's activity cards
    await expect(page.getByText('Ordrer i dag')).toBeVisible();
    await expect(page.getByText('Ubehandlede ordrer')).toBeVisible();
    await expect(page.getByText('Dagens leveringer')).toBeVisible();
    await expect(page.getByText('Denne måneden')).toBeVisible();
  });

  test('should display system overview section', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Check system overview
    await expect(page.getByText('Systemoversikt')).toBeVisible();
    await expect(page.getByText('Komplett oversikt over alle moduler')).toBeVisible();

    // Check categories
    await expect(page.getByText('Personer')).toBeVisible();
    await expect(page.getByText('Produkter & Menyer')).toBeVisible();
    await expect(page.getByText('Ordrer')).toBeVisible();
  });

  test('should display quick access buttons', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Check quick access section
    await expect(page.getByText('Hurtigtilgang')).toBeVisible();

    // Check action buttons
    await expect(page.getByRole('button', { name: /Ny ordre/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ny kunde/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Produkter/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ny oppskrift/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Menyer/i })).toBeVisible();
  });

  test('should navigate from quick access buttons', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Click "Ny ordre" and check navigation
    await page.getByRole('button', { name: /Ny ordre/i }).click();
    await expect(page).toHaveURL(/\/orders\/new/);

    // Go back and try another
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Ny kunde/i }).click();
    await expect(page).toHaveURL(/\/customers\/new/);
  });

  test('should display stats cards that link to relevant pages', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Click on Kunder card
    const kundeCard = page.locator('a[href="/customers"]').first();
    await kundeCard.click();
    await expect(page).toHaveURL(/\/customers/);

    // Navigate back
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on Ordrer card
    const ordrerCard = page.locator('a[href="/orders"]').first();
    await ordrerCard.click();
    await expect(page).toHaveURL(/\/orders/);
  });

  test('should display orders chart section', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Check chart section
    await expect(page.getByText('Ordrer siste 30 dager')).toBeVisible();
    await expect(page.getByText('Antall ordrer per dag')).toBeVisible();
  });

  test('should display top products section', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Check top products section
    await expect(page.getByText('Topp 10 produkter')).toBeVisible();
    await expect(page.getByText('Mest bestilte produkter siste 30 dager')).toBeVisible();
  });

  test('should display upcoming periods section', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Check upcoming periods section
    await expect(page.getByText('Kommende perioder')).toBeVisible();
    await expect(page.getByText('Perioder som starter snart')).toBeVisible();
  });

  test('should handle loading state', async ({ page }) => {
    // Slow down network
    await page.route('**/api/v1/stats/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto('/');

    // Should show loading state
    await expect(page.getByText('Laster data...')).toBeVisible();

    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Loading state should be gone
    await expect(page.getByText('Laster data...')).not.toBeVisible();
  });

  test('should fetch data from stats API', async ({ page }) => {
    // Monitor API calls
    const statsRequest = page.waitForResponse(
      response => response.url().includes('/api/v1/stats/') && response.status() === 200
    );

    await page.goto('/');

    // Verify API was called
    const response = await statsRequest;
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('total_customers');
    expect(data).toHaveProperty('total_orders');
  });
});

test.describe('Dashboard Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Main heading
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('Dashboard');
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Some element should be focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have clickable cards', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Cards should be clickable (have cursor pointer)
    const card = page.locator('a[href="/orders"]').first();
    await expect(card).toBeVisible();

    // Verify it's an anchor element
    const tagName = await card.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('a');
  });
});

test.describe('Dashboard Responsiveness', () => {
  test('should display correctly on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Dashboard should still be visible
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Stats cards should be visible
    await expect(page.getByText('Ordrer i dag')).toBeVisible();
  });

  test('should display correctly on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Dashboard should be visible
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
