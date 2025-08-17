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
          data: { id: 'call_123', streamUrl: 'wss://stream.vapi.ai/call_123' }
        })
        .mockResolvedValueOnce({
          data: { success: true }
        });

      // 1. Incoming call (ringing)
      const ringingBody = createFormBody(mockTwilioWebhookData.ringing);
      const ringingEvent = mockAPIGatewayEvent(ringingBody);
      
      const ringingResult = await handler(ringingEvent, mockContext);
      
      expect(ringingResult.statusCode).toBe(200);
      expect(ringingResult.body).toContain('Connecting you to our AI assistant');
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.vapi.ai/call/phone',
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
        data: { id: 'call_123', streamUrl: 'wss://stream.vapi.ai/call_123' }
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
        data: { id: 'call_123', streamUrl: 'wss://stream.vapi.ai/call_123' }
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
});