const twilio = require('twilio');
const axios = require('axios');

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_ENDPOINT = process.env.VAPI_ENDPOINT;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    try {
        // Validate Twilio webhook signature
        const signature = event.headers['X-Twilio-Signature'] || event.headers['x-twilio-signature'];
        const url = `https://${event.headers.Host}${event.requestContext.path}`;
        
        if (!validateTwilioSignature(event.body, signature, url)) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Invalid Twilio signature' })
            };
        }
        
        // Parse Twilio webhook data
        const params = new URLSearchParams(event.body);
        const twilioData = Object.fromEntries(params);
        
        console.log('Twilio webhook data:', twilioData);
        
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

function validateTwilioSignature(body, signature, url) {
    if (!signature || !TWILIO_AUTH_TOKEN) {
        console.warn('Missing signature or auth token for validation');
        return true; // Skip validation if not configured
    }
    
    try {
        return twilio.validateRequest(TWILIO_AUTH_TOKEN, signature, url, body);
    } catch (error) {
        console.error('Error validating Twilio signature:', error);
        return false;
    }
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
    console.log('Handling incoming call:', data);
    
    try {
        // Start VAPI call
        const vapiCall = await startVAPICall(data);
        
        // Return TwiML to connect to VAPI
        return generateTwiMLResponse(`
            <Say>Connecting you to our AI assistant.</Say>
            <Dial>
                <Stream url="${vapiCall.streamUrl}" />
            </Dial>
        `);
        
    } catch (error) {
        console.error('Error starting VAPI call:', error);
        
        return generateTwiMLResponse(`
            <Say>Sorry, we're experiencing technical difficulties. Please try again later.</Say>
            <Hangup/>
        `);
    }
}

async function handleCallAnswered(data) {
    console.log('Call answered:', data);
    
    // Log call answered event
    await logCallEvent(data, 'answered');
    
    return generateTwiMLResponse('');
}

async function handleCallCompleted(data) {
    console.log('Call completed:', data);
    
    // Log call completion and duration
    await logCallEvent(data, 'completed');
    
    // End VAPI call if needed
    await endVAPICall(data.CallSid);
    
    return generateTwiMLResponse('');
}

async function startVAPICall(twilioData) {
    const { From, To, CallSid } = twilioData;
    
    const vapiPayload = {
        type: 'inboundPhoneCall',
        phoneNumber: To,
        customer: {
            number: From
        },
        twilioCallSid: CallSid,
        assistantId: process.env.VAPI_ASSISTANT_ID, // Optional: specify assistant
    };
    
    const response = await axios.post(`${VAPI_ENDPOINT}/call/phone`, vapiPayload, {
        headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });
    
    console.log('VAPI call started:', response.data);
    return response.data;
}

async function endVAPICall(callSid) {
    if (!callSid) return;
    
    try {
        const response = await axios.post(`${VAPI_ENDPOINT}/call/${callSid}/end`, {}, {
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('VAPI call ended:', response.data);
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