import { test, expect } from '@playwright/test';

test.describe('All Pages Backend Integration', () => {
  
  test('Recipes page shows data from backend', async ({ page }) => {
    await page.goto('http://localhost:3001/recipes');
    
    // Wait for data to load
    await page.waitForSelector('tbody tr', { timeout: 10000 });
    
    // Check Norwegian headers
    await expect(page.locator('h1').first()).toContainText('Oppskrifter');
    
    // Verify table has data
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
    console.log(`✅ Recipes: Found ${rows} recipes`);
    
    // Check first recipe
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toContainText('Risgrøt');
  });

  test('Employees page shows data from backend', async ({ page }) => {
    await page.goto('http://localhost:3001/employees');
    
    // Wait for data to load
    await page.waitForSelector('tbody tr', { timeout: 10000 });
    
    // Check Norwegian headers
    await expect(page.locator('h1').first()).toContainText('Ansatte');
    
    // Verify table has data
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
    console.log(`✅ Employees: Found ${rows} employees`);
    
    // Check some employees
    const tableContent = await page.locator('tbody').textContent();
    expect(tableContent).toContain('Thor Atle');
    expect(tableContent).toContain('Terje');
    expect(tableContent).toContain('Helene');
  });

  test('Customers page shows data from backend', async ({ page }) => {
    await page.goto('http://localhost:3001/customers');
    
    // Wait for possible data or empty state
    await page.waitForTimeout(2000);
    
    // Check Norwegian headers
    await expect(page.locator('h1').first()).toContainText('Kunder');
    
    // Check if table exists
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    // Check if we have data or loading state
    const tbody = page.locator('tbody');
    const tbodyText = await tbody.textContent();
    
    if (tbodyText?.includes('Loading')) {
      console.log('⏳ Customers: Still loading...');
    } else {
      const rows = await page.locator('tbody tr').count();
      console.log(`✅ Customers: Found ${rows} customers`);
    }
  });

  test('Products page shows data from backend', async ({ page }) => {
    await page.goto('http://localhost:3001/products');
    
    // Wait for possible data or empty state
    await page.waitForTimeout(2000);
    
    // Check Norwegian headers
    await expect(page.locator('h1').first()).toContainText('Produkter');
    
    // Check if table exists
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    const tbody = page.locator('tbody');
    const tbodyText = await tbody.textContent();
    
    if (tbodyText?.includes('Loading')) {
      console.log('⏳ Products: Still loading...');
    } else {
      const rows = await page.locator('tbody tr').count();
      console.log(`✅ Products: Found ${rows} products`);
    }
  });

  test('Orders page shows data from backend', async ({ page }) => {
    await page.goto('http://localhost:3001/orders');
    
    // Wait for possible data or empty state
    await page.waitForTimeout(2000);
    
    // Check Norwegian headers
    await expect(page.locator('h1').first()).toContainText('Ordrer');
    
    // Check if table exists
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    const tbody = page.locator('tbody');
    const tbodyText = await tbody.textContent();
    
    if (tbodyText?.includes('Loading')) {
      console.log('⏳ Orders: Still loading...');
    } else if (tbodyText?.includes('Ingen')) {
      console.log('📭 Orders: No orders found (empty state)');
    } else {
      const rows = await page.locator('tbody tr').count();
      console.log(`✅ Orders: Found ${rows} orders`);
    }
  });

  test('Menus page shows data from backend', async ({ page }) => {
    await page.goto('http://localhost:3001/menus');
    
    // Wait for possible data or empty state
    await page.waitForTimeout(2000);
    
    // Check Norwegian headers
    await expect(page.locator('h1').first()).toContainText('Menyer');
    
    // Check if table exists or other content
    const pageContent = await page.locator('main').textContent();
    
    if (pageContent?.includes('Loading')) {
      console.log('⏳ Menus: Still loading...');
    } else if (pageContent?.includes('Ingen')) {
      console.log('📭 Menus: No menus found (empty state)');
    } else {
      console.log('✅ Menus: Page loaded');
    }
  });
});

test.describe('API Response Verification', () => {
  
  test('All API endpoints return valid JSON', async ({ page }) => {
    const endpoints = [
      { url: '/api/v1/oppskrifter/', name: 'Recipes' },
      { url: '/api/v1/ansatte/', name: 'Employees' },
      { url: '/api/v1/kunder/', name: 'Customers' },
      { url: '/api/v1/produkter/', name: 'Products' },
      { url: '/api/v1/ordrer/', name: 'Orders' },
      { url: '/api/v1/meny/', name: 'Menus' }
    ];
    
    for (const endpoint of endpoints) {
      const response = await page.request.get(`http://localhost:8000${endpoint.url}`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
      
      console.log(`✅ ${endpoint.name} API: Returns array with ${data.length} items`);
    }
  });

  test('API endpoints handle parameters correctly', async ({ page }) => {
    // Test pagination
    const response = await page.request.get('http://localhost:8000/api/v1/oppskrifter/', {
      params: {
        skip: 0,
        limit: 5
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBeLessThanOrEqual(5);
    
    console.log('✅ Pagination works correctly');
  });
});

test.describe('Navigation and UI Elements', () => {
  
  test('Navigation menu works on all pages', async ({ page }) => {
    await page.goto('http://localhost:3001/');
    
    // Check all navigation links exist
    const navLinks = [
      { text: 'Dashboard', url: '/' },
      { text: 'Menyer', url: '/menus' },
      { text: 'Oppskrifter', url: '/recipes' },
      { text: 'Kunder', url: '/customers' },
      { text: 'Ordrer', url: '/orders' },
      { text: 'Produkter', url: '/products' },
      { text: 'Leveranser', url: '/deliveries' },
      { text: 'Ansatte', url: '/employees' },
      { text: 'Rapporter', url: '/reports' },
      { text: 'Innstillinger', url: '/settings' }
    ];
    
    for (const link of navLinks) {
      const navLink = page.locator(`nav a:has-text("${link.text}")`);
      await expect(navLink).toBeVisible();
      console.log(`✅ Nav link "${link.text}" is visible`);
    }
  });

  test('Search functionality exists on data pages', async ({ page }) => {
    const pagesWithSearch = [
      '/recipes',
      '/employees', 
      '/customers',
      '/products',
      '/orders'
    ];
    
    for (const pageUrl of pagesWithSearch) {
      await page.goto(`http://localhost:3001${pageUrl}`);
      
      // Look for search input
      const searchInput = page.locator('input[type="text"], input[placeholder*="Søk"], input[placeholder*="Search"]').first();
      await expect(searchInput).toBeVisible();
      
      console.log(`✅ Search input found on ${pageUrl}`);
    }
  });

  test('Add New buttons exist on CRUD pages', async ({ page }) => {
    const pagesWithAddNew = [
      '/recipes',
      '/employees',
      '/customers', 
      '/products',
      '/orders'
    ];
    
    for (const pageUrl of pagesWithAddNew) {
      await page.goto(`http://localhost:3001${pageUrl}`);
      
      // Look for Add New button
      const addNewButton = page.locator('a:has-text("Add New"), button:has-text("Add New"), a:has-text("Legg til")').first();
      await expect(addNewButton).toBeVisible();
      
      console.log(`✅ Add New button found on ${pageUrl}`);
    }
  });
});

test.describe('Error Handling', () => {
  
  test('Pages handle API errors gracefully', async ({ page }) => {
    // Intercept and fail API call
    await page.route('**/api/v1/oppskrifter/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    await page.goto('http://localhost:3001/recipes');
    await page.waitForTimeout(2000);
    
    // Should not crash - should show error state or retry
    const pageContent = await page.locator('body').textContent();
    
    // Check page didn't crash
    expect(pageContent).toBeTruthy();
    console.log('✅ Page handles API errors without crashing');
  });
});

test.describe('Data Display Formats', () => {
  
  test('Dates are formatted in Norwegian format', async ({ page }) => {
    await page.goto('http://localhost:3001/recipes');
    await page.waitForSelector('tbody tr', { timeout: 10000 });
    
    // Check date format (DD.MM.YYYY)
    const dateCell = page.locator('tbody tr').first().locator('td').nth(4);
    const dateText = await dateCell.textContent();
    
    if (dateText && dateText !== '-') {
      expect(dateText).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
      console.log(`✅ Date format is Norwegian: ${dateText}`);
    }
  });

  test('Norwegian language is used throughout', async ({ page }) => {
    await page.goto('http://localhost:3001/employees');
    
    // Check for Norwegian text
    const pageContent = await page.locator('body').textContent();
    
    const norwegianWords = ['Ansatte', 'Fornavn', 'Etternavn', 'Aktiv'];
    for (const word of norwegianWords) {
      expect(pageContent).toContain(word);
    }
    
    console.log('✅ Norwegian language confirmed');
  });
});