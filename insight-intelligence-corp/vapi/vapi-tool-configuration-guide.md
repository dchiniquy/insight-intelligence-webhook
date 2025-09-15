# VAPI Tool Configuration Guide

## Overview
This guide configures your VAPI assistant with the right tools for both **inbound sales calls** and **outbound demo calls**, ensuring Richard knows exactly when to use each tool.

## Tool Definitions

### 1. **Check Availability Tool**
**When to use**: When the caller wants to schedule a demo and you need to find available time slots.

```json
{
  "type": "function",
  "function": {
    "name": "check_availability",
    "description": "Check Don's calendar availability for demo scheduling. Use this when the caller wants to schedule a demo or asks about available times. Always use this BEFORE trying to book an appointment.",
    "parameters": {
      "type": "object",
      "properties": {
        "date": {
          "type": "string",
          "format": "date",
          "description": "Specific date to check (YYYY-MM-DD format). Optional - if not provided, checks next 7 days during business hours (9 AM - 5 PM)."
        },
        "requested_date": {
          "type": "string",
          "format": "date", 
          "description": "Alternative parameter name for specific date requested."
        },
        "time_preference": {
          "type": "string",
          "enum": ["morning", "afternoon", "evening", "any"],
          "description": "Time of day preference. Morning = 9 AM-12 PM, Afternoon = 12 PM-5 PM, Evening = 5 PM-8 PM. Optional - if not provided, checks all business hours."
        },
        "timezone": {
          "type": "string",
          "default": "America/Los_Angeles",
          "description": "Timezone for the availability check. Defaults to Pacific Time."
        },
        "duration_minutes": {
          "type": "integer",
          "default": 30,
          "description": "Meeting duration in minutes. Defaults to 30 minutes."
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

### 2. **Book Appointment Tool**
**When to use**: After checking availability and the caller confirms a specific time slot.

```json
{
  "type": "function",
  "function": {
    "name": "book_appointment",
    "description": "Book a confirmed appointment and create a Teams meeting. ONLY use this after the user has confirmed a specific time slot from the check_availability results. Always collect customer_name, customer_email, and appointment_datetime before using this tool.",
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
          "description": "Additional notes about the appointment or customer needs"
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

### 3. **Collect Contact Information Tool**
**When to use**: For every call where you gather contact information, regardless of outcome.

```json
{
  "type": "function",
  "function": {
    "name": "collect_contact_information",
    "description": "Store contact information and call details in CRM. Use this for EVERY call where you collect any contact information, regardless of whether they book a demo or not. This ensures proper lead tracking and follow-up.",
    "parameters": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "Customer's full name"
        },
        "firstName": {
          "type": "string",
          "description": "Customer's first name"
        },
        "lastName": {
          "type": "string",
          "description": "Customer's last name"
        },
        "email": {
          "type": "string",
          "format": "email",
          "description": "Customer's email address"
        },
        "phone": {
          "type": "string",
          "description": "Customer's phone number"
        },
        "company": {
          "type": "string",
          "description": "Customer's company name"
        },
        "industry": {
          "type": "string",
          "description": "Customer's business industry"
        },
        "message": {
          "type": "string",
          "description": "Summary of the conversation, customer needs, and key discussion points"
        },
        "call_outcome": {
          "type": "string",
          "enum": ["demo_scheduled", "demo_requested", "interested", "not_interested", "callback_requested", "pricing_inquiry", "implementation_ready"],
          "description": "What happened during the call"
        },
        "interest_level": {
          "type": "string",
          "enum": ["hot", "warm", "cold"],
          "description": "How qualified/interested the prospect is"
        },
        "next_steps": {
          "type": "string",
          "description": "Specific next steps or follow-up actions needed"
        },
        "call_duration": {
          "type": "string",
          "description": "Length of the call (if available)"
        },
        "vapi_call_id": {
          "type": "string",
          "description": "VAPI call identifier (if available)"
        }
      },
      "required": ["name", "call_outcome", "interest_level"]
    }
  },
  "server": {
    "url": "https://your-n8n-domain.com/webhook/outbound-call-contact-collection",
    "method": "POST"
  }
}
```

## Usage Flow Examples

### Example 1: Inbound Call - Demo Request
```
Caller: "I'd like to schedule a demo of your AI phone system."
Richard: "Great! Let me check my availability for you."

1. Use check_availability tool:
   - time_preference: "any" (or ask their preference)
   - duration_minutes: 30

2. Present available slots:
   "I have availability Tuesday at 2 PM, Wednesday at 10 AM, or Thursday at 3 PM. Which works best?"

3. When they confirm:
   "Perfect! Tuesday at 2 PM it is. Let me get your details to send the invite."
   - Collect: name, email, phone, company

4. Use book_appointment tool:
   - customer_name: "John Smith"
   - customer_email: "john@company.com"
   - appointment_datetime: "2024-12-17T14:00:00"
   - company_name: "ABC Corp"

5. Use collect_contact_information tool:
   - call_outcome: "demo_scheduled"
   - interest_level: "warm"
   - next_steps: "Demo scheduled for Tuesday 2 PM"
```

### Example 2: Inbound Call - Information Gathering
```
Caller: "I'm interested in your AI solutions but need more information first."
Richard: [Discovery conversation about their business needs]

1. Only use collect_contact_information tool:
   - call_outcome: "interested"
   - interest_level: "warm" 
   - next_steps: "Follow up with ROI analysis and pricing"
   - message: "Small business owner interested in AI phone automation"
```

### Example 3: Outbound Call - Demo Follow-up
```
Richard calls prospect who requested demo via website
Richard: [Discovery conversation, builds interest]
Prospect: "This sounds good. When can we do the demo?"

1. Use check_availability tool
2. Get confirmation and details
3. Use book_appointment tool
4. Use collect_contact_information tool
```

## Key Decision Logic

### When to use check_availability:
- ✅ Caller asks to "schedule a demo"
- ✅ Caller asks "when are you available?"
- ✅ Caller says "let's set up a meeting"
- ✅ After building interest and they want to move forward
- ❌ Don't use if they're just asking questions or gathering information

### When to use book_appointment:
- ✅ ONLY after check_availability shows available slots
- ✅ ONLY after customer confirms a specific time
- ✅ ONLY when you have their name and email
- ❌ Never use without checking availability first
- ❌ Never use if they haven't confirmed a specific time slot

### When to use collect_contact_information:
- ✅ EVERY call where you get a name and contact info
- ✅ Whether they book a demo or not
- ✅ Even for "just looking" or price shoppers
- ✅ Use at the END of successful interactions
- ✅ Critical for CRM tracking and follow-up

## Tool Usage Best Practices

1. **Always check availability BEFORE booking** - Never assume times are available
2. **Collect contact info for EVERY qualified lead** - Even if they don't book immediately
3. **Use natural language** - Don't announce you're "using a tool"
4. **Confirm details** - Repeat back the appointment details before booking
5. **Handle errors gracefully** - If a tool fails, offer alternative next steps

## Error Handling

### If check_availability fails:
"I'm having a brief technical issue with my calendar. Let me take down your preferred times and I'll confirm availability and send you the meeting details within the hour."

### If book_appointment fails:
"I want to make sure this gets scheduled properly. Let me take down all your information and have our scheduling team send you the calendar invitation directly."

### If collect_contact_information fails:
Continue the conversation normally - this is background CRM functionality and shouldn't interrupt the customer experience.

## Configuration Notes

- Replace `https://your-n8n-domain.com` with your actual n8n webhook URLs
- Ensure all webhook endpoints are active in n8n
- Test each tool individually before deploying
- Consider timezone handling for multi-timezone businesses
- Set up proper error notifications for failed tool calls

This configuration ensures Richard uses the right tool at the right time, creating a smooth experience while capturing all leads and bookings properly.