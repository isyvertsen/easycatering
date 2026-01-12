import { test, expect } from '@playwright/test';

test('Debug recipes page', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => console.log('Browser console:', msg.text()));
  page.on('pageerror', err => console.error('Page error:', err));
  
  // Intercept API calls
  page.on('request', request => {
    if (request.url().includes('/rpkalkyle')) {
      console.log('API Request:', request.method(), request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/rpkalkyle')) {
      console.log('API Response:', response.status(), response.url());
    }
  });
  
  // Navigate to recipes page
  console.log('Navigating to recipes page...');
  await page.goto('http://localhost:3001/recipes');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot
  await page.screenshot({ path: 'recipes-page.png', fullPage: true });
  console.log('Screenshot saved as recipes-page.png');
  
  // Check for error messages
  const errorElements = await page.locator('[role="alert"], .error, .text-destructive').all();
  if (errorElements.length > 0) {
    console.log('Error elements found:');
    for (const el of errorElements) {
      console.log('- Error text:', await el.textContent());
    }
  }
  
  // Check for table
  const table = page.locator('table');
  const tableVisible = await table.isVisible();
  console.log('Table visible:', tableVisible);
  
  if (tableVisible) {
    // Count rows
    const rows = await page.locator('tbody tr').all();
    console.log('Number of rows in table:', rows.length);
    
    if (rows.length > 0) {
      // Log first row content
      const firstRow = rows[0];
      console.log('First row content:', await firstRow.textContent());
    }
  }
  
  // Check for loading state
  const loadingElements = await page.locator('.animate-spin, [aria-busy="true"]').all();
  if (loadingElements.length > 0) {
    console.log('Loading elements found - page may still be loading');
  }
  
  // Wait a bit and check again
  await page.waitForTimeout(2000);
  
  // Check final state
  const bodyText = await page.locator('body').textContent();
  console.log('Page contains "Oppskrifter":', bodyText?.includes('Oppskrifter'));
  console.log('Page contains "Ingen":', bodyText?.includes('Ingen'));
  console.log('Page contains error keywords:', bodyText?.includes('error') || bodyText?.includes('Error'));
});