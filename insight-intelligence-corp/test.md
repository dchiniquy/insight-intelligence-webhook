# Testing Guide

This document explains how to run and understand the tests for the Insight Intelligence Corp webhook.

## Test Structure

```
├── index.test.js           # Unit tests for webhook handler
├── test/
│   ├── integration.test.js # Integration tests for complete workflows
│   ├── mocks.js           # Mock data and utilities
│   └── setup.js           # Global test configuration
├── jest.config.js         # Jest configuration
└── package.json           # Test scripts and dependencies
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Categories

**Unit Tests** (`index.test.js`)
- Test individual functions and handlers
- Mock external dependencies (Twilio, VAPI, axios)
- Fast execution, isolated testing

**Integration Tests** (`test/integration.test.js`)
- Test complete webhook workflows
- Test error scenarios and edge cases
- Performance and security validation

## Test Coverage

The test suite aims for 80% coverage across:
- **Branches**: Code paths and conditional logic
- **Functions**: All exported functions
- **Lines**: Individual code lines
- **Statements**: Code statements

View detailed coverage:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Test Scenarios Covered

### ✅ Core Functionality
- **Incoming call handling** (ringing status)
- **Call answered events** (answered status)
- **Call completion** (completed status)
- **VAPI integration** (API calls and responses)
- **TwiML response generation**

### ✅ Security
- **Twilio signature validation**
- **Invalid signature rejection**
- **Missing signature handling**

### ✅ Error Handling
- **VAPI API failures**
- **Network timeouts**
- **Malformed request bodies**
- **Missing environment variables**

### ✅ Performance
- **Concurrent request handling**
- **Response time validation**
- **Resource cleanup**

## Mock Data

The test suite uses realistic mock data for:

- **Twilio webhook payloads** (ringing, answered, completed)
- **API Gateway events** (headers, body, context)
- **VAPI API responses** (success and error scenarios)
- **AWS Lambda context** (function metadata)

## Adding New Tests

### Unit Test Example
```javascript
it('should handle new webhook event', async () => {
  // Arrange
  const mockData = { /* test data */ };
  const event = mockAPIGatewayEvent(createFormBody(mockData));
  
  // Act
  const result = await handler(event, mockContext);
  
  // Assert
  expect(result.statusCode).toBe(200);
  expect(result.body).toContain('expected-content');
});
```

### Integration Test Example
```javascript
it('should handle complete workflow', async () => {
  // Mock external services
  axios.post.mockResolvedValue({ data: mockResponse });
  
  // Test multiple webhook calls in sequence
  const results = await Promise.all([
    handler(ringingEvent, mockContext),
    handler(answeredEvent, mockContext),
    handler(completedEvent, mockContext)
  ]);
  
  // Verify complete flow
  results.forEach(result => {
    expect(result.statusCode).toBe(200);
  });
});
```

## Debugging Tests

### Enable Verbose Output
```bash
npm test -- --verbose
```

### Run Specific Test Files
```bash
npm test index.test.js
npm test integration.test.js
```

### Debug Individual Tests
```bash
npm test -- --testNamePattern="should handle ringing webhook"
```

## Best Practices

1. **Mock External Dependencies**: Always mock Twilio, VAPI, and axios
2. **Test Error Scenarios**: Include failure cases and edge conditions
3. **Use Realistic Data**: Mock data should match real webhook payloads
4. **Test Security**: Validate signature checking and authentication
5. **Performance Testing**: Ensure reasonable response times
6. **Cleanup**: Reset mocks and environment variables between tests

## Continuous Integration

The tests are designed to run in CI/CD environments:

- **No external dependencies** (everything mocked)
- **Deterministic results** (no random or time-dependent behavior)
- **Fast execution** (under 30 seconds for full suite)
- **Clear failure reporting** (detailed error messages)

## Troubleshooting

### Common Issues

**Tests fail with "Cannot find module"**
```bash
npm install  # Install dependencies
```

**Tests timeout**
```bash
# Increase timeout in jest.config.js
jest.setTimeout(15000);
```

**Coverage below threshold**
```bash
# Check which lines are uncovered
npm run test:coverage
# Add tests for uncovered code paths
```