import { Page } from '@playwright/test';
import { TEST_CONFIG } from './test-config';

/**
 * Performs real backend login and sets up authentication
 */
export async function setupAuth(page: Page) {
  // Navigate to login page
  await page.goto('/login');
  
  // Wait for login form to be ready
  await page.waitForLoadState('networkidle');
  
  // Fill in the login form with test credentials
  const usernameInput = page.locator('input[id="username"], input[name="username"], input[type="text"]').first();
  const passwordInput = page.locator('input[id="password"], input[name="password"], input[type="password"]').first();
  
  await usernameInput.fill(TEST_CONFIG.testUser.username);
  await passwordInput.fill(TEST_CONFIG.testUser.password);
  
  // Submit the form
  const submitButton = page.getByRole('button', { name: /log in|sign in/i });
  await submitButton.click();
  
  // Wait for successful login - should redirect to dashboard
  await page.waitForURL('**/back-office/dashboard', { 
    timeout: TEST_CONFIG.loginTimeout,
    waitUntil: 'networkidle' 
  });
  
  // Verify we're authenticated by checking we're not on login page
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    throw new Error('Login failed - still on login page');
  }
  
  // Wait a bit for any post-login initialization
  await page.waitForTimeout(500);
}

/**
 * Performs login via direct API call and sets session
 */
export async function setupAuthViaAPI(page: Page) {
  // Make login request to backend
  const response = await page.request.post(`${TEST_CONFIG.apiUrl}/api/auth/login`, {
    data: {
      username: TEST_CONFIG.testUser.username,
      password: TEST_CONFIG.testUser.password
    }
  });
  
  if (!response.ok()) {
    throw new Error(`Login failed: ${response.status()} ${response.statusText()}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(`Login failed: ${data.message}`);
  }
  
  // Navigate to home page first to set up context
  await page.goto('/');
  
  // Set the session data in localStorage
  await page.evaluate((loginData) => {
    // Set session ID if provided
    if (loginData.session_id) {
      localStorage.setItem('sessionId', loginData.session_id);
    }
    
    // Set auth token if provided
    if (loginData.token) {
      localStorage.setItem('authToken', loginData.token);
    }
    
    // Set the auth storage for the app
    const authState = {
      state: {
        user: loginData.user,
        token: loginData.token || loginData.session_id,
        isAuthenticated: true
      }
    };
    
    localStorage.setItem('auth-storage', JSON.stringify(authState));
  }, data);
  
  // Set cookies if session_id is provided
  if (data.session_id) {
    await page.context().addCookies([
      {
        name: 'sessionId',
        value: data.session_id,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax'
      }
    ]);
  }
  
  // Reload page to apply auth state
  await page.reload();
  await page.waitForLoadState('networkidle');
}

/**
 * Logs out the current user
 */
export async function logout(page: Page) {
  // Look for logout button/link
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
  const logoutLink = page.getByRole('link', { name: /logout|sign out/i });
  
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  } else if (await logoutLink.isVisible()) {
    await logoutLink.click();
  } else {
    // If no logout button, clear storage manually
    await clearAuth(page);
    await page.goto('/');
  }
  
  // Wait for redirect to login or home
  await page.waitForLoadState('networkidle');
}

/**
 * Clears authentication
 */
export async function clearAuth(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
}

/**
 * Waits for page to be fully loaded
 */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // Extra time for JS rendering
}

/**
 * Checks if an element is clickable
 */
export async function isClickable(element: any) {
  return await element.isEnabled() && await element.isVisible();
}

/**
 * Fills a form field with retry logic
 */
export async function fillField(page: Page, selector: string, value: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const element = page.locator(selector).first();
      await element.waitFor({ state: 'visible', timeout: 5000 });
      await element.fill(value);
      return;
    } catch (error) {
      if (i === retries - 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Clicks an element with retry logic
 */
export async function clickElement(page: Page, selector: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const element = page.locator(selector).first();
      await element.waitFor({ state: 'visible', timeout: 5000 });
      await element.click();
      return;
    } catch (error) {
      if (i === retries - 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}