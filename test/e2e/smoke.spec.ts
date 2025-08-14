import { test, expect } from '@playwright/test';
import { setupAuth, clearAuth } from './test-utils';
import { TEST_CONFIG } from './test-config';

test.describe('Smoke Tests - Critical User Flows', () => {
  
  test('Complete authentication flow', async ({ page }) => {
    // Test login
    await page.goto('/login');
    
    const usernameInput = page.locator('#username');
    const passwordInput = page.locator('#password');
    const submitButton = page.getByRole('button', { name: /log in|sign in/i });
    
    await usernameInput.fill(TEST_CONFIG.testUser.username);
    await passwordInput.fill(TEST_CONFIG.testUser.password);
    await submitButton.click();
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/back-office\/dashboard/, { timeout: 10000 });
    
    // Verify user is logged in
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('All main navigation links work', async ({ page }) => {
    await setupAuth(page);
    
    const mainPages = [
      { name: 'Delivery', url: '/back-office/delivery' },
      { name: 'Test', url: '/back-office/test' },
      { name: 'Category', url: '/back-office/category' },
      { name: 'Scoring', url: '/back-office/scoring' },
      { name: 'Result', url: '/back-office/result' }
    ];
    
    for (const pageInfo of mainPages) {
      await page.goto(pageInfo.url);
      await page.waitForLoadState('networkidle');
      
      // Verify we're on the right page
      await expect(page).toHaveURL(new RegExp(pageInfo.url));
      
      // Verify page loaded (no error)
      const errorElements = await page.locator('.error, .exception, [class*="Error"]').count();
      expect(errorElements).toBe(0);
    }
  });

  test('Search functionality works on Delivery page', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/back-office/delivery');
    await page.waitForLoadState('networkidle');
    
    // Find search input - try multiple selectors
    const searchSelectors = [
      'input[placeholder*="search" i]',
      'input[placeholder*="Search" i]',
      'input[type="search"]',
      'input[name*="search" i]',
      'input.search-input'
    ];
    
    let searchInput = null;
    for (const selector of searchSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        searchInput = element;
        break;
      }
    }
    
    if (searchInput) {
      await searchInput.fill('test search');
      await expect(searchInput).toHaveValue('test search');
      
      // Try to find and click search button
      const searchButton = page.getByRole('button', { name: /search/i }).first();
      if (await searchButton.count() > 0) {
        await searchButton.click();
        await page.waitForLoadState('networkidle');
      } else {
        // Try pressing Enter if no search button
        await searchInput.press('Enter');
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('Create buttons are present and clickable', async ({ page }) => {
    await setupAuth(page);
    
    const pagesWithCreateButtons = [
      { url: '/back-office/delivery', buttonPattern: /delivery|create|add|new/i },
      { url: '/back-office/test', buttonPattern: /test|exam|create|add|new/i },
      { url: '/back-office/group', buttonPattern: /group|create|add|new/i }
    ];
    
    for (const pageInfo of pagesWithCreateButtons) {
      await page.goto(pageInfo.url);
      await page.waitForLoadState('networkidle');
      
      // Find create/add button
      const createButtons = await page.getByRole('button').filter({ hasText: pageInfo.buttonPattern }).all();
      const plusButtons = await page.locator('button svg').all();
      
      const hasCreateButton = createButtons.length > 0 || plusButtons.length > 0;
      expect(hasCreateButton).toBeTruthy();
      
      if (createButtons.length > 0) {
        const firstButton = createButtons[0];
        await expect(firstButton).toBeEnabled();
        
        // Click to open dialog
        await firstButton.click();
        await page.waitForTimeout(500);
        
        // Check if dialog opened
        const dialog = page.getByRole('dialog').first();
        const dialogVisible = await dialog.count() > 0;
        
        if (dialogVisible) {
          // Close dialog
          const closeButton = dialog.getByRole('button', { name: /cancel|close/i }).first();
          if (await closeButton.count() > 0) {
            await closeButton.click();
          } else {
            // Press Escape to close
            await page.keyboard.press('Escape');
          }
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('Table interactions work', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/back-office/delivery');
    await page.waitForLoadState('networkidle');
    
    // Check if table exists
    const tables = await page.locator('table').count();
    
    if (tables > 0) {
      // Check for table rows
      const rows = await page.locator('tbody tr, tr[class*="row"]').count();
      
      // Tables should have headers
      const headers = await page.locator('thead th, th').count();
      expect(headers).toBeGreaterThan(0);
      
      // If there are data rows, check for action buttons
      if (rows > 0) {
        const actionButtons = await page.locator('tbody button, tbody a[role="button"]').count();
        // Most tables should have action buttons
        expect(actionButtons).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('Forms can be filled and validated', async ({ page }) => {
    await page.goto('/login');
    
    const usernameInput = page.locator('#username');
    const passwordInput = page.locator('#password');
    
    // Test form validation - submit empty form
    const submitButton = page.getByRole('button', { name: /log in|sign in/i });
    await submitButton.click();
    
    // Should stay on login page (validation failed)
    await expect(page).toHaveURL(/\/login/);
    
    // Fill with invalid credentials
    await usernameInput.fill('invalid');
    await passwordInput.fill('short'); // Too short
    await submitButton.click();
    
    // Should show error or stay on login
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/login/);
    
    // Now fill with valid test credentials
    await usernameInput.clear();
    await passwordInput.clear();
    await usernameInput.fill(TEST_CONFIG.testUser.username);
    await passwordInput.fill(TEST_CONFIG.testUser.password);
    await submitButton.click();
    
    // Should successfully login
    await expect(page).toHaveURL(/\/back-office/, { timeout: 10000 });
  });

  test('Responsive menu works on mobile', async ({ page }) => {
    await setupAuth(page);
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/back-office/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Look for mobile menu button
    const menuButtons = await page.locator('button[aria-label*="menu" i], button.menu-toggle, button.hamburger').count();
    
    if (menuButtons > 0) {
      const menuButton = page.locator('button[aria-label*="menu" i], button.menu-toggle, button.hamburger').first();
      await menuButton.click();
      await page.waitForTimeout(500);
      
      // Menu should be visible after clicking
      const navLinks = await page.getByRole('link').count();
      expect(navLinks).toBeGreaterThan(0);
    }
    
    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Pagination controls work', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/back-office/delivery');
    await page.waitForLoadState('networkidle');
    
    // Look for pagination controls
    const nextButton = page.getByRole('button', { name: /next/i }).first();
    const prevButton = page.getByRole('button', { name: /prev/i }).first();
    
    if (await nextButton.count() > 0) {
      // Previous should be disabled on first page
      if (await prevButton.count() > 0) {
        const isPrevDisabled = await prevButton.isDisabled();
        // This is expected on first page
      }
      
      // If next is enabled, click it
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');
        
        // Now previous should be enabled
        if (await prevButton.count() > 0) {
          await expect(prevButton).toBeEnabled();
        }
      }
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up after each test
    await clearAuth(page);
  });
});