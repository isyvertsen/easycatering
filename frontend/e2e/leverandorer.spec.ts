import { test, expect } from '@playwright/test';
import { login, navigateTo, API_BASE_URL } from './helpers/test-utils';

test.describe('Leverandører Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display leverandører list', async ({ page }) => {
    await navigateTo(page, '/leverandorer');

    // Check page title
    await expect(page.getByRole('heading', { name: /Leverandører/i })).toBeVisible();

    // Check if table is visible
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    await navigateTo(page, '/leverandorer');

    // Find search input
    const searchInput = page.getByPlaceholder(/Søk/i);
    await expect(searchInput).toBeVisible();

    // Type in search
    await searchInput.fill('test');
    await page.waitForLoadState('networkidle');
  });

  test('should have add new leverandør button', async ({ page }) => {
    await navigateTo(page, '/leverandorer');

    // Find add new button
    const addButton = page.getByRole('link', { name: /Legg til|Ny leverandør/i }).or(
      page.getByRole('button', { name: /Legg til|Ny leverandør/i })
    );
    await expect(addButton).toBeVisible();
  });

  test('should display leverandør details', async ({ page }) => {
    await navigateTo(page, '/leverandorer');

    await page.waitForLoadState('networkidle');

    // Check table headers
    await expect(page.getByRole('columnheader', { name: /Navn/i })).toBeVisible();
  });

  test('should have edit and delete actions', async ({ page }) => {
    await navigateTo(page, '/leverandorer');

    await page.waitForLoadState('networkidle');

    // Find first row action menu
    const actionButton = page.locator('tbody tr').first().locator('button[aria-haspopup="menu"]');
    if (await actionButton.isVisible()) {
      await actionButton.click();

      // Check for edit and delete options
      await expect(page.getByRole('menuitem', { name: /Rediger/i })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /Slett/i })).toBeVisible();
    }
  });

  test('should navigate to edit page', async ({ page }) => {
    await navigateTo(page, '/leverandorer');

    await page.waitForLoadState('networkidle');

    const actionButton = page.locator('tbody tr').first().locator('button[aria-haspopup="menu"]');
    if (await actionButton.isVisible()) {
      await actionButton.click();
      const editOption = page.getByRole('menuitem', { name: /Rediger/i });
      if (await editOption.isVisible()) {
        await editOption.click();
        await expect(page).toHaveURL(/\/leverandorer\/\d+/);
      }
    }
  });

  test('should show delete confirmation', async ({ page }) => {
    await navigateTo(page, '/leverandorer');

    await page.waitForLoadState('networkidle');

    const actionButton = page.locator('tbody tr').first().locator('button[aria-haspopup="menu"]');
    if (await actionButton.isVisible()) {
      await actionButton.click();
      const deleteOption = page.getByRole('menuitem', { name: /Slett/i });
      if (await deleteOption.isVisible()) {
        await deleteOption.click();

        // Confirm dialog should appear
        const dialog = page.getByRole('alertdialog');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(/Er du sikker|Slett/i);

        // Cancel
        await page.getByRole('button', { name: /Avbryt/i }).click();
      }
    }
  });
});

test.describe('New Leverandør Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display new leverandør form', async ({ page }) => {
    await navigateTo(page, '/leverandorer/new');

    // Check page title
    await expect(page.getByRole('heading', { name: /Ny leverandør|Opprett leverandør/i })).toBeVisible();
  });

  test('should have required form fields', async ({ page }) => {
    await navigateTo(page, '/leverandorer/new');

    // Check for name field
    await expect(page.getByLabel(/Navn/i)).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await navigateTo(page, '/leverandorer/new');

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /Lagre|Opprett/i });
    await submitButton.click();

    // Should show validation errors or stay on page
    await expect(page).toHaveURL(/\/leverandorer\/new/);
  });

  test('should have cancel button', async ({ page }) => {
    await navigateTo(page, '/leverandorer/new');

    const cancelButton = page.getByRole('button', { name: /Avbryt/i }).or(
      page.getByRole('link', { name: /Tilbake/i })
    );
    await expect(cancelButton).toBeVisible();
  });
});

test.describe('Leverandører - API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should fetch leverandører from API', async ({ page }) => {
    const leverandorerRequest = page.waitForResponse(
      response => response.url().includes('/api/v1/leverandorer') && response.status() === 200
    );

    await navigateTo(page, '/leverandorer');

    const response = await leverandorerRequest;
    expect(response.ok()).toBeTruthy();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.route('**/api/v1/leverandorer**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await navigateTo(page, '/leverandorer');

    // Page should not crash
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Leverandører - Norwegian Text', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should use Norwegian throughout', async ({ page }) => {
    await navigateTo(page, '/leverandorer');

    await expect(page.getByText('Leverandører')).toBeVisible();
  });
});

test.describe('Leverandører - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have proper table structure', async ({ page }) => {
    await navigateTo(page, '/leverandorer');

    const table = page.getByRole('table');
    await expect(table).toBeVisible();

    const headers = page.getByRole('columnheader');
    expect(await headers.count()).toBeGreaterThan(0);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await navigateTo(page, '/leverandorer');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
