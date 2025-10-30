# Quick Start: Website Blocking Extension

Get website blocking working in 5 minutes!

## Step 1: Setup Database (2 minutes)

Run the migration to create required tables:

```bash
# Option A: If you have Supabase CLI installed
supabase db push

# Option B: Manual SQL
# 1. Go to your Supabase dashboard
# 2. Click SQL Editor
# 3. Copy/paste contents of: supabase/migrations/20250129_add_website_blocking.sql
# 4. Click Run
```

## Step 2: Configure Extension (1 minute)

You need to update 3 files with your Supabase credentials.

### Find Your Credentials

1. Go to your Supabase dashboard
2. Click Settings > API
3. Copy your:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (starts with: `eyJhbGc...`)

### Update Extension Files

**File 1: `browser-extension/background.js` (lines 4-5)**
```javascript
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY-HERE';
```

**File 2: `browser-extension/popup.js` (lines 4-6)**
```javascript
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY-HERE';
const CLARITY_APP_URL = 'http://localhost:5173'; // or your production URL
```

**File 3: `browser-extension/blocked.html` (line 128)**
```javascript
window.location.href = 'http://localhost:5173/dashboard'; // or your production URL
```

## Step 3: Create Icons (30 seconds)

Create 3 simple PNG images (or use placeholders):

- `browser-extension/icons/icon16.png` - 16x16 pixels
- `browser-extension/icons/icon48.png` - 48x48 pixels
- `browser-extension/icons/icon128.png` - 128x128 pixels

**Quick tip**: Use any image editor or online tool to create simple icons. They just need to be recognizable in the browser toolbar.

## Step 4: Load Extension (30 seconds)

### Chrome:
1. Open `chrome://extensions/`
2. Toggle "Developer mode" ON (top right)
3. Click "Load unpacked"
4. Select the `browser-extension` folder
5. Done! Extension icon should appear in toolbar

### Firefox:
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `browser-extension/manifest.json`
4. Done! Extension icon should appear in toolbar

## Step 5: Test It (1 minute)

### Sign In to Extension
1. Click the extension icon in your toolbar
2. Enter your Clarity email/password
3. Click "Sign In"
4. Should see "Status: Authenticated"

### Add a Blocked Website
1. Open your Clarity web app
2. Go to **Dashboard > Settings tab**
3. Add a test site:
   - URL Pattern: `*://*.youtube.com/*`
   - Name: `YouTube`
4. Click "Add"

### Start Focus Session
1. Go to **Track** page
2. Session starts automatically
3. Wait 30 seconds for extension to sync
4. Extension badge should show 🔒

### Test Blocking
1. Try to visit youtube.com
2. You should see a beautiful blocked page with a motivational quote!
3. Go back to Clarity and click "End Session"
4. Wait 30 seconds
5. YouTube should work normally again

## Common Issues

### "Extension not blocking"
- **Wait 30 seconds** - Extension polls every 30 seconds
- **Check badge** - Extension icon should show 🔒 when blocking
- **Click "Refresh Status"** in extension popup

### "Not authenticated"
- Click extension icon and sign in
- Make sure you're using the same account as the web app

### "Sites still accessible"
- Check URL pattern matches exactly
- Example: YouTube needs `*://*.youtube.com/*` (with the wildcards)

### "Database error"
- Make sure you ran the migration (Step 1)
- Check Supabase dashboard > Table Editor
- Should see `blocked_websites` and `active_blocking_sessions` tables

## What's Next?

### Add More Sites

Common patterns to block:

```
*://*.youtube.com/*     - YouTube
*://*.reddit.com/*      - Reddit
*://twitter.com/*       - Twitter
*://facebook.com/*      - Facebook
*://*.instagram.com/*   - Instagram
*://*.tiktok.com/*      - TikTok
*://*.netflix.com/*     - Netflix
*://*.twitch.tv/*       - Twitch
```

### Customize Blocked Page

Edit `browser-extension/blocked.html` to:
- Change colors/styling
- Add your own motivational quotes
- Add custom messages

### Production Deployment

When ready to deploy:

1. **Update URLs** in all 3 extension files to production URLs
2. **Test thoroughly** with production Supabase
3. **Create proper icons** (professional looking)
4. **Publish to Chrome Web Store** (optional)
5. **Publish to Firefox Add-ons** (optional)

## Need Help?

1. Check `browser-extension/README.md` for detailed docs
2. Check `BROWSER_EXTENSION_INTEGRATION.md` for architecture details
3. Open browser console (F12) and check for errors
4. Check extension service worker console for logs:
   - Chrome: `chrome://extensions/` > "Inspect views: service worker"
   - Firefox: `about:debugging` > "Inspect"

## Tips

- **Start small**: Block 2-3 sites first, add more later
- **URL patterns**: Use `*://` prefix and `/*` suffix for best results
- **Testing**: Use incognito/private window to test without cached data
- **Debugging**: Check extension console for helpful error messages
- **Heartbeat**: Web app sends heartbeat every 30s to keep session alive

## Success Checklist

- [ ] Database migration ran successfully
- [ ] Extension files updated with Supabase credentials
- [ ] Icons created (even simple placeholders work)
- [ ] Extension loaded in browser
- [ ] Signed in through extension popup
- [ ] Added at least one blocked website
- [ ] Started focus session from Track page
- [ ] Extension badge shows 🔒
- [ ] Blocked website redirects to motivational page
- [ ] Ending session removes blocking

If all checked ✓, you're done! Enjoy distraction-free focus sessions!
