const { handler } = require('./index');
const {
  mockTwilioWebhookData,
  mockAPIGatewayEvent,
  mockVAPIResponse,
  mockContext,
  createFormBody
} = require('./test/mocks');

// Mock external dependencies
jest.mock('twilio', () => ({
  validateRequest: jest.fn()
}));

jest.mock('axios');
const axios = require('axios');

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    VAPI_API_KEY: 'test-vapi-key',
    VAPI_ENDPOINT: 'https://api.vapi.ai',
    VAPI_ASSISTANT_ID: 'test-assistant-id',
    TWILIO_AUTH_TOKEN: 'test-twilio-token'
  };
  jest.clearAllMocks();
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Twilio VAPI Webhook Handler', () => {
  describe('handler function', () => {
    it('should return 200 for valid ringing webhook', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);
      
      axios.post.mockResolvedValue({
        data: mockVAPIResponse.success
      });

      const body = createFormBody(mockTwilioWebhookData.ringing);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('application/xml');
      expect(result.body).toContain('<Response>');
      expect(result.body).toContain('Connecting you to our AI assistant');
    });

    it('should return 200 for valid answered webhook', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);

      const body = createFormBody(mockTwilioWebhookData.answered);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('application/xml');
      expect(result.body).toContain('<Response>');
    });

    it('should return 200 for valid completed webhook', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);

      const body = createFormBody(mockTwilioWebhookData.completed);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('application/xml');
      expect(result.body).toContain('<Response>');
    });

    it('should return 403 for invalid Twilio signature', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(false);

      const body = createFormBody(mockTwilioWebhookData.ringing);
      const event = mockAPIGatewayEvent(body);
      event.headers['X-Twilio-Signature'] = 'invalid-signature';

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body).error).toBe('Invalid Twilio signature');
    });

    it('should return 500 on VAPI API error', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);
      
      axios.post.mockRejectedValue(new Error('VAPI API Error'));

      const body = createFormBody(mockTwilioWebhookData.ringing);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200); // Should still return 200 with error TwiML
      expect(result.body).toContain('technical difficulties');
    });

    it('should handle missing signature gracefully', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);

      const body = createFormBody(mockTwilioWebhookData.ringing);
      const event = mockAPIGatewayEvent(body, { 'X-Twilio-Signature': undefined });

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
    });

    it('should handle unknown call status', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);

      const unknownStatusData = {
        ...mockTwilioWebhookData.ringing,
        CallStatus: 'unknown-status'
      };
      
      const body = createFormBody(unknownStatusData);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('<Response>');
    });
  });

  describe('VAPI integration', () => {
    it('should call VAPI API with correct parameters for incoming call', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);
      
      axios.post.mockResolvedValue({
        data: mockVAPIResponse.success
      });

      const body = createFormBody(mockTwilioWebhookData.ringing);
      const event = mockAPIGatewayEvent(body);

      await handler(event, mockContext);

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.vapi.ai/call/phone',
        expect.objectContaining({
          type: 'inboundPhoneCall',
          phoneNumber: mockTwilioWebhookData.ringing.To,
          customer: {
            number: mockTwilioWebhookData.ringing.From
          },
          twilioCallSid: mockTwilioWebhookData.ringing.CallSid
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-vapi-key',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should attempt to end VAPI call on call completion', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);
      
      axios.post.mockResolvedValue({ data: {} });

      const body = createFormBody(mockTwilioWebhookData.completed);
      const event = mockAPIGatewayEvent(body);

      await handler(event, mockContext);

      expect(axios.post).toHaveBeenCalledWith(
        `https://api.vapi.ai/call/${mockTwilioWebhookData.completed.CallSid}/end`,
        {},
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-vapi-key',
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle malformed request body', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);

      const event = mockAPIGatewayEvent('invalid-body-format');

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('<Response>');
    });

    it('should handle missing environment variables', async () => {
      delete process.env.VAPI_API_KEY;
      delete process.env.TWILIO_AUTH_TOKEN;

      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);

      const body = createFormBody(mockTwilioWebhookData.ringing);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
    });
  });
});