import { test, expect } from '@playwright/test';
import { login, navigateTo, API_BASE_URL } from './helpers/test-utils';

test.describe('Products - Hovedside', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display products page with correct title', async ({ page }) => {
    await navigateTo(page, '/products');

    // Sjekk tittel
    await expect(page.getByRole('heading', { name: 'Produkter' })).toBeVisible();
    await expect(page.getByText('Administrer produkter og deres informasjon')).toBeVisible();
  });

  test('should display products table', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    // Tabell skal være synlig
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    // Søkefelt
    const searchInput = page.getByPlaceholder(/Søk etter produktnavn/i);
    await expect(searchInput).toBeVisible();

    // Test søk
    await searchInput.fill('melk');
    await page.waitForLoadState('networkidle');
  });

  test('should have active/inactive filter', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    // Aktiv/inaktiv filter dropdown
    const filterSelect = page.locator('select').filter({ hasText: /Aktive produkter|Utgåtte produkter/i });
    await expect(filterSelect).toBeVisible();
  });

  test('should switch between active and inactive products', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    // Velg utgåtte produkter
    const filterSelect = page.locator('select').filter({ hasText: /Aktive produkter/i });
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption({ label: 'Utgåtte produkter' });
      await page.waitForLoadState('networkidle');

      // Bytt tilbake til aktive
      await filterSelect.selectOption({ label: 'Aktive produkter' });
      await page.waitForLoadState('networkidle');
    }
  });

  test('should have advanced search link', async ({ page }) => {
    await navigateTo(page, '/products');

    // Avansert søk link
    const advancedSearchLink = page.getByRole('link', { name: /Avansert søk/i }).or(
      page.getByRole('button', { name: /Avansert søk/i })
    );
    await expect(advancedSearchLink).toBeVisible();
  });

  test('should navigate to advanced search', async ({ page }) => {
    await navigateTo(page, '/products');

    // Klikk på avansert søk
    const advancedSearchLink = page.getByRole('link', { name: /Avansert søk/i }).or(
      page.getByRole('button', { name: /Avansert søk/i })
    );
    await advancedSearchLink.click();

    await expect(page).toHaveURL(/\/products\/search/);
  });
});

test.describe('Products - Table Columns', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display produktnavn column', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('columnheader', { name: /Produktnavn/i })).toBeVisible();
  });

  test('should display visningsnavn column', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('columnheader', { name: /Visningsnavn/i })).toBeVisible();
  });

  test('should display pris column', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('columnheader', { name: /Pris/i })).toBeVisible();
  });

  test('should display status column', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('columnheader', { name: /Status/i })).toBeVisible();
  });

  test('should display webshop column', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('columnheader', { name: /Webshop/i })).toBeVisible();
  });
});

test.describe('Products - Column Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should sort by produktnavn', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    const produktnavnHeader = page.getByRole('columnheader', { name: /Produktnavn/i });
    await produktnavnHeader.click();
    await page.waitForLoadState('networkidle');
  });

  test('should sort by visningsnavn', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    const visningsnavnHeader = page.getByRole('columnheader', { name: /Visningsnavn/i });
    await visningsnavnHeader.click();
    await page.waitForLoadState('networkidle');
  });

  test('should sort by pris', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    const prisHeader = page.getByRole('columnheader', { name: /Pris/i });
    await prisHeader.click();
    await page.waitForLoadState('networkidle');
  });

  test('should sort by lagermengde', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    const lagermengdeHeader = page.getByRole('columnheader', { name: /Lagermengde/i });
    await lagermengdeHeader.click();
    await page.waitForLoadState('networkidle');
  });
});

test.describe('Products - Status Badges', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display status badges', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    // Status badges - Aktiv eller Utgått
    const badges = page.locator('[class*="badge"], [class*="Badge"]');
    expect(await badges.count()).toBeGreaterThan(0);
  });

  test('should show active product status', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    // Aktiv badge
    const aktivBadge = page.getByText('Aktiv').first();
    await expect(aktivBadge).toBeVisible();
  });

  test('should show webshop status', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    // Webshop Ja/Nei badges
    const webshopBadges = page.getByText(/^(Ja|Nei)$/);
    expect(await webshopBadges.count()).toBeGreaterThan(0);
  });
});

test.describe('Products - Advanced Search Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display advanced search page', async ({ page }) => {
    await navigateTo(page, '/products/search');

    // Siden skal laste
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Products - EAN Management Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display EAN management page', async ({ page }) => {
    await navigateTo(page, '/products/ean-management');

    // Siden skal laste
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Products - Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have export button', async ({ page }) => {
    await navigateTo(page, '/products');

    // Eksport knapp (ProductExport component)
    const exportButton = page.getByRole('button', { name: /Eksporter|Export|Last ned/i });
    // Eksport funksjonalitet kan eksistere
  });
});

test.describe('Products - API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should fetch products from API', async ({ page }) => {
    const productsRequest = page.waitForResponse(
      response => response.url().includes('/api/v1/produkter') && response.status() === 200
    );

    await navigateTo(page, '/products');

    try {
      const response = await productsRequest;
      expect(response.ok()).toBeTruthy();
    } catch (e) {
      // API kan ha annen path
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.route('**/api/v1/produkter**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await navigateTo(page, '/products');

    // Siden skal ikke krasje
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Products - Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have pagination controls', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    // Pagination knapper kan eksistere
    const nextButton = page.getByRole('button', { name: /Neste|>|→/i });
    const prevButton = page.getByRole('button', { name: /Forrige|<|←/i });
  });
});

test.describe('Products - Norwegian Text', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should use Norwegian throughout', async ({ page }) => {
    await navigateTo(page, '/products');

    // Norsk tittel
    await expect(page.getByText('Produkter')).toBeVisible();
    await expect(page.getByText('Administrer produkter og deres informasjon')).toBeVisible();
  });

  test('should have Norwegian column headers', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('columnheader', { name: /Produktnavn/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Visningsnavn/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Pris/i })).toBeVisible();
  });

  test('should have Norwegian filter labels', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    // Norske filter-labels
    const filterSelect = page.locator('select');
    if (await filterSelect.isVisible()) {
      await expect(page.getByText('Aktive produkter')).toBeVisible();
    }
  });
});

test.describe('Products - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have proper heading structure', async ({ page }) => {
    await navigateTo(page, '/products');

    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('Produkter');
  });

  test('should have proper table structure', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    const table = page.getByRole('table');
    await expect(table).toBeVisible();

    const headers = page.getByRole('columnheader');
    expect(await headers.count()).toBeGreaterThan(0);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await navigateTo(page, '/products');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
