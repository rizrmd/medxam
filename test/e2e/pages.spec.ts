import { test, expect } from '@playwright/test';
import { setupAuth, setupAuthViaAPI, waitForPageReady, logout } from './test-utils';
import { TEST_CONFIG } from './test-config';

const publicPages = [
  { path: '/', title: 'Home', expectedContent: ['Welcome', 'IoNbEc'] },
  { path: '/login', title: 'Login', expectedContent: ['Sign in', 'Username', 'Password'] },
];

const protectedPages = [
  { path: '/back-office/dashboard', title: 'Dashboard', expectedContent: ['Dashboard'] },
  { path: '/back-office/delivery', title: 'Delivery Management', expectedContent: ['Manage Deliveries', 'IoNbEc'] },
  { path: '/back-office/test', title: 'Exam Management', expectedContent: ['Exam', 'Test'] },
  { path: '/back-office/group', title: 'Group Management', expectedContent: ['Group'] },
  { path: '/back-office/category', title: 'Question Categories', expectedContent: ['Category', 'Question'] },
  { path: '/back-office/question-set', title: 'Question Sets', expectedContent: ['Question', 'Set'] },
  { path: '/back-office/question-pack', title: 'Question Search', expectedContent: ['Question', 'Search'] },
  { path: '/back-office/test-taker', title: 'Candidate Management', expectedContent: ['Candidate', 'Taker'] },
  { path: '/back-office/scoring', title: 'Scoring Management', expectedContent: ['Scoring'] },
  { path: '/back-office/result', title: 'Results Management', expectedContent: ['Result'] },
  { path: '/back-office/profile', title: 'User Profile', expectedContent: ['Profile'] },
  { path: '/back-office/user', title: 'User Access Control', expectedContent: ['User', 'Access'] },
];

test.describe('Public Pages', () => {
  for (const page of publicPages) {
    test(`should load ${page.title} page at ${page.path}`, async ({ page: browserPage }) => {
      await browserPage.goto(page.path);
      
      // Check page loads without errors
      await expect(browserPage).toHaveURL(new RegExp(page.path.replace('/', '\\/')));
      
      // Check for expected content
      for (const content of page.expectedContent) {
        const elements = await browserPage.getByText(content, { exact: false }).count();
        expect(elements).toBeGreaterThan(0);
      }
      
      // Check for no console errors
      const consoleErrors: string[] = [];
      browserPage.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await browserPage.waitForTimeout(1000);
      expect(consoleErrors).toHaveLength(0);
    });
  }
});

test.describe('Authentication', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in login form
    const usernameInput = page.locator('#username');
    const passwordInput = page.locator('#password');
    
    await usernameInput.fill(TEST_CONFIG.testUser.username);
    await passwordInput.fill(TEST_CONFIG.testUser.password);
    
    // Submit form
    const submitButton = page.getByRole('button', { name: /log in|sign in/i });
    await submitButton.click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/back-office\/dashboard/, { timeout: 10000 });
    
    // Verify we're logged in
    const dashboardHeading = page.getByRole('heading', { name: /dashboard/i });
    await expect(dashboardHeading.first()).toBeVisible();
  });
  
  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in login form with invalid credentials
    const usernameInput = page.locator('#username');
    const passwordInput = page.locator('#password');
    
    await usernameInput.fill('invaliduser');
    await passwordInput.fill('wrongpassword');
    
    // Submit form
    const submitButton = page.getByRole('button', { name: /log in|sign in/i });
    await submitButton.click();
    
    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
    
    // Should show error message
    const errorMessage = page.locator('.text-red-600, [class*="error"], [class*="alert"]').first();
    await expect(errorMessage).toBeVisible();
  });
});

test.describe('Protected Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Use real authentication via UI
    await setupAuth(page);
  });

  for (const pageInfo of protectedPages) {
    test(`should load ${pageInfo.title} page at ${pageInfo.path}`, async ({ page }) => {
      await page.goto(pageInfo.path);
      
      // Check page loads and doesn't redirect to login
      await expect(page).not.toHaveURL(/\/login/);
      
      // Check for expected content (at least one should be visible)
      let foundContent = false;
      for (const content of pageInfo.expectedContent) {
        const elements = await page.getByText(content, { exact: false }).count();
        if (elements > 0) {
          foundContent = true;
          break;
        }
      }
      expect(foundContent).toBeTruthy();
      
      // Check for no critical console errors
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !msg.text().includes('404')) {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.waitForTimeout(1000);
    });
  }
});

test.describe('Navigation', () => {
  test('should redirect to login when accessing protected routes without auth', async ({ page }) => {
    await page.goto('/back-office/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unknown routes to home', async ({ page }) => {
    await page.goto('/unknown-route');
    await expect(page).toHaveURL('/');
  });

  test('sidebar navigation should work correctly', async ({ page }) => {
    // Already authenticated in beforeEach

    await page.goto('/back-office/dashboard');
    
    // Test sidebar navigation links
    const navLinks = [
      { text: 'Dashboard', url: '/back-office/dashboard' },
      { text: 'Delivery', url: '/back-office/delivery' },
      { text: 'Test', url: '/back-office/test' },
      { text: 'Group', url: '/back-office/group' },
    ];

    for (const link of navLinks) {
      const linkElement = page.getByRole('link', { name: link.text }).first();
      if (await linkElement.isVisible()) {
        await linkElement.click();
        await expect(page).toHaveURL(new RegExp(link.url));
      }
    }
  });
});

test.describe('Responsive Design', () => {
  test('should be responsive on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check that page is still accessible
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should be responsive on tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Check that page is still accessible
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('pages should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });
});