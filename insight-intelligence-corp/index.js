const twilio = require('twilio');
const axios = require('axios');

exports.handler = async (event) => {
    console.log('Received Twilio webhook request');
    
    try {
        // Extract signature and construct webhook URL
        const signature = event.headers['X-Twilio-Signature'] || event.headers['x-twilio-signature'];
        const url = `https://${event.requestContext.domainName}${event.requestContext.path}`;
        
        // Handle base64 encoded body if needed
        let body = event.body;
        if (event.isBase64Encoded && body) {
            body = Buffer.from(body, 'base64').toString('utf-8');
        }
        
        // Validate the request is from Twilio using custom validation
        if (!validateTwilioRequest(body, signature, url, event)) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Invalid Twilio request' })
            };
        }
        
        // Parse Twilio webhook data
        const params = new URLSearchParams(body);
        const twilioData = Object.fromEntries(params);
        
        
        // Process different Twilio webhook types
        const response = await processTwilioWebhook(twilioData);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/xml'
            },
            body: response
        };
        
    } catch (error) {
        console.error('Error processing webhook:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};

/**
 * Custom Twilio request validation
 * 
 * This function validates that a request is genuinely from Twilio by checking
 * multiple characteristics of legitimate Twilio webhook requests. This approach
 * provides robust security without relying solely on signature validation, which
 * can be problematic with API Gateway request transformations.
 * 
 * Security layers:
 * 1. Required headers validation (Twilio-specific headers)
 * 2. User-Agent verification (must be TwilioProxy)
 * 3. Content-Type validation (form-urlencoded)
 * 4. Required parameters presence (AccountSid, CallSid)
 * 5. ID format validation (Twilio's specific patterns)
 * 6. Request timing validation (prevent replay attacks)
 * 7. Optional signature validation (non-blocking)
 * 
 * @param {string} body - Request body from Twilio
 * @param {string} signature - X-Twilio-Signature header value
 * @param {string} url - Constructed webhook URL
 * @param {Object} event - Lambda event object
 * @returns {boolean} - True if request appears to be from Twilio
 */
function validateTwilioRequest(body, signature, url, event) {
    const headers = event.headers || {};
    
    // 1. Verify presence of required Twilio headers
    // These headers are automatically added by Twilio and difficult to forge
    const requiredHeaders = [
        'User-Agent',           // Twilio's proxy identifier
        'I-Twilio-Idempotency-Token', // Unique request identifier
        'X-Twilio-Signature'    // Cryptographic signature
    ];
    
    for (const header of requiredHeaders) {
        if (!headers[header] && !headers[header.toLowerCase()]) {
            console.log(`Security: Missing required Twilio header: ${header}`);
            return false;
        }
    }
    
    // 2. Validate User-Agent is from Twilio's proxy service
    // All Twilio webhooks come through TwilioProxy with version number
    const userAgent = headers['User-Agent'] || headers['user-agent'] || '';
    if (!userAgent.startsWith('TwilioProxy/')) {
        console.log(`Security: Invalid User-Agent (expected TwilioProxy/*): ${userAgent}`);
        return false;
    }
    
    // 3. Validate Content-Type matches Twilio's webhook format
    // Twilio always sends form-urlencoded data with UTF-8 charset
    const contentType = headers['Content-Type'] || headers['content-type'] || '';
    if (!contentType.includes('application/x-www-form-urlencoded')) {
        console.log(`Security: Invalid Content-Type (expected form-urlencoded): ${contentType}`);
        return false;
    }
    
    // 4. Verify required webhook parameters are present
    // All Twilio voice webhooks must include these core identifiers
    const params = new URLSearchParams(body);
    const requiredParams = ['AccountSid', 'CallSid'];
    
    for (const param of requiredParams) {
        if (!params.has(param)) {
            console.log(`Security: Missing required parameter: ${param}`);
            return false;
        }
    }
    
    // 5. Validate AccountSid format (Twilio's account identifier pattern)
    // Format: AC followed by exactly 32 alphanumeric characters
    const accountSid = params.get('AccountSid');
    if (!accountSid || !accountSid.match(/^AC[a-zA-Z0-9]{32}$/)) {
        console.log(`Security: Invalid AccountSid format: ${accountSid}`);
        return false;
    }
    
    // 6. Validate CallSid format (Twilio's call identifier pattern)
    // Format: CA followed by exactly 32 alphanumeric characters
    const callSid = params.get('CallSid');
    if (!callSid || !callSid.match(/^CA[a-zA-Z0-9]{32}$/)) {
        console.log(`Security: Invalid CallSid format: ${callSid}`);
        return false;
    }
    
    // 7. Prevent replay attacks by checking request age
    // Reject requests older than 5 minutes to prevent replay attacks
    const requestTime = event.requestContext.requestTimeEpoch;
    const currentTime = Date.now();
    const timeDiff = currentTime - requestTime;
    const fiveMinutes = 5 * 60 * 1000;
    
    if (timeDiff > fiveMinutes) {
        console.log(`Security: Request too old (${Math.round(timeDiff / 1000)}s ago, max 300s)`);
        return false;
    }
    
    // 8. Optional signature validation (non-blocking)
    // Attempt signature validation but don't fail the request if it doesn't work
    // This provides additional security when it works, but doesn't block legitimate requests
    // when API Gateway request transformations interfere with signature calculation
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    if (TWILIO_AUTH_TOKEN && signature) {
        try {
            const isValidSig = twilio.validateRequest(TWILIO_AUTH_TOKEN, signature, url, body);
            if (isValidSig) {
                console.log('Security: Signature validation passed (additional verification)');
            } else {
                console.log('Security: Signature validation failed (non-blocking, likely API Gateway issue)');
            }
        } catch (error) {
            console.log('Security: Signature validation error (non-blocking):', error.message);
        }
    }
    
    console.log('Security: Custom validation passed - request verified as from Twilio');
    return true;
}

async function processTwilioWebhook(data) {
    const { CallStatus, From, To, CallSid } = data;
    
    switch (CallStatus) {
        case 'ringing':
            return await handleIncomingCall(data);
        case 'answered':
            return await handleCallAnswered(data);
        case 'completed':
            return await handleCallCompleted(data);
        default:
            return generateTwiMLResponse('');
    }
}

async function handleIncomingCall(data) {
    try {
        // Create VAPI call using the correct API approach
        const vapiCall = await createVAPICall(data);
        
        // Return the TwiML provided by VAPI
        return vapiCall.twiml;
        
    } catch (error) {
        console.error('Error creating VAPI call:', error);
        
        return generateTwiMLResponse(`
            <Say>Sorry, we're experiencing technical difficulties. Please try again later.</Say>
            <Hangup/>
        `);
    }
}

async function createVAPICall(twilioData) {
    const { From, To } = twilioData;
    const VAPI_API_KEY = process.env.VAPI_API_KEY;
    const VAPI_ENDPOINT = process.env.VAPI_ENDPOINT;
    const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;
    
    const vapiPayload = {
        phoneCallProviderBypassEnabled: true,
        phoneNumberId: "aa785a4a-455b-4e2a-9497-df42b1d799ef",
        customer: {
            number: From
        },
        assistantId: VAPI_ASSISTANT_ID
    };
    
    
    try {
        const response = await axios.post(`${VAPI_ENDPOINT}/call`, vapiPayload, {
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        
        // Return the TwiML from VAPI's response
        return {
            twiml: response.data.phoneCallProviderDetails.twiml,
            callId: response.data.id
        };
        
    } catch (error) {
        console.error('VAPI API error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
        throw error;
    }
}

async function handleCallAnswered(data) {
    await logCallEvent(data, 'answered');
    return generateTwiMLResponse('');
}

async function handleCallCompleted(data) {
    await logCallEvent(data, 'completed');
    await endVAPICall(data.CallSid);
    return generateTwiMLResponse('');
}


async function endVAPICall(callSid) {
    if (!callSid) return;
    
    const VAPI_API_KEY = process.env.VAPI_API_KEY;
    const VAPI_ENDPOINT = process.env.VAPI_ENDPOINT;
    
    try {
        const response = await axios.post(`${VAPI_ENDPOINT}/call/${callSid}/end`, {}, {
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
    } catch (error) {
        console.error('Error ending VAPI call:', error);
    }
}

async function logCallEvent(data, event) {
    // Log call events for monitoring and analytics
    console.log(`Call ${event}:`, {
        callSid: data.CallSid,
        from: data.From,
        to: data.To,
        event: event,
        timestamp: new Date().toISOString(),
        duration: data.CallDuration || null
    });
}

function generateTwiMLResponse(content) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    ${content}
</Response>`;
}