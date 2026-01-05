# Google Calendar Sync - Quick Start Guide

## ⚡ Quick Setup (5 minutes)

### Step 1: Get Google Credentials (2 min)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable "Google Calendar API"
3. Create OAuth 2.0 client:
   - Authorized redirect URIs (add both):
     - `http://localhost:3001/api/google-calendar/callback` (for local dev)
     - `https://your-domain.com/api/google-calendar/callback` (for production)
   - Copy Client ID and Secret

### Step 2: Configure App (1 min)

Add to `.env.local`:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_URL=http://localhost:3001
# For production, set: NEXT_PUBLIC_URL=https://your-domain.com
```

**Note:** The callback URL is automatically built from `NEXT_PUBLIC_URL`, so update this variable for each environment.

### Step 3: Run Migration (1 min)

In Supabase SQL Editor:
```sql
-- Copy/paste from migrations/add_google_calendar_sync.sql
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS google_event_id TEXT;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_shifts_google_event_id ON shifts(google_event_id);
```

### Step 4: Restart Server (1 min)

```bash
npm run dev
```

### Step 5: Test (2 min)

1. Navigate to **Google Calendar Sync** in sidebar
2. Click **Connect Google Calendar**
3. Authorize the app
4. Configure settings:
   - ✅ Check at least 1 event field (e.g., Carer Name, Hours)
   - ✅ Select at least 1 client
   - ✅ Select at least 1 carer
5. Click **Sync Now**
6. Check your Google Calendar!

## 📋 Settings Explained

### Event Format
Choose what appears in calendar event titles:
- ✅ **Carer Name** | **Client Name** | **3.5h**  
  Result: "John Smith | Jane Doe | 3.5h"

### Filters
- **Clients**: Only sync shifts for selected clients
- **Carers**: Only sync shifts for selected carers

### Sync Mode
- **Automatic**: All shifts (future feature: continuous sync)
- **Manual**: Choose date range or leave empty for all

## 🎯 Example Use Cases

### Scenario 1: Sync All Shifts
- Fields: Carer Name, Client Name, Hours
- Clients: Select All
- Carers: Select All
- Mode: Manual (no dates)
- Result: All shifts appear in calendar

### Scenario 2: Specific Client Only
- Fields: Client Name, Description, Cost
- Clients: ✅ John Smith only
- Carers: Select All
- Mode: Automatic
- Result: Only John Smith's shifts appear

### Scenario 3: Weekly Sync
- Fields: Carer Name, Hours
- Clients: Select All
- Carers: Select All
- Mode: Manual
- Dates: This week only
- Result: This week's shifts sync on demand

## 🔧 Troubleshooting

### "OAuth error"
→ Check redirect URI matches exactly in Google Console

### "No access token"
→ Click Disconnect, then reconnect

### Events not appearing
→ Ensure at least 1 field, 1 client, 1 carer selected

### "Token exchange failed"
→ Verify Client Secret is correct

## 📚 Full Documentation

- **Setup Guide**: `GOOGLE_CALENDAR_SYNC_SETUP.md`
- **Implementation Details**: `GOOGLE_CALENDAR_SYNC_IMPLEMENTATION.md`

## 🚀 You're Done!

Your shifts should now appear in Google Calendar with your custom format. Any questions? Check the full documentation files above.
