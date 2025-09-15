// Mock data and utilities for testing

const mockTwilioWebhookData = {
  ringing: {
    AccountSid: 'ACfakeaccountsidfortestingpurposes',
    ApiVersion: '2010-04-01',
    CallSid: 'CAfakecallsidforitestingpurposesxx',
    CallStatus: 'ringing',
    Called: '+15551234567',
    Caller: '+15559876543',
    Direction: 'inbound',
    From: '+15559876543',
    To: '+15551234567',
  },
  answered: {
    AccountSid: 'ACfakeaccountsidfortestingpurposes',
    ApiVersion: '2010-04-01',
    CallSid: 'CAfakecallsidforitestingpurposesxx',
    CallStatus: 'answered',
    Called: '+15551234567',
    Caller: '+15559876543',
    Direction: 'inbound',
    From: '+15559876543',
    To: '+15551234567',
  },
  completed: {
    AccountSid: 'ACfakeaccountsidfortestingpurposes',
    ApiVersion: '2010-04-01',
    CallSid: 'CAfakecallsidforitestingpurposesxx',
    CallStatus: 'completed',
    Called: '+15551234567',
    Caller: '+15559876543',
    Direction: 'inbound',
    From: '+15559876543',
    To: '+15551234567',
    CallDuration: '120'
  },
  // Phone routing test scenarios
  mainBusinessLine: {
    AccountSid: 'ACfakeaccountsidfortestingpurposes',
    ApiVersion: '2010-04-01',
    CallSid: 'CAfakecallsidforitestingpurposesxx',
    CallStatus: 'ringing',
    Called: '+14805767537', // Main business line - should go direct to VAPI
    Caller: '+15559876543',
    Direction: 'inbound',
    From: '+15559876543',
    To: '+14805767537',
  },
  ownerLine: {
    AccountSid: 'ACfakeaccountsidfortestingpurposes',
    ApiVersion: '2010-04-01',
    CallSid: 'CAfakecallsidforitestingpurposesxx',
    CallStatus: 'ringing',
    Called: '+15551234567', // Owner line - should forward to mobile
    Caller: '+15559876543',
    Direction: 'inbound',
    From: '+15559876543',
    To: '+15551234567',
  },
  unmappedNumber: {
    AccountSid: 'ACfakeaccountsidfortestingpurposes',
    ApiVersion: '2010-04-01',
    CallSid: 'CAfakecallsidforitestingpurposesxx',
    CallStatus: 'ringing',
    Called: '+15559999999', // Unmapped - should go to default VAPI
    Caller: '+15559876543',
    Direction: 'inbound',
    From: '+15559876543',
    To: '+15559999999',
  },
  // Dial status callbacks
  dialAnswered: {
    AccountSid: 'ACfakeaccountsidfortestingpurposes',
    ApiVersion: '2010-04-01',
    CallSid: 'CAfakecallsidforitestingpurposesxx',
    CallStatus: 'in-progress',
    DialCallStatus: 'answered',
    Called: '+15551234567',
    Caller: '+15559876543',
    Direction: 'inbound',
    From: '+15559876543',
    To: '+15551234567',
  },
  dialNoAnswer: {
    AccountSid: 'ACfakeaccountsidfortestingpurposes',
    ApiVersion: '2010-04-01',
    CallSid: 'CAfakecallsidforitestingpurposesxx',
    CallStatus: 'in-progress',
    DialCallStatus: 'no-answer',
    Called: '+15551234567',
    Caller: '+15559876543',
    Direction: 'inbound',
    From: '+15559876543',
    To: '+15551234567',
  },
  dialBusy: {
    AccountSid: 'ACfakeaccountsidfortestingpurposes',
    ApiVersion: '2010-04-01',
    CallSid: 'CAfakecallsidforitestingpurposesxx',
    CallStatus: 'in-progress',
    DialCallStatus: 'busy',
    Called: '+15551234567',
    Caller: '+15559876543',
    Direction: 'inbound',
    From: '+15559876543',
    To: '+15551234567',
  }
};

const mockAPIGatewayEvent = (body, headers = {}) => ({
  body,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Host': 'api.example.com',
    'User-Agent': 'TwilioProxy/1.1',
    'I-Twilio-Idempotency-Token': 'test-idempotency-token',
    'X-Twilio-Signature': 'mock-signature',
    ...headers
  },
  requestContext: {
    domainName: 'api.example.com',
    path: '/dev/webhook',
    httpMethod: 'POST',
    requestTimeEpoch: Date.now()
  },
  isBase64Encoded: false
});

const mockVAPIResponse = {
  success: {
    id: 'call_123',
    status: 'active',
    phoneCallProviderDetails: {
      twiml: '<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="wss://stream.vapi.ai/call_123" /></Connect></Response>'
    }
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