# VAPI Tool Configuration Guide

## ⚠️ IMPORTANT UPDATE
This guide has been superseded by the comprehensive tool configuration in `/vapi/vapi-tool-configuration-guide.md`. The new guide includes:

- Complete tool definitions for availability checking and appointment booking
- Integration with your existing VAPI sales and demo prompts  
- Decision logic for when Richard should use each tool
- Proper error handling and conversation flows
- CRM integration via contact collection tools

**Use the new guide for current implementations.**

## Overview
This guide explains how to set up VAPI tools to integrate with your n8n workflows for checking availability and booking appointments.

## Created Workflows

### 1. **vapi-availability-checker.json**
- **Purpose**: Check your calendar availability for demo scheduling
- **Endpoint**: `/check-availability`
- **Integration**: Microsoft Outlook Calendar via Microsoft Graph API

### 2. **vapi-appointment-booking.json**  
- **Purpose**: Book confirmed appointments and create Teams meetings
- **Endpoint**: `/book-appointment`
- **Integration**: Microsoft Outlook Calendar + HubSpot CRM

## VAPI Tool Setup

### 1. Availability Checker Tool

Add this tool to your VAPI assistant:

```json
{
  "type": "function",
  "function": {
    "name": "check_availability",
    "description": "Check Don's calendar availability for demo scheduling. Use this when the user wants to schedule a demo or asks about available times.",
    "parameters": {
      "type": "object",
      "properties": {
        "date": {
          "type": "string",
          "format": "date",
          "description": "Specific date to check (YYYY-MM-DD format). Optional - if not provided, checks next 7 days."
        },
        "time_preference": {
          "type": "string",
          "enum": ["morning", "afternoon", "evening"],
          "description": "Time of day preference. Optional - if not provided, checks full business hours."
        }
      }
    }
  },
  "server": {
    "url": "https://your-n8n-domain.com/webhook/check-availability",
    "method": "POST"
  }
}
```

### 2. Appointment Booking Tool

Add this tool to your VAPI assistant:

```json
{
  "type": "function", 
  "function": {
    "name": "book_appointment",
    "description": "Book a confirmed appointment and create a Teams meeting. Only use this after the user has confirmed a specific time slot.",
    "parameters": {
      "type": "object",
      "properties": {
        "customer_name": {
          "type": "string",
          "description": "Customer's full name"
        },
        "customer_email": {
          "type": "string",
          "format": "email", 
          "description": "Customer's email address for calendar invitation"
        },
        "customer_phone": {
          "type": "string",
          "description": "Customer's phone number"
        },
        "company_name": {
          "type": "string",
          "description": "Customer's company name"
        },
        "appointment_datetime": {
          "type": "string",
          "format": "date-time",
          "description": "Confirmed appointment date and time in ISO format (e.g., 2024-12-15T14:00:00)"
        },
        "timezone": {
          "type": "string",
          "default": "America/Los_Angeles",
          "description": "Timezone for the appointment"
        },
        "duration_minutes": {
          "type": "integer",
          "default": 30,
          "description": "Meeting duration in minutes"
        },
        "appointment_type": {
          "type": "string",
          "default": "Demo",
          "description": "Type of appointment (Demo, Consultation, etc.)"
        },
        "notes": {
          "type": "string",
          "description": "Additional notes about the appointment"
        }
      },
      "required": ["customer_name", "customer_email", "appointment_datetime"]
    }
  },
  "server": {
    "url": "https://your-n8n-domain.com/webhook/book-appointment", 
    "method": "POST"
  }
}
```

## Conversation Flow Example

Here's how your VAPI assistant should use these tools:

### Step 1: Check Availability
```
User: "I'd like to schedule a demo"
AI: "Great! Let me check my availability for you."
[Calls check_availability tool]
AI: "I have availability Tuesday at 2 PM, Wednesday at 10 AM, or Thursday at 3 PM. Which works best for you?"
```

### Step 2: Collect Information & Book
```
User: "Tuesday at 2 PM works"
AI: "Perfect! I'll book that for you. Can I get your name and email address?"
User: "John Smith, john@acmecorp.com"
AI: "Thank you! And what's your company name and phone number?"
User: "Acme Corporation, 555-123-4567"
AI: [Calls book_appointment tool with all details]
AI: "Perfect! I've scheduled your demo for Tuesday at 2 PM and sent you a calendar invitation with the Teams meeting link."
```

## Response Handling

### Availability Checker Response
The tool returns available time slots that you can present to the user:
```json
{
  "status": "success",
  "available": true,
  "time_slots": [
    {
      "start_time": "2024-12-15T14:00:00Z",
      "start_time_readable": "Tuesday, December 15, 2:00 PM",
      "duration_minutes": 30,
      "available": true
    }
  ],
  "conversation_context": {
    "suggested_response": "I have availability starting Tuesday, December 15, 2:00 PM. Would that work for you?"
  }
}
```

### Booking Confirmation Response  
The booking tool confirms successful scheduling:
```json
{
  "status": "success",
  "message": "Appointment successfully booked",
  "conversation_context": {
    "confirmation_message": "Perfect! I've scheduled your demo for Tuesday, December 15, 2:00 PM. You'll receive a calendar invitation with the Teams meeting link at john@acmecorp.com."
  }
}
```

## Setup Requirements

### n8n Configuration
1. Import both workflow JSON files into your n8n instance
2. Configure Microsoft Outlook OAuth2 credentials
3. Configure HubSpot OAuth2 credentials (for booking workflow)
4. Activate both workflows
5. Note the webhook URLs generated

### VAPI Configuration
1. Add both tools to your VAPI assistant configuration
2. Update the webhook URLs to match your n8n instance
3. Test the tools with sample requests
4. Update your assistant's system prompt to include guidance on when/how to use these tools

## Error Handling

Both workflows include comprehensive error handling:
- **Validation errors**: Invalid or missing parameters
- **Calendar errors**: Unable to access calendar
- **Booking errors**: Conflicts or system issues

The responses include `conversation_context` with suggested fallback responses for your VAPI assistant to use.

## Testing

### Test Availability Check
```bash
curl -X POST https://your-n8n-domain.com/webhook/check-availability \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-12-15",
    "time_preference": "afternoon"
  }'
```

### Test Appointment Booking
```bash
curl -X POST https://your-n8n-domain.com/webhook/book-appointment \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "John Smith",
    "customer_email": "john@example.com",
    "customer_phone": "+15551234567", 
    "company_name": "Acme Corp",
    "appointment_datetime": "2024-12-15T14:00:00",
    "appointment_type": "Demo",
    "notes": "Interested in AI phone automation"
  }'
```

## Integration Benefits

This setup provides:
- **Real-time availability checking** from your actual calendar
- **Automated Teams meeting creation** with proper invitations
- **HubSpot contact creation** for lead tracking
- **Error handling and fallbacks** for smooth user experience
- **Structured responses** that guide VAPI conversations

The workflows follow the same pattern as your existing intelligence-chat workflow, ensuring consistency across your automation systems.