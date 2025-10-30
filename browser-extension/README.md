# Clarity Focus Blocker - Browser Extension

A browser extension that syncs with your Clarity web app to automatically block distracting websites during focus sessions.

## Features

- **Automatic Website Blocking**: Blocks configured websites when you start a focus session
- **Real-time Sync**: Syncs with your Clarity account via Supabase
- **Beautiful Blocked Page**: Shows motivational quotes when you try to visit blocked sites
- **Session Detection**: Automatically enables/disables based on active focus sessions
- **Heartbeat System**: Keeps blocking active while your focus session is running

## Architecture

```
Clarity Web App (Track Page)
         ↕️
   Supabase Database
   - blocked_websites
   - active_blocking_sessions
         ↕️
Browser Extension (Service Worker)
   - Polls every 30 seconds
   - Updates blocking rules dynamically
```

## Installation

### Prerequisites

1. Clarity web app running (with Supabase configured)
2. Chrome or Firefox browser

### Setup Steps

#### 1. Configure Supabase

First, you need to run the database migration to create the required tables:

```bash
# From your Clarity app root directory
# If using Supabase CLI:
supabase db push

# Or manually run the SQL migration in your Supabase dashboard:
# Go to SQL Editor and run: supabase/migrations/20250129_add_website_blocking.sql
```

#### 2. Update Extension Configuration

Edit `background.js` and `popup.js` to add your Supabase credentials:

**background.js (lines 4-5):**
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

**popup.js (lines 4-6):**
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
const CLARITY_APP_URL = 'https://clarityaiapp.vercel.app/'; // Update for production
```

**blocked.html (line 128):**
```javascript
window.location.href = 'https://your-clarity-app.com/dashboard';
```

You can find your Supabase credentials in your Supabase dashboard under Settings > API.

#### 3. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `browser-extension` folder
5. The extension icon should appear in your toolbar

#### 4. Load Extension in Firefox

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file in the `browser-extension` folder (e.g., `manifest.json`)
4. The extension will be loaded temporarily

For permanent installation in Firefox, you'll need to sign the extension through Mozilla.

## Usage

### 1. Sign In

Click the extension icon in your browser toolbar and sign in with your Clarity account credentials.

### 2. Configure Blocked Websites

1. Open your Clarity web app
2. Go to Dashboard > Settings tab
3. Add websites you want to block using URL patterns:
   - `*://*.youtube.com/*` - Blocks all YouTube pages
   - `*://*.reddit.com/*` - Blocks all Reddit pages
   - `*://twitter.com/*` - Blocks Twitter
   - `*://facebook.com/*` - Blocks Facebook

### 3. Start a Focus Session

1. Go to the Track page in your Clarity app
2. The extension will automatically detect the active session
3. Try to visit a blocked website - you'll see a motivational blocked page
4. When you end your session, blocking is automatically disabled

### 4. Monitor Status

Click the extension icon to see:
- Authentication status
- Whether blocking is currently active
- Quick links to your dashboard

## URL Pattern Examples

The extension uses Chrome's URL matching patterns. Here are some examples:

| Pattern | Matches |
|---------|---------|
| `*://*.youtube.com/*` | All YouTube pages |
| `*://*.reddit.com/*` | All Reddit pages |
| `*://twitter.com/*` | Twitter main domain only |
| `*://facebook.com/*` | Facebook main domain only |
| `*://*.instagram.com/*` | All Instagram pages |
| `*://*.tiktok.com/*` | All TikTok pages |
| `*://*.netflix.com/*` | All Netflix pages |

**Pattern Syntax:**
- `*://` - Matches both http:// and https://
- `*.` - Matches any subdomain
- `/*` - Matches any path

## How It Works

### Session Lifecycle

1. **Session Start**:
   - User clicks "Start Session" on Track page
   - Web app creates record in `active_blocking_sessions` table
   - Extension detects active session within 30 seconds
   - Extension fetches blocked websites
   - Extension updates browser blocking rules

2. **During Session**:
   - Web app sends heartbeat every 30 seconds to update `last_heartbeat`
   - Extension polls Supabase every 30 seconds
   - If heartbeat stops for >5 minutes, session is considered stale
   - Extension automatically disables blocking if session is stale

3. **Session End**:
   - User clicks "End Session" on Track page
   - Web app marks session as `is_active = false`
   - Extension detects inactive session within 30 seconds
   - Extension removes all blocking rules
   - User can access websites normally

### Security

- **Authentication**: Uses Supabase Auth with JWT tokens
- **Storage**: Session tokens stored in Chrome's secure storage
- **Row Level Security**: Supabase RLS policies ensure users can only access their own data
- **No Data Collection**: Extension only syncs with your personal Clarity account

## Troubleshooting

### Extension Not Blocking Sites

1. **Check Authentication**: Click extension icon - are you signed in?
2. **Check Active Session**: Open Clarity app - is a focus session running?
3. **Check Blocked Sites**: Go to Settings tab - are websites configured?
4. **Check URL Patterns**: Ensure patterns are correct (see examples above)
5. **Refresh Extension**: Click "Refresh Status" in extension popup

### Extension Not Detecting Session

1. **Check Console**: Right-click extension icon > Inspect > Console tab
2. **Verify Supabase Config**: Ensure URL and keys are correct
3. **Check Database**: Verify `active_blocking_sessions` table exists
4. **Wait 30 Seconds**: Extension polls every 30 seconds

### Blocked Sites Still Accessible

1. **Check URL Pattern**: Pattern must match exactly
2. **Hard Refresh**: Press Ctrl+Shift+R on the page
3. **Check Permissions**: Ensure extension has `declarativeNetRequest` permission

## Development

### File Structure

```
browser-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (main logic)
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── blocked.html          # Page shown when site is blocked
├── icons/                # Extension icons (you need to add these)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

### Adding Icons

You need to create three PNG icons:
- `icons/icon16.png` - 16x16 pixels
- `icons/icon48.png` - 48x48 pixels
- `icons/icon128.png` - 128x128 pixels

These should be simple, recognizable icons representing focus or clarity.

### Testing

1. Make changes to extension files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Clarity Focus Blocker card
4. Test your changes

### Debugging

**Background Script:**
1. Go to `chrome://extensions/`
2. Find Clarity Focus Blocker
3. Click "Inspect views: service worker"
4. Check Console for logs

**Popup:**
1. Right-click extension icon
2. Select "Inspect"
3. Check Console for logs

## Production Deployment

### Chrome Web Store

1. Create a developer account ($5 one-time fee)
2. Package extension as .zip file
3. Upload to Chrome Web Store
4. Submit for review

### Firefox Add-ons

1. Create Mozilla developer account (free)
2. Sign extension through web-ext
3. Upload to addons.mozilla.org
4. Submit for review

## Future Enhancements

- [ ] Whitelist mode (block everything except certain sites)
- [ ] Scheduled blocking (block sites during certain hours)
- [ ] Break reminders
- [ ] Sync block count with session stats
- [ ] Custom blocked page messages
- [ ] Emergency "Break Glass" button to temporarily disable
- [ ] Statistics dashboard in extension popup
- [ ] Desktop notifications when session starts/ends

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Open an issue on the Clarity GitHub repository
3. Include console logs from both the extension and web app

## License

Same as Clarity web app (specify your license here)
