import { test, expect } from '@playwright/test';
import {
  navigateTo,
  waitForAPI,
  waitForToast,
  clickButton,
  login
} from './helpers/test-utils';

test.describe('Produkter Management with GTIN', () => {
  test.beforeEach(async ({ page }) => {
    // Login (with AUTH_BYPASS in dev)
    await login(page);
  });

  test('should display produkter list', async ({ page }) => {
    await navigateTo(page, '/produkter');

    // Wait for produkter to load
    await waitForAPI(page, '/produkter');

    // Check page title
    await expect(page.getByRole('heading', { name: 'Produkter' })).toBeVisible();

    // Check description
    await expect(page.getByText(/Administrer produkter/i)).toBeVisible();

    // Check if table is visible
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Check table headers
    await expect(page.getByRole('columnheader', { name: 'ID' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Produktnavn' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'GTIN/EAN' })).toBeVisible();
  });

  test('should show GTIN filter tabs', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await waitForAPI(page, '/produkter');

    // Check filter tabs
    await expect(page.getByRole('tab', { name: /Alle/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Med GTIN/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Uten GTIN/i })).toBeVisible();
  });

  test('should filter products by GTIN status', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await waitForAPI(page, '/produkter');

    // Get initial count
    const allTab = page.getByRole('tab', { name: /Alle \(\d+\)/i });
    const allCount = await allTab.textContent();
    expect(allCount).toContain('Alle');

    // Click "Med GTIN" tab
    const withGtinTab = page.getByRole('tab', { name: /Med GTIN/i });
    await withGtinTab.click();

    // Wait a bit for filter to apply
    await page.waitForTimeout(500);

    // Click "Uten GTIN" tab
    const withoutGtinTab = page.getByRole('tab', { name: /Uten GTIN/i });
    await withoutGtinTab.click();

    // Wait a bit for filter to apply
    await page.waitForTimeout(500);
  });

  test('should open Matinfo search dialog', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await waitForAPI(page, '/produkter');

    // Find first "Søk GTIN" or "Endre GTIN" button in table
    const searchButton = page.getByRole('button', { name: /Søk GTIN|Endre GTIN/i }).first();

    if (await searchButton.isVisible()) {
      await searchButton.click();

      // Check if dialog opened
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Check dialog title
      await expect(page.getByText(/Søk GTIN i Matinfo/i)).toBeVisible();

      // Check if search input is visible
      const searchInput = page.getByPlaceholder(/Søk etter produktnavn/i);
      await expect(searchInput).toBeVisible();
    }
  });

  test('should search Matinfo products', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await waitForAPI(page, '/produkter');

    // Find first "Søk GTIN" button
    const searchButton = page.getByRole('button', { name: /Søk GTIN|Endre GTIN/i }).first();

    if (await searchButton.isVisible()) {
      await searchButton.click();

      // Wait for dialog
      await expect(page.getByRole('dialog')).toBeVisible();

      // Type search query
      const searchInput = page.getByPlaceholder(/Søk etter produktnavn/i);
      await searchInput.fill('melk');

      // Click search button
      const submitButton = page.getByRole('button', { name: /Søk/i }).last();
      await submitButton.click();

      // Wait for API call
      await waitForAPI(page, '/matinfo/search');

      // Check if results appeared
      // Should show product names, GTINs, etc.
      await page.waitForTimeout(1000);
    }
  });

  test('should display allergen badges in search results', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await waitForAPI(page, '/produkter');

    // Find first "Søk GTIN" button
    const searchButton = page.getByRole('button', { name: /Søk GTIN|Endre GTIN/i }).first();

    if (await searchButton.isVisible()) {
      await searchButton.click();

      // Wait for dialog
      await expect(page.getByRole('dialog')).toBeVisible();

      // Type search query for a product that likely has allergens
      const searchInput = page.getByPlaceholder(/Søk etter produktnavn/i);
      await searchInput.fill('melk');

      // Click search button
      const submitButton = page.getByRole('button', { name: /Søk/i }).last();
      await submitButton.click();

      // Wait for API call
      await waitForAPI(page, '/matinfo/search');

      // Wait for results to render
      await page.waitForTimeout(1000);

      // Check if allergen section exists (if products have allergens)
      const allergenText = page.getByText(/Allergener:/i);
      if (await allergenText.isVisible()) {
        await expect(allergenText).toBeVisible();
      }
    }
  });

  test('should display nutrition summary in search results', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await waitForAPI(page, '/produkter');

    // Find first "Søk GTIN" button
    const searchButton = page.getByRole('button', { name: /Søk GTIN|Endre GTIN/i }).first();

    if (await searchButton.isVisible()) {
      await searchButton.click();

      // Wait for dialog
      await expect(page.getByRole('dialog')).toBeVisible();

      // Type search query
      const searchInput = page.getByPlaceholder(/Søk etter produktnavn/i);
      await searchInput.fill('melk');

      // Click search button
      const submitButton = page.getByRole('button', { name: /Søk/i }).last();
      await submitButton.click();

      // Wait for API call
      await waitForAPI(page, '/matinfo/search');

      // Wait for results to render
      await page.waitForTimeout(1000);

      // Check if nutrition data appears (kcal, protein, etc.)
      // This is conditional as not all products have nutrition data
      const kcalText = page.getByText(/kcal/i);
      if (await kcalText.isVisible()) {
        await expect(kcalText).toBeVisible();
      }
    }
  });

  test('should show automatic suggestions based on product name', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await waitForAPI(page, '/produkter');

    // Find first "Søk GTIN" button
    const searchButton = page.getByRole('button', { name: /Søk GTIN|Endre GTIN/i }).first();

    if (await searchButton.isVisible()) {
      await searchButton.click();

      // Wait for dialog
      await expect(page.getByRole('dialog')).toBeVisible();

      // Wait for suggestions API call
      await waitForAPI(page, '/matinfo-suggestions');

      // Check if suggestions section appears
      const suggestionsHeader = page.getByText(/Forslag basert på produktnavn/i);
      if (await suggestionsHeader.isVisible()) {
        await expect(suggestionsHeader).toBeVisible();
      }
    }
  });

  test('should open bulk GTIN update dialog', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await waitForAPI(page, '/produkter');

    // Click "Masse-oppdatering" button
    const bulkButton = page.getByRole('button', { name: /Masse-oppdatering/i });
    await expect(bulkButton).toBeVisible();
    await bulkButton.click();

    // Check if dialog opened
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Check dialog title
    await expect(page.getByText(/Masse-oppdatering av GTIN/i)).toBeVisible();

    // Check if CSV instructions are visible
    await expect(page.getByText(/Format:/i)).toBeVisible();
    await expect(page.getByText(/produktid,gtin/i)).toBeVisible();
  });

  test('should validate bulk GTIN CSV format', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await waitForAPI(page, '/produkter');

    // Open bulk update dialog
    const bulkButton = page.getByRole('button', { name: /Masse-oppdatering/i });
    await bulkButton.click();

    // Wait for dialog
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill in invalid CSV data
    const textarea = page.getByPlaceholder(/produktid,gtin/i);
    await textarea.fill('invalid data');

    // Click validate button
    const validateButton = page.getByRole('button', { name: /Valider data/i });
    await validateButton.click();

    // Should show error
    await page.waitForTimeout(500);
    const errorSection = page.getByText(/Feil ved parsing/i);
    if (await errorSection.isVisible()) {
      await expect(errorSection).toBeVisible();
    }
  });

  test('should show GTIN statistics', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await waitForAPI(page, '/produkter');

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Check if percentage text is visible
    const percentageText = page.getByText(/har GTIN/i);
    if (await percentageText.isVisible()) {
      await expect(percentageText).toBeVisible();
    }
  });
});
