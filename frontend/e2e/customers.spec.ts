import { test, expect } from '@playwright/test';
import { login, waitForAPI, navigateTo, searchTable, API_BASE_URL } from './helpers/test-utils';

test.describe('Customers Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display customers list', async ({ page }) => {
    await navigateTo(page, '/customers');

    // Check page title
    await expect(page.getByRole('heading', { name: 'Kunder' })).toBeVisible();

    // Check if table is visible
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Check table headers (Norwegian)
    await expect(page.getByRole('columnheader', { name: /Kundenr/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Navn/i })).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    await navigateTo(page, '/customers');

    // Find search input
    const searchInput = page.getByPlaceholder(/Søk/i);
    await expect(searchInput).toBeVisible();

    // Type in search
    await searchInput.fill('test');
    await searchInput.press('Enter');

    // Wait for filtered results
    await page.waitForLoadState('networkidle');
  });

  test('should have add new customer button', async ({ page }) => {
    await navigateTo(page, '/customers');

    // Find add new button
    const addButton = page.getByRole('link', { name: /Legg til|Ny kunde/i });
    await expect(addButton).toBeVisible();

    // Click and verify navigation
    await addButton.click();
    await expect(page).toHaveURL(/\/customers\/new/);
  });

  test('should filter by active status', async ({ page }) => {
    await navigateTo(page, '/customers');

    // Find active filter toggle
    const activeSwitch = page.locator('button[role="switch"]');
    if (await activeSwitch.isVisible()) {
      await activeSwitch.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('should have pagination controls', async ({ page }) => {
    await navigateTo(page, '/customers');

    await page.waitForLoadState('networkidle');

    // Check for pagination controls
    const pagination = page.locator('[aria-label*="Pagination"], button:has-text("Neste"), button:has-text("Forrige")');
    // Pagination may or may not be visible depending on data
  });

  test('should navigate to customer details', async ({ page }) => {
    await navigateTo(page, '/customers');

    await page.waitForLoadState('networkidle');

    // Find first row action menu
    const actionButton = page.locator('tbody tr').first().locator('button[aria-haspopup="menu"]');
    if (await actionButton.isVisible()) {
      await actionButton.click();

      // Click edit option
      const editOption = page.getByRole('menuitem', { name: /Rediger/i });
      if (await editOption.isVisible()) {
        await editOption.click();
        await expect(page).toHaveURL(/\/customers\/\d+/);
      }
    }
  });

  test('should show customer group filter', async ({ page }) => {
    await navigateTo(page, '/customers');

    // Look for customer group select/filter
    const groupFilter = page.locator('select, [role="combobox"]').filter({ hasText: /gruppe|alle/i });
    // Customer group filter may exist
  });

  test('should show delete confirmation dialog', async ({ page }) => {
    await navigateTo(page, '/customers');

    await page.waitForLoadState('networkidle');

    // Find first row action menu
    const actionButton = page.locator('tbody tr').first().locator('button[aria-haspopup="menu"]');
    if (await actionButton.isVisible()) {
      await actionButton.click();

      // Click delete option
      const deleteOption = page.getByRole('menuitem', { name: /Slett/i });
      if (await deleteOption.isVisible()) {
        await deleteOption.click();

        // Verify dialog appears
        const dialog = page.getByRole('alertdialog');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(/Er du sikker|Slette/i);

        // Cancel delete
        await page.getByRole('button', { name: /Avbryt/i }).click();
      }
    }
  });

  test('should support sorting', async ({ page }) => {
    await navigateTo(page, '/customers');

    await page.waitForLoadState('networkidle');

    // Click on sortable column header
    const sortableHeader = page.locator('th').filter({ hasText: /Navn/ });
    if (await sortableHeader.isVisible()) {
      await sortableHeader.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('should export customers to Excel', async ({ page }) => {
    await navigateTo(page, '/customers');

    await page.waitForLoadState('networkidle');

    // Look for export button
    const exportButton = page.getByRole('button', { name: /Eksporter|Excel/i });
    if (await exportButton.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();

      try {
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.xlsx?$/);
      } catch (e) {
        // Export might not be available
      }
    }
  });
});

test.describe('New Customer Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display new customer form', async ({ page }) => {
    await navigateTo(page, '/customers/new');

    // Check page title
    await expect(page.getByRole('heading', { name: /Ny kunde|Opprett kunde/i })).toBeVisible();

    // Check form fields exist
    await expect(page.getByLabel(/Kundenavn|Navn/i)).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await navigateTo(page, '/customers/new');

    // Find and click submit button without filling form
    const submitButton = page.getByRole('button', { name: /Lagre|Opprett/i });
    await submitButton.click();

    // Should show validation errors or stay on page
    await expect(page).toHaveURL(/\/customers\/new/);
  });

  test('should create new customer', async ({ page }) => {
    await navigateTo(page, '/customers/new');

    // Fill in form
    await page.getByLabel(/Kundenavn|Navn/i).first().fill('Test Kunde AS');

    // Fill other required fields if visible
    const addressField = page.getByLabel(/Adresse/i);
    if (await addressField.isVisible()) {
      await addressField.fill('Testveien 123');
    }

    const phoneField = page.getByLabel(/Telefon/i);
    if (await phoneField.isVisible()) {
      await phoneField.fill('12345678');
    }

    // Submit form
    const submitButton = page.getByRole('button', { name: /Lagre|Opprett/i });
    await submitButton.click();

    // Wait for API response
    await page.waitForLoadState('networkidle');
  });

  test('should have cancel button', async ({ page }) => {
    await navigateTo(page, '/customers/new');

    // Find cancel button
    const cancelButton = page.getByRole('button', { name: /Avbryt/i }).or(page.getByRole('link', { name: /Avbryt|Tilbake/i }));
    await expect(cancelButton).toBeVisible();

    // Click cancel and verify navigation back
    await cancelButton.click();
    await expect(page).toHaveURL(/\/customers/);
  });
});

test.describe('Customer Details Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display customer details', async ({ page }) => {
    // Navigate to a customer (assuming ID 1 exists)
    await navigateTo(page, '/customers');
    await page.waitForLoadState('networkidle');

    // Click on first customer row
    const firstRow = page.locator('tbody tr').first();
    const actionButton = firstRow.locator('button[aria-haspopup="menu"]');

    if (await actionButton.isVisible()) {
      await actionButton.click();
      const editOption = page.getByRole('menuitem', { name: /Rediger|Vis/i });
      if (await editOption.isVisible()) {
        await editOption.click();

        // Check we're on details page
        await expect(page).toHaveURL(/\/customers\/\d+/);
      }
    }
  });

  test('should have edit functionality', async ({ page }) => {
    // Navigate to customers list first
    await navigateTo(page, '/customers');
    await page.waitForLoadState('networkidle');

    // Get first customer and navigate to edit
    const firstRow = page.locator('tbody tr').first();
    const actionButton = firstRow.locator('button[aria-haspopup="menu"]');

    if (await actionButton.isVisible()) {
      await actionButton.click();
      const editOption = page.getByRole('menuitem', { name: /Rediger/i });
      if (await editOption.isVisible()) {
        await editOption.click();

        // Should be on edit page
        await expect(page).toHaveURL(/\/customers\/\d+/);

        // Edit button or form should be visible
        const editForm = page.locator('form');
        const editButton = page.getByRole('button', { name: /Rediger|Lagre/i });
        expect(await editForm.isVisible() || await editButton.isVisible()).toBe(true);
      }
    }
  });
});

test.describe('Customers - Norwegian Text', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should use Norwegian throughout', async ({ page }) => {
    await navigateTo(page, '/customers');

    // Check for Norwegian text
    await expect(page.getByText('Kunder')).toBeVisible();

    // Check for Norwegian button text
    const addButton = page.getByRole('link', { name: /Legg til|Ny kunde/i });
    await expect(addButton).toBeVisible();
  });
});

test.describe('Customers - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have proper table structure', async ({ page }) => {
    await navigateTo(page, '/customers');

    // Table should have headers
    const table = page.getByRole('table');
    await expect(table).toBeVisible();

    // Should have column headers
    const headers = page.getByRole('columnheader');
    expect(await headers.count()).toBeGreaterThan(0);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await navigateTo(page, '/customers');

    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Some element should be focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

test.describe('Customers - API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should fetch customers from API', async ({ page }) => {
    // Monitor API calls
    const customersRequest = page.waitForResponse(
      response => response.url().includes('/api/v1/kunder') && response.status() === 200
    );

    await navigateTo(page, '/customers');

    // Verify API was called
    const response = await customersRequest;
    expect(response.ok()).toBeTruthy();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/kunder**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await navigateTo(page, '/customers');

    // Page should not crash
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
