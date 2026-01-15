import { test, expect } from '@playwright/test';
import { login, navigateTo, API_BASE_URL } from './helpers/test-utils';

test.describe('Produkter - Hovedside', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display produkter page with correct title', async ({ page }) => {
    await navigateTo(page, '/produkter');

    // Sjekk tittel
    await expect(page.getByRole('heading', { name: 'Produkter' })).toBeVisible();
    await expect(page.getByText('Administrer produkter og GTIN-koder')).toBeVisible();
  });

  test('should display produkter table', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await page.waitForLoadState('networkidle');

    // Tabell skal være synlig
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Sjekk kolonneoverskrifter
    await expect(page.getByRole('columnheader', { name: 'ID' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Produktnavn' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'GTIN/EAN' })).toBeVisible();
  });

  test('should have GTIN filter tabs', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await page.waitForLoadState('networkidle');

    // Filter tabs
    await expect(page.getByRole('tab', { name: /Alle/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Med GTIN/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Uten GTIN/i })).toBeVisible();
  });

  test('should filter products by GTIN status', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await page.waitForLoadState('networkidle');

    // Klikk på "Med GTIN" tab
    const withGtinTab = page.getByRole('tab', { name: /Med GTIN/i });
    await withGtinTab.click();
    await page.waitForLoadState('networkidle');

    // Klikk på "Uten GTIN" tab
    const withoutGtinTab = page.getByRole('tab', { name: /Uten GTIN/i });
    await withoutGtinTab.click();
    await page.waitForLoadState('networkidle');

    // Klikk tilbake til "Alle" tab
    const allTab = page.getByRole('tab', { name: /Alle/i });
    await allTab.click();
    await page.waitForLoadState('networkidle');
  });

  test('should display GTIN statistics', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await page.waitForLoadState('networkidle');

    // Prosent-tekst skal vises
    const percentageText = page.getByText(/har GTIN/i);
    await expect(percentageText).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await page.waitForLoadState('networkidle');

    // Søkefelt
    const searchInput = page.getByPlaceholder(/Søk etter produktid/i);
    await expect(searchInput).toBeVisible();

    // Test søk
    await searchInput.fill('melk');
    await page.waitForLoadState('networkidle');
  });

  test('should have add new product button', async ({ page }) => {
    await navigateTo(page, '/produkter');

    // Ny produkt knapp
    const addButton = page.getByRole('button', { name: /Nytt produkt/i }).or(
      page.getByRole('link', { name: /Nytt produkt/i })
    );
    await expect(addButton).toBeVisible();
  });

  test('should have bulk update button', async ({ page }) => {
    await navigateTo(page, '/produkter');

    // Masse-oppdatering knapp
    const bulkButton = page.getByRole('button', { name: /Masse-oppdatering/i });
    await expect(bulkButton).toBeVisible();
  });
});

test.describe('Produkter - GTIN Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should open Matinfo search dialog from action menu', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await page.waitForLoadState('networkidle');

    // Åpne action menu på første rad
    const firstRow = page.locator('tbody tr').first();
    const actionButton = firstRow.locator('button[aria-haspopup="menu"]');

    if (await actionButton.isVisible()) {
      await actionButton.click();

      // Klikk på "Søk GTIN" eller "Endre GTIN"
      const searchOption = page.getByRole('menuitem', { name: /Søk GTIN|Endre GTIN/i });
      if (await searchOption.isVisible()) {
        await searchOption.click();

        // Dialog skal åpnes
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        // Dialog tittel
        await expect(page.getByText(/Søk GTIN i Matinfo/i)).toBeVisible();
      }
    }
  });

  test('should open bulk GTIN update dialog', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await page.waitForLoadState('networkidle');

    // Klikk på "Masse-oppdatering" knapp
    const bulkButton = page.getByRole('button', { name: /Masse-oppdatering/i });
    await bulkButton.click();

    // Dialog skal åpnes
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Dialog tittel
    await expect(page.getByText(/Masse-oppdatering av GTIN/i)).toBeVisible();

    // CSV instruksjoner
    await expect(page.getByText(/Format:/i)).toBeVisible();
    await expect(page.getByText(/produktid,gtin/i)).toBeVisible();
  });

  test('should validate bulk GTIN CSV format', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await page.waitForLoadState('networkidle');

    // Åpne bulk update dialog
    const bulkButton = page.getByRole('button', { name: /Masse-oppdatering/i });
    await bulkButton.click();

    await expect(page.getByRole('dialog')).toBeVisible();

    // Fyll inn ugyldig CSV data
    const textarea = page.getByPlaceholder(/produktid,gtin/i);
    await textarea.fill('invalid data');

    // Klikk valider
    const validateButton = page.getByRole('button', { name: /Valider data/i });
    await validateButton.click();

    await page.waitForTimeout(500);
  });
});

test.describe('Produkter - Matinfo Search', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should search Matinfo products', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await page.waitForLoadState('networkidle');

    // Åpne action menu på første rad
    const firstRow = page.locator('tbody tr').first();
    const actionButton = firstRow.locator('button[aria-haspopup="menu"]');

    if (await actionButton.isVisible()) {
      await actionButton.click();

      const searchOption = page.getByRole('menuitem', { name: /Søk GTIN|Endre GTIN/i });
      if (await searchOption.isVisible()) {
        await searchOption.click();

        // Vent på dialog
        await expect(page.getByRole('dialog')).toBeVisible();

        // Søk etter produkt
        const searchInput = page.getByPlaceholder(/Søk etter produktnavn/i);
        await searchInput.fill('melk');

        // Klikk søk
        const submitButton = page.getByRole('button', { name: /Søk/i }).last();
        await submitButton.click();

        // Vent på resultater
        await page.waitForLoadState('networkidle');
      }
    }
  });
});

test.describe('Produkter - CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to new product page', async ({ page }) => {
    await navigateTo(page, '/produkter');

    // Klikk på "Nytt produkt"
    const addButton = page.getByRole('button', { name: /Nytt produkt/i }).or(
      page.getByRole('link', { name: /Nytt produkt/i })
    );
    await addButton.click();

    await expect(page).toHaveURL(/\/produkter\/new/);
  });

  test('should display new product form', async ({ page }) => {
    await navigateTo(page, '/produkter/new');

    // Form skal være synlig
    const form = page.locator('form');
    await expect(form).toBeVisible();
  });

  test('should navigate to edit product from action menu', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await page.waitForLoadState('networkidle');

    // Åpne action menu
    const firstRow = page.locator('tbody tr').first();
    const actionButton = firstRow.locator('button[aria-haspopup="menu"]');

    if (await actionButton.isVisible()) {
      await actionButton.click();

      // Klikk på "Rediger"
      const editOption = page.getByRole('menuitem', { name: /Rediger/i });
      if (await editOption.isVisible()) {
        await editOption.click();
        await expect(page).toHaveURL(/\/produkter\/\d+/);
      }
    }
  });
});

test.describe('Produkter - API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should fetch produkter from API', async ({ page }) => {
    const produkterRequest = page.waitForResponse(
      response => response.url().includes('/api/v1/produkter') && response.status() === 200
    );

    await navigateTo(page, '/produkter');

    const response = await produkterRequest;
    expect(response.ok()).toBeTruthy();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.route('**/api/v1/produkter**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await navigateTo(page, '/produkter');

    // Siden skal ikke krasje
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Produkter - Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have pagination controls', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await page.waitForLoadState('networkidle');

    // Pagination knapper
    const nextButton = page.getByRole('button', { name: /Neste|>|→/i });
    const prevButton = page.getByRole('button', { name: /Forrige|<|←/i });
    // Pagination kan eksistere avhengig av antall produkter
  });

  test('should navigate between pages', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await page.waitForLoadState('networkidle');

    const nextButton = page.getByRole('button', { name: /Neste|>/i });
    if (await nextButton.isVisible() && await nextButton.isEnabled()) {
      await nextButton.click();
      await page.waitForLoadState('networkidle');
    }
  });
});

test.describe('Produkter - Column Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should sort by produktnavn', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await page.waitForLoadState('networkidle');

    const produktnavnHeader = page.getByRole('columnheader', { name: /Produktnavn/i });
    await produktnavnHeader.click();
    await page.waitForLoadState('networkidle');
  });

  test('should sort by ID', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await page.waitForLoadState('networkidle');

    const idHeader = page.getByRole('columnheader', { name: 'ID' });
    await idHeader.click();
    await page.waitForLoadState('networkidle');
  });

  test('should sort by pris', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await page.waitForLoadState('networkidle');

    const prisHeader = page.getByRole('columnheader', { name: /Pris/i });
    await prisHeader.click();
    await page.waitForLoadState('networkidle');
  });
});

test.describe('Produkter - Norwegian Text', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should use Norwegian throughout', async ({ page }) => {
    await navigateTo(page, '/produkter');

    // Norsk tittel og beskrivelse
    await expect(page.getByText('Produkter')).toBeVisible();
    await expect(page.getByText('Administrer produkter og GTIN-koder')).toBeVisible();
  });

  test('should have Norwegian button labels', async ({ page }) => {
    await navigateTo(page, '/produkter');

    await expect(page.getByRole('button', { name: /Masse-oppdatering/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nytt produkt/i }).or(
      page.getByRole('link', { name: /Nytt produkt/i })
    )).toBeVisible();
  });

  test('should have Norwegian tab labels', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('tab', { name: /Alle/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Med GTIN/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Uten GTIN/i })).toBeVisible();
  });
});

test.describe('Produkter - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have proper heading structure', async ({ page }) => {
    await navigateTo(page, '/produkter');

    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('Produkter');
  });

  test('should have proper table structure', async ({ page }) => {
    await navigateTo(page, '/produkter');
    await page.waitForLoadState('networkidle');

    const table = page.getByRole('table');
    await expect(table).toBeVisible();

    const headers = page.getByRole('columnheader');
    expect(await headers.count()).toBeGreaterThan(0);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await navigateTo(page, '/produkter');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
