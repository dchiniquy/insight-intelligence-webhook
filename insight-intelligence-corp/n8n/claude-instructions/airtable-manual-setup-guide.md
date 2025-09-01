# Airtable Manual Setup Guide - Chat Leads Base

Since Airtable doesn't support direct JSON schema import, here are the easiest methods to create your base:

## Option 1: Manual Field Creation (Recommended - 15 minutes)

### Step 1: Create New Base
1. Go to **Airtable.com** → Click **"Create a base"** → **"Start from scratch"**
2. **Rename base** to: `Chat Leads - Insight Intelligence`
3. **Rename table** to: `Incomplete Leads`

### Step 2: Create Fields (Copy this exact structure)

**Delete default fields first**, then create these fields in order:

| # | Field Name | Field Type | Settings/Options |
|---|------------|------------|------------------|
| 1 | `firstName` | Single line text | - |
| 2 | `lastName` | Single line text | - |
| 3 | `phone` | Phone number | - |
| 4 | `email` | Email | - |
| 5 | `message` | Long text | - |
| 6 | `sessionId` | Single line text | - |
| 7 | `timestamp` | Date and time | Include time |
| 8 | `leadSource` | Single select | Options: `chat`, `phone`, `form`, `referral` |
| 9 | `intentClassification` | Long text | - |
| 10 | `primaryIntent` | Single select | See options below ⬇️ |
| 11 | `leadQuality` | Single select | Options: `hot`, `warm`, `cold`, `nurture` |
| 12 | `urgencyLevel` | Single select | Options: `immediate`, `soon`, `flexible`, `exploring` |
| 13 | `vapiCallStatus` | Single select | Options: `pending`, `completed`, `failed`, `no_answer`, `scheduled` |
| 14 | `vapiCallId` | Single line text | - |
| 15 | `status` | Single select | Options: `new`, `contacted`, `qualified`, `converted`, `unresponsive` |
| 16 | `hubspotMigrated` | Checkbox | - |
| 17 | `hubspotContactId` | Single line text | - |
| 18 | `notes` | Long text | - |
| 19 | `lastContactDate` | Date and time | Include time |
| 20 | `nextFollowUpDate` | Date and time | Include time |

### Primary Intent Options (Field #10):
```
demo_request
pricing_inquiry
lead_qualification
information_gathering
technical_support
objection_handling
scheduling
general_conversation
```

### Step 3: Create Views

**View 1: New Leads**
1. Click **"+ Create"** next to "Views" 
2. Name: `New Leads`
3. Filter: `status` equals `new`
4. Sort: `timestamp` (newest to oldest)

**View 2: Pending VAPI Calls**
1. Create new view: `Pending VAPI Calls`
2. Filter: `vapiCallStatus` equals `pending`
3. Sort: `timestamp` (oldest to newest)

**View 3: Hot Prospects**  
1. Create new view: `Hot Prospects`
2. Filters: 
   - `leadQuality` equals `hot` 
   - AND `status` does not equal `converted`
3. Sort: `urgencyLevel` (A to Z)

**View 4: Ready for HubSpot**
1. Create new view: `Ready for HubSpot`
2. Filters:
   - `email` is not empty
   - AND `hubspotMigrated` is unchecked
   - AND `status` equals `qualified`
3. Sort: `timestamp` (newest to oldest)

**View 5: Converted Leads**
1. Create new view: `Converted Leads`  
2. Filter: `hubspotMigrated` is checked
3. Sort: `lastContactDate` (newest to oldest)

---

## Option 2: CSV Template Import (Faster - 5 minutes)

### Step 1: Create Base and Import CSV
1. Go to **Airtable.com** → Click **"Create a base"** → **"Import data"** → **"CSV file"**
2. **Upload** the `airtable-csv-template.csv` file from this project
3. **Configure import**:
   - ✅ Check "Use first row as column headers"
   - ✅ Check "Auto-select field types"
4. **Name your base**: `Chat Leads - Insight Intelligence` 
5. **Name your table**: `Incomplete Leads`
6. **Click "Import"**

### Step 2: Fix Field Types (Airtable auto-detection limitations)

After import, you need to convert some text fields to proper types:

1. **leadSource** → Change to **Single Select**
   - Options: `chat`, `phone`, `form`, `referral`

2. **primaryIntent** → Change to **Single Select**  
   - Options: `demo_request`, `pricing_inquiry`, `lead_qualification`, `information_gathering`, `technical_support`, `objection_handling`, `scheduling`, `general_conversation`

3. **leadQuality** → Change to **Single Select**
   - Options: `hot`, `warm`, `cold`, `nurture`

4. **urgencyLevel** → Change to **Single Select**
   - Options: `immediate`, `soon`, `flexible`, `exploring`

5. **vapiCallStatus** → Change to **Single Select**
   - Options: `pending`, `completed`, `failed`, `no_answer`, `scheduled`

6. **status** → Change to **Single Select** 
   - Options: `new`, `contacted`, `qualified`, `converted`, `unresponsive`

7. **hubspotMigrated** → Change to **Checkbox**

8. **phone** → Change to **Phone Number**

9. **email** → Change to **Email**

10. **timestamp**, **lastContactDate**, **nextFollowUpDate** → Change to **Date and Time** (include time)

### Step 3: Delete Sample Data
Delete the 3 sample rows after confirming field types are correct.

### Step 4: Create Views (Same as Option 1)
Follow the view creation steps from Option 1 above.

---

## Option 3: Airtable Template Sharing (Coming Soon)

Airtable is working on better template sharing features, but currently you'd need to manually recreate the structure.

---

## Verification Checklist

After setup, verify you have:

- [ ] **Base named**: `Chat Leads - Insight Intelligence`
- [ ] **Table named**: `Incomplete Leads`  
- [ ] **20 fields** with correct types and options
- [ ] **5 views** configured with proper filters
- [ ] **No sample data** remaining (if used CSV import)

## Get Your Base ID

Once created:

1. **Go to your base** in Airtable
2. **Click "Help"** in top-right → **"API documentation"**
3. **Copy the Base ID** from the URL (starts with `app...`)
4. **Save this ID** - you'll need it for n8n configuration

Example Base ID format: `appXXXXXXXXXXXXXX`

---

## Next Steps

After creating your base:

1. ✅ **Generate Personal Access Token** (see airtable-setup-guide.md)
2. ✅ **Configure n8n credentials** with your Base ID and token
3. ✅ **Test the integration** with sample chat messages
4. ✅ **Monitor lead routing** between Airtable and HubSpot

**Estimated Total Setup Time**: 15-20 minutes

The manual option (Option 1) gives you the most control and understanding of your base structure, while the CSV import (Option 2) is faster but requires field type corrections afterward.
