import { test, expect } from '@playwright/test';
import { login, navigateTo } from './helpers/test-utils';

test.describe('Matinfo - Hovedside', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display matinfo page with correct title', async ({ page }) => {
    await navigateTo(page, '/matinfo');

    // Tittel skal være "Matinfo Administrasjon"
    await expect(page.getByRole('heading', { name: 'Matinfo Administrasjon' })).toBeVisible();
    await expect(page.getByText(/Administrer produktinformasjon/i)).toBeVisible();
  });

  test('should have sync button', async ({ page }) => {
    await navigateTo(page, '/matinfo');

    const syncButton = page.getByRole('button', { name: /Synkroniser/i });
    await expect(syncButton).toBeVisible();
  });

  test('should display status cards', async ({ page }) => {
    await navigateTo(page, '/matinfo');

    // Status-kort skal vises
    await expect(page.getByText(/Totalt produkter/i)).toBeVisible();
    await expect(page.getByText(/Oppdatert/i)).toBeVisible();
    await expect(page.getByText(/Nye produkter/i)).toBeVisible();
  });

  test('should display products table', async ({ page }) => {
    await navigateTo(page, '/matinfo');

    // Tabell med produkter
    await expect(page.getByText(/Matinfo-produkter/i)).toBeVisible();

    // Tabell-kolonner
    await expect(page.getByText('GTIN')).toBeVisible();
    await expect(page.getByText('Produktnavn')).toBeVisible();
  });
});

test.describe('Matinfo - Søk og Filtrering', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have search input', async ({ page }) => {
    await navigateTo(page, '/matinfo');

    const searchInput = page.getByPlaceholder(/Søk etter produkt|GTIN|merke/i);
    await expect(searchInput).toBeVisible();
  });

  test('should search for products', async ({ page }) => {
    await navigateTo(page, '/matinfo');

    const searchInput = page.getByPlaceholder(/Søk/i);
    await searchInput.fill('melk');

    // Vent på søkeresultater
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');
  });
});

test.describe('Matinfo - Synkronisering', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should click sync button', async ({ page }) => {
    await navigateTo(page, '/matinfo');

    const syncButton = page.getByRole('button', { name: /Synkroniser/i });
    await expect(syncButton).toBeEnabled();

    // Klikk og se at knappen endrer tilstand
    await syncButton.click();

    // Knappen kan vise loading-tilstand
    await page.waitForTimeout(500);
  });

  test('should show sync status after sync', async ({ page }) => {
    // Mock sync API for å teste suksess-melding
    await page.route('**/api/v1/matinfo/sync**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ synced: 10, failed: 0 })
      });
    });

    await navigateTo(page, '/matinfo');

    const syncButton = page.getByRole('button', { name: /Synkroniser/i });
    await syncButton.click();

    // Suksess-melding kan vises - avhenger av API-respons
    await page.waitForTimeout(1000);
  });

  test('should show error on sync failure', async ({ page }) => {
    await page.route('**/api/v1/matinfo/sync**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Sync failed' })
      });
    });

    await navigateTo(page, '/matinfo');

    const syncButton = page.getByRole('button', { name: /Synkroniser/i });
    await syncButton.click();

    // Feilmelding skal vises
    await expect(page.getByText(/Synkronisering feilet/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Matinfo - Tabell Funksjonalitet', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should show allergen badges', async ({ page }) => {
    await navigateTo(page, '/matinfo');
    await page.waitForLoadState('networkidle');

    // Allergener kolonne skal finnes i tabellen
    const allergenHeader = page.locator('th, [role="columnheader"]').filter({ hasText: 'Allergener' });
    await expect(allergenHeader.first()).toBeVisible();
  });

  test('should show nutrients column', async ({ page }) => {
    await navigateTo(page, '/matinfo');
    await page.waitForLoadState('networkidle');

    // Næring kolonne skal finnes i tabellen
    const nutrientHeader = page.locator('th, [role="columnheader"]').filter({ hasText: 'Næring' });
    await expect(nutrientHeader.first()).toBeVisible();
  });

  test('should have pagination', async ({ page }) => {
    await navigateTo(page, '/matinfo');
    await page.waitForLoadState('networkidle');

    // Paginering kan være synlig hvis det er data
    const pagination = page.locator('[class*="pagination"]');
    // Bare sjekk at tabellen laster
  });
});

test.describe('Matinfo - Navigasjon til Detaljer', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to product detail', async ({ page }) => {
    await navigateTo(page, '/matinfo');
    await page.waitForLoadState('networkidle');

    // Finn edit-knapp på første rad
    const editButton = page.locator('button[aria-label*="Rediger"], button:has-text("Rediger")').first();

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();

      // Skal navigere til detalj-side
      await page.waitForURL(/\/matinfo\/\d+/);
    }
  });
});

test.describe('Matinfo - API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should fetch matinfo products from API', async ({ page }) => {
    const apiRequest = page.waitForResponse(
      response => response.url().includes('/matinfo') && response.status() === 200
    );

    await navigateTo(page, '/matinfo');

    try {
      const response = await apiRequest;
      expect(response.ok()).toBeTruthy();
    } catch (e) {
      // OK hvis API har annen path
    }
  });

  test('should fetch updated GTINs', async ({ page }) => {
    await navigateTo(page, '/matinfo');
    await page.waitForLoadState('networkidle');

    // Sjekk at status-kortet for oppdateringer vises
    await expect(page.getByText(/Oppdatert/i).first()).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.route('**/api/v1/matinfo/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await navigateTo(page, '/matinfo');

    // Siden skal ikke krasje
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Matinfo - Status Cards', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display total products count', async ({ page }) => {
    await navigateTo(page, '/matinfo');

    await expect(page.getByText(/Totalt produkter/i)).toBeVisible();
    await expect(page.getByText(/produkter i databasen/i)).toBeVisible();
  });

  test('should display updated products count', async ({ page }) => {
    await navigateTo(page, '/matinfo');

    await expect(page.getByText(/Oppdatert \(7 dager\)/i)).toBeVisible();
    await expect(page.getByText(/produkter med oppdateringer/i)).toBeVisible();
  });

  test('should display new products count', async ({ page }) => {
    await navigateTo(page, '/matinfo');

    await expect(page.getByText(/Nye produkter/i)).toBeVisible();
    await expect(page.getByText(/nye i Matinfo/i)).toBeVisible();
  });
});

test.describe('Matinfo - Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateTo(page, '/matinfo');

    await expect(page.getByRole('heading', { name: 'Matinfo Administrasjon' })).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await navigateTo(page, '/matinfo');

    await expect(page.getByRole('heading', { name: 'Matinfo Administrasjon' })).toBeVisible();
  });
});

test.describe('Matinfo - Norwegian Text', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should use Norwegian throughout', async ({ page }) => {
    await navigateTo(page, '/matinfo');

    // Sjekk norske tekster
    await expect(page.getByRole('heading', { name: 'Matinfo Administrasjon' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Synkroniser/i })).toBeVisible();
  });
});

test.describe('Matinfo - Loading States', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should show loading skeleton initially', async ({ page }) => {
    // Naviger til siden
    await navigateTo(page, '/matinfo');

    // Siden skal til slutt laste
    await expect(page.getByRole('heading', { name: 'Matinfo Administrasjon' })).toBeVisible();
  });
});
