# Claude Code Session Notes

## Project: Twilio-VAPI Webhook Integration

### Key Learnings and Solutions

#### 1. Twilio Signature Validation Issues with API Gateway

**Problem**: Twilio's standard signature validation consistently failed despite correct auth tokens and URL construction.

**Root Cause**: AWS API Gateway request transformations interfere with signature calculation by:
- Modifying request headers (Host vs domainName)
- Potentially altering URL encoding
- Adding/removing parameters during proxy integration

**Solution**: Implemented custom 7-layer validation instead of relying solely on signature validation:

```javascript
function validateTwilioRequest(body, signature, url, event) {
    // 1. Required headers validation (Twilio-specific headers)
    // 2. User-Agent verification (must be TwilioProxy)
    // 3. Content-Type validation (form-urlencoded)
    // 4. Required parameters presence (AccountSid, CallSid)
    // 5. ID format validation (Twilio's specific patterns)
    // 6. Request timing validation (prevent replay attacks)
    // 7. Optional signature validation (non-blocking)
}
```

#### 2. VAPI API Payload Format Requirements

**Problem**: VAPI returned 400 errors with specific payload format requirements.

**Incorrect Format**:
```javascript
{
    type: 'inboundPhoneCall',
    phoneNumber: "+14805767537",  // Wrong: string format
    twilioCallSid: "CA...",       // Wrong: property not accepted
    customer: { number: "+15034688103" }
}
```

**Correct Format**:
```javascript
{
    type: 'inboundPhoneCall',
    phoneNumber: {
        twilioPhoneNumber: "+14805767537",     // Correct: object with specific property
        twilioAccountSid: "AC..."              // Required: Twilio account SID
    },
    customer: { number: "+15034688103" },
    assistantId: "your-vapi-assistant-id"
}
```

#### 3. VAPI-Twilio Integration Setup

**Critical Requirement**: VAPI must be configured to recognize your Twilio account before it can handle phone number requests.

**Error**: "Number Not Found on Twilio" indicates VAPI cannot verify the phone number in your Twilio account.

**Resolution**: Configure the Twilio integration in VAPI dashboard before testing webhooks.

#### 4. AWS Secrets Manager Integration

**Security Best Practice**: Store sensitive credentials in AWS Secrets Manager instead of environment variables.

**Implementation**:
- VAPI API Key: `VAPI-API-Key`
- Twilio Auth Token: `Twilio-Auth-Token`
- VAPI Assistant ID: `VAPI-Assistant-Id`

**Terraform Configuration**:
```hcl
data "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = data.aws_secretsmanager_secret.app_secrets.id
}

locals {
  secrets = jsondecode(data.aws_secretsmanager_secret_version.app_secrets.secret_string)
}
```

#### 5. Testing Strategy

**Test Commands**:
```bash
npm test                    # Run all tests
npm run test:coverage      # Run with coverage
npm run build              # Build Lambda package
terraform apply            # Deploy to AWS
```

**Mock Data Requirements**:
- Use valid 34-character SID formats (e.g., `CAfakecallsidforitestingpurposesxx`)
- Include proper Twilio headers in mock events
- Test both validation success and failure scenarios

#### 6. Debugging Techniques

**Enhanced Error Logging**:
```javascript
console.log('VAPI request payload:', JSON.stringify(vapiPayload, null, 2));

// Detailed error logging
console.error('VAPI API error details:', {
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data,
    message: error.message
});
```

**CloudWatch Logs Investigation**:
```bash
# Get latest log stream
aws logs describe-log-streams --log-group-name "/aws/lambda/function-name" --order-by LastEventTime --descending --max-items 1

# Search for specific errors
aws logs get-log-events --log-group-name "/aws/lambda/function-name" --log-stream-name "stream-name" | grep "VAPI\|error"
```

#### 7. Common Pitfalls

1. **GitHub Secret Detection**: VAPI Assistant IDs look like secrets to GitHub - store them in AWS Secrets Manager
2. **URL Construction**: Use `event.requestContext.domainName` instead of `event.headers.Host` for API Gateway
3. **Base64 Encoding**: Handle `event.isBase64Encoded` for request bodies
4. **Test Data**: Use realistic SID formats in tests to match validation patterns

#### 8. Production Deployment Checklist

- [ ] All secrets stored in AWS Secrets Manager
- [ ] Custom validation implemented and tested
- [ ] VAPI-Twilio integration configured
- [ ] Phone numbers purchased and configured in Twilio
- [ ] CloudWatch logging enabled for debugging
- [ ] Test coverage > 90%
- [ ] Error handling for all failure scenarios

### Architecture Summary

```
Twilio Call → API Gateway → Lambda → VAPI API
                ↓
        Custom Security Validation
                ↓
        AWS Secrets Manager ← Terraform
```

This configuration provides robust security without relying on problematic signature validation, while maintaining proper integration between Twilio and VAPI services.