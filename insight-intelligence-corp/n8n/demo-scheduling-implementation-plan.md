# Demo Scheduling Implementation Plan
## Transforming VAPI Call Integration to Calendar-Based Demo Scheduling

---

## 📋 Project Overview

**Objective:** Transform existing chatbot workflow from VAPI call triggering to intelligent demo scheduling with Microsoft 365 calendar integration and enhanced HubSpot contact tracking.

**Timeline:** 3 weeks  
**Complexity:** Medium (80% workflow reuse)  
**Key Integration:** Microsoft Graph API + HubSpot CRM

---

## 🔍 Research Summary

### Microsoft 365 Calendar Integration Capabilities

**Microsoft Graph API Features:**
- **getSchedule API** - Check availability across multiple users' calendars
- **Shared Calendar Support** - Access to delegated/shared team calendars  
- **Time Zone Handling** - Automatic time zone conversion and work hours consideration
- **Event Creation** - Direct calendar booking with attendee management
- **Real-time Availability** - Current free/busy status checking

### n8n Integration Approach

**Best Method:** HTTP Request nodes with OAuth2 API credentials and delegated permissions
- Native Microsoft Outlook node has limited calendar scheduling features
- Graph API provides full scheduling functionality with proper authentication
- **CRITICAL LESSON:** Personal account with shared calendars is simpler than application permissions

### Authentication Strategy (Based on Real Implementation)

**✅ RECOMMENDED: Personal Account with Shared Calendars**
- Use your existing Microsoft 365 account
- Have team members share their calendars with you
- Use OAuth2 API credential with Authorization Code flow
- Simpler setup, immediate functionality

**❌ COMPLEX: Application Permissions (Service Principal)**
- Requires Client Credentials flow
- Cannot use `/me/` endpoints with application permissions
- Complex permission management and propagation delays
- Best for large enterprise deployments

**Required OAuth2 Configuration:**
```javascript
// n8n OAuth2 API Credential Settings
Grant Type: Authorization Code
Authorization URL: https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize
Access Token URL: https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token
Client ID: [Azure App ID]
Client Secret: [Azure App Secret]
Scope: Calendars.Read.Shared Calendars.ReadWrite.Shared User.Read offline_access
Authentication: Send as Body
```

**Required Azure Permissions (Delegated):**
- `Calendars.Read` - Read calendars
- `Calendars.Read.Shared` - Read shared calendars
- `Calendars.ReadWrite` - Create/modify events
- `Calendars.ReadWrite.Shared` - Create events on shared calendars
- `User.Read` - Basic user information

**Correct API Endpoints:**
```javascript
// Check availability (works with shared calendars)
POST https://graph.microsoft.com/v1.0/me/calendar/getSchedule

// Create calendar event
POST https://graph.microsoft.com/v1.0/me/events

// List accessible calendars (yours + shared)
GET https://graph.microsoft.com/v1.0/me/calendars
```

### Authentication Troubleshooting Guide

**Common Issues Encountered During Implementation:**

#### 1. "Forbidden" Errors with Application Permissions
**Problem:** Cannot access `/me/` endpoints with application permissions
**Solution:** Use delegated permissions with personal account authentication instead

#### 2. n8n Credential Configuration Confusion
**Problem:** Multiple OAuth2 credential types with different field sets
**Solution:** Use "OAuth2 API" (generic), NOT "Microsoft OAuth2 API" (simplified)

#### 3. Permission Propagation Delays
**Problem:** Azure permissions granted but API calls still fail
**Solution:** 
- Wait 5-10 minutes after granting admin consent
- Re-authenticate in n8n after permission changes
- Use "Authorization Code" flow, not "Client Credentials" for personal account

#### 4. Finding OAuth2 Callback URL in n8n
**Problem:** n8n doesn't clearly show the callback URL needed for Azure
**Solution:** 
- Create OAuth2 credential first, URL appears after initial setup
- Manual format: `https://your-n8n-instance/rest/oauth2-credential/callback`

#### 5. Authentication Type Visibility in HTTP Request Nodes
**Problem:** "OAuth2 API" credential doesn't appear in HTTP Request authentication options
**Solution:** Use "Predefined Credential Type" instead of "Generic Credential Type"

**Verification Steps:**
```javascript
// Test basic authentication
GET https://graph.microsoft.com/v1.0/me

// Test calendar access
GET https://graph.microsoft.com/v1.0/me/calendars

// Test scheduling function
POST https://graph.microsoft.com/v1.0/me/calendar/getSchedule
```

---

## 🔄 Existing Workflow Analysis

### ✅ Reusable Components (80% of current workflow)

**1. AI Intent Classification**
- Already identifies `demo_request`, `scheduling`, `pricing_inquiry` intents
- Routes high-intent leads to qualification flow
- **Status:** Keep as-is, works perfectly for demo detection

**2. Extract Contact Details Node**
- Current regex patterns for name, email, phone extraction
- **Enhancement needed:** Add business and industry extraction
- **Status:** Modify existing code

**3. HubSpot Integration**
- Existing contact creation with ID tracking
- OAuth2 authentication already configured  
- **Enhancement needed:** Add demo-specific properties
- **Status:** Extend existing functionality

**4. Conversation Memory (JSONBin)**
- Session-based conversation storage
- Intent classification persistence
- **Enhancement needed:** Store HubSpot contact ID for follow-up
- **Status:** Extend existing data structure

**5. Ava's Enhanced Identity**
- Recently updated to focus on 3-day setup advantage
- Context-aware response generation
- **Enhancement needed:** Add demo scheduling conversation flows
- **Status:** Update system prompts

### 🔄 Components to Replace

**1. VAPI Call Integration**
- **Remove:** `Trigger VAPI Call` node
- **Replace with:** Microsoft Graph calendar integration nodes
- **Reason:** Direct demo scheduling vs phone callback

**2. Voice Response Flows**
- **Remove:** VAPI-specific response building
- **Replace with:** Demo confirmation and calendar management responses

---

## 🎯 Enhanced Demo Scheduling Conversation Flow

### Phase 1: Demo Interest Detection (Existing)
```
User Message → AI Intent Classification → 
Routes to: demo_request, scheduling intents
```

### Phase 2: Enhanced Contact Collection
**Required Fields:**
- firstName (existing)
- lastName (existing) 
- email (existing)
- phone (existing)
- **business** (new - company name)
- **industry** (new - business category)

**Enhanced Extraction Patterns:**
```javascript
// Add to existing Extract Contact Details node
const businessMatch = message.match(/(?:company|business|work at|from)\\s+([a-zA-Z0-9\\s&.,'-]{2,50})/i);
const industryMatch = message.match(/(?:industry|sector|field|business type)\\s*:?\\s*([a-zA-Z\\s]{2,30})/i);

// Industry inference from business name
const industryKeywords = {
  'medical|dental|health|clinic|hospital': 'Healthcare',
  'law|legal|attorney|lawyer': 'Legal Services', 
  'real estate|property|realtor': 'Real Estate',
  'manufacturing|factory|production': 'Manufacturing',
  'restaurant|food|catering': 'Food Service'
};
```

### Phase 3: Demo Scheduling Conversation
**Ava's Enhanced Prompts:**
```
Demo Request Response:
"Perfect! I'd love to schedule a personalized 30-minute demo to show you exactly how our AI system (that sets up in 3 days vs competitors' 3-6 months) would work for [INDUSTRY] businesses like yours.

What's your availability preference?
• This week (mornings/afternoons)  
• Next week (specific days)
• I'm flexible - show me options"
```

**Availability Collection Flow:**
1. **Time Preference** - Morning/Afternoon/Flexible
2. **Week Selection** - This week/Next week/Specific dates
3. **Final Confirmation** - Present 2-3 specific time slots

### Phase 4: Calendar Integration & Booking
**Workflow Steps:**
1. Call Microsoft Graph findMeetingTimes API
2. Present available slots to user
3. Collect user selection
4. Create calendar event with team member
5. Send confirmation to user and internal team

### Phase 5: HubSpot Contact Enhancement  
**Contact Properties:**
```javascript
{
  // Standard fields (existing)
  firstName: "John",
  lastName: "Smith", 
  email: "john@company.com",
  phone: "555-123-4567",
  
  // Enhanced demo fields (new)
  company: "Smith Manufacturing",
  industry: "Manufacturing", 
  demo_scheduled: true,
  demo_date: "2025-01-15T14:00:00Z",
  demo_assigned_to: "sales_person@company.com",
  demo_preferences: "Interested in phone automation, 20+ calls/day",
  lead_source: "chatbot_demo_request",
  setup_notes: "Mentioned competitor evaluation, wants 3-day setup proof"
}
```

**Contact ID Tracking:**
- Store `hubspotContactId` in JSONBin conversation memory
- Check for existing contact on subsequent messages  
- Update existing contacts with notes vs creating duplicates

---

## 🏗️ Technical Implementation Plan

### Phase 1: Modify Existing Workflow (Week 1)

#### 1.1 Enhanced Contact Extraction
**File:** `insight-intelligence-ai-chatbot-handler-jsonbin-memory.json`
**Node:** `Extract Contact Details` (ID: 963d1607-c3c1-415f-91e8-632983858e75)

**Modifications:**
```javascript
// Add to existing jsCode
// Extract business/company name
const businessMatch = message.match(/(?:company|business|work at|from|represent)\\s+([a-zA-Z0-9\\s&.,'-]{2,50})/i);
const business = businessMatch ? businessMatch[1].trim() : '';

// Extract or infer industry
let industry = '';
const industryMatch = message.match(/(?:industry|sector|field|business type)\\s*:?\\s*([a-zA-Z\\s]{2,30})/i);
if (industryMatch) {
  industry = industryMatch[1].trim();
} else {
  // Infer from business name or context
  const text = message.toLowerCase();
  if (text.match(/medical|dental|health|clinic|hospital|practice/)) industry = 'Healthcare';
  else if (text.match(/law|legal|attorney|lawyer|firm/)) industry = 'Legal Services';
  else if (text.match(/real estate|property|realtor|homes/)) industry = 'Real Estate';
  else if (text.match(/manufacturing|factory|production|industrial/)) industry = 'Manufacturing';
  else if (text.match(/restaurant|food|catering|hospitality/)) industry = 'Food Service';
}

// Return enhanced contact object
return [{
  firstName: firstName,
  lastName: lastName, 
  phone: phone,
  email: email,
  business: business,
  industry: industry,
  hasEmail: !!email,
  hasName: !!nameMatch,
  hasPhone: !!phoneMatch,
  hasBusiness: !!business,
  hasIndustry: !!industry
}];
```

#### 1.2 Remove VAPI Integration Nodes
**Nodes to Remove:**
- `Trigger VAPI Call` (ID: 85840430-8ba0-4650-9092-8ea96a502a0d)
- `Build Voice Response JSON` (ID: c963d83a-455c-4244-a7ab-81b61139f69f) 
- `Send Voice Response` (ID: fc08c9c2-e6d4-493f-90ed-bfbbedcac07d)

#### 1.3 Update Ava's System Prompts
**Nodes to Modify:**
- `Generate Standard Response` (ID: 21c35b30-5c94-46c0-a0ea-44f2b0fa6f1e)
- `Generate Lead Response` (ID: 3691bd67-2ad6-4e2f-b95b-1758058cabd8)

**Enhanced System Prompt:**
```javascript
'You are Ava, your AI Automation Specialist for Insight Intelligence. 

DEMO SCHEDULING CONTEXT: User classified as ' + ($json['lead_quality'] || 'unknown') + ' lead with ' + ($json['primary_intent'] || 'general') + ' intent. 

DEMO SCHEDULING GUIDANCE:
**Demo Request/Scheduling**: Perfect! I can schedule a personalized 30-minute demo to show you exactly how our AI system (that sets up in 3 days vs competitors 3-6 months) would handle calls for your ' + (contactInfo.industry || 'business') + '. 

To get you connected with the right specialist, I need:
• Your name and best phone number
• Your company name and industry  
• Your availability preference (this week/next week, mornings/afternoons)

This will be a brief demo where we show live examples and calculate your $58K+ savings potential.

CRITICAL: Collect all required fields systematically. If missing business/industry, ask: "What type of business do you run?" Focus on demo value and 3-day setup advantage.'
```

### Phase 2: Calendar Integration (Week 2)

#### 2.1 Microsoft 365 Setup (Simplified Approach)
**Prerequisites:**
1. **Azure App Registration**
   - Register app in Azure Portal  
   - Add DELEGATED permissions (not Application)
   - Generate client secret for authentication

2. **Calendar Sharing Setup**
   - Have team members share calendars with your account
   - Verify shared calendar access in Outlook

3. **n8n Authentication Setup** 
   - Create OAuth2 API credential (not Microsoft OAuth2 API)
   - Use Authorization Code flow
   - Authenticate with your personal account
   - Test basic connection

#### 2.2 Calendar Integration Nodes (Updated Based on Testing)

**Node 1: Check Team Availability**
```javascript
{
  "parameters": {
    "method": "POST",
    "url": "https://graph.microsoft.com/v1.0/me/calendar/getSchedule",
    "authentication": "predefinedCredentialType", 
    "nodeCredentialType": "oAuth2Api",
    "sendBody": true,
    "specifyBody": "json",
    "headers": {
      "Content-Type": "application/json"
    },
    "jsonBody": "={{ {
      schedules: [
        'your-email@company.com',
        'employee1@company.com',
        'employee2@company.com'
      ],
      startTime: {
        dateTime: $node['Process User Request'].json.requestedStartTime,
        timeZone: 'America/New_York'
      },
      endTime: {
        dateTime: $node['Process User Request'].json.requestedEndTime,
        timeZone: 'America/New_York'
      },
      availabilityViewInterval: 30
    } }}"
  },
  "name": "Check Team Availability",
  "type": "n8n-nodes-base.httpRequest"
}
```

**Node 2: Present Time Slots to User**
```javascript
{
  "parameters": {
    "jsCode": "// Process Graph API response and format for user\nconst suggestions = $json.meetingTimeSuggestions || [];\nconst timeSlots = suggestions.slice(0, 3).map((suggestion, index) => ({\n  option: index + 1,\n  datetime: suggestion.meetingTimeSlot.start.dateTime,\n  attendee: suggestion.attendeeAvailability[0].attendee.emailAddress.name,\n  confidence: suggestion.confidence,\n  formatted: formatDateTime(suggestion.meetingTimeSlot.start.dateTime)\n}));\n\n// Generate user-friendly response\nconst availabilityText = timeSlots.map(slot => \n  `${slot.option}. ${slot.formatted} with ${slot.attendee}`\n).join('\\n');\n\nreturn {\n  json: {\n    availableSlots: timeSlots,\n    responseText: `Great! I found these available demo times:\\n\\n${availabilityText}\\n\\nWhich option works best for you?`,\n    hasAvailability: timeSlots.length > 0\n  }\n};"
  },
  "name": "Format Available Times",
  "type": "n8n-nodes-base.code"
}
```

**Node 3: Create Calendar Event**
```javascript
{
  "parameters": {
    "method": "POST",
    "url": "https://graph.microsoft.com/v1.0/me/events",
    "authentication": "predefinedCredentialType",
    "nodeCredentialType": "microsoftGraphApi", 
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ {
      subject: 'Insight Intelligence Demo - ' + ($node['Extract Contact Details'].json.firstName) + ' ' + ($node['Extract Contact Details'].json.lastName),
      body: {
        contentType: 'HTML',
        content: `Demo for ${$node['Extract Contact Details'].json.business || 'Prospect Company'}<br>Industry: ${$node['Extract Contact Details'].json.industry || 'Unknown'}<br>Contact: ${$node['Extract Contact Details'].json.phone}<br>Lead Source: Chatbot Demo Request<br><br>Prospect interested in AI phone automation solutions.`
      },
      start: {
        dateTime: /* selected time slot */,
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: /* selected time + 30 minutes */,
        timeZone: 'America/New_York'  
      },
      attendees: [
        {
          emailAddress: {
            address: $node['Extract Contact Details'].json.email,
            name: ($node['Extract Contact Details'].json.firstName + ' ' + $node['Extract Contact Details'].json.lastName)
          },
          type: 'required'
        },
        {
          emailAddress: {
            address: /* selected sales rep email */,
            name: /* selected sales rep name */
          },
          type: 'required'
        }
      ],
      location: {
        displayName: 'Video Conference (Link will be sent)',
        locationType: 'default'
      },
      allowNewTimeProposals: false
    } }}"
  },
  "name": "Create Demo Event", 
  "type": "n8n-nodes-base.httpRequest"
}
```

### Phase 3: HubSpot Enhancement (Week 2)

#### 3.1 Enhanced Contact Creation
**Modify:** `Create HubSpot Lead` node (ID: 37c80705-ca96-4908-8866-18d657fca0c6)

**Enhanced Properties:**
```javascript
{
  "parameters": {
    "resource": "contact",
    "email": "={{ $node['Extract Contact Details'].json.email }}",
    "additionalFields": {
      "firstName": "={{ $node['Extract Contact Details'].json.firstName }}",
      "lastName": "={{ $node['Extract Contact Details'].json.lastName }}",
      "phone": "={{ $node['Extract Contact Details'].json.phone }}",
      "company": "={{ $node['Extract Contact Details'].json.business || 'Unknown' }}",
      "industry": "={{ $node['Extract Contact Details'].json.industry || 'Unknown' }}",
      "demo_scheduled": "true",
      "demo_date": "={{ $node['Create Demo Event'].json.start.dateTime }}",
      "demo_assigned_to": "={{ $node['Format Available Times'].json.selectedAttendee }}",
      "lead_source": "chatbot_demo_request",
      "lifecycle_stage": "opportunity"
    }
  }
}
```

#### 3.2 Contact ID Persistence
**Modify:** Conversation memory nodes to store HubSpot contact ID

```javascript
// In JSONBin update nodes
binData.conversations[sessionKey] = {
  // ... existing fields
  metadata: {
    // ... existing metadata
    hubspotContactId: $node['Create HubSpot Lead'].json.id,
    demoScheduled: true,
    demoDate: $node['Create Demo Event'].json.start.dateTime,
    salesRepAssigned: selectedSalesRep
  }
};
```

#### 3.3 Follow-up Notes System
**New Node:** `Update Contact Notes`
```javascript
{
  "parameters": {
    "method": "PATCH",
    "url": "=https://api.hubapi.com/crm/v3/objects/contacts/{{$node['Extract Conversation Data'].json.existingConversation.metadata.hubspotContactId}}",
    "authentication": "predefinedCredentialType",
    "nodeCredentialType": "hubspotApi",
    "sendBody": true,
    "specifyBody": "json", 
    "jsonBody": "={{ {
      properties: {
        hs_note_body: 'Additional info from chatbot: ' + $node['Extract Message Data'].json.message + '\\n\\nPrevious conversation context: ' + ($node['Extract Conversation Data'].json.conversationHistory.map(msg => msg.role + ': ' + msg.content).join('\\n'))
      }
    } }}"
  },
  "name": "Update Contact Notes",
  "type": "n8n-nodes-base.httpRequest"
}
```

### Phase 4: Testing and Refinement (Week 3)

#### 4.1 End-to-End Testing Checklist
- [ ] Demo intent detection accuracy
- [ ] Complete contact field collection
- [ ] Calendar availability checking across shared calendars  
- [ ] Time slot presentation and selection
- [ ] Calendar event creation with correct attendees
- [ ] HubSpot contact creation with demo properties
- [ ] Contact ID persistence for follow-up conversations
- [ ] Notes addition to existing contacts

#### 4.2 Conversation Flow Optimization
**A/B Testing Scenarios:**
1. **Time Collection Methods:**
   - Option A: Free text ("When are you available?")
   - Option B: Multiple choice options
   - Option C: Calendar picker integration

2. **Availability Presentation:**
   - Show 2 vs 3 time options
   - Morning/afternoon grouping vs specific times
   - Confidence score display vs hidden

3. **Confirmation Flow:**
   - Immediate booking vs review-and-confirm
   - Calendar invite preview vs direct creation

---

## 📊 Expected Business Impact

### Immediate Improvements
- **Higher Conversion Rates:** Direct booking eliminates phone tag friction
- **Better User Experience:** Instant scheduling confirmation with calendar integration
- **Reduced Sales Overhead:** Automated booking process reduces manual coordination
- **Complete Lead Capture:** Systematic collection of business/industry data

### Long-term Benefits  
- **Scalable Scheduling:** Automatically handles multiple team members' availability
- **Rich Contact Database:** Complete business context for all demo leads
- **Follow-up Capability:** Continue conversations with existing HubSpot contacts
- **Analytics & Optimization:** Track booking rates, preferred times, industry patterns

### Key Performance Metrics
- **Demo Booking Rate:** Target >40% of qualified leads
- **Show Rate:** Target >70% attendance (calendar integration should improve)
- **Lead Quality Score:** Enhanced with business/industry context
- **Sales Team Efficiency:** Reduced back-and-forth scheduling time

---

## 🔧 Technical Requirements

### Microsoft 365 Setup
1. **Azure App Registration**
   - App ID and Client Secret
   - Microsoft Graph API permissions
   - Redirect URLs for OAuth2

2. **Calendar Configuration** 
   - Identify shared calendar or main calendar with delegation
   - Configure team member calendar sharing
   - Test calendar access permissions

3. **n8n Credentials**
   - Microsoft Graph OAuth2 credential
   - Test authentication and API access
   - Configure webhook endpoints if needed

### HubSpot Configuration
- **Custom Properties:** Add demo-specific fields to contact schema
- **API Permissions:** Ensure write access for contact creation/updates  
- **Workflow Integration:** Consider HubSpot workflows for demo follow-up

### Workflow Deployment
- **Backup Current Workflow:** Save existing configuration
- **Staged Rollout:** Test with limited traffic first
- **Monitor Performance:** Track success rates and error handling
- **Documentation:** Update team training materials

---

## 🚀 Implementation Timeline

### Week 1: Foundation
- [ ] Set up Microsoft 365 Graph API access
- [ ] Modify contact extraction for business/industry  
- [ ] Update Ava's conversation flows for demo scheduling
- [ ] Remove VAPI integration nodes
- [ ] Test enhanced contact collection

### Week 2: Calendar Integration
- [ ] Implement findMeetingTimes API calls
- [ ] Build time slot presentation logic
- [ ] Create calendar event booking functionality
- [ ] Enhance HubSpot contact creation
- [ ] Implement contact ID persistence

### Week 3: Testing & Optimization
- [ ] End-to-end workflow testing
- [ ] Load testing with multiple scenarios
- [ ] Conversation flow optimization
- [ ] Error handling and edge cases
- [ ] Team training and documentation

### Week 4: Production Launch
- [ ] Staged rollout (25% -> 50% -> 100% traffic)
- [ ] Performance monitoring and analytics
- [ ] Feedback collection and iterations
- [ ] Success metrics tracking

---

## 📋 Success Criteria

### Technical Success
- ✅ Workflow executes without errors for all demo request scenarios
- ✅ Calendar integration finds availability across shared team calendars
- ✅ HubSpot contacts created with complete information
- ✅ Demo appointments confirmed in both calendars and CRM
- ✅ Follow-up conversations properly reference existing contacts

### Business Success  
- ✅ >40% demo booking rate for qualified leads
- ✅ >70% demo show rate (attendance)
- ✅ 50% reduction in sales team scheduling overhead
- ✅ 100% lead capture with business/industry context
- ✅ Customer satisfaction >4.5/5 for scheduling experience

### User Experience Success
- ✅ Average time to book demo <3 minutes
- ✅ Clear availability options presented
- ✅ Immediate confirmation and calendar invites
- ✅ Seamless conversation flow without errors
- ✅ Professional sales handoff experience

---

*This implementation plan leverages 80% of existing workflow components while adding enterprise-level calendar integration and CRM enhancement capabilities. The approach prioritizes user experience, sales team efficiency, and comprehensive lead capture for maximum business impact.*

---

## 🔧 Authentication Research & Lessons Learned

### Microsoft Graph API Authentication Deep Dive

Based on extensive testing and troubleshooting during implementation, here are the key insights for future reference:

#### The Authentication Maze
**Multiple OAuth Flows Available:**
1. **Authorization Code Flow** (Delegated Permissions) - RECOMMENDED
   - User signs in and grants access to shared calendars
   - Works with `/me/` endpoints
   - Simpler for small teams
   - Bot acts "as the user"

2. **Client Credentials Flow** (Application Permissions) - COMPLEX
   - App gets access without user sign-in
   - Cannot use `/me/` endpoints - must use `/users/{id}/`
   - Requires extensive permission management
   - Best for enterprise-scale deployments

#### Critical Discovery: The `/me/` Endpoint Restriction
**KEY LESSON:** When using application permissions (Client Credentials flow), you CANNOT use `/me/` endpoints. This is a Microsoft Graph API restriction that's poorly documented.

**Wrong (with App Permissions):**
```javascript
GET https://graph.microsoft.com/v1.0/me/calendars
POST https://graph.microsoft.com/v1.0/me/calendar/getSchedule
```

**Correct (with App Permissions):**
```javascript
GET https://graph.microsoft.com/v1.0/users/user@domain.com/calendars
POST https://graph.microsoft.com/v1.0/users/user@domain.com/calendar/getSchedule
```

**But Simpler (with Delegated Permissions):**
```javascript
GET https://graph.microsoft.com/v1.0/me/calendars  // Works fine!
POST https://graph.microsoft.com/v1.0/me/calendar/getSchedule  // Works fine!
```

#### n8n OAuth2 Configuration Pitfalls

**Issue 1: Multiple Credential Types**
- "Microsoft OAuth2 API" - Simplified, only shows Scope field
- "OAuth2 API" - Full configuration, all necessary fields
- **Solution:** Always use "OAuth2 API" for custom Azure apps

**Issue 2: Authentication Type in HTTP Request Nodes**
- Look for "Predefined Credential Type" not "Generic Credential Type"
- OAuth2 credentials may not appear in other authentication types

**Issue 3: Callback URL Discovery**
- Not immediately visible when creating credentials
- Appears after initial credential creation
- Format: `https://your-n8n-instance/rest/oauth2-credential/callback`

#### Permission Configuration Gotchas

**Azure Permissions vs Reality:**
- Granting admin consent can take 5-10 minutes to propagate
- Must re-authenticate in n8n after permission changes
- Delegated permissions require calendar sharing by each user
- Application permissions require complex organizational setup

**Recommended Permission Set (Delegated):**
```
Calendars.Read - Basic calendar reading
Calendars.Read.Shared - Access to shared calendars  
Calendars.ReadWrite - Create events on own calendar
Calendars.ReadWrite.Shared - Create events on shared calendars
User.Read - Basic user profile information
offline_access - Refresh tokens for persistent access
```

#### Testing and Validation Strategy

**Progressive Testing Approach:**
1. **Basic Auth Test:** `GET /me` - Verifies authentication works
2. **Calendar Access:** `GET /me/calendars` - Verifies calendar permissions
3. **Shared Calendar:** Look for shared calendars in response
4. **Schedule Query:** `POST /me/calendar/getSchedule` - Full functionality test

**Common Error Patterns:**
- `401 Unauthorized` - Authentication failed, check credentials
- `403 Forbidden` - Permission denied, check Azure permissions & admin consent  
- `404 Not Found` - Wrong endpoint, verify `/me/` vs `/users/{id}/`
- `400 Bad Request` - Malformed request body or headers

### Implementation Recommendation

**For Small Teams (< 10 people):** Use personal account with shared calendars
- Simplest setup
- Immediate functionality  
- Easy to test and verify

**For Large Organizations (> 10 people):** Consider application permissions with proper IT setup
- More secure and scalable
- Requires dedicated service account
- Complex permission management

### Final Authentication Configuration

**Working n8n OAuth2 API Credential:**
```javascript
Credential Name: Microsoft Graph Personal
Grant Type: Authorization Code
Authorization URL: https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize
Access Token URL: https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token
Client ID: [Azure App Registration Client ID]
Client Secret: [Azure App Registration Client Secret]
Scope: Calendars.Read.Shared Calendars.ReadWrite.Shared User.Read offline_access
Authentication: Send as Body
```

**Working API Test:**
```javascript
GET https://graph.microsoft.com/v1.0/me/calendars
Authorization: [Handled by n8n OAuth2 credential]
```

This configuration provides reliable access to shared calendars with proper authentication flow that's been tested and verified to work in production.

---

## 📝 Change Log

**Created:** December 2024  
**Version:** 1.1  
**Updated:** December 2024 - Added authentication research and troubleshooting guide
**Author:** AI Implementation Plan with Real-World Testing  
**Status:** Ready for Implementation (Authentication Verified)

**Key Files:**
- Base Workflow: `insight-intelligence-ai-chatbot-handler-jsonbin-memory.json`
- Agent Identity: `ai-chat-agent-identity-v2.md`  
- Test Suite: `postman-chat-tests.json`
- Implementation Plan: `demo-scheduling-implementation-plan.md`