import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'http://io844g808o48ccsoscc888s0.107.155.75.50.sslip.io';
const USERNAME = 'admin';
const PASSWORD = 'p4ssw0rd';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const DOCS_FILE = path.join(__dirname, 'documentation.md');

let featureDocumentation = [];
let screenshotCount = 0;

async function ensureDirectoryExists(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error);
  }
}

async function saveScreenshot(page, name) {
  screenshotCount++;
  const filename = `${screenshotCount.toString().padStart(3, '0')}_${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
  const screenshotPath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ 
    path: screenshotPath,
    fullPage: true 
  });
  return filename;
}

async function documentDetailedPage(page, pageName, category) {
  console.log(`\n📄 Documenting: ${pageName}`);
  
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const screenshot = await saveScreenshot(page, pageName);
  const pageTitle = await page.title();
  const url = page.url();
  
  const pageDetails = await page.evaluate(() => {
    const details = {
      forms: [],
      tables: [],
      buttons: [],
      modals: [],
      dropdowns: [],
      filters: [],
      navigation: [],
      actions: []
    };
    
    // Document all forms
    document.querySelectorAll('form').forEach((form, index) => {
      const formData = {
        index: index + 1,
        fields: [],
        action: form.action,
        method: form.method
      };
      
      form.querySelectorAll('input, select, textarea').forEach(input => {
        const field = {
          type: input.type || input.tagName.toLowerCase(),
          name: input.name,
          id: input.id,
          placeholder: input.placeholder,
          required: input.hasAttribute('required'),
          value: input.value,
          label: ''
        };
        
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) field.label = label.textContent.trim();
        
        if (input.tagName === 'SELECT') {
          field.options = Array.from(input.options).map(opt => ({
            value: opt.value,
            text: opt.textContent.trim()
          }));
        }
        
        formData.fields.push(field);
      });
      
      details.forms.push(formData);
    });
    
    // Document all tables
    document.querySelectorAll('table').forEach((table, index) => {
      const tableData = {
        index: index + 1,
        headers: [],
        rowCount: 0,
        actions: []
      };
      
      table.querySelectorAll('thead th, thead td').forEach(header => {
        tableData.headers.push(header.textContent.trim());
      });
      
      tableData.rowCount = table.querySelectorAll('tbody tr').length;
      
      table.querySelectorAll('tbody button, tbody a.btn').forEach(btn => {
        const action = btn.textContent.trim();
        if (action && !tableData.actions.includes(action)) {
          tableData.actions.push(action);
        }
      });
      
      details.tables.push(tableData);
    });
    
    // Document all buttons
    document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn').forEach(button => {
      const buttonText = button.textContent.trim() || button.value;
      const buttonData = {
        text: buttonText,
        type: button.type || 'button',
        classes: button.className,
        dataAttributes: {}
      };
      
      for (let attr of button.attributes) {
        if (attr.name.startsWith('data-')) {
          buttonData.dataAttributes[attr.name] = attr.value;
        }
      }
      
      if (buttonText) {
        details.buttons.push(buttonData);
      }
    });
    
    // Document dropdowns and select elements
    document.querySelectorAll('select').forEach(select => {
      const dropdownData = {
        name: select.name,
        id: select.id,
        options: Array.from(select.options).map(opt => ({
          value: opt.value,
          text: opt.textContent.trim(),
          selected: opt.selected
        }))
      };
      details.dropdowns.push(dropdownData);
    });
    
    // Document filter elements
    document.querySelectorAll('[class*="filter"], [id*="filter"], input[type="search"], input[placeholder*="search" i]').forEach(filter => {
      const filterData = {
        type: filter.tagName.toLowerCase(),
        placeholder: filter.placeholder,
        name: filter.name,
        id: filter.id
      };
      details.filters.push(filterData);
    });
    
    // Document navigation elements
    document.querySelectorAll('nav a, .sidebar a, .menu a, .breadcrumb a').forEach(link => {
      const navData = {
        text: link.textContent.trim(),
        href: link.href,
        active: link.classList.contains('active')
      };
      if (navData.text && !navData.href.includes('logout')) {
        details.navigation.push(navData);
      }
    });
    
    // Document action links
    document.querySelectorAll('a[href*="edit"], a[href*="delete"], a[href*="view"], a[href*="create"], a[href*="add"]').forEach(action => {
      const actionData = {
        text: action.textContent.trim(),
        href: action.href,
        icon: action.querySelector('i') ? action.querySelector('i').className : null
      };
      if (actionData.text) {
        details.actions.push(actionData);
      }
    });
    
    // Check for modals
    document.querySelectorAll('.modal, [role="dialog"], .popup').forEach(modal => {
      const modalData = {
        id: modal.id,
        title: '',
        visible: modal.style.display !== 'none' && !modal.classList.contains('hide')
      };
      
      const title = modal.querySelector('.modal-title, .modal-header h1, .modal-header h2, .modal-header h3, .modal-header h4, .modal-header h5');
      if (title) modalData.title = title.textContent.trim();
      
      details.modals.push(modalData);
    });
    
    return details;
  });
  
  return {
    pageName,
    category,
    title: pageTitle,
    url,
    screenshot,
    details: pageDetails
  };
}

async function generateDetailedMarkdown() {
  let markdown = '# Application Feature Documentation\n\n';
  markdown += `**Application Name:** National Orthopaedic and Traumatology Board Examination (IoNbEc)\n`;
  markdown += `**Application URL:** ${BASE_URL}\n`;
  markdown += `**Documentation Date:** ${new Date().toISOString()}\n`;
  markdown += `**Total Features Documented:** ${featureDocumentation.length}\n\n`;
  
  markdown += '---\n\n';
  markdown += '## Executive Summary\n\n';
  markdown += 'This document provides comprehensive documentation of all features, forms, and functionalities ';
  markdown += 'available in the IoNbEc examination management system. Each section includes detailed field descriptions, ';
  markdown += 'available actions, and visual documentation through screenshots.\n\n';
  
  const categories = {};
  featureDocumentation.forEach(feature => {
    if (!categories[feature.category]) {
      categories[feature.category] = [];
    }
    categories[feature.category].push(feature);
  });
  
  markdown += '## Table of Contents\n\n';
  Object.keys(categories).forEach(category => {
    markdown += `### ${category}\n`;
    categories[category].forEach(feature => {
      markdown += `- [${feature.pageName}](#${feature.pageName.toLowerCase().replace(/\s+/g, '-')})\n`;
    });
    markdown += '\n';
  });
  
  markdown += '---\n\n';
  
  Object.keys(categories).forEach(category => {
    markdown += `## ${category}\n\n`;
    
    categories[category].forEach(feature => {
      markdown += `### ${feature.pageName}\n\n`;
      markdown += `**URL:** \`${feature.url}\`\n`;
      markdown += `**Page Title:** ${feature.title}\n`;
      markdown += `**Screenshot:** ![${feature.pageName}](screenshots/${feature.screenshot})\n\n`;
      
      if (feature.details.forms.length > 0) {
        markdown += '#### Forms\n\n';
        feature.details.forms.forEach((form, index) => {
          markdown += `##### Form ${index + 1}\n`;
          if (form.action) markdown += `- **Action:** ${form.action}\n`;
          if (form.method) markdown += `- **Method:** ${form.method}\n`;
          markdown += `- **Fields:**\n`;
          
          form.fields.forEach(field => {
            markdown += `  - **${field.label || field.name || field.placeholder}**\n`;
            markdown += `    - Type: ${field.type}\n`;
            if (field.required) markdown += `    - Required: Yes\n`;
            if (field.placeholder) markdown += `    - Placeholder: "${field.placeholder}"\n`;
            if (field.options && field.options.length > 0) {
              markdown += `    - Options:\n`;
              field.options.forEach(opt => {
                markdown += `      - ${opt.text || opt}\n`;
              });
            }
          });
          markdown += '\n';
        });
      }
      
      if (feature.details.tables.length > 0) {
        markdown += '#### Data Tables\n\n';
        feature.details.tables.forEach((table, index) => {
          markdown += `##### Table ${index + 1}\n`;
          markdown += `- **Headers:** ${table.headers.join(', ')}\n`;
          markdown += `- **Row Count:** ${table.rowCount}\n`;
          if (table.actions.length > 0) {
            markdown += `- **Available Actions:** ${table.actions.join(', ')}\n`;
          }
          markdown += '\n';
        });
      }
      
      if (feature.details.buttons.length > 0) {
        markdown += '#### Action Buttons\n\n';
        const uniqueButtons = [...new Set(feature.details.buttons.map(b => b.text))];
        uniqueButtons.forEach(button => {
          markdown += `- ${button}\n`;
        });
        markdown += '\n';
      }
      
      if (feature.details.dropdowns.length > 0) {
        markdown += '#### Dropdown Filters\n\n';
        feature.details.dropdowns.forEach(dropdown => {
          markdown += `- **${dropdown.name || dropdown.id}**\n`;
          if (dropdown.options.length > 0 && dropdown.options.length <= 10) {
            markdown += `  - Options: ${dropdown.options.map(o => o.text).join(', ')}\n`;
          } else if (dropdown.options.length > 10) {
            markdown += `  - Options: ${dropdown.options.length} items available\n`;
          }
        });
        markdown += '\n';
      }
      
      if (feature.details.filters.length > 0) {
        markdown += '#### Search & Filter Options\n\n';
        feature.details.filters.forEach(filter => {
          markdown += `- ${filter.placeholder || filter.name || filter.id} (${filter.type})\n`;
        });
        markdown += '\n';
      }
      
      if (feature.details.navigation.length > 0) {
        markdown += '#### Navigation Menu\n\n';
        feature.details.navigation.forEach(nav => {
          markdown += `- ${nav.text}${nav.active ? ' (Active)' : ''}\n`;
        });
        markdown += '\n';
      }
      
      if (feature.details.actions.length > 0) {
        markdown += '#### Quick Actions\n\n';
        feature.details.actions.forEach(action => {
          markdown += `- ${action.text}\n`;
        });
        markdown += '\n';
      }
      
      markdown += '---\n\n';
    });
  });
  
  await fs.writeFile(DOCS_FILE, markdown);
  console.log(`\n✓ Documentation saved to: ${DOCS_FILE}`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('       APPLICATION FEATURE DOCUMENTATION GENERATOR');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  await ensureDirectoryExists(SCREENSHOTS_DIR);
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  try {
    console.log('🔐 AUTHENTICATION & ACCESS\n');
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const homePage = await documentDetailedPage(page, 'Public Home Page', 'Authentication & Access');
    featureDocumentation.push(homePage);
    
    await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' });
    const loginPage = await documentDetailedPage(page, 'Administrator Login', 'Authentication & Access');
    featureDocumentation.push(loginPage);
    
    console.log('\n🔑 Logging in as administrator...');
    await page.fill('input[type="text"]', USERNAME);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button:has-text("Log in")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('\n📊 DASHBOARD & OVERVIEW\n');
    
    const dashboardPage = await documentDetailedPage(page, 'Administrator Dashboard', 'Dashboard & Overview');
    featureDocumentation.push(dashboardPage);
    
    console.log('\n📝 EXAM MANAGEMENT\n');
    
    await page.goto(BASE_URL + '/back-office/delivery', { waitUntil: 'networkidle' });
    const deliveriesPage = await documentDetailedPage(page, 'Delivery Management', 'Exam Management');
    featureDocumentation.push(deliveriesPage);
    
    await page.goto(BASE_URL + '/back-office/test', { waitUntil: 'networkidle' });
    const examsPage = await documentDetailedPage(page, 'Exam Configuration', 'Exam Management');
    featureDocumentation.push(examsPage);
    
    console.log('\n❓ QUESTION MANAGEMENT\n');
    
    await page.goto(BASE_URL + '/back-office/category', { waitUntil: 'networkidle' });
    const categoriesPage = await documentDetailedPage(page, 'Question Categories', 'Question Management');
    featureDocumentation.push(categoriesPage);
    
    await page.goto(BASE_URL + '/back-office/question-set', { waitUntil: 'networkidle' });
    const questionSetsPage = await documentDetailedPage(page, 'Question Sets', 'Question Management');
    featureDocumentation.push(questionSetsPage);
    
    await page.goto(BASE_URL + '/back-office/question-pack', { waitUntil: 'networkidle' });
    const questionSearchPage = await documentDetailedPage(page, 'Question Search & Filter', 'Question Management');
    featureDocumentation.push(questionSearchPage);
    
    console.log('\n👥 PARTICIPANT MANAGEMENT\n');
    
    await page.goto(BASE_URL + '/back-office/group', { waitUntil: 'networkidle' });
    const groupsPage = await documentDetailedPage(page, 'Group Management', 'Participant Management');
    featureDocumentation.push(groupsPage);
    
    await page.goto(BASE_URL + '/back-office/test-taker', { waitUntil: 'networkidle' });
    const candidatesPage = await documentDetailedPage(page, 'Candidate Registration', 'Participant Management');
    featureDocumentation.push(candidatesPage);
    
    console.log('\n📈 SCORING & RESULTS\n');
    
    await page.goto(BASE_URL + '/back-office/scoring', { waitUntil: 'networkidle' });
    const scoringPage = await documentDetailedPage(page, 'Scoring Configuration', 'Scoring & Results');
    featureDocumentation.push(scoringPage);
    
    await page.goto(BASE_URL + '/back-office/result', { waitUntil: 'networkidle' });
    const resultsPage = await documentDetailedPage(page, 'Results Overview', 'Scoring & Results');
    featureDocumentation.push(resultsPage);
    
    console.log('\n👤 USER MANAGEMENT\n');
    
    await page.goto(BASE_URL + '/back-office/profile', { waitUntil: 'networkidle' });
    const profilePage = await documentDetailedPage(page, 'User Profile Settings', 'User Management');
    featureDocumentation.push(profilePage);
    
    await page.goto(BASE_URL + '/back-office/user', { waitUntil: 'networkidle' });
    const usersPage = await documentDetailedPage(page, 'User Access Control', 'User Management');
    featureDocumentation.push(usersPage);
    
    await generateDetailedMarkdown();
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                    DOCUMENTATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n📁 Screenshots: ${SCREENSHOTS_DIR}`);
    console.log(`📄 Documentation: ${DOCS_FILE}`);
    console.log(`📊 Total Features Documented: ${featureDocumentation.length}`);
    console.log(`📸 Total Screenshots Captured: ${screenshotCount}`);
    
  } catch (error) {
    console.error('\n❌ Error during documentation:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
  }
}

// Run the documentation
main().catch(console.error);