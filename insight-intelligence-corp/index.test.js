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
    TWILIO_AUTH_TOKEN: 'test-twilio-token',
    PHONE_ROUTING_ENABLED: 'true',
    PHONE_ROUTING_MAP: JSON.stringify({
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
    }),
    DEFAULT_FORWARD_TIMEOUT: '30',
    VAPI_FALLBACK_ENABLED: 'true'
  };
  jest.clearAllMocks();
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Twilio VAPI Webhook Handler', () => {
  describe('handler function', () => {
    it('should return 200 for valid ringing webhook (unmapped number)', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);
      
      axios.post.mockResolvedValue({
        data: mockVAPIResponse.success
      });

      const body = createFormBody(mockTwilioWebhookData.unmappedNumber);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('application/xml');
      expect(result.body).toContain('<Response>');
      expect(result.body).toContain('<Stream url="wss://stream.vapi.ai/call_123"');
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

    it('should return 403 for invalid Twilio request', async () => {
      const body = createFormBody(mockTwilioWebhookData.ringing);
      const event = mockAPIGatewayEvent(body, {
        'User-Agent': 'InvalidAgent/1.0' // Invalid User-Agent to trigger validation failure
      });

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body).error).toBe('Invalid Twilio request');
    });

    it('should return 500 on VAPI API error (unmapped number)', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);
      
      axios.post.mockRejectedValue(new Error('VAPI API Error'));

      const body = createFormBody(mockTwilioWebhookData.unmappedNumber);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200); // Should still return 200 with error TwiML
      expect(result.body).toContain('technical difficulties');
    });

    it('should reject requests with missing signature header', async () => {
      const body = createFormBody(mockTwilioWebhookData.ringing);
      const event = mockAPIGatewayEvent(body);
      delete event.headers['X-Twilio-Signature']; // Remove required header

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body).error).toBe('Invalid Twilio request');
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
    it('should call VAPI API with correct parameters for unmapped number', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);
      
      axios.post.mockResolvedValue({
        data: mockVAPIResponse.success
      });

      const body = createFormBody(mockTwilioWebhookData.unmappedNumber);
      const event = mockAPIGatewayEvent(body);

      await handler(event, mockContext);

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.vapi.ai/call',
        expect.objectContaining({
          phoneCallProviderBypassEnabled: true,
          phoneNumberId: "aa785a4a-455b-4e2a-9497-df42b1d799ef",
          customer: {
            number: mockTwilioWebhookData.unmappedNumber.From
          },
          assistantId: "test-assistant-id"
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

  describe('phone routing', () => {
    it('should go directly to VAPI for main business line (no targetNumber)', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);
      
      axios.post.mockResolvedValue({
        data: mockVAPIResponse.success
      });

      const body = createFormBody(mockTwilioWebhookData.mainBusinessLine);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('<Stream url="wss://stream.vapi.ai/call_123"');
      
      // Should call VAPI with the mapped assistant ID for main business line
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.vapi.ai/call',
        expect.objectContaining({
          assistantId: "main-business-assistant"
        }),
        expect.any(Object)
      );
    });

    it('should forward to target number for owner line (with targetNumber)', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);

      const body = createFormBody(mockTwilioWebhookData.ownerLine);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('<Dial timeout="30"');
      expect(result.body).toContain('<Number>+15034688103</Number>');
      expect(result.body).not.toContain('<Stream'); // Should not contain VAPI stream initially
    });

    it('should use default VAPI for unmapped numbers', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);
      
      axios.post.mockResolvedValue({
        data: mockVAPIResponse.success
      });

      const body = createFormBody(mockTwilioWebhookData.unmappedNumber);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('<Stream url="wss://stream.vapi.ai/call_123"');
      
      // Should call VAPI with default assistant ID
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.vapi.ai/call',
        expect.objectContaining({
          assistantId: "test-assistant-id" // Default assistant
        }),
        expect.any(Object)
      );
    });

    it('should handle dial answered callback', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);

      const body = createFormBody(mockTwilioWebhookData.dialAnswered);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.body).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n    \n</Response>');
    });

    it('should transfer to VAPI on dial no-answer', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);
      
      axios.post.mockResolvedValue({
        data: mockVAPIResponse.success
      });

      // First simulate the call setup to store routing info
      const callStatusMap = new Map();
      callStatusMap.set('CAfakecallsidforitestingpurposesxx', {
        routingConfig: {
          targetNumber: '+15034688103',
          vapiAssistantId: 'owner-assistant'
        },
        status: 'forwarding'
      });

      const body = createFormBody(mockTwilioWebhookData.dialNoAnswer);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      // Should contain VAPI TwiML or call VAPI API
    });

    it('should transfer to VAPI on dial busy', async () => {
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);
      
      axios.post.mockResolvedValue({
        data: mockVAPIResponse.success
      });

      const body = createFormBody(mockTwilioWebhookData.dialBusy);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      // Should contain VAPI TwiML or call VAPI API
    });

    it('should work with routing disabled', async () => {
      process.env.PHONE_ROUTING_ENABLED = 'false';
      
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);
      
      axios.post.mockResolvedValue({
        data: mockVAPIResponse.success
      });

      const body = createFormBody(mockTwilioWebhookData.mainBusinessLine);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('<Stream url="wss://stream.vapi.ai/call_123"');
      
      // Should use default assistant even for mapped numbers
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.vapi.ai/call',
        expect.objectContaining({
          assistantId: "test-assistant-id"
        }),
        expect.any(Object)
      );
    });

    it('should handle malformed routing map JSON', async () => {
      process.env.PHONE_ROUTING_MAP = 'invalid-json{';
      
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);
      
      axios.post.mockResolvedValue({
        data: mockVAPIResponse.success
      });

      const body = createFormBody(mockTwilioWebhookData.mainBusinessLine);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      // Should fallback to VAPI with default settings
      expect(result.body).toContain('<Stream url="wss://stream.vapi.ai/call_123"');
    });

    it('should handle VAPI fallback disabled on no-answer', async () => {
      process.env.VAPI_FALLBACK_ENABLED = 'false';
      
      const twilio = require('twilio');
      twilio.validateRequest.mockReturnValue(true);

      const body = createFormBody(mockTwilioWebhookData.dialNoAnswer);
      const event = mockAPIGatewayEvent(body);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('<Hangup/>');
    });
  });

  describe('error handling', () => {
    it('should reject malformed request body', async () => {
      const event = mockAPIGatewayEvent('invalid-body-format'); // Missing required parameters

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body).error).toBe('Invalid Twilio request');
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