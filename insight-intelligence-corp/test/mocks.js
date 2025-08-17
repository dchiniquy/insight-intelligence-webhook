// Mock data and utilities for testing

const mockTwilioWebhookData = {
  ringing: {
    AccountSid: 'AC123456789',
    ApiVersion: '2010-04-01',
    CallSid: 'CA123456789',
    CallStatus: 'ringing',
    Called: '+15551234567',
    Caller: '+15559876543',
    Direction: 'inbound',
    From: '+15559876543',
    To: '+15551234567',
  },
  answered: {
    AccountSid: 'AC123456789',
    ApiVersion: '2010-04-01',
    CallSid: 'CA123456789',
    CallStatus: 'answered',
    Called: '+15551234567',
    Caller: '+15559876543',
    Direction: 'inbound',
    From: '+15559876543',
    To: '+15551234567',
  },
  completed: {
    AccountSid: 'AC123456789',
    ApiVersion: '2010-04-01',
    CallSid: 'CA123456789',
    CallStatus: 'completed',
    Called: '+15551234567',
    Caller: '+15559876543',
    Direction: 'inbound',
    From: '+15559876543',
    To: '+15551234567',
    CallDuration: '120'
  }
};

const mockAPIGatewayEvent = (body, headers = {}) => ({
  body,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Host': 'api.example.com',
    'X-Twilio-Signature': 'mock-signature',
    ...headers
  },
  requestContext: {
    path: '/webhook',
    httpMethod: 'POST'
  },
  isBase64Encoded: false
});

const mockVAPIResponse = {
  success: {
    id: 'call_123',
    status: 'active',
    streamUrl: 'wss://stream.vapi.ai/call_123'
  },
  error: {
    error: 'Invalid API key',
    message: 'Authentication failed'
  }
};

// Create form-encoded body from object
const createFormBody = (data) => {
  return new URLSearchParams(data).toString();
};

// Mock AWS Lambda context
const mockContext = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'insight-intelligence-corp-webhook',
  functionVersion: '$LATEST',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789:function:test',
  memoryLimitInMB: 128,
  awsRequestId: 'test-request-id',
  logGroupName: '/aws/lambda/test',
  logStreamName: '2023/12/01/[$LATEST]test',
  getRemainingTimeInMillis: () => 30000
};

module.exports = {
  mockTwilioWebhookData,
  mockAPIGatewayEvent,
  mockVAPIResponse,
  mockContext,
  createFormBody
};