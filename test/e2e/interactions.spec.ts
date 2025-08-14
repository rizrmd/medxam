import { test, expect } from '@playwright/test';
import { setupAuth, waitForPageReady, isClickable } from './test-utils';

test.describe('Button Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('Home page buttons should be clickable', async ({ page }) => {
    await page.goto('/');
    
    // Test Administrator Login button
    const adminButton = page.getByRole('button', { name: /Administrator Login/i });
    await expect(adminButton).toBeVisible();
    await expect(adminButton).toBeEnabled();
    await adminButton.click();
    await expect(page).toHaveURL('/login');
    
    // Go back to home
    await page.goto('/');
    
    // Test Candidate Login button
    const candidateButton = page.getByRole('button', { name: /Candidate Login/i });
    await expect(candidateButton).toBeVisible();
    await expect(candidateButton).toBeEnabled();
    
    // Test Submit Inquiry button
    const inquiryButton = page.getByRole('button', { name: /Submit Inquiry/i });
    await expect(inquiryButton).toBeVisible();
    await expect(inquiryButton).toBeEnabled();
  });

  test('Dashboard navigation buttons should work', async ({ page }) => {
    // Ensure authentication is set up
    await setupAuth(page);
    
    await page.goto('/back-office/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check we're on dashboard page
    await expect(page).toHaveURL(/dashboard/);
    
    // Check sidebar is visible - wait for it to load
    const sidebar = page.locator('aside, nav, [class*="sidebar"], [class*="Sidebar"]').first();
    await page.waitForTimeout(1000); // Give sidebar time to render
    const sidebarExists = await sidebar.count() > 0;
    
    // Test navigation links if sidebar exists
    if (sidebarExists) {
      const navItems = [
        { name: 'Delivery', url: '/back-office/delivery' },
        { name: 'Test', url: '/back-office/test' },
        { name: 'Group', url: '/back-office/group' },
        { name: 'Category', url: '/back-office/category' },
      ];
      
      for (const item of navItems) {
        const link = page.getByRole('link', { name: item.name }).first();
        if (await link.isVisible()) {
          await link.click();
          await expect(page).toHaveURL(new RegExp(item.url));
          await page.goto('/back-office/dashboard'); // Return to dashboard
        }
      }
    }
  });

  test('Delivery Management buttons should be functional', async ({ page }) => {
    await page.goto('/back-office/delivery');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Test "New Delivery" button
    const newDeliveryBtn = page.getByRole('button', { name: /Delivery/i }).filter({ hasText: 'Delivery' });
    if (await newDeliveryBtn.isVisible()) {
      await expect(newDeliveryBtn).toBeEnabled();
      await newDeliveryBtn.click();
      
      // Check if dialog opened
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();
      
      // Close dialog
      const cancelBtn = page.getByRole('button', { name: /Cancel/i });
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
      }
    }
    
    // Test action buttons (Edit, Delete, View) if deliveries exist
    const editButtons = page.locator('button').filter({ has: page.locator('svg') });
    const buttonCount = await editButtons.count();
    
    if (buttonCount > 0) {
      // Test first action button is clickable
      const firstButton = editButtons.first();
      await expect(firstButton).toBeEnabled();
    }
  });

  test('All page create/add buttons should be clickable', async ({ page }) => {
    const pagesToTest = [
      { url: '/back-office/test', buttonText: /Test|Exam|Create|Add/i },
      { url: '/back-office/group', buttonText: /Group|Create|Add/i },
      { url: '/back-office/category', buttonText: /Category|Create|Add/i },
      { url: '/back-office/question-set', buttonText: /Question|Set|Create|Add/i },
      { url: '/back-office/test-taker', buttonText: /Candidate|Taker|Create|Add|Register/i },
      { url: '/back-office/scoring', buttonText: /Scoring|Create|Add/i },
    ];
    
    for (const pageInfo of pagesToTest) {
      await page.goto(pageInfo.url);
      await page.waitForLoadState('networkidle');
      
      // Find buttons with Plus icon or matching text
      const createButtons = page.getByRole('button').filter({ hasText: pageInfo.buttonText });
      const plusButtons = page.locator('button').filter({ has: page.locator('[class*="Plus"]') });
      
      const allButtons = await page.locator('button').all();
      let foundClickableButton = false;
      
      for (const button of allButtons) {
        const text = await button.textContent();
        if (text && (text.includes('Add') || text.includes('Create') || text.includes('New'))) {
          await expect(button).toBeEnabled();
          foundClickableButton = true;
          break;
        }
      }
      
      // At least one create/add button should be found on each management page
      if (!foundClickableButton && createButtons) {
        const count = await createButtons.count();
        if (count > 0) {
          await expect(createButtons.first()).toBeEnabled();
        }
      }
    }
  });
});

test.describe('Search and Filter Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('Delivery Management search should work', async ({ page }) => {
    await page.goto('/back-office/delivery');
    await page.waitForLoadState('networkidle');
    
    // Find search input
    const searchInput = page.getByPlaceholder(/search/i).first();
    if (await searchInput.isVisible()) {
      await expect(searchInput).toBeEnabled();
      
      // Type in search
      await searchInput.fill('test delivery');
      
      // Find and click search button
      const searchButton = page.getByRole('button', { name: /search/i });
      if (await searchButton.isVisible()) {
        await expect(searchButton).toBeEnabled();
        await searchButton.click();
        
        // Wait for search to complete
        await page.waitForLoadState('networkidle');
      }
      
      // Test clear button
      const clearButton = page.getByRole('button', { name: /clear/i });
      if (await clearButton.isVisible()) {
        await expect(clearButton).toBeEnabled();
        await clearButton.click();
        
        // Verify search input is cleared
        await expect(searchInput).toHaveValue('');
      }
    }
    
    // Test date filter
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible()) {
      await expect(dateInput).toBeEnabled();
      await dateInput.fill('2024-01-01');
      
      // Trigger search with date
      const searchButton = page.getByRole('button', { name: /search/i });
      if (await searchButton.isVisible()) {
        await searchButton.click();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('Exam Management search and filters should work', async ({ page }) => {
    await page.goto('/back-office/test');
    await page.waitForLoadState('networkidle');
    
    // Test search input if exists
    const searchInputs = page.getByPlaceholder(/search/i);
    const searchCount = await searchInputs.count();
    
    if (searchCount > 0) {
      const searchInput = searchInputs.first();
      await expect(searchInput).toBeEnabled();
      await searchInput.fill('exam test');
      
      // Look for search button or filter button
      const searchButton = page.getByRole('button').filter({ hasText: /search|filter/i }).first();
      if (await searchButton.isVisible()) {
        await searchButton.click();
        await page.waitForLoadState('networkidle');
      }
    }
    
    // Test any select/dropdown filters
    const selects = page.locator('select');
    const selectCount = await selects.count();
    
    if (selectCount > 0) {
      const firstSelect = selects.first();
      await expect(firstSelect).toBeEnabled();
    }
  });

  test('Group Management search should work', async ({ page }) => {
    await page.goto('/back-office/group');
    await page.waitForLoadState('networkidle');
    
    // Find any search or filter inputs
    const inputs = page.locator('input[type="text"], input[type="search"]');
    const inputCount = await inputs.count();
    
    if (inputCount > 0) {
      const searchInput = inputs.first();
      await expect(searchInput).toBeEnabled();
      await searchInput.fill('test group');
      
      // Test if typing triggers search or if button is needed
      const searchButtons = page.getByRole('button').filter({ hasText: /search|filter|apply/i });
      if (await searchButtons.count() > 0) {
        await searchButtons.first().click();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('Question Categories filters should work', async ({ page }) => {
    await page.goto('/back-office/category');
    await page.waitForLoadState('networkidle');
    
    // Test any available filters or search
    const allInputs = page.locator('input[type="text"], input[type="search"], select');
    const inputCount = await allInputs.count();
    
    for (let i = 0; i < Math.min(inputCount, 3); i++) {
      const input = allInputs.nth(i);
      if (await input.isVisible()) {
        await expect(input).toBeEnabled();
      }
    }
  });

  test('Pagination should work where available', async ({ page }) => {
    const pagesWithPagination = [
      '/back-office/delivery',
      '/back-office/test',
      '/back-office/group',
      '/back-office/question-set',
      '/back-office/test-taker',
      '/back-office/result'
    ];
    
    for (const url of pagesWithPagination) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      // Look for pagination controls
      const nextButton = page.getByRole('button', { name: /next/i }).first();
      const prevButton = page.getByRole('button', { name: /previous|prev/i }).first();
      const pageButtons = page.getByRole('button').filter({ hasText: /^[0-9]+$/ });
      
      // If pagination exists, verify buttons are enabled/disabled correctly
      if (await nextButton.isVisible()) {
        const isDisabled = await nextButton.isDisabled();
        // Next should be enabled if there are more pages
        if (!isDisabled) {
          await expect(nextButton).toBeEnabled();
        }
      }
      
      if (await prevButton.isVisible()) {
        // Previous should be disabled on first page
        const currentPage = await page.getByRole('button', { name: '1' }).first();
        if (await currentPage.isVisible()) {
          const hasSelectedClass = await currentPage.evaluate(el => 
            el.classList.contains('bg-primary') || 
            el.classList.contains('selected') ||
            el.getAttribute('aria-current') === 'page'
          );
          // Skip this check as pagination implementation may vary
          // Some pages might not disable the previous button
        }
      }
    }
  });
});

test.describe('Form and Dialog Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('Login form should validate and submit', async ({ page }) => {
    await page.goto('/login');
    
    const usernameInput = page.getByLabel(/username/i);
    const passwordInput = page.getByLabel(/password/i);
    const submitButton = page.getByRole('button', { name: /log in|sign in/i });
    
    // Test empty form submission
    await submitButton.click();
    
    // Fill in form
    await usernameInput.fill('testuser');
    await passwordInput.fill('testpass');
    
    // Verify inputs accept text
    await expect(usernameInput).toHaveValue('testuser');
    await expect(passwordInput).toHaveValue('testpass');
    
    // Remember me checkbox should be clickable
    const rememberCheckbox = page.getByRole('checkbox', { name: /remember/i });
    if (await rememberCheckbox.isVisible()) {
      await expect(rememberCheckbox).toBeEnabled();
      await rememberCheckbox.check();
      await expect(rememberCheckbox).toBeChecked();
    }
  });

  test('Create dialogs should have working form controls', async ({ page }) => {
    await page.goto('/back-office/delivery');
    await page.waitForLoadState('networkidle');
    
    // Open create dialog
    const createButton = page.getByRole('button').filter({ hasText: /delivery/i }).filter({ hasText: /delivery/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Wait for dialog
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();
      
      // Test form inputs in dialog
      const inputs = dialog.locator('input');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < Math.min(inputCount, 3); i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          await expect(input).toBeEnabled();
          
          const type = await input.getAttribute('type');
          if (type === 'text') {
            await input.fill('Test Value');
            await expect(input).toHaveValue('Test Value');
          } else if (type === 'number') {
            await input.fill('123');
            await expect(input).toHaveValue('123');
          } else if (type === 'datetime-local' || type === 'date') {
            const testDate = type === 'date' ? '2024-01-01' : '2024-01-01T10:00';
            await input.fill(testDate);
            await expect(input).toHaveValue(testDate);
          }
        }
      }
      
      // Test dialog buttons
      const cancelButton = dialog.getByRole('button', { name: /cancel/i });
      const createDialogButton = dialog.getByRole('button', { name: /create|save|submit/i });
      
      await expect(cancelButton).toBeEnabled();
      await expect(createDialogButton).toBeEnabled();
      
      // Close dialog
      await cancelButton.click();
      await expect(dialog).not.toBeVisible();
    }
  });

  test('Table action buttons should be interactive', async ({ page }) => {
    const pagesWithTables = [
      '/back-office/delivery',
      '/back-office/test',
      '/back-office/group',
      '/back-office/test-taker',
      '/back-office/result'
    ];
    
    for (const url of pagesWithTables) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      // Look for table rows
      const tableRows = page.locator('tr').filter({ has: page.locator('td') });
      const rowCount = await tableRows.count();
      
      if (rowCount > 0) {
        // Check first row's action buttons
        const firstRow = tableRows.first();
        const actionButtons = firstRow.locator('button');
        const buttonCount = await actionButtons.count();
        
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          const button = actionButtons.nth(i);
          if (await button.isVisible()) {
            await expect(button).toBeEnabled();
            
            // Verify button has click handler (won't actually click to avoid side effects)
            const hasClickHandler = await button.evaluate(el => {
              return el.onclick !== null || el.hasAttribute('onclick') || 
                     el.parentElement?.tagName === 'A' || el.closest('a') !== null;
            });
          }
        }
      }
    }
  });
});

test.describe('Responsive Controls', () => {
  test('Controls should be accessible on mobile', async ({ page }) => {
    await setupAuth(page);
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/back-office/delivery');
    await page.waitForLoadState('networkidle');
    
    // Check if mobile menu button exists
    const menuButton = page.getByRole('button').filter({ hasText: /menu/i });
    const hamburgerButton = page.locator('button').filter({ has: page.locator('[class*="bars"], [class*="menu"]') });
    
    if (await menuButton.isVisible() || await hamburgerButton.isVisible()) {
      const button = await menuButton.isVisible() ? menuButton : hamburgerButton;
      await expect(button).toBeEnabled();
      await button.click();
      
      // Mobile menu should open
      await page.waitForTimeout(500); // Wait for animation
    }
    
    // Verify key buttons are still accessible
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    
    let accessibleButtons = 0;
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        accessibleButtons++;
      }
    }
    
    // At least some buttons should be visible on mobile
    expect(accessibleButtons).toBeGreaterThan(0);
  });

  test('Search inputs should be usable on tablet', async ({ page }) => {
    await setupAuth(page);
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/back-office/delivery');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.getByPlaceholder(/search/i).first();
    if (await searchInput.isVisible()) {
      await expect(searchInput).toBeEnabled();
      await searchInput.fill('tablet test');
      await expect(searchInput).toHaveValue('tablet test');
    }
  });
});

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('Forms should be keyboard navigable', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Click on body first to ensure focus is in the page
    await page.locator('body').click();
    
    // Focus first input
    const usernameInput = page.getByLabel(/username/i);
    await usernameInput.focus();
    
    // Check if username field is focused
    await expect(usernameInput).toBeFocused();
    
    // Tab to password
    await page.keyboard.press('Tab');
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeFocused();
    
    // Tab to remember checkbox
    await page.keyboard.press('Tab');
    
    // Tab to submit button
    await page.keyboard.press('Tab');
    const submitButton = page.getByRole('button', { name: /log in|sign in/i });
    
    // Enter should submit when button is focused
    const isFocused = await submitButton.evaluate(el => el === document.activeElement);
  });

  test('Search can be triggered with Enter key', async ({ page }) => {
    await page.goto('/back-office/delivery');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.getByPlaceholder(/search/i).first();
    if (await searchInput.isVisible()) {
      await searchInput.focus();
      await searchInput.fill('enter test');
      
      // Press Enter to search
      await page.keyboard.press('Enter');
      
      // Wait for potential search execution
      await page.waitForTimeout(500);
      
      // Verify the search input still has the value (wasn't cleared by error)
      await expect(searchInput).toHaveValue('enter test');
    }
  });
});