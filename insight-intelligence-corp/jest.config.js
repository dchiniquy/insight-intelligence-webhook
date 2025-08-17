module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    '*.js',
    '!coverage/**',
    '!node_modules/**',
    '!*.config.js',
    '!test/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/test/setup.js']
};