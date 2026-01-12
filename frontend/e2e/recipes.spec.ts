import { test, expect } from '@playwright/test';
import {
  navigateTo,
  waitForAPI,
  waitForToast,
  fillFormField,
  clickButton,
  expectError,
  expectTableRow,
  deleteTableRow,
  searchTable,
  login
} from './helpers/test-utils';

test.describe('Recipe Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login (with AUTH_BYPASS in dev)
    await login(page);
  });

  test('should display recipe list', async ({ page }) => {
    await navigateTo(page, '/recipes');
    
    // Wait for recipes to load
    await waitForAPI(page, '/rpkalkyle');
    
    // Check page title
    await expect(page.getByRole('heading', { name: 'Oppskrifter' })).toBeVisible();
    
    // Check description
    await expect(page.getByText(/Administrer oppskrifter/i)).toBeVisible();
    
    // Check if table is visible
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    // Check table headers
    await expect(page.getByRole('columnheader', { name: 'Kode' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Navn' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Porsjoner' })).toBeVisible();
  });

  test('should search for recipes', async ({ page }) => {
    await navigateTo(page, '/recipes');
    await waitForAPI(page, '/rpkalkyle');
    
    // Search for a recipe
    await searchTable(page, 'Risgrøt');
    
    // Wait for filtered results
    await waitForAPI(page, '/rpkalkyle');
    
    // Check if search results are displayed
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    
    if (count > 0) {
      // At least one result should contain search term
      const firstRow = rows.first();
      await expect(firstRow).toContainText(/risgrøt/i);
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/oppskrifter', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Database feil oppstod',
          type: 'DatabaseError' 
        })
      });
    });
    
    await navigateTo(page, '/recipes');
    
    // Should show error state
    await expectError(page);
    
    // Should show retry button
    const retryButton = page.getByRole('button', { name: /Prøv igjen/i });
    await expect(retryButton).toBeVisible();
  });

  test('should navigate to recipe details', async ({ page }) => {
    await navigateTo(page, '/recipes');
    await waitForAPI(page, '/rpkalkyle');
    
    // Click on first recipe row
    const firstRow = page.locator('tbody tr').first();
    const recipeName = await firstRow.locator('td').nth(1).textContent();
    
    if (recipeName) {
      await firstRow.click();
      
      // Should navigate to recipe detail page
      await expect(page).toHaveURL(/\/recipes\/\d+/);
      
      // Should show recipe name
      await expect(page.getByRole('heading', { name: recipeName })).toBeVisible();
    }
  });

  test('should create new recipe', async ({ page }) => {
    await navigateTo(page, '/recipes/new');
    
    // Fill recipe form
    await fillFormField(page, 'Navn', 'Test Oppskrift');
    await fillFormField(page, 'Beskrivelse', 'En test oppskrift for E2E testing');
    await fillFormField(page, 'Porsjoner', '4');
    await fillFormField(page, 'Forberedelsestid', '15');
    await fillFormField(page, 'Tilberedningstid', '30');
    
    // Add ingredient
    await clickButton(page, 'Legg til ingrediens');
    await fillFormField(page, 'Ingrediens', 'Mel');
    await fillFormField(page, 'Mengde', '500');
    await fillFormField(page, 'Enhet', 'g');
    
    // Submit form
    await clickButton(page, 'Opprett oppskrift');
    
    // Wait for API response
    await waitForAPI(page, '/rpkalkyle', 'POST');
    
    // Should show success toast
    await waitForToast(page, 'Oppskrift opprettet');
    
    // Should redirect to recipe list or detail
    await expect(page).toHaveURL(/\/recipes/);
  });

  test('should update existing recipe', async ({ page }) => {
    // Navigate to a specific recipe
    await navigateTo(page, '/recipes/2'); // Assuming recipe with ID 2 exists
    
    // Wait for recipe to load
    await waitForAPI(page, '/rpkalkyle/2');
    
    // Click edit button
    await clickButton(page, 'Rediger');
    
    // Update recipe name
    const nameField = page.getByLabel('Navn');
    await nameField.clear();
    await nameField.fill('Oppdatert Oppskrift');
    
    // Save changes
    await clickButton(page, 'Lagre endringer');
    
    // Wait for API response
    await waitForAPI(page, '/rpkalkyle/2', 'PUT');
    
    // Should show success toast
    await waitForToast(page, 'Oppskrift oppdatert');
  });

  test('should delete recipe with confirmation', async ({ page }) => {
    await navigateTo(page, '/recipes');
    await waitForAPI(page, '/rpkalkyle');
    
    // Get first recipe name for verification
    const firstRow = page.locator('tbody tr').first();
    const recipeName = await firstRow.locator('td').nth(1).textContent();
    
    if (recipeName) {
      // Click delete button
      await deleteTableRow(page, recipeName);
      
      // Confirmation dialog should appear
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(/Er du sikker/i);
      
      // Confirm deletion
      await clickButton(page, 'Slett');
      
      // Wait for API response
      await waitForAPI(page, '/rpkalkyle', 'DELETE');
      
      // Should show success toast
      await waitForToast(page, 'Oppskrift slettet');
      
      // Recipe should be removed from list
      await expect(firstRow).not.toContainText(recipeName);
    }
  });

  test('should handle form validation', async ({ page }) => {
    await navigateTo(page, '/recipes/new');
    
    // Try to submit empty form
    await clickButton(page, 'Opprett oppskrift');
    
    // Should show validation errors
    await expectError(page, 'Navn er påkrevd');
    
    // Fill only name
    await fillFormField(page, 'Navn', 'Test');
    
    // Try to add ingredient without required fields
    await clickButton(page, 'Legg til ingrediens');
    await clickButton(page, 'Lagre ingrediens');
    
    // Should show ingredient validation error
    await expectError(page, 'Ingrediensnavn er påkrevd');
  });

  test('should filter recipes by category', async ({ page }) => {
    await navigateTo(page, '/recipes');
    await waitForAPI(page, '/rpkalkyle');
    
    // Open filter dropdown
    const filterButton = page.getByRole('button', { name: /Filter/i });
    if (await filterButton.isVisible()) {
      await filterButton.click();
      
      // Select a category
      const categoryOption = page.getByRole('option', { name: /Hovedrett/i });
      if (await categoryOption.isVisible()) {
        await categoryOption.click();
        
        // Wait for filtered results
        await waitForAPI(page, '/rpkalkyle');
        
        // All visible recipes should be in selected category
        const rows = page.locator('tbody tr');
        const count = await rows.count();
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  test('should paginate recipe list', async ({ page }) => {
    await navigateTo(page, '/recipes');
    await waitForAPI(page, '/rpkalkyle');
    
    // Check if pagination controls exist
    const pagination = page.locator('[aria-label="Pagination"], .pagination');
    
    if (await pagination.isVisible()) {
      // Click next page
      const nextButton = page.getByRole('button', { name: /Neste|Next/i });
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        
        // Wait for new page to load
        await waitForAPI(page, '/rpkalkyle');
        
        // URL should update with page parameter
        await expect(page).toHaveURL(/page=2/);
      }
    }
  });

  test('should export recipe to PDF', async ({ page }) => {
    await navigateTo(page, '/recipes/2');
    await waitForAPI(page, '/rpkalkyle/2');
    
    // Click export button
    const exportButton = page.getByRole('button', { name: /Eksporter|Export/i });
    if (await exportButton.isVisible()) {
      // Start waiting for download
      const downloadPromise = page.waitForEvent('download');
      
      await exportButton.click();
      
      // Select PDF option if dropdown appears
      const pdfOption = page.getByRole('option', { name: /PDF/i });
      if (await pdfOption.isVisible()) {
        await pdfOption.click();
      }
      
      // Wait for download to start
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('.pdf');
    }
  });

  test('should calculate recipe cost', async ({ page }) => {
    await navigateTo(page, '/recipes/2');
    await waitForAPI(page, '/rpkalkyle/2');
    
    // Click calculate cost button
    const costButton = page.getByRole('button', { name: /Beregn kostnad/i });
    if (await costButton.isVisible()) {
      await costButton.click();
      
      // Wait for cost calculation
      await waitForAPI(page, '/rpkalkyle/2/cost');
      
      // Cost should be displayed
      const costElement = page.locator('[data-testid="recipe-cost"], .recipe-cost');
      await expect(costElement).toBeVisible();
      await expect(costElement).toContainText(/kr/i);
    }
  });

  test('should duplicate recipe', async ({ page }) => {
    await navigateTo(page, '/recipes/2');
    await waitForAPI(page, '/rpkalkyle/2');
    
    // Click duplicate button
    const duplicateButton = page.getByRole('button', { name: /Dupliser/i });
    if (await duplicateButton.isVisible()) {
      await duplicateButton.click();
      
      // Enter new name in dialog
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      
      await fillFormField(page, 'Nytt navn', 'Kopi av oppskrift');
      await clickButton(page, 'Dupliser');
      
      // Wait for API response
      await waitForAPI(page, '/rpkalkyle/2/duplicate', 'POST');
      
      // Should show success toast
      await waitForToast(page, 'Oppskrift duplisert');
      
      // Should redirect to new recipe
      await expect(page).toHaveURL(/\/recipes\/\d+/);
      await expect(page.getByRole('heading')).toContainText('Kopi av oppskrift');
    }
  });
});

test.describe('Recipe Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await navigateTo(page, '/recipes');
    
    // Check main navigation
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
    
    // Check table accessibility
    const table = page.getByRole('table');
    await expect(table).toHaveAttribute('aria-label');
    
    // Check form labels
    await navigateTo(page, '/recipes/new');
    
    const nameInput = page.getByLabel('Navn');
    await expect(nameInput).toBeVisible();
    
    // Check button accessibility
    const submitButton = page.getByRole('button', { name: /Opprett/i });
    await expect(submitButton).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await navigateTo(page, '/recipes');
    
    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check focused element
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Navigate with arrow keys in table
    const table = page.locator('table');
    if (await table.isVisible()) {
      await table.focus();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      
      // Should navigate to detail page
      await expect(page).toHaveURL(/\/recipes\/\d+/);
    }
  });
});