// Global test setup file

// Set timeout for async operations
jest.setTimeout(10000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test utilities
global.testUtils = {
  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to create test environment variables
  withEnv: (envVars, testFn) => {
    const originalEnv = process.env;
    return async () => {
      process.env = { ...originalEnv, ...envVars };
      try {
        await testFn();
      } finally {
        process.env = originalEnv;
      }
    };
  }
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});