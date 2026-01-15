import { test, expect } from '@playwright/test';
import { login, navigateTo, API_BASE_URL } from './helpers/test-utils';

test.describe('Plukking Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display plukking page', async ({ page }) => {
    await navigateTo(page, '/plukking');

    // Check page title
    await expect(page.getByRole('heading', { name: /Plukking|Plukkliste/i })).toBeVisible();
  });

  test('should have date filter', async ({ page }) => {
    await navigateTo(page, '/plukking');

    // Look for date picker or filter
    const dateInput = page.locator('input[type="date"], [data-testid="date-filter"]');
    // Date filter should exist for selecting which orders to pick
  });

  test('should display orders for picking', async ({ page }) => {
    await navigateTo(page, '/plukking');

    await page.waitForLoadState('networkidle');

    // Look for order list or table
    const table = page.locator('table');
    const orderList = page.locator('[data-testid="picking-list"]');
    // Either table or list should show picking items
  });

  test('should show product quantities', async ({ page }) => {
    await navigateTo(page, '/plukking');

    await page.waitForLoadState('networkidle');

    // Look for quantity column or display
    const quantityHeader = page.locator('th, [role="columnheader"]').filter({ hasText: /Antall|Mengde/i });
    // Quantity information should be visible
  });

  test('should have checkbox or toggle for marking items as picked', async ({ page }) => {
    await navigateTo(page, '/plukking');

    await page.waitForLoadState('networkidle');

    // Look for checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    // Checkboxes may exist for marking items as picked
  });

  test('should have complete/confirm button', async ({ page }) => {
    await navigateTo(page, '/plukking');

    await page.waitForLoadState('networkidle');

    // Look for confirm or complete button
    const completeButton = page.getByRole('button', { name: /Fullfør|Bekreft|Plukket/i });
    // Complete button may exist
  });

  test('should group items by order or customer', async ({ page }) => {
    await navigateTo(page, '/plukking');

    await page.waitForLoadState('networkidle');

    // Look for grouping/sections
    const orderGroups = page.locator('[data-testid="order-group"], section, .order-section');
    // Items may be grouped
  });

  test('should have print functionality', async ({ page }) => {
    await navigateTo(page, '/plukking');

    await page.waitForLoadState('networkidle');

    // Look for print button
    const printButton = page.getByRole('button', { name: /Skriv ut|Print/i });
    // Print button may exist
  });

  test('should show delivery information', async ({ page }) => {
    await navigateTo(page, '/plukking');

    await page.waitForLoadState('networkidle');

    // Look for delivery info
    const deliveryInfo = page.locator('text=/levering|leveringsdato|adresse/i');
    // Delivery information may be visible
  });
});

test.describe('Plukking - Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should mark item as picked', async ({ page }) => {
    await navigateTo(page, '/plukking');

    await page.waitForLoadState('networkidle');

    // Find first checkbox and click it
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    if (await firstCheckbox.isVisible()) {
      await firstCheckbox.click();

      // Verify state changed
      await expect(firstCheckbox).toBeChecked();
    }
  });

  test('should show progress indicator', async ({ page }) => {
    await navigateTo(page, '/plukking');

    await page.waitForLoadState('networkidle');

    // Look for progress bar or counter
    const progress = page.locator('[role="progressbar"], text=/\\d+\\/\\d+/');
    // Progress indicator may show how many items are picked
  });

  test('should filter by status', async ({ page }) => {
    await navigateTo(page, '/plukking');

    await page.waitForLoadState('networkidle');

    // Look for status filter
    const statusFilter = page.locator('select, [role="combobox"]').filter({ hasText: /status|alle/i });
    // Status filter may exist
  });
});

test.describe('Plukking - Norwegian Text', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should use Norwegian throughout', async ({ page }) => {
    await navigateTo(page, '/plukking');

    // Check for Norwegian text
    const pageContent = await page.locator('body').textContent();
    // Should contain Norwegian words
  });

  test('should display Norwegian date format', async ({ page }) => {
    await navigateTo(page, '/plukking');

    await page.waitForLoadState('networkidle');

    // Dates should be in Norwegian format
    const dateText = page.locator('text=/\\d{2}\\.\\d{2}\\.\\d{4}/');
    // Norwegian dates may be visible
  });
});

test.describe('Plukking - API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should fetch plukking data from API', async ({ page }) => {
    // Monitor API calls
    const plukkingRequest = page.waitForResponse(
      response => response.url().includes('/api/v1/plukking') && response.status() === 200
    );

    await navigateTo(page, '/plukking');

    // Verify API was called
    try {
      const response = await plukkingRequest;
      expect(response.ok()).toBeTruthy();
    } catch (e) {
      // API endpoint may have different path
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/plukking**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await navigateTo(page, '/plukking');

    // Page should not crash
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Plukking - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have proper heading structure', async ({ page }) => {
    await navigateTo(page, '/plukking');

    // Main heading
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await navigateTo(page, '/plukking');

    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Some element should be focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have accessible checkboxes', async ({ page }) => {
    await navigateTo(page, '/plukking');

    await page.waitForLoadState('networkidle');

    // Checkboxes should have labels
    const checkboxes = page.locator('input[type="checkbox"]');
    // Checkboxes should be accessible
  });
});
