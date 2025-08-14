/**
 * Test configuration for E2E tests
 */

export const TEST_CONFIG = {
  // Test user credentials
  testUser: {
    username: 'testadmin',
    password: 'testpass123'
  },
  
  // URLs
  baseUrl: process.env.BASE_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:8080',
  
  // Timeouts
  loginTimeout: 10000,
  pageLoadTimeout: 5000,
  
  // Test data
  testDeliveryName: 'Test Delivery ' + Date.now(),
  testExamName: 'Test Exam ' + Date.now(),
  testGroupName: 'Test Group ' + Date.now(),
  testCategoryName: 'Test Category ' + Date.now(),
};