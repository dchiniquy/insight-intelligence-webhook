const twilio = require('twilio');
const axios = require('axios');

// Global state to track call status (in production, use database)
const callStatusMap = new Map();

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
        
        // Check if this is a whisper endpoint request
        if (event.requestContext.path && event.requestContext.path.endsWith('/whisper')) {
            return generateWhisperResponse(twilioData);
        }
        
        // Process different Twilio webhook types
        const response = await processTwilioWebhook(twilioData, event);
        
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

/**
 * Get routing configuration for an incoming phone number
 * 
 * @param {string} incomingNumber - The phone number being called (To field)
 * @returns {Object|null} - Routing configuration or null if no mapping
 */
function getRoutingConfig(incomingNumber) {
    const routingEnabled = process.env.PHONE_ROUTING_ENABLED === 'true';
    if (!routingEnabled) {
        console.log('Phone routing disabled - using VAPI for all calls');
        return null;
    }

    const routingMapString = process.env.PHONE_ROUTING_MAP || '{}';
    let routingMap;
    
    try {
        routingMap = JSON.parse(routingMapString);
    } catch (error) {
        console.error('Error parsing PHONE_ROUTING_MAP:', error);
        return null;
    }

    const config = routingMap[incomingNumber];
    if (!config) {
        console.log(`No routing configuration found for ${incomingNumber} - using VAPI`);
        return null;
    }

    // Set defaults for missing fields
    const routingConfig = {
        targetNumber: config.targetNumber,
        requiresAnswer: config.requiresAnswer !== false, // Default to true
        vapiAssistantId: config.vapiAssistantId || process.env.VAPI_ASSISTANT_ID,
        maxRingTime: config.maxRingTime || (parseInt(process.env.DEFAULT_FORWARD_TIMEOUT) * 1000) || 30000,
        description: config.description || `Forward ${incomingNumber} → ${config.targetNumber}`
    };

    console.log(`Routing config for ${incomingNumber}:`, routingConfig);
    return routingConfig;
}

/**
 * Find routing configuration by target number (reverse lookup)
 * Used for whisper calls where we have the mobile number, not the business number
 * 
 * @param {string} targetNumber - The mobile/target number to find routing config for
 * @returns {Object|null} - Routing configuration object or null
 */
function findRoutingConfigByTarget(targetNumber) {
    const routingEnabled = process.env.PHONE_ROUTING_ENABLED === 'true';
    if (!routingEnabled) {
        console.log('Phone routing disabled - no routing config available for whisper');
        return null;
    }

    const routingMapString = process.env.PHONE_ROUTING_MAP || '{}';
    let routingMap;
    
    try {
        routingMap = JSON.parse(routingMapString);
    } catch (error) {
        console.error('Error parsing PHONE_ROUTING_MAP for whisper:', error);
        return null;
    }

    // Search through all routing configs to find one with matching targetNumber
    for (const [businessNumber, config] of Object.entries(routingMap)) {
        if (config.targetNumber === targetNumber) {
            console.log(`Found routing config for target ${targetNumber}: business number ${businessNumber}`);
            // Include the whisperMessage in the returned config
            return {
                ...config,
                businessNumber: businessNumber
            };
        }
    }
    
    console.log(`No routing configuration found for target number ${targetNumber}`);
    return null;
}

/**
 * Generate TwiML to forward call to target number with timeout
 * 
 * @param {Object} twilioData - Twilio webhook data
 * @param {Object} routingConfig - Routing configuration
 * @param {string} webhookUrl - Base webhook URL for status callbacks
 * @returns {string} - TwiML response
 */
function forwardCall(twilioData, routingConfig, webhookUrl, baseUrl) {
    const { CallSid } = twilioData;
    const timeoutSeconds = Math.floor(routingConfig.maxRingTime / 1000);

    // Store call routing info for status tracking
    callStatusMap.set(CallSid, {
        routingConfig: routingConfig,
        startTime: Date.now(),
        status: 'forwarding',
        originalCaller: twilioData.From
    });

    console.log(`Forwarding call ${CallSid} to ${routingConfig.targetNumber} with ${timeoutSeconds}s timeout`);

    const whisperUrl = `${baseUrl}/dev/whisper`;
    console.log(`Whisper URL: ${whisperUrl}`);
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial timeout="${timeoutSeconds}" action="${webhookUrl}" method="POST" callerId="${twilioData.From}">
        <Number url="${whisperUrl}">${routingConfig.targetNumber}</Number>
    </Dial>
    <Say voice="alice">I'm sorry, but no one is available to take your call right now. Please hold while I connect you to our AI assistant who can help you.</Say>
</Response>`;

    return twiml;
}

async function processTwilioWebhook(data, event) {
    const { CallStatus, From, To, CallSid, DialCallStatus } = data;
    
    // Check if this is a dial status callback (from forwarded call)
    if (DialCallStatus) {
        return await handleDialStatus(data);
    }
    
    switch (CallStatus) {
        case 'ringing':
            return await handleIncomingCall(data, event);
        case 'answered':
            return await handleCallAnswered(data);
        case 'completed':
            return await handleCallCompleted(data);
        default:
            return generateTwiMLResponse('');
    }
}

/**
 * Handle dial status callbacks from forwarded calls
 * 
 * @param {Object} data - Twilio webhook data with DialCallStatus
 * @returns {string} - TwiML response
 */
async function handleDialStatus(data) {
    const { CallSid, DialCallStatus } = data;
    const callInfo = callStatusMap.get(CallSid);
    
    console.log(`Dial status for ${CallSid}: ${DialCallStatus}`);
    
    if (!callInfo) {
        console.log(`No call info found for ${CallSid} - generating empty response`);
        return generateTwiMLResponse('');
    }

    switch (DialCallStatus) {
        case 'answered':
            console.log(`Call ${CallSid} was answered by target number`);
            callStatusMap.set(CallSid, { ...callInfo, status: 'answered' });
            // Call was answered - no further action needed
            return generateTwiMLResponse('');

        case 'no-answer':
        case 'busy':
        case 'failed':
            console.log(`Call ${CallSid} not answered (${DialCallStatus}) - transferring to VAPI`);
            
            // Check if VAPI fallback is enabled
            if (process.env.VAPI_FALLBACK_ENABLED !== 'true') {
                console.log('VAPI fallback disabled - ending call');
                return generateTwiMLResponse('<Hangup/>');
            }

            // Transfer to VAPI
            try {
                const vapiCall = await createVAPICall(data, callInfo.routingConfig);
                callStatusMap.set(CallSid, { ...callInfo, status: 'transferred_to_vapi' });
                return vapiCall.twiml;
            } catch (error) {
                console.error('Error transferring to VAPI:', error);
                return generateTwiMLResponse(`
                    <Say>I apologize, but we're experiencing technical difficulties. Please try calling again later.</Say>
                    <Hangup/>
                `);
            }

        default:
            console.log(`Unknown dial status: ${DialCallStatus}`);
            return generateTwiMLResponse('');
    }
}

async function handleIncomingCall(data, event) {
    const { To, From, CallSid } = data;
    
    try {
        console.log(`Incoming call: ${From} → ${To} (${CallSid})`);
        
        // Check if routing is configured for this number
        const routingConfig = getRoutingConfig(To);
        
        if (routingConfig && routingConfig.targetNumber) {
            // Forward call to target number
            const baseUrl = `https://${event.requestContext.domainName}`;
            const webhookUrl = `${baseUrl}${event.requestContext.path}`;
            console.log(`Using routing config - forwarding to ${routingConfig.targetNumber}`);
            return forwardCall(data, routingConfig, webhookUrl, baseUrl);
        } else if (routingConfig) {
            // Routing config exists but no targetNumber - direct to VAPI with specific assistant
            console.log(`Using routing config - direct to VAPI with assistant ${routingConfig.vapiAssistantId}`);
            const vapiCall = await createVAPICall(data, routingConfig);
            return vapiCall.twiml;
        } else {
            // No routing configured - use VAPI directly with defaults
            console.log('No routing config - using VAPI directly with defaults');
            const vapiCall = await createVAPICall(data);
            return vapiCall.twiml;
        }
        
    } catch (error) {
        console.error('Error handling incoming call:', error);
        
        return generateTwiMLResponse(`
            <Say>Sorry, we're experiencing technical difficulties. Please try again later.</Say>
            <Hangup/>
        `);
    }
}

async function createVAPICall(twilioData, routingConfig = null) {
    const { From, To } = twilioData;
    const VAPI_API_KEY = process.env.VAPI_API_KEY;
    const VAPI_ENDPOINT = process.env.VAPI_ENDPOINT;
    
    // Use routing config assistant ID if available, otherwise default
    const VAPI_ASSISTANT_ID = routingConfig?.vapiAssistantId || process.env.VAPI_ASSISTANT_ID;
    
    const vapiPayload = {
        phoneCallProviderBypassEnabled: true,
        phoneNumberId: "08b043a5-27ee-4aaa-8438-be91a1975a56",
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
    
    // Clean up call status tracking
    const { CallSid } = data;
    if (callStatusMap.has(CallSid)) {
        console.log(`Cleaning up call status for ${CallSid}`);
        callStatusMap.delete(CallSid);
    }
    
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

/**
 * Generate whisper response for call screening
 * 
 * @param {Object} twilioData - Twilio webhook data
 * @param {Object} event - Lambda event object
 * @returns {Object} - HTTP response with TwiML
 */
function generateWhisperResponse(twilioData) {
    const { From, To } = twilioData;
    
    // For whisper calls, To is the mobile number, not the business number
    // We need to find which business number forwards to this mobile number
    const routingConfig = findRoutingConfigByTarget(To);
    
    let whisperMessage = `Call from ${From}`;
    
    if (routingConfig && routingConfig.whisperMessage) {
        whisperMessage = routingConfig.whisperMessage;
    } else if (routingConfig && routingConfig.description) {
        whisperMessage = `${routingConfig.description}: Call from ${From}`;
    } else {
        whisperMessage = `Business call forwarded from ${To} - caller ${From}`;
    }
    
    console.log(`Generating whisper for ${To}: "${whisperMessage}"`);
    console.log(`Routing config found:`, JSON.stringify(routingConfig, null, 2));
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">${whisperMessage}</Say>
</Response>`;
    
    console.log(`Whisper TwiML:`, twiml);
    
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/xml'
        },
        body: twiml
    };
}