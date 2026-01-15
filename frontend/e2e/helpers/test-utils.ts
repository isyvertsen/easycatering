import { Page, expect } from '@playwright/test';

/**
 * Test utilities for Playwright E2E tests
 */

// API URL for backend calls
export const API_BASE_URL = process.env.API_URL || 'http://localhost:8000';
export const API_V1_URL = `${API_BASE_URL}/api/v1`;

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

export const testUsers = {
  admin: {
    email: 'admin@larvikkommune.no',
    password: 'admin123',
    name: 'Admin User'
  },
  employee: {
    email: 'ansatt@larvikkommune.no',
    password: 'ansatt123',
    name: 'Test Ansatt'
  }
};

/**
 * Wait for API response
 */
export async function waitForAPI(page: Page, url: string, method: string = 'GET') {
  return page.waitForResponse(
    response => response.url().includes(url) && response.request().method() === method
  );
}

/**
 * Login helper - since AUTH_BYPASS is enabled in dev, this just navigates
 */
export async function login(page: Page, user?: TestUser) {
  // In development with AUTH_BYPASS, we don't need actual login
  // Just navigate to the main page
  await page.goto('/');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
}

/**
 * Check if element contains Norwegian text
 */
export async function expectNorwegianText(page: Page, selector: string) {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  
  // Check for common Norwegian characters
  const text = await element.textContent();
  return text && /[æøåÆØÅ]/.test(text);
}

/**
 * Wait for toast notification
 */
export async function waitForToast(page: Page, text?: string) {
  const toast = page.locator('[data-sonner-toast]');
  await expect(toast).toBeVisible();
  
  if (text) {
    await expect(toast).toContainText(text);
  }
  
  return toast;
}

/**
 * Dismiss all toast notifications
 */
export async function dismissToasts(page: Page) {
  const toasts = page.locator('[data-sonner-toast]');
  const count = await toasts.count();
  
  for (let i = 0; i < count; i++) {
    const closeButton = toasts.nth(i).locator('[data-dismiss]');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }
}

/**
 * Fill form field helper
 */
export async function fillFormField(page: Page, label: string, value: string) {
  const field = page.getByLabel(label);
  await field.clear();
  await field.fill(value);
}

/**
 * Select from dropdown
 */
export async function selectOption(page: Page, label: string, option: string) {
  const select = page.getByLabel(label);
  await select.selectOption(option);
}

/**
 * Click button with text
 */
export async function clickButton(page: Page, text: string) {
  const button = page.getByRole('button', { name: text });
  await button.click();
}

/**
 * Navigate to page and wait for load
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

/**
 * Check if error message is displayed
 */
export async function expectError(page: Page, errorText?: string) {
  const errorElement = page.locator('[role="alert"], .error, .text-destructive');
  await expect(errorElement).toBeVisible();
  
  if (errorText) {
    await expect(errorElement).toContainText(errorText);
  }
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ 
    path: `e2e/screenshots/${name}-${timestamp}.png`,
    fullPage: true 
  });
}

/**
 * Mock API response
 */
export async function mockAPIResponse(
  page: Page, 
  url: string, 
  response: any,
  status: number = 200
) {
  await page.route(`**/api/**${url}`, route => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response)
    });
  });
}

/**
 * Check table row exists
 */
export async function expectTableRow(page: Page, values: string[]) {
  const row = page.locator('tr').filter({ 
    hasText: values[0] 
  });
  
  await expect(row).toBeVisible();
  
  for (const value of values) {
    await expect(row).toContainText(value);
  }
}

/**
 * Delete table row
 */
export async function deleteTableRow(page: Page, identifier: string) {
  const row = page.locator('tr').filter({ hasText: identifier });
  const deleteButton = row.locator('button[aria-label*="Slett"], button[aria-label*="Delete"]');
  
  await deleteButton.click();
  
  // Confirm deletion if dialog appears
  const confirmButton = page.getByRole('button', { name: /Slett|Bekreft/i });
  if (await confirmButton.isVisible()) {
    await confirmButton.click();
  }
}

/**
 * Search in table
 */
export async function searchTable(page: Page, searchTerm: string) {
  const searchInput = page.getByPlaceholder(/Søk|Search/i);
  await searchInput.clear();
  await searchInput.fill(searchTerm);
  await searchInput.press('Enter');
  
  // Wait for search results
  await page.waitForTimeout(500);
}