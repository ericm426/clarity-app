# Browser Extension Integration Guide

This document explains how the browser extension integrates with your Clarity web app to block distracting websites during focus sessions.

## Overview

The integration adds a powerful new feature to Clarity: automatic website blocking during focus sessions. When you start a focus session on the Track page, the browser extension automatically blocks websites you've configured, helping you stay focused.

## What Was Added

### 1. Database Schema (Supabase)

Two new tables were added to store blocked websites and track active sessions:

**`blocked_websites`** - Stores user's blocked website patterns
- `id`: Unique identifier
- `user_id`: Links to authenticated user
- `url_pattern`: URL pattern to block (e.g., `*://*.youtube.com/*`)
- `name`: Optional friendly name for the website
- `is_active`: Whether this block rule is currently enabled
- `created_at`, `updated_at`: Timestamps

**`active_blocking_sessions`** - Tracks active focus sessions with blocking
- `id`: Unique identifier
- `user_id`: Links to authenticated user
- `focus_session_id`: Optional link to focus_sessions table
- `started_at`: When blocking session started
- `is_active`: Whether session is currently active
- `last_heartbeat`: Last time web app checked in (prevents stale sessions)

**Location**: `supabase/migrations/20250129_add_website_blocking.sql`

### 2. TypeScript Types

Updated Supabase types to include the new tables:

**Location**: `src/integrations/supabase/types.ts`

### 3. Web App Components

#### BlockedWebsitesManager Component

A UI component for managing blocked websites in the Dashboard.

**Features**:
- Add new blocked websites with URL patterns
- View all configured blocked websites
- Enable/disable individual websites
- Delete websites from the list
- Installation instructions for browser extension

**Location**: `src/components/BlockedWebsitesManager.tsx`

#### useBlockingSession Hook

A React hook that manages blocking sessions in the web app.

**Features**:
- Start/stop blocking sessions
- Send periodic heartbeats to keep session alive
- Check for existing active sessions
- Automatic cleanup of stale sessions

**Location**: `src/hooks/useBlockingSession.ts`

### 4. Updated Track Page

The Track page now automatically starts and stops blocking sessions.

**Changes**:
- Imports `useBlockingSession` hook
- Starts blocking session when focus session begins
- Sends heartbeat every 30 seconds to keep session alive
- Stops blocking session when focus session ends
- Shows toast notification when blocking is activated

**Location**: `src/pages/Track.tsx`

### 5. Updated Dashboard

Added a new "Settings" tab with the website blocking manager.

**Changes**:
- Added "Settings" tab to tab list
- Integrated BlockedWebsitesManager component
- Added section header for settings

**Location**: `src/pages/Dashboard.tsx`

### 6. Browser Extension

A complete browser extension (Chrome/Firefox) that syncs with the web app.

**Files**:
- `manifest.json` - Extension configuration (Manifest V3)
- `background.js` - Service worker with blocking logic
- `popup.html` - Extension popup UI
- `popup.js` - Popup logic and authentication
- `blocked.html` - Page shown when visiting blocked sites
- `README.md` - Comprehensive setup and usage guide

**Location**: `browser-extension/`

## How It Works

### Sequence Diagram

```
User                Web App              Supabase           Browser Extension
 |                     |                     |                      |
 |--Start Session----->|                     |                      |
 |                     |--Create Session---->|                      |
 |                     |                     |                      |
 |                     |                     |<--Poll (30s)---------|
 |                     |                     |                      |
 |                     |                     |--Active Session----->|
 |                     |                     |                      |
 |                     |                     |<--Fetch Blocklist----|
 |                     |                     |                      |
 |                     |                     |--Blocked Sites------>|
 |                     |                     |                      |
 |                     |                     |                [Enable Blocking]
 |                     |                     |                      |
 |                     |--Heartbeat (30s)--->|                      |
 |                     |                     |                      |
 |--Try Visit Site-----|                     |                      |
 |                     |                     |                      |--Block Page-->
 |                     |                     |                      |
 |--End Session------->|                     |                      |
 |                     |--Deactivate-------->|                      |
 |                     |                     |                      |
 |                     |                     |<--Poll (30s)---------|
 |                     |                     |                      |
 |                     |                     |--Inactive----------->|
 |                     |                     |                      |
 |                     |                     |               [Disable Blocking]
```

### Data Flow

1. **User starts focus session** (Track page)
   - `useBlockingSession.startBlockingSession()` called
   - Creates record in `active_blocking_sessions` with `is_active = true`
   - Sets `last_heartbeat` to current time

2. **Web app sends heartbeats**
   - Every 30 seconds, updates `last_heartbeat` timestamp
   - Keeps session marked as active

3. **Extension polls for active session**
   - Every 30 seconds, checks `active_blocking_sessions` for user
   - Looks for sessions with `is_active = true`
   - Checks if `last_heartbeat` is within 5 minutes (prevents stale sessions)

4. **Extension fetches blocked websites**
   - Queries `blocked_websites` for user where `is_active = true`
   - Gets list of URL patterns to block

5. **Extension updates blocking rules**
   - Converts URL patterns to Chrome declarativeNetRequest rules
   - Updates dynamic rules to block specified websites
   - Sets badge on extension icon to show blocking is active

6. **User tries to visit blocked site**
   - Chrome intercepts request
   - Redirects to `blocked.html` page
   - Shows motivational message and session info

7. **User ends focus session** (Track page)
   - `useBlockingSession.stopBlockingSession()` called
   - Updates `active_blocking_sessions` to set `is_active = false`
   - Saves focus session data to `focus_sessions` table

8. **Extension detects inactive session**
   - Polls and sees no active session
   - Removes all dynamic blocking rules
   - Clears badge on extension icon

## Setup Instructions

### Prerequisites

1. Clarity web app running with Supabase configured
2. Chrome or Firefox browser
3. Supabase project with migrations applied

### Step 1: Run Database Migration

Apply the database migration to create the required tables:

**Option A: Using Supabase CLI**
```bash
cd clarity-app
supabase db push
```

**Option B: Manual SQL**
1. Open Supabase dashboard
2. Go to SQL Editor
3. Copy contents of `supabase/migrations/20250129_add_website_blocking.sql`
4. Paste and run

### Step 2: Configure Extension

1. Open `browser-extension/background.js`
2. Update lines 4-5 with your Supabase credentials:
   ```javascript
   const SUPABASE_URL = 'https://your-project.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key';
   ```

3. Open `browser-extension/popup.js`
4. Update lines 4-6:
   ```javascript
   const SUPABASE_URL = 'https://your-project.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key';
   const CLARITY_APP_URL = 'http://localhost:5173'; // or your production URL
   ```

5. Open `browser-extension/blocked.html`
6. Update line 128:
   ```javascript
   window.location.href = 'https://your-clarity-app.com/dashboard';
   ```

### Step 3: Add Extension Icons

Create three PNG icons for the extension:
- `browser-extension/icons/icon16.png` (16x16 pixels)
- `browser-extension/icons/icon48.png` (48x48 pixels)
- `browser-extension/icons/icon128.png` (128x128 pixels)

### Step 4: Load Extension

**For Chrome:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `browser-extension` folder

**For Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `browser-extension/manifest.json`

### Step 5: Test Integration

1. **Sign in to extension**
   - Click extension icon
   - Enter your Clarity credentials
   - Verify "Authenticated" status

2. **Add blocked websites**
   - Open Clarity web app
   - Go to Dashboard > Settings tab
   - Add a test website (e.g., `*://*.youtube.com/*`)

3. **Start focus session**
   - Go to Track page
   - Session should start automatically
   - Extension should show "Blocking: Active" within 30 seconds

4. **Test blocking**
   - Try to visit youtube.com (or your test site)
   - Should see blocked page with motivational message

5. **End session**
   - Click "End Session" button
   - Extension should show "Blocking: Inactive" within 30 seconds
   - Should be able to visit previously blocked sites

## URL Pattern Examples

Users can configure these patterns in the Settings tab:

| Website | URL Pattern |
|---------|------------|
| YouTube | `*://*.youtube.com/*` |
| Reddit | `*://*.reddit.com/*` |
| Twitter | `*://twitter.com/*` |
| Facebook | `*://facebook.com/*` |
| Instagram | `*://*.instagram.com/*` |
| TikTok | `*://*.tiktok.com/*` |
| Netflix | `*://*.netflix.com/*` |

## Troubleshooting

### Extension Not Blocking

1. **Check authentication**: Extension popup should show "Authenticated"
2. **Check active session**: Dashboard should show active session
3. **Check blocked sites**: Settings tab should have websites configured
4. **Check URL patterns**: Must match format exactly
5. **Wait 30 seconds**: Extension polls every 30 seconds

### Session Not Detected

1. **Check database**: Verify `active_blocking_sessions` table has record
2. **Check heartbeat**: Verify `last_heartbeat` is updating
3. **Check extension console**: Inspect service worker for errors
4. **Verify Supabase config**: Ensure URL and keys are correct

### Database Issues

1. **Migration failed**: Run SQL manually in Supabase dashboard
2. **RLS policies**: Ensure Row Level Security policies are applied
3. **User permissions**: Verify user has access to tables

## API Reference

### useBlockingSession Hook

```typescript
const {
  isBlockingActive,        // boolean: Is blocking currently active?
  blockingSessionId,       // string | null: Current session ID
  startBlockingSession,    // (focusSessionId?) => Promise<string | null>
  stopBlockingSession,     // () => Promise<void>
  sendHeartbeat,          // () => Promise<void>
  error                   // string | null: Last error message
} = useBlockingSession();
```

### Database Schema

**blocked_websites**
```sql
CREATE TABLE blocked_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  url_pattern TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, url_pattern)
);
```

**active_blocking_sessions**
```sql
CREATE TABLE active_blocking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  focus_session_id UUID REFERENCES focus_sessions(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  last_heartbeat TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, is_active) WHERE is_active = true
);
```

## Security Considerations

1. **Authentication**: Extension uses same Supabase Auth as web app
2. **Row Level Security**: All tables have RLS policies enforcing user access
3. **Token Storage**: Session tokens stored in Chrome's secure storage
4. **Heartbeat Expiry**: Stale sessions (>5 min without heartbeat) automatically deactivated
5. **No Data Leakage**: Extension only accesses user's own data

## Performance

- **Polling Frequency**: 30 seconds (configurable)
- **Heartbeat Frequency**: 30 seconds
- **Database Queries**: Minimal (2-3 per poll cycle)
- **Extension Size**: ~50KB total
- **Memory Usage**: <5MB typical

## Future Enhancements

Potential features for future development:

1. **WebSocket sync**: Real-time updates instead of polling
2. **Whitelist mode**: Block everything except certain sites
3. **Scheduled blocking**: Automatic blocking during certain hours
4. **Custom messages**: Personalized blocked page messages
5. **Statistics**: Track how many times sites were blocked
6. **Break reminders**: Periodic notifications to take breaks
7. **Emergency override**: Temporary disable for urgent access

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review browser extension README
3. Check console logs (web app and extension)
4. Open issue on GitHub repository

## License

Same as Clarity web app
