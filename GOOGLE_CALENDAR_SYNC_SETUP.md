# Google Calendar Sync Setup

This guide explains how to set up the Google Calendar sync feature to automatically sync shifts from your invoice app to Google Calendar.

## Features

- **One-way sync**: App → Google Calendar
- **Customizable event format**: Choose which fields to include (carer name, client name, line item code, description, cost, hours)
- **Field ordering**: Drag to reorder or use number inputs to set the sequence
- **Client & Carer filtering**: Select specific clients and carers to sync
- **Auto & Manual modes**:
  - **Automatic**: Continuously sync all shifts
  - **Manual**: Sync specific date ranges or all shifts on-demand
- **Event updates**: Automatically updates existing events when shifts change

## Setup Instructions

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Configure the OAuth consent screen if prompted:
   - User Type: External (for testing) or Internal (for organization)
   - App name: "Invoice App Calendar Sync"
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add `https://www.googleapis.com/auth/calendar` and `https://www.googleapis.com/auth/calendar.events`
4. Create OAuth client ID:
   - Application type: Web application
   - Name: "Invoice App"
   - Authorized JavaScript origins:
     - `http://localhost:3001` (for development)
     - Your production URL (e.g., `https://your-app.vercel.app`)
   - Authorized redirect URIs:
     - `http://localhost:3001/api/google-calendar/callback` (for development)
     - Your production callback URL (e.g., `https://your-app.vercel.app/api/google-calendar/callback`)
   - **Important:** You can add multiple redirect URIs - add all environments you'll use
5. Copy the **Client ID** and **Client Secret**

### 3. Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Google Calendar OAuth
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_URL=http://localhost:3001
```

**Important:** The OAuth callback URL is automatically constructed as `${NEXT_PUBLIC_URL}/api/google-calendar/callback`

**For production**, set `NEXT_PUBLIC_URL` to your production domain:
```env
NEXT_PUBLIC_URL=https://your-app.vercel.app
```

This way, the same code works in all environments without changes.

### 4. Run Database Migration

Execute the migration to add Google Calendar sync columns to the shifts table:

```bash
# Connect to your Supabase database and run:
psql YOUR_DATABASE_URL -f migrations/add_google_calendar_sync.sql
```

Or in Supabase dashboard:
1. Go to SQL Editor
2. Open `migrations/add_google_calendar_sync.sql`
3. Run the migration

This adds:
- `google_event_id` column to track synced events
- `last_synced_at` timestamp for sync tracking
- Index for faster lookups

### 5. Restart Development Server

```bash
npm run dev
```

## Usage

### Initial Setup

1. Navigate to **Google Calendar Sync** in the sidebar
2. Click **"Connect Google Calendar"**
3. Authorize the app to access your Google Calendar
4. Configure your sync settings:

#### Event Summary Configuration
- Select which fields to include in event titles
- Arrange the order using ▲/▼ buttons
- Preview shows how events will appear
- Fields are separated by `|`
- Example: `John Smith | Jane Doe | 3.5h`

#### Client Selection
- Select which clients' shifts to sync
- Must select at least one client
- Use "Select All" or "Select None" for bulk actions

#### Carer Selection
- Select which carers' shifts to sync
- Must select at least one carer
- Use "Select All" or "Select None" for bulk actions

#### Sync Mode
- **Automatic**: Syncs all shifts matching your filters continuously
- **Manual**: Sync specific date ranges on-demand
  - Leave date fields empty to sync all shifts
  - Or specify a date range (from/to)

### Syncing Shifts

1. Configure all settings (at least 1 field, 1 client, 1 carer)
2. Click **"Start Automatic Sync"** or **"Sync Now"**
3. The app will:
   - Fetch shifts matching your filters
   - Create Google Calendar events with your custom format
   - Store `google_event_id` for future updates
   - Show success/error message

### Updating Shifts

When you edit a shift in the app:
- If automatic mode is enabled, it will auto-sync
- If manual mode is enabled, click "Sync Now" to update
- Existing events are updated (not duplicated)

## Timezone Configuration

By default, events use **Australia/Sydney** timezone. To change this:

1. Edit `/app/api/sync-google-calendar/route.ts`
2. Find `timeZone: 'Australia/Sydney'`
3. Replace with your timezone (e.g., `America/New_York`, `Europe/London`)
4. Update both `start` and `end` event fields

## Troubleshooting

### "OAuth error" message
- Check that redirect URIs are correctly configured in Google Cloud Console
- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env.local`
- Verify `NEXT_PUBLIC_URL` matches your current environment

### "Access token required" error
- Click "Disconnect" and reconnect to Google Calendar
- Check browser console for OAuth flow errors

### Events not appearing in Google Calendar
- Check that you have at least 1 field, 1 client, and 1 carer selected
- Verify date range if using manual mode
- Check the sync message for error details
- Look at browser console for API errors

### "Token exchange failed" error
- Verify `GOOGLE_CLIENT_SECRET` is correct
- Check that the OAuth consent screen is published (not in testing mode) or you're a test user
- Ensure redirect URIs exactly match (including trailing slashes)

## Security Notes

### Production Considerations

1. **Token Storage**: Currently, tokens are stored in `localStorage` for simplicity. For production:
   - Store encrypted tokens in your database
   - Implement token refresh logic
   - Use secure HTTP-only cookies

2. **OAuth Consent**: 
   - Publish your OAuth consent screen for public use
   - Or keep it in testing mode and add users manually

3. **HTTPS**: 
   - Always use HTTPS in production
   - Google requires HTTPS for OAuth redirect URIs

4. **Scopes**: 
   - Limit scopes to only what's needed
   - Current scopes: `calendar` and `calendar.events`

## API Endpoints

- `GET /api/google-calendar/auth` - Initiates OAuth flow
- `GET /api/google-calendar/callback` - Handles OAuth callback
- `POST /api/sync-google-calendar` - Syncs shifts to Google Calendar

## Database Schema

### New Columns in `shifts` Table

```sql
google_event_id TEXT          -- Google Calendar event ID
last_synced_at TIMESTAMP      -- Last sync timestamp
```

## Future Enhancements

- [ ] Two-way sync (Google Calendar → App)
- [ ] Batch sync for better performance
- [ ] Webhook-based automatic sync (instead of polling)
- [ ] Multiple calendar support
- [ ] Conflict resolution for manual edits
- [ ] Sync history and logs
- [ ] Email notifications on sync errors
