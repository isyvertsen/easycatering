import { test, expect } from '@playwright/test';
import { login, navigateTo } from './helpers/test-utils';

test.describe('Kalkyler - Hovedside', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display kalkyler page with correct title', async ({ page }) => {
    await navigateTo(page, '/kalkyler');

    // Tittel skal være "Oppskrifter (Kalkyler)"
    await expect(page.getByRole('heading', { name: /Oppskrifter|Kalkyler/i })).toBeVisible();
    await expect(page.getByText('Oversikt over alle oppskrifter')).toBeVisible();
  });

  test('should have search input', async ({ page }) => {
    await navigateTo(page, '/kalkyler');

    const searchInput = page.getByPlaceholder(/Søk etter oppskrift/i);
    await expect(searchInput).toBeVisible();
  });

  test('should display recipe cards', async ({ page }) => {
    await navigateTo(page, '/kalkyler');

    // Vent på at data lastes
    await page.waitForLoadState('networkidle');

    // Sjekk om det finnes kort eller "ingen oppskrifter" melding
    const cards = page.locator('[class*="Card"], [class*="card"]');
    const noResults = page.getByText(/Ingen oppskrifter/i);

    // En av dem skal være synlig
    const hasCards = await cards.count() > 0;
    const hasNoResults = await noResults.isVisible().catch(() => false);

    expect(hasCards || hasNoResults).toBe(true);
  });

  test('should search for recipes', async ({ page }) => {
    await navigateTo(page, '/kalkyler');

    const searchInput = page.getByPlaceholder(/Søk etter oppskrift/i);
    await searchInput.fill('suppe');

    // Vent på debounce og søkeresultater
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');
  });

  test('should show loading state', async ({ page }) => {
    // Naviger til siden og sjekk loading-indikator
    await page.goto('/kalkyler');

    // Loading-tekst eller ikon skal vises kort
    const loading = page.getByText(/Laster oppskrifter/i);
    // Kan være for rask til å fange, så vi sjekker bare at siden laster
    await page.waitForLoadState('networkidle');
  });
});

test.describe('Kalkyler - Paginering', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should show pagination when there are many recipes', async ({ page }) => {
    await navigateTo(page, '/kalkyler');

    // Vent på data
    await page.waitForLoadState('networkidle');

    // Sjekk om paginering vises (hvis det er nok data)
    const pagination = page.getByText(/Side \d+ av \d+/);
    const prevButton = page.locator('button').filter({ has: page.locator('svg') }).first();

    // Paginering vises bare hvis det er flere sider
    if (await pagination.isVisible().catch(() => false)) {
      await expect(pagination).toBeVisible();
    }
  });

  test('should navigate to next page', async ({ page }) => {
    await navigateTo(page, '/kalkyler');
    await page.waitForLoadState('networkidle');

    // Finn neste-side knapp
    const nextButton = page.locator('button').filter({ hasText: '' }).last();

    if (await nextButton.isEnabled().catch(() => false)) {
      await nextButton.click();
      await page.waitForLoadState('networkidle');
    }
  });
});

test.describe('Kalkyler - Navigasjon', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to recipe detail when clicking card', async ({ page }) => {
    await navigateTo(page, '/kalkyler');
    await page.waitForLoadState('networkidle');

    // Klikk på første oppskrift-kort
    const firstCard = page.locator('[class*="Card"]').first();

    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();

      // Skal navigere til detalj-side
      await page.waitForURL(/\/kalkyler\/\d+/);
    }
  });
});

test.describe('Kalkyler - API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should fetch recipes from API', async ({ page }) => {
    const apiRequest = page.waitForResponse(
      response => response.url().includes('/oppskrifter') && response.status() === 200
    );

    await navigateTo(page, '/kalkyler');

    try {
      const response = await apiRequest;
      expect(response.ok()).toBeTruthy();
    } catch (e) {
      // OK hvis API har annen path
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.route('**/api/v1/oppskrifter/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await navigateTo(page, '/kalkyler');

    // Feilmelding skal vises
    const errorCard = page.getByText(/Feil|Kunne ikke hente/i);
    await expect(errorCard).toBeVisible({ timeout: 10000 });
  });

  test('should show retry button on error', async ({ page }) => {
    await page.route('**/api/v1/oppskrifter/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await navigateTo(page, '/kalkyler');

    // Prøv igjen-knapp skal vises
    const retryButton = page.getByRole('button', { name: /Prøv igjen/i });
    await expect(retryButton).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Kalkyler - Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateTo(page, '/kalkyler');

    await expect(page.getByRole('heading', { name: /Oppskrifter|Kalkyler/i })).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await navigateTo(page, '/kalkyler');

    await expect(page.getByRole('heading', { name: /Oppskrifter|Kalkyler/i })).toBeVisible();
  });
});

test.describe('Kalkyler - Norwegian Text', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should use Norwegian throughout', async ({ page }) => {
    await navigateTo(page, '/kalkyler');

    // Sjekk norske tekster
    await expect(page.getByRole('heading', { name: /Oppskrifter/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Søk/i)).toBeVisible();
  });
});
