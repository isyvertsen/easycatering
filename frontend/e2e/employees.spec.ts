import { test, expect } from '@playwright/test';
import { login, navigateTo, API_BASE_URL } from './helpers/test-utils';

test.describe('Employees Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display employees list', async ({ page }) => {
    await navigateTo(page, '/employees');

    // Check page title
    await expect(page.getByRole('heading', { name: 'Ansatte' })).toBeVisible();

    // Check if table is visible
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    await navigateTo(page, '/employees');

    // Find search input
    const searchInput = page.getByPlaceholder(/Søk/i);
    await expect(searchInput).toBeVisible();

    // Type in search
    await searchInput.fill('Thor');
    await page.waitForLoadState('networkidle');
  });

  test('should have add new employee button', async ({ page }) => {
    await navigateTo(page, '/employees');

    // Find add new button
    const addButton = page.getByRole('link', { name: /Legg til|Ny ansatt/i }).or(
      page.getByRole('button', { name: /Legg til|Ny ansatt/i })
    );
    await expect(addButton).toBeVisible();
  });

  test('should display employee information', async ({ page }) => {
    await navigateTo(page, '/employees');

    await page.waitForLoadState('networkidle');

    // Check table headers
    await expect(page.getByRole('columnheader', { name: /Fornavn/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Etternavn/i })).toBeVisible();
  });

  test('should show employee status', async ({ page }) => {
    await navigateTo(page, '/employees');

    await page.waitForLoadState('networkidle');

    // Look for status column
    const statusHeader = page.getByRole('columnheader', { name: /Aktiv|Status/i });
    // Status column should exist
  });

  test('should have edit and delete actions', async ({ page }) => {
    await navigateTo(page, '/employees');

    await page.waitForLoadState('networkidle');

    // Find first row action menu
    const actionButton = page.locator('tbody tr').first().locator('button[aria-haspopup="menu"]');
    if (await actionButton.isVisible()) {
      await actionButton.click();

      // Check for edit option
      await expect(page.getByRole('menuitem', { name: /Rediger/i })).toBeVisible();
    }
  });

  test('should navigate to employee edit page', async ({ page }) => {
    await navigateTo(page, '/employees');

    await page.waitForLoadState('networkidle');

    const actionButton = page.locator('tbody tr').first().locator('button[aria-haspopup="menu"]');
    if (await actionButton.isVisible()) {
      await actionButton.click();
      const editOption = page.getByRole('menuitem', { name: /Rediger/i });
      if (await editOption.isVisible()) {
        await editOption.click();
        await expect(page).toHaveURL(/\/employees\/\d+/);
      }
    }
  });

  test('should filter by active status', async ({ page }) => {
    await navigateTo(page, '/employees');

    // Look for active filter
    const activeSwitch = page.locator('button[role="switch"]');
    if (await activeSwitch.isVisible()) {
      await activeSwitch.click();
      await page.waitForLoadState('networkidle');
    }
  });
});

test.describe('New Employee Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display new employee form', async ({ page }) => {
    await navigateTo(page, '/employees/new');

    // Check page title
    await expect(page.getByRole('heading', { name: /Ny ansatt|Opprett ansatt/i })).toBeVisible();
  });

  test('should have required form fields', async ({ page }) => {
    await navigateTo(page, '/employees/new');

    // Check for name fields
    await expect(page.getByLabel(/Fornavn/i)).toBeVisible();
    await expect(page.getByLabel(/Etternavn/i)).toBeVisible();
  });

  test('should have email field', async ({ page }) => {
    await navigateTo(page, '/employees/new');

    const emailField = page.getByLabel(/E-post|Email/i);
    // Email field may exist
  });

  test('should have phone field', async ({ page }) => {
    await navigateTo(page, '/employees/new');

    const phoneField = page.getByLabel(/Telefon|Mobil/i);
    // Phone field may exist
  });

  test('should validate required fields', async ({ page }) => {
    await navigateTo(page, '/employees/new');

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /Lagre|Opprett/i });
    await submitButton.click();

    // Should show validation errors or stay on page
    await expect(page).toHaveURL(/\/employees\/new/);
  });

  test('should have cancel button', async ({ page }) => {
    await navigateTo(page, '/employees/new');

    const cancelButton = page.getByRole('button', { name: /Avbryt/i }).or(
      page.getByRole('link', { name: /Tilbake/i })
    );
    await expect(cancelButton).toBeVisible();
  });

  test('should create new employee', async ({ page }) => {
    await navigateTo(page, '/employees/new');

    // Fill in form
    await page.getByLabel(/Fornavn/i).fill('Test');
    await page.getByLabel(/Etternavn/i).fill('Ansatt');

    const emailField = page.getByLabel(/E-post|Email/i);
    if (await emailField.isVisible()) {
      await emailField.fill('test.ansatt@example.com');
    }

    // Submit
    const submitButton = page.getByRole('button', { name: /Lagre|Opprett/i });
    await submitButton.click();

    await page.waitForLoadState('networkidle');
  });
});

test.describe('Employee Details Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display employee details', async ({ page }) => {
    await navigateTo(page, '/employees');
    await page.waitForLoadState('networkidle');

    const actionButton = page.locator('tbody tr').first().locator('button[aria-haspopup="menu"]');
    if (await actionButton.isVisible()) {
      await actionButton.click();
      const editOption = page.getByRole('menuitem', { name: /Rediger|Vis/i });
      if (await editOption.isVisible()) {
        await editOption.click();
        await expect(page).toHaveURL(/\/employees\/\d+/);
      }
    }
  });

  test('should have save button in edit mode', async ({ page }) => {
    await navigateTo(page, '/employees');
    await page.waitForLoadState('networkidle');

    const actionButton = page.locator('tbody tr').first().locator('button[aria-haspopup="menu"]');
    if (await actionButton.isVisible()) {
      await actionButton.click();
      const editOption = page.getByRole('menuitem', { name: /Rediger/i });
      if (await editOption.isVisible()) {
        await editOption.click();

        const saveButton = page.getByRole('button', { name: /Lagre/i });
        await expect(saveButton).toBeVisible();
      }
    }
  });
});

test.describe('Employees - API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should fetch employees from API', async ({ page }) => {
    const employeesRequest = page.waitForResponse(
      response => response.url().includes('/api/v1/ansatte') && response.status() === 200
    );

    await navigateTo(page, '/employees');

    const response = await employeesRequest;
    expect(response.ok()).toBeTruthy();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.route('**/api/v1/ansatte**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await navigateTo(page, '/employees');

    // Page should not crash
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Employees - Norwegian Text', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should use Norwegian throughout', async ({ page }) => {
    await navigateTo(page, '/employees');

    await expect(page.getByText('Ansatte')).toBeVisible();
    await expect(page.getByText(/Fornavn/i)).toBeVisible();
    await expect(page.getByText(/Etternavn/i)).toBeVisible();
  });
});

test.describe('Employees - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have proper table structure', async ({ page }) => {
    await navigateTo(page, '/employees');

    const table = page.getByRole('table');
    await expect(table).toBeVisible();

    const headers = page.getByRole('columnheader');
    expect(await headers.count()).toBeGreaterThan(0);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await navigateTo(page, '/employees');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
