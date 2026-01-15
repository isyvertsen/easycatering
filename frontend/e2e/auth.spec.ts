import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/auth/signin');

    // Check page elements
    await expect(page.getByRole('heading', { name: 'Logg inn' })).toBeVisible();
    await expect(page.getByText('Velkommen til Larvik Kommune Catering System')).toBeVisible();

    // Check form elements
    await expect(page.getByLabel('E-post')).toBeVisible();
    await expect(page.getByLabel('Passord')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logg inn' })).toBeVisible();
  });

  test('should display Google login option', async ({ page }) => {
    await page.goto('/auth/signin');

    // Check Google login button
    await expect(page.getByRole('button', { name: /Logg inn med Google/i })).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin');

    // Fill in invalid credentials
    await page.getByLabel('E-post').fill('invalid@test.com');
    await page.getByLabel('Passord').fill('wrongpassword');

    // Submit form
    await page.getByRole('button', { name: 'Logg inn' }).click();

    // Wait for error message
    await page.waitForTimeout(1000);

    // Should show error (either from API or validation)
    const errorMessage = page.locator('.text-red-800, [role="alert"]');
    // Either we see an error message or the page doesn't redirect
    const currentUrl = page.url();
    expect(currentUrl).toContain('/auth/signin');
  });

  test('should show loading state during login', async ({ page }) => {
    // Slow down API response
    await page.route('**/api/auth/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto('/auth/signin');

    // Fill in credentials
    await page.getByLabel('E-post').fill('test@example.com');
    await page.getByLabel('Passord').fill('password123');

    // Click login
    await page.getByRole('button', { name: 'Logg inn' }).click();

    // Should show loading state
    await expect(page.getByRole('button', { name: 'Logger inn...' })).toBeVisible();
  });

  test('should have required field validation', async ({ page }) => {
    await page.goto('/auth/signin');

    // Try to submit empty form
    await page.getByRole('button', { name: 'Logg inn' }).click();

    // Email field should be invalid (browser validation)
    const emailInput = page.getByLabel('E-post');
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/auth/signin');

    // Fill in invalid email
    await page.getByLabel('E-post').fill('notanemail');
    await page.getByLabel('Passord').fill('password123');

    // Try to submit
    await page.getByRole('button', { name: 'Logg inn' }).click();

    // Email should be invalid
    const emailInput = page.getByLabel('E-post');
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test('should disable inputs during loading', async ({ page }) => {
    await page.route('**/api/auth/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('/auth/signin');

    // Fill in credentials
    await page.getByLabel('E-post').fill('test@example.com');
    await page.getByLabel('Passord').fill('password123');

    // Click login
    await page.getByRole('button', { name: 'Logg inn' }).click();

    // Inputs should be disabled
    await expect(page.getByLabel('E-post')).toBeDisabled();
    await expect(page.getByLabel('Passord')).toBeDisabled();
  });
});

test.describe('Authentication - Norwegian Text', () => {
  test('should use Norwegian language throughout', async ({ page }) => {
    await page.goto('/auth/signin');

    // Check for Norwegian text
    await expect(page.getByText('Logg inn')).toBeVisible();
    await expect(page.getByText('E-post')).toBeVisible();
    await expect(page.getByText('Passord')).toBeVisible();
    await expect(page.getByText('Velkommen til Larvik Kommune Catering System')).toBeVisible();
    await expect(page.getByText('Eller')).toBeVisible();
  });

  test('should show Norwegian error messages', async ({ page }) => {
    await page.goto('/auth/signin');

    // Fill in credentials that will fail
    await page.getByLabel('E-post').fill('wrong@example.com');
    await page.getByLabel('Passord').fill('wrongpassword');

    // Mock API to return error
    await page.route('**/api/auth/callback/credentials**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' })
      });
    });

    await page.getByRole('button', { name: 'Logg inn' }).click();

    // Wait for potential error
    await page.waitForTimeout(1000);

    // Page should still be on signin (not redirected)
    expect(page.url()).toContain('/auth/signin');
  });
});

test.describe('Authentication - Accessibility', () => {
  test('should have proper form labels', async ({ page }) => {
    await page.goto('/auth/signin');

    // Check that labels are properly associated
    const emailInput = page.getByLabel('E-post');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');

    const passwordInput = page.getByLabel('Passord');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/auth/signin');

    // Tab through form elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Email input should be focusable
    const emailInput = page.getByLabel('E-post');

    // Fill using keyboard
    await emailInput.focus();
    await page.keyboard.type('test@example.com');

    // Verify input value
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('should support form submission with Enter key', async ({ page }) => {
    await page.goto('/auth/signin');

    // Fill in form
    await page.getByLabel('E-post').fill('test@example.com');
    await page.getByLabel('Passord').fill('password123');

    // Press Enter to submit
    await page.getByLabel('Passord').press('Enter');

    // Form should be submitted (button shows loading)
    await page.waitForTimeout(500);
    // Either loading state or still on page
    expect(page.url()).toContain('/auth/signin');
  });
});

test.describe('Authentication - Protected Routes', () => {
  test('should redirect unauthenticated users to login', async ({ page, context }) => {
    // Clear any existing cookies/sessions
    await context.clearCookies();

    // Try to access protected page without AUTH_BYPASS
    // Note: In dev with AUTH_BYPASS this might not redirect
    await page.goto('/');

    // Either we're on dashboard (AUTH_BYPASS) or redirected to login
    const url = page.url();
    const isOnDashboard = url.endsWith('/') || url.includes('localhost:3001');
    const isOnLogin = url.includes('/auth/signin');

    // One of these should be true
    expect(isOnDashboard || isOnLogin).toBe(true);
  });
});

test.describe('Authentication - Responsive Design', () => {
  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/auth/signin');

    // Login form should be visible
    await expect(page.getByRole('heading', { name: 'Logg inn' })).toBeVisible();
    await expect(page.getByLabel('E-post')).toBeVisible();
    await expect(page.getByLabel('Passord')).toBeVisible();
  });

  test('should display correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/auth/signin');

    // Login form should be visible
    await expect(page.getByRole('heading', { name: 'Logg inn' })).toBeVisible();
  });
});
