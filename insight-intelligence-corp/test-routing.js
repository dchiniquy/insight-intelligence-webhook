// Test script for phone routing functionality
// Run with: node test-routing.js

// Mock environment variables
process.env.PHONE_ROUTING_ENABLED = 'true';
process.env.PHONE_ROUTING_MAP = JSON.stringify({
  '+14805767537': {
    vapiAssistantId: 'main-business-assistant',
    description: 'Main business line → Direct to VAPI'
  },
  '+15551234567': {
    targetNumber: '+15034688103',
    requiresAnswer: true,
    maxRingTime: 30000,
    vapiAssistantId: 'owner-assistant',
    description: 'Owner line → Mobile then VAPI'
  }
});
process.env.DEFAULT_FORWARD_TIMEOUT = '30';
process.env.VAPI_FALLBACK_ENABLED = 'true';
process.env.VAPI_ASSISTANT_ID = 'default-assistant-id';

// Import the functions we need to test
const { handler } = require('./index.js');

// Test data
// Main business line - should go direct to VAPI
const mockTwilioWebhookMainBusiness = {
  httpMethod: 'POST',
  headers: {
    'User-Agent': 'TwilioProxy/1.1',
    'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    'X-Twilio-Signature': 'test-signature',
    'I-Twilio-Idempotency-Token': 'test-token'
  },
  body: new URLSearchParams({
    AccountSid: 'ACfakecallsidforitestingpurposesxx',
    CallSid: 'CAfakecallsidforitestingpurposesxx',
    From: '+15559876543',
    To: '+14805767537', // Main business line
    CallStatus: 'ringing'
  }).toString(),
  requestContext: {
    domainName: 'test-api.execute-api.us-west-2.amazonaws.com',
    path: '/dev/webhook',
    requestTimeEpoch: Date.now()
  }
};

// Owner line - should forward first
const mockTwilioWebhookOwnerLine = {
  httpMethod: 'POST',
  headers: {
    'User-Agent': 'TwilioProxy/1.1',
    'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    'X-Twilio-Signature': 'test-signature',
    'I-Twilio-Idempotency-Token': 'test-token'
  },
  body: new URLSearchParams({
    AccountSid: 'ACfakecallsidforitestingpurposesxx',
    CallSid: 'CAfakecallsidforitestingpurposesxx',
    From: '+15559876543',
    To: '+15551234567', // Owner line
    CallStatus: 'ringing'
  }).toString(),
  requestContext: {
    domainName: 'test-api.execute-api.us-west-2.amazonaws.com',
    path: '/dev/webhook',
    requestTimeEpoch: Date.now()
  }
};

const mockTwilioWebhookDialStatus = {
  httpMethod: 'POST',
  headers: {
    'User-Agent': 'TwilioProxy/1.1',
    'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    'X-Twilio-Signature': 'test-signature',
    'I-Twilio-Idempotency-Token': 'test-token'
  },
  body: new URLSearchParams({
    AccountSid: 'ACfakecallsidforitestingpurposesxx',
    CallSid: 'CAfakecallsidforitestingpurposesxx',
    From: '+15559876543',
    To: '+14805767537',
    CallStatus: 'in-progress',
    DialCallStatus: 'no-answer'
  }).toString(),
  requestContext: {
    domainName: 'test-api.execute-api.us-west-2.amazonaws.com',
    path: '/dev/webhook',
    requestTimeEpoch: Date.now()
  }
};

async function testRouting() {
  console.log('=== Testing Phone Routing Implementation ===\n');
  
  try {
    console.log('1. Testing main business line (direct to VAPI)...');
    const response1 = await handler(mockTwilioWebhookMainBusiness);
    console.log('Response Status:', response1.statusCode);
    console.log('Response Body:', response1.body);
    console.log('Should contain VAPI TwiML (direct to VAPI)\n');

    console.log('2. Testing owner line (forward first)...');
    const response2 = await handler(mockTwilioWebhookOwnerLine);
    console.log('Response Status:', response2.statusCode);
    console.log('Response Body:', response2.body);
    console.log('Should contain <Dial> with target number +15034688103\n');

    console.log('3. Testing dial status callback (no-answer)...');
    const response3 = await handler(mockTwilioWebhookDialStatus);
    console.log('Response Status:', response3.statusCode);
    console.log('Response Body:', response3.body);
    console.log('Should contain VAPI TwiML or error message\n');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Test routing configuration parsing
function testRoutingConfig() {
  console.log('=== Testing Routing Configuration Parsing ===\n');
  
  // This would normally be imported from index.js, but functions aren't exported
  // For now, just validate the JSON parsing works
  const routingMap = JSON.parse(process.env.PHONE_ROUTING_MAP);
  console.log('Parsed routing map:', JSON.stringify(routingMap, null, 2));
  
  const config = routingMap['+14805767537'];
  if (config) {
    console.log(`✅ Configuration found for +14805767537: ${config.description}`);
  } else {
    console.log('❌ No configuration found for +14805767537');
  }
}

// Run tests
testRoutingConfig();
testRouting();