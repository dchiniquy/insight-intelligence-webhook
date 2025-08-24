# Airtable Integration Setup Guide

## Step 1: Create Airtable Base

1. **Go to Airtable** and create a new base called "Chat Leads - Insight Intelligence"
2. **Create Table** called "Incomplete Leads" 
3. **Configure Fields** using the structure from `airtable-base-setup.json`:

### Required Fields Setup

| Field Name | Field Type | Options/Settings |
|------------|------------|-----------------|
| `firstName` | Single line text | Required |
| `lastName` | Single line text | Required |
| `phone` | Phone number | Required |
| `email` | Email | Optional |
| `message` | Long text | Required |
| `sessionId` | Single line text | Required |
| `timestamp` | Date and time | Required |
| `leadSource` | Single select | Options: chat, phone, form, referral |
| `intentClassification` | Long text | - |
| `primaryIntent` | Single select | Options: demo_request, pricing_inquiry, lead_qualification, information_gathering, technical_support, objection_handling, scheduling, general_conversation |
| `leadQuality` | Single select | Options: hot, warm, cold, nurture |
| `urgencyLevel` | Single select | Options: immediate, soon, flexible, exploring |
| `vapiCallStatus` | Single select | Options: pending, completed, failed, no_answer, scheduled |
| `vapiCallId` | Single line text | - |
| `status` | Single select | Options: new, contacted, qualified, converted, unresponsive |
| `hubspotMigrated` | Checkbox | Default: unchecked |
| `hubspotContactId` | Single line text | - |
| `notes` | Long text | - |
| `lastContactDate` | Date and time | - |
| `nextFollowUpDate` | Date and time | - |

### Create Views

**1. New Leads View:**
- Filter: `status` = "new"
- Sort: `timestamp` (newest first)

**2. Pending VAPI Calls View:**
- Filter: `vapiCallStatus` = "pending"
- Sort: `timestamp` (oldest first)

**3. Hot Prospects View:**
- Filter: `leadQuality` = "hot" AND `status` ≠ "converted"
- Sort: `urgencyLevel` (immediate first)

**4. Ready for HubSpot View:**
- Filter: `email` is not empty AND `hubspotMigrated` is unchecked AND `status` = "qualified"
- Sort: `timestamp` (newest first)

## Step 2: Generate Airtable Access Token

1. **Go to Airtable Developer Hub**: https://airtable.com/create/tokens
2. **Create Personal Access Token**:
   - Name: "N8N Chat Leads Integration"
   - Scopes: 
     - `data:read`
     - `data:write`
   - Access:
     - Select your "Chat Leads - Insight Intelligence" base
3. **Copy the token** (you'll only see it once)

## Step 3: Get Base ID

1. **Go to Airtable API Documentation**: https://airtable.com/api
2. **Select your base** "Chat Leads - Insight Intelligence"
3. **Copy the Base ID** from the URL (starts with "app...")

## Step 4: Configure N8N Credentials

### Create HTTP Header Auth Credential

1. **In N8N**, go to Settings > Credentials
2. **Click "Create Credential"**
3. **Select "HTTP Header Auth"**
4. **Configure:**
   - **Credential Name**: "Airtable API Auth"  
   - **Name**: Authorization
   - **Value**: `Bearer {YOUR_PERSONAL_ACCESS_TOKEN}`
5. **Save the credential**

### Store Base Configuration

Since n8n expressions need access to your base ID, you have two options:

**Option A: Environment Variables (Recommended)**
1. Set environment variable: `AIRTABLE_BASE_ID=your_base_id_here`
2. Update the workflow JSON to use: `{{ $env.AIRTABLE_BASE_ID }}`

**Option B: Direct Configuration**
1. Replace `{{ $credentials.airtableConfig.baseId }}` in the workflow with your actual base ID
2. Replace `{{ $credentials.airtableConfig.accessToken }}` with your actual token

## Step 5: Test the Integration

### Test Data

Use this test message to verify the Airtable integration:

```json
{
  "message": "Hi, my name is John Smith and you can reach me at 555-123-4567. I need help with my business missing calls.",
  "sessionId": "test-session-123"
}
```

**Expected Result:**
- Should route to "Create Airtable Lead" node
- Should create a record in Airtable with:
  - firstName: "John"
  - lastName: "Smith" 
  - phone: "5551234567"
  - status: "new"
  - vapiCallStatus: "pending"

### Verify Complete Lead Routing

Test with email included:

```json
{
  "message": "Hi, I'm Sarah Johnson at sarah@company.com or 555-987-6543. I want to schedule a demo.",
  "sessionId": "test-session-456"
}
```

**Expected Result:**
- Should route to "Create HubSpot Lead" node (existing flow)
- Should NOT go to Airtable

## Step 6: Update VAPI Integration

The VAPI nodes should be updated to handle both HubSpot and Airtable leads:

### For Airtable Leads:
- Pass Airtable record ID to VAPI
- Update Airtable record after call completion
- Collect email during call for potential HubSpot migration

### Enhanced VAPI Variables:
```json
{
  "assistantOverrides": {
    "variableValues": {
      "customerName": "{{firstName}} {{lastName}}",
      "leadSource": "chat_incomplete",
      "airtableRecordId": "{{airtable record ID}}",
      "collectEmail": "true",
      "intentData": "{{intentClassification}}"
    }
  }
}
```

## Troubleshooting

### Common Issues:

**1. "Invalid request" from Airtable API**
- Verify your Personal Access Token has correct scopes
- Check that Base ID is correct in the URL
- Ensure field names match exactly (case-sensitive)

**2. "Field not found" errors**
- Double-check all field names in Airtable match the JSON
- Verify field types are configured correctly

**3. "Rate limit exceeded"**
- Airtable allows 5 requests/second
- N8N should handle retries automatically

**4. Data not appearing in Airtable**
- Check the API response in N8N execution logs
- Verify the record was created with correct field mapping
- Check Airtable base permissions

### Testing Commands:

**Test Airtable API directly:**
```bash
curl -X POST "https://api.airtable.com/v0/YOUR_BASE_ID/Incomplete%20Leads" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [{
      "fields": {
        "firstName": "Test",
        "lastName": "User",
        "phone": "5551234567",
        "message": "Test message",
        "sessionId": "test123",
        "timestamp": "2025-08-24T12:00:00Z",
        "status": "new"
      }
    }]
  }'
```

## Success Metrics

Once configured, monitor these metrics:

1. **Airtable Records Created**: Incomplete leads should appear in "New Leads" view
2. **HubSpot Records**: Only complete leads (with email) should go to HubSpot
3. **VAPI Integration**: Both systems should trigger VAPI calls successfully
4. **Data Quality**: No more dummy emails in HubSpot

## Next Steps

After successful setup:

1. **Monitor lead routing** for first week
2. **Review Airtable views** to track lead progression
3. **Implement data migration** from Airtable to HubSpot when emails are collected
4. **Set up regular data cleanup** procedures

This dual-system architecture will provide clean data separation while maintaining full functionality for both complete and incomplete chat leads.