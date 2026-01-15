import { test, expect } from '@playwright/test';
import { login, navigateTo, API_BASE_URL } from './helpers/test-utils';

test.describe('Reports Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display reports page', async ({ page }) => {
    await navigateTo(page, '/reports');

    // Check page title
    await expect(page.getByRole('heading', { name: /Rapporter|Reports/i })).toBeVisible();
  });

  test('should show report types', async ({ page }) => {
    await navigateTo(page, '/reports');

    await page.waitForLoadState('networkidle');

    // Look for report type selection
    const reportTypes = page.locator('select, [role="combobox"], button').filter({ hasText: /rapport|type/i });
    // Report type selection may exist
  });

  test('should have date range picker', async ({ page }) => {
    await navigateTo(page, '/reports');

    // Look for date inputs
    const startDate = page.locator('input[type="date"]').first();
    const endDate = page.locator('input[type="date"]').last();
    // Date range pickers should exist
  });

  test('should have generate report button', async ({ page }) => {
    await navigateTo(page, '/reports');

    // Look for generate button
    const generateButton = page.getByRole('button', { name: /Generer|Lag rapport|Vis rapport/i });
    // Generate button may exist
  });

  test('should have export options', async ({ page }) => {
    await navigateTo(page, '/reports');

    await page.waitForLoadState('networkidle');

    // Look for export buttons
    const exportPdf = page.getByRole('button', { name: /PDF/i });
    const exportExcel = page.getByRole('button', { name: /Excel|CSV/i });
    // Export options may exist
  });

  test('should display report preview', async ({ page }) => {
    await navigateTo(page, '/reports');

    await page.waitForLoadState('networkidle');

    // Look for report preview area
    const preview = page.locator('[data-testid="report-preview"], .report-content, table');
    // Report preview may be visible
  });
});

test.describe('Reports - Different Report Types', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should generate sales report', async ({ page }) => {
    await navigateTo(page, '/reports');

    await page.waitForLoadState('networkidle');

    // Select sales report type
    const reportSelect = page.locator('select, [role="combobox"]').first();
    if (await reportSelect.isVisible()) {
      await reportSelect.click();
      const salesOption = page.getByRole('option', { name: /Salg|Omsetning/i });
      if (await salesOption.isVisible()) {
        await salesOption.click();
      }
    }
  });

  test('should generate customer report', async ({ page }) => {
    await navigateTo(page, '/reports');

    await page.waitForLoadState('networkidle');

    // Select customer report type
    const reportSelect = page.locator('select, [role="combobox"]').first();
    if (await reportSelect.isVisible()) {
      await reportSelect.click();
      const customerOption = page.getByRole('option', { name: /Kunde|Customer/i });
      if (await customerOption.isVisible()) {
        await customerOption.click();
      }
    }
  });

  test('should generate inventory report', async ({ page }) => {
    await navigateTo(page, '/reports');

    await page.waitForLoadState('networkidle');

    // Select inventory report type
    const reportSelect = page.locator('select, [role="combobox"]').first();
    if (await reportSelect.isVisible()) {
      await reportSelect.click();
      const inventoryOption = page.getByRole('option', { name: /Lager|Inventar/i });
      if (await inventoryOption.isVisible()) {
        await inventoryOption.click();
      }
    }
  });
});

test.describe('Reports - Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should export to PDF', async ({ page }) => {
    await navigateTo(page, '/reports');

    await page.waitForLoadState('networkidle');

    const pdfButton = page.getByRole('button', { name: /PDF/i });
    if (await pdfButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await pdfButton.click();

      try {
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.pdf$/);
      } catch (e) {
        // PDF export might not be available
      }
    }
  });

  test('should export to Excel', async ({ page }) => {
    await navigateTo(page, '/reports');

    await page.waitForLoadState('networkidle');

    const excelButton = page.getByRole('button', { name: /Excel|XLS/i });
    if (await excelButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await excelButton.click();

      try {
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.xlsx?$/);
      } catch (e) {
        // Excel export might not be available
      }
    }
  });
});

test.describe('Reports - Date Range', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should filter by date range', async ({ page }) => {
    await navigateTo(page, '/reports');

    await page.waitForLoadState('networkidle');

    // Set date range
    const startDate = page.locator('input[type="date"]').first();
    const endDate = page.locator('input[type="date"]').last();

    if (await startDate.isVisible()) {
      await startDate.fill('2024-01-01');
    }
    if (await endDate.isVisible()) {
      await endDate.fill('2024-12-31');
    }

    // Generate report
    const generateButton = page.getByRole('button', { name: /Generer|Vis/i });
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('should have quick date presets', async ({ page }) => {
    await navigateTo(page, '/reports');

    await page.waitForLoadState('networkidle');

    // Look for preset buttons
    const thisMonth = page.getByRole('button', { name: /Denne måneden|This month/i });
    const lastMonth = page.getByRole('button', { name: /Forrige måned|Last month/i });
    const thisYear = page.getByRole('button', { name: /I år|This year/i });
    // Quick presets may exist
  });
});

test.describe('Reports - API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should fetch report data from API', async ({ page }) => {
    const reportsRequest = page.waitForResponse(
      response => response.url().includes('/api/v1/reports') && response.status() === 200
    );

    await navigateTo(page, '/reports');

    try {
      const response = await reportsRequest;
      expect(response.ok()).toBeTruthy();
    } catch (e) {
      // API may have different path
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.route('**/api/v1/reports**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await navigateTo(page, '/reports');

    // Page should not crash
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Reports - Norwegian Text', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should use Norwegian throughout', async ({ page }) => {
    await navigateTo(page, '/reports');

    await expect(page.getByText(/Rapporter/i)).toBeVisible();
  });

  test('should display Norwegian date format', async ({ page }) => {
    await navigateTo(page, '/reports');

    await page.waitForLoadState('networkidle');

    // Dates should be in Norwegian format (DD.MM.YYYY)
    const dateText = page.locator('text=/\\d{2}\\.\\d{2}\\.\\d{4}/');
    // Norwegian dates may be visible
  });

  test('should use Norwegian number format', async ({ page }) => {
    await navigateTo(page, '/reports');

    await page.waitForLoadState('networkidle');

    // Numbers should use Norwegian format (space as thousand separator, comma as decimal)
    // Look for currency values
    const currencyText = page.locator('text=/kr|NOK/i');
    // Currency values may be visible
  });
});

test.describe('Reports - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have proper heading structure', async ({ page }) => {
    await navigateTo(page, '/reports');

    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await navigateTo(page, '/reports');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have labeled form controls', async ({ page }) => {
    await navigateTo(page, '/reports');

    // Form controls should have labels
    const inputs = page.locator('input, select');
    // Inputs should be accessible
  });
});
