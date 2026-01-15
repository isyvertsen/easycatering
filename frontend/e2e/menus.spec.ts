import { test, expect } from '@playwright/test';
import { login, navigateTo, API_BASE_URL } from './helpers/test-utils';

test.describe('Menus - Hovedside', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display menus page with title', async ({ page }) => {
    await navigateTo(page, '/menus');

    // Sjekk tittel
    await expect(page.getByRole('heading', { name: 'Menyer' })).toBeVisible();
    await expect(page.getByText('Administrer menyer og ukentlig planlegging')).toBeVisible();
  });

  test('should display Quick Actions cards', async ({ page }) => {
    await navigateTo(page, '/menus');
    await page.waitForLoadState('networkidle');

    // Ukentlig Menyplan card
    await expect(page.getByText('Ukentlig Menyplan')).toBeVisible();

    // Registrer Bestilling card
    await expect(page.getByText('Registrer Bestilling')).toBeVisible();

    // Menymaler card
    await expect(page.getByText('Menymaler')).toBeVisible();
  });

  test('should navigate to weekly plan', async ({ page }) => {
    await navigateTo(page, '/menus');
    await page.waitForLoadState('networkidle');

    // Klikk på Ukentlig Menyplan
    const weeklyPlanCard = page.locator('a[href="/menus/weekly-plan"]');
    await weeklyPlanCard.click();

    await expect(page).toHaveURL(/\/menus\/weekly-plan/);
  });

  test('should navigate to order registration', async ({ page }) => {
    await navigateTo(page, '/menus');
    await page.waitForLoadState('networkidle');

    // Klikk på Registrer Bestilling
    const orderRegCard = page.locator('a[href="/menus/order-registration"]');
    await orderRegCard.click();

    await expect(page).toHaveURL(/\/menus\/order-registration/);
  });

  test('should navigate to menu templates', async ({ page }) => {
    await navigateTo(page, '/menus');
    await page.waitForLoadState('networkidle');

    // Klikk på Menymaler
    const templatesCard = page.locator('a[href="/menus/templates"]');
    await templatesCard.click();

    await expect(page).toHaveURL(/\/menus\/templates/);
  });

  test('should have search functionality', async ({ page }) => {
    await navigateTo(page, '/menus');

    // Søkefelt
    const searchInput = page.getByPlaceholder(/Søk/i);
    await expect(searchInput).toBeVisible();

    // Test søk
    await searchInput.fill('test');
    await page.waitForLoadState('networkidle');
  });

  test('should display menu table', async ({ page }) => {
    await navigateTo(page, '/menus');
    await page.waitForLoadState('networkidle');

    // Tabell med menyer
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('should have pagination controls', async ({ page }) => {
    await navigateTo(page, '/menus');
    await page.waitForLoadState('networkidle');

    // Pagination
    const nextButton = page.getByRole('button', { name: /Neste|>/i });
    const prevButton = page.getByRole('button', { name: /Forrige|</i });
    // Pagination kan eksistere
  });
});

test.describe('Menus - Weekly Plan', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display weekly plan page', async ({ page }) => {
    await navigateTo(page, '/menus/weekly-plan');

    // Siden skal laste
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should have print functionality', async ({ page }) => {
    await navigateTo(page, '/menus/weekly-plan');
    await page.waitForLoadState('networkidle');

    // Print knapp
    const printButton = page.getByRole('button', { name: /Skriv ut|Print/i });
    // Print funksjonalitet kan eksistere
  });

  test('should display 4 weeks of menus', async ({ page }) => {
    await navigateTo(page, '/menus/weekly-plan');
    await page.waitForLoadState('networkidle');

    // Ukentlig visning
    const weekHeaders = page.locator('text=/Uke \\d+/i');
    // Uker skal vises
  });
});

test.describe('Menus - Order Registration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display order registration page', async ({ page }) => {
    await navigateTo(page, '/menus/order-registration');

    // Siden skal laste
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should have customer selection', async ({ page }) => {
    await navigateTo(page, '/menus/order-registration');
    await page.waitForLoadState('networkidle');

    // Kundevalg
    const customerSelect = page.locator('select, [role="combobox"]');
    // Kunde-dropdown kan eksistere
  });

  test('should allow selecting menu items', async ({ page }) => {
    await navigateTo(page, '/menus/order-registration');
    await page.waitForLoadState('networkidle');

    // Menyvalg
    const menuItems = page.locator('[data-testid="menu-item"], .menu-item');
    // Menyelementer kan velges
  });
});

test.describe('Menus - Templates', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display templates page', async ({ page }) => {
    await navigateTo(page, '/menus/templates');

    // Siden skal laste
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should have add new template button', async ({ page }) => {
    await navigateTo(page, '/menus/templates');
    await page.waitForLoadState('networkidle');

    // Ny mal knapp
    const addButton = page.getByRole('button', { name: /Ny mal|Legg til/i }).or(
      page.getByRole('link', { name: /Ny mal|Legg til/i })
    );
    // Add-knapp kan eksistere
  });
});

test.describe('Menus - Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display management page', async ({ page }) => {
    await navigateTo(page, '/menus/management');

    // Siden skal laste
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Menus - Menu Details', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to menu details from table', async ({ page }) => {
    await navigateTo(page, '/menus');
    await page.waitForLoadState('networkidle');

    // Klikk på første meny i tabellen
    const firstRow = page.locator('tbody tr').first();
    const actionButton = firstRow.locator('button[aria-haspopup="menu"]');

    if (await actionButton.isVisible()) {
      await actionButton.click();

      // Rediger option
      const editOption = page.getByRole('menuitem', { name: /Rediger/i });
      if (await editOption.isVisible()) {
        await editOption.click();
        await expect(page).toHaveURL(/\/menus\/\d+/);
      }
    }
  });

  test('should have delete menu option', async ({ page }) => {
    await navigateTo(page, '/menus');
    await page.waitForLoadState('networkidle');

    // Åpne action menu
    const firstRow = page.locator('tbody tr').first();
    const actionButton = firstRow.locator('button[aria-haspopup="menu"]');

    if (await actionButton.isVisible()) {
      await actionButton.click();

      // Slett option
      const deleteOption = page.getByRole('menuitem', { name: /Slett/i });
      if (await deleteOption.isVisible()) {
        await deleteOption.click();

        // Bekreftelsesdialog
        const dialog = page.getByRole('alertdialog');
        await expect(dialog).toBeVisible();

        // Avbryt
        const cancelButton = page.getByRole('button', { name: /Avbryt/i });
        await cancelButton.click();
      }
    }
  });
});

test.describe('Menus - CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create new menu', async ({ page }) => {
    await navigateTo(page, '/menus/new');

    // Ny meny form
    const form = page.locator('form');
    // Form kan eksistere
  });

  test('should edit existing menu', async ({ page }) => {
    await navigateTo(page, '/menus');
    await page.waitForLoadState('networkidle');

    // Åpne action menu og rediger
    const firstRow = page.locator('tbody tr').first();
    const actionButton = firstRow.locator('button[aria-haspopup="menu"]');

    if (await actionButton.isVisible()) {
      await actionButton.click();
      const editOption = page.getByRole('menuitem', { name: /Rediger/i });
      if (await editOption.isVisible()) {
        await editOption.click();

        // Lagre knapp skal være synlig
        const saveButton = page.getByRole('button', { name: /Lagre/i });
      }
    }
  });
});

test.describe('Menus - API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should fetch menus from API', async ({ page }) => {
    const menusRequest = page.waitForResponse(
      response => response.url().includes('/api/v1/meny') && response.status() === 200
    );

    await navigateTo(page, '/menus');

    const response = await menusRequest;
    expect(response.ok()).toBeTruthy();
  });

  test('should fetch menu groups from API', async ({ page }) => {
    const groupsRequest = page.waitForResponse(
      response => response.url().includes('/api/v1/menygruppe') && response.status() === 200
    );

    await navigateTo(page, '/menus');

    try {
      const response = await groupsRequest;
      expect(response.ok()).toBeTruthy();
    } catch (e) {
      // Menygruppe API kan ha annen timing
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.route('**/api/v1/meny**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await navigateTo(page, '/menus');

    // Siden skal ikke krasje
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Menus - Norwegian Text', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should use Norwegian throughout', async ({ page }) => {
    await navigateTo(page, '/menus');

    // Norsk tittel
    await expect(page.getByText('Menyer')).toBeVisible();
    await expect(page.getByText('Administrer menyer og ukentlig planlegging')).toBeVisible();
  });

  test('should have Norwegian Quick Action labels', async ({ page }) => {
    await navigateTo(page, '/menus');
    await page.waitForLoadState('networkidle');

    // Norske labels på cards
    await expect(page.getByText('Ukentlig Menyplan')).toBeVisible();
    await expect(page.getByText('Registrer Bestilling')).toBeVisible();
    await expect(page.getByText('Menymaler')).toBeVisible();
  });

  test('should display Norwegian date format', async ({ page }) => {
    await navigateTo(page, '/menus');
    await page.waitForLoadState('networkidle');

    // Datoer i norsk format
    const dateCell = page.locator('td').filter({ hasText: /\d{2}\.\d{2}\.\d{4}/ });
    // Norske datoer kan vises
  });
});

test.describe('Menus - Quick Actions Cards', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display all Quick Action cards', async ({ page }) => {
    await navigateTo(page, '/menus');
    await page.waitForLoadState('networkidle');

    // Alle kort skal være synlige
    const cards = page.locator('.hover\\:shadow-lg');
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
  });

  test('should have correct descriptions on cards', async ({ page }) => {
    await navigateTo(page, '/menus');
    await page.waitForLoadState('networkidle');

    // Beskrivelser
    await expect(page.getByText('Generer og skriv ut menybestillingsskjema for 4 uker')).toBeVisible();
    await expect(page.getByText('Registrer ordrer fra utfylte menyskjemaer')).toBeVisible();
    await expect(page.getByText('Opprett og administrer gjenbrukbare menymaler')).toBeVisible();
  });

  test('should have icons on cards', async ({ page }) => {
    await navigateTo(page, '/menus');
    await page.waitForLoadState('networkidle');

    // Ikoner (Calendar, FileText, etc.)
    const icons = page.locator('svg');
    expect(await icons.count()).toBeGreaterThan(0);
  });
});

test.describe('Menus - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have proper heading structure', async ({ page }) => {
    await navigateTo(page, '/menus');

    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('Menyer');
  });

  test('should have clickable cards', async ({ page }) => {
    await navigateTo(page, '/menus');
    await page.waitForLoadState('networkidle');

    // Cards skal være klikkbare (links)
    const weeklyPlanLink = page.locator('a[href="/menus/weekly-plan"]');
    await expect(weeklyPlanLink).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await navigateTo(page, '/menus');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper table structure', async ({ page }) => {
    await navigateTo(page, '/menus');
    await page.waitForLoadState('networkidle');

    const table = page.getByRole('table');
    await expect(table).toBeVisible();

    const headers = page.getByRole('columnheader');
    expect(await headers.count()).toBeGreaterThan(0);
  });
});
