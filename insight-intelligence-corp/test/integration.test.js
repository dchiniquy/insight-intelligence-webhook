// Mock Twilio module first
jest.mock('twilio', () => ({
  validateRequest: jest.fn().mockReturnValue(true)
}));

jest.mock('axios');

const { handler } = require('../index');
const {
  mockTwilioWebhookData,
  mockAPIGatewayEvent,
  mockContext,
  createFormBody
} = require('./mocks');
const axios = require('axios');

// Integration tests for real webhook scenarios
describe('Webhook Integration Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      VAPI_API_KEY: 'test-vapi-key',
      VAPI_ENDPOINT: 'https://api.vapi.ai',
      VAPI_ASSISTANT_ID: 'test-assistant-id',
      TWILIO_AUTH_TOKEN: 'test-twilio-token'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('Complete call flow', () => {
    it('should handle complete call lifecycle', async () => {
      // Set up axios mock responses for this test
      axios.post
        .mockResolvedValueOnce({
          data: { 
            id: 'call_123', 
            phoneCallProviderDetails: { 
              twiml: '<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="wss://stream.vapi.ai/call_123" /></Connect></Response>'
            }
          }
        })
        .mockResolvedValueOnce({
          data: { success: true }
        });

      // 1. Incoming call (ringing)
      const ringingBody = createFormBody(mockTwilioWebhookData.ringing);
      const ringingEvent = mockAPIGatewayEvent(ringingBody);
      
      const ringingResult = await handler(ringingEvent, mockContext);
      
      expect(ringingResult.statusCode).toBe(200);
      expect(ringingResult.body).toContain('<Stream url="wss://stream.vapi.ai/call_123"');
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.vapi.ai/call',
        expect.any(Object),
        expect.any(Object)
      );

      // 2. Call answered
      const answeredBody = createFormBody(mockTwilioWebhookData.answered);
      const answeredEvent = mockAPIGatewayEvent(answeredBody);
      
      const answeredResult = await handler(answeredEvent, mockContext);
      
      expect(answeredResult.statusCode).toBe(200);

      // 3. Call completed
      const completedBody = createFormBody(mockTwilioWebhookData.completed);
      const completedEvent = mockAPIGatewayEvent(completedBody);
      
      const completedResult = await handler(completedEvent, mockContext);
      
      expect(completedResult.statusCode).toBe(200);
      expect(axios.post).toHaveBeenCalledWith(
        `https://api.vapi.ai/call/${mockTwilioWebhookData.completed.CallSid}/end`,
        {},
        expect.any(Object)
      );
    });
  });

  describe('Error scenarios', () => {
    it('should handle VAPI service unavailable', async () => {
      axios.post.mockRejectedValueOnce(new Error('Service Unavailable'));

      const body = createFormBody(mockTwilioWebhookData.ringing);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('technical difficulties');
      expect(result.body).toContain('<Hangup/>');
    });

    it('should handle network timeout gracefully', async () => {
      axios.post.mockRejectedValueOnce(new Error('ETIMEDOUT'));

      const body = createFormBody(mockTwilioWebhookData.ringing);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('technical difficulties');
    });
  });

  describe('Security validation', () => {
    it('should reject requests with invalid headers', async () => {
      const body = createFormBody(mockTwilioWebhookData.ringing);
      const event = mockAPIGatewayEvent(body, {
        'User-Agent': 'InvalidAgent/1.0' // Invalid User-Agent to trigger validation failure
      });

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body).error).toBe('Invalid Twilio request');
    });

    it('should reject requests with missing signature header', async () => {
      const body = createFormBody(mockTwilioWebhookData.ringing);
      const event = mockAPIGatewayEvent(body, {});
      delete event.headers['X-Twilio-Signature'];

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body).error).toBe('Invalid Twilio request');
    });
  });

  describe('Performance and reliability', () => {
    it('should handle high-volume concurrent requests', async () => {
      axios.post.mockResolvedValue({
        data: { 
          id: 'call_123', 
          phoneCallProviderDetails: { 
            twiml: '<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="wss://stream.vapi.ai/call_123" /></Connect></Response>'
          }
        }
      });

      const promises = [];
      
      // Simulate 10 concurrent requests
      for (let i = 0; i < 10; i++) {
        const callData = {
          ...mockTwilioWebhookData.ringing,
          CallSid: `CAfakecallsidforitestingpurposese${i}` // Valid 34-char format
        };
        
        const body = createFormBody(callData);
        const event = mockAPIGatewayEvent(body);
        
        promises.push(handler(event, mockContext));
      }

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.statusCode).toBe(200);
      });
    });

    it('should complete within acceptable time limits', async () => {
      axios.post.mockResolvedValue({
        data: { 
          id: 'call_123', 
          phoneCallProviderDetails: { 
            twiml: '<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="wss://stream.vapi.ai/call_123" /></Connect></Response>'
          }
        }
      });

      const body = createFormBody(mockTwilioWebhookData.ringing);
      const event = mockAPIGatewayEvent(body);

      const startTime = Date.now();
      const result = await handler(event, mockContext);
      const endTime = Date.now();

      expect(result.statusCode).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Whisper Endpoint Tests', () => {
    beforeEach(() => {
      process.env = {
        ...originalEnv,
        PHONE_ROUTING_ENABLED: 'true',
        PHONE_ROUTING_MAP: JSON.stringify({
          "+16029609874": {
            "targetNumber": "+15034688103",
            "requiresAnswer": true,
            "maxRingTime": 22000,
            "vapiAssistantId": "7198cd49-dfc0-4616-b5bc-3ed4b7fa42a1",
            "description": "Don direct line → Mobile then VAPI",
            "whisperMessage": "Insight Intelligence Call"
          },
          "+16026000707": {
            "targetNumber": "+14586002713",
            "requiresAnswer": true,
            "maxRingTime": 22000,
            "vapiAssistantId": "498fa201-d561-4401-9f84-bfbccdf79b65",
            "description": "Demie line → Office then VAPI",
            "whisperMessage": "Business call from Demie's line"
          },
          "+14805767537": {
            "vapiAssistantId": "498fa201-d561-4401-9f84-bfbccdf79b65",
            "description": "Main business line → Direct to VAPI"
          }
        }),
        VAPI_API_KEY: 'test-vapi-key',
        TWILIO_AUTH_TOKEN: 'test-twilio-token'
      };
    });

    it('should return correct whisper message for configured target number', async () => {
      const whisperData = {
        AccountSid: 'ACfakeaccountsidfortestingpurposes',
        CallSid: 'CAfakecallsidforitestingpurposesxx',
        From: '+15559876543', // Original caller
        To: '+15034688103',   // Don's mobile (target number)
        CallStatus: 'in-progress'
      };

      const body = createFormBody(whisperData);
      const event = {
        ...mockAPIGatewayEvent(body),
        requestContext: {
          ...mockAPIGatewayEvent(body).requestContext,
          path: '/dev/whisper'
        }
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('application/xml');
      expect(result.body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.body).toContain('<Response>');
      expect(result.body).toContain('<Say voice="alice">Insight Intelligence Call</Say>');
      expect(result.body).toContain('</Response>');
    });

    it('should return correct whisper message for second configured target number', async () => {
      const whisperData = {
        AccountSid: 'ACfakeaccountsidfortestingpurposes',
        CallSid: 'CAfakecallsidforitestingpurposesxx',
        From: '+15559876543', // Original caller
        To: '+14586002713',   // Demie's office (target number)
        CallStatus: 'in-progress'
      };

      const body = createFormBody(whisperData);
      const event = {
        ...mockAPIGatewayEvent(body),
        requestContext: {
          ...mockAPIGatewayEvent(body).requestContext,
          path: '/dev/whisper'
        }
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('<Say voice="alice">Business call from Demie\'s line</Say>');
    });

    it('should fall back to default message for unconfigured target number', async () => {
      const whisperData = {
        AccountSid: 'ACfakeaccountsidfortestingpurposes',
        CallSid: 'CAfakecallsidforitestingpurposesxx',
        From: '+15559876543', // Original caller
        To: '+15551111111',   // Unconfigured target number
        CallStatus: 'in-progress'
      };

      const body = createFormBody(whisperData);
      const event = {
        ...mockAPIGatewayEvent(body),
        requestContext: {
          ...mockAPIGatewayEvent(body).requestContext,
          path: '/dev/whisper'
        }
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('<Say voice="alice">Business call forwarded from +15551111111 - caller +15559876543</Say>');
    });

    it('should handle whisper request when routing is disabled', async () => {
      process.env.PHONE_ROUTING_ENABLED = 'false';

      const whisperData = {
        AccountSid: 'ACfakeaccountsidfortestingpurposes',
        CallSid: 'CAfakecallsidforitestingpurposesxx',
        From: '+15559876543',
        To: '+15034688103',
        CallStatus: 'in-progress'
      };

      const body = createFormBody(whisperData);
      const event = {
        ...mockAPIGatewayEvent(body),
        requestContext: {
          ...mockAPIGatewayEvent(body).requestContext,
          path: '/dev/whisper'
        }
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('<Say voice="alice">Business call forwarded from +15034688103 - caller +15559876543</Say>');
    });

    it('should handle malformed routing configuration gracefully', async () => {
      process.env.PHONE_ROUTING_MAP = 'invalid-json';

      const whisperData = {
        AccountSid: 'ACfakeaccountsidfortestingpurposes',
        CallSid: 'CAfakecallsidforitestingpurposesxx',
        From: '+15559876543',
        To: '+15034688103',
        CallStatus: 'in-progress'
      };

      const body = createFormBody(whisperData);
      const event = {
        ...mockAPIGatewayEvent(body),
        requestContext: {
          ...mockAPIGatewayEvent(body).requestContext,
          path: '/dev/whisper'
        }
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('Business call forwarded from');
    });

    it('should handle whisper endpoint with missing Twilio data', async () => {
      const incompleteData = {
        AccountSid: 'ACfakeaccountsidfortestingpurposes', // Need this for validation
        CallSid: 'CAfakecallsidforitestingpurposesxx',
        From: '+15559876543', // Add minimal required data
        To: '+15034688103'
        // Other fields can be missing
      };

      const body = createFormBody(incompleteData);
      const event = {
        ...mockAPIGatewayEvent(body),
        requestContext: {
          ...mockAPIGatewayEvent(body).requestContext,
          path: '/dev/whisper'
        }
      };

      const result = await handler(event, mockContext);

      // Should still return valid TwiML even with minimal data
      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('application/xml');
      expect(result.body).toContain('<Response>');
      expect(result.body).toContain('<Say voice="alice">');
    });
  });
});