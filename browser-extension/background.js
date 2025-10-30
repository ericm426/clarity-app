// Import our custom Supabase client (no external dependencies)
import { supabase } from './supabase-client.js';

let userId = null;
let blockingRulesActive = false;

// Check if user is authenticated
async function checkAuth() {
  const { data: { user } } = await supabase.getUser();
  if (user) {
    userId = user.id;
    return true;
  }
  return false;
}

// Fetch blocked websites from Supabase
async function fetchBlockedWebsites() {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('blocked_websites')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching blocked websites:', error);
    return [];
  }
}

// Check if there's an active blocking session
async function checkActiveSession() {
  if (!userId) {
    console.log('No userId, cannot check session');
    return false;
  }

  console.log('Checking active session for user:', userId);

  try {
    const { data, error } = await supabase
      .from('active_blocking_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    console.log('Query result:', { data, error });

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('No rows returned (PGRST116)');
        return false;
      }
      console.error('Query error:', error);
      throw error;
    }

    if (!data) {
      console.log('No active session found (data is null)');
      return false;
    }

    // Check if session is stale (no heartbeat in 5 minutes)
    const lastHeartbeat = new Date(data.last_heartbeat);
    const now = new Date();
    const minutesSinceHeartbeat = (now - lastHeartbeat) / 1000 / 60;

    console.log('Active session found!', {
      sessionId: data.id,
      heartbeat: minutesSinceHeartbeat.toFixed(2) + ' minutes ago',
      isStale: minutesSinceHeartbeat >= 5
    });

    return minutesSinceHeartbeat < 5;
  } catch (error) {
    console.error('Error checking active session:', error);
    return false;
  }
}

// Update blocking rules
async function updateBlockingRules() {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) {
    console.log('User not authenticated');
    await clearBlockingRules();
    return;
  }

  const hasActiveSession = await checkActiveSession();
  if (!hasActiveSession) {
    console.log('No active blocking session');
    await clearBlockingRules();
    blockingRulesActive = false;
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  const blockedWebsites = await fetchBlockedWebsites();

  if (blockedWebsites.length === 0) {
    console.log('No blocked websites configured');
    await clearBlockingRules();
    return;
  }

  // Convert blocked websites to declarativeNetRequest rules
  const rules = blockedWebsites.map((site, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: {
        url: chrome.runtime.getURL('blocked.html')
      }
    },
    condition: {
      urlFilter: site.url_pattern,
      resourceTypes: ['main_frame']
    }
  }));

  try {
    // Remove old rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIdsToRemove = existingRules.map(rule => rule.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIdsToRemove,
      addRules: rules
    });

    blockingRulesActive = true;
    chrome.action.setBadgeText({ text: '🔒' });
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });

    console.log(`Updated blocking rules: ${rules.length} sites blocked`);
  } catch (error) {
    console.error('Error updating blocking rules:', error);
  }
}

// Clear all blocking rules
async function clearBlockingRules() {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIdsToRemove = existingRules.map(rule => rule.id);

    if (ruleIdsToRemove.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIdsToRemove,
        addRules: []
      });
    }

    blockingRulesActive = false;
    chrome.action.setBadgeText({ text: '' });
    console.log('Cleared all blocking rules');
  } catch (error) {
    console.error('Error clearing blocking rules:', error);
  }
}

// Set up periodic sync (every 30 seconds)
function setupPeriodicSync() {
  chrome.alarms.create('syncBlockingRules', {
    periodInMinutes: 0.5 // 30 seconds
  });
}

// Handle alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncBlockingRules') {
    updateBlockingRules();
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'login') {
    // Popup will handle login, we just need to refresh
    checkAuth().then(() => {
      updateBlockingRules();
      sendResponse({ success: true });
    });
    return true; // Will respond asynchronously
  } else if (request.action === 'logout') {
    supabase.signOut().then(() => {
      userId = null;
      clearBlockingRules();
      sendResponse({ success: true });
    });
    return true; // Will respond asynchronously
  } else if (request.action === 'refresh') {
    updateBlockingRules().then(() => {
      sendResponse({ success: true, active: blockingRulesActive });
    });
    return true; // Will respond asynchronously
  } else if (request.action === 'getStatus') {
    sendResponse({
      authenticated: userId !== null,
      blocking: blockingRulesActive
    });
  }
});

// Initialize on install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('Clarity Focus Blocker installed/updated');
  setupPeriodicSync();
  updateBlockingRules();
});

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started, initializing Clarity Focus Blocker');
  setupPeriodicSync();
  updateBlockingRules();
});

// Initialize immediately
setupPeriodicSync();
updateBlockingRules();
