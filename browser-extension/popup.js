// Import our custom Supabase client (no external dependencies)
import { supabase } from './supabase-client.js';

const CLARITY_APP_URL = 'http://localhost:8080'; // Update for production

// Update UI based on status
async function updateUI() {
  const { data: { user } } = await supabase.getUser();

  const loadingSection = document.getElementById('loading-section');
  const mainSection = document.getElementById('main-section');
  const authSection = document.getElementById('auth-section');

  loadingSection.style.display = 'none';

  if (user) {
    // User is authenticated - show main section
    mainSection.style.display = 'block';
    authSection.style.display = 'none';

    document.getElementById('auth-status').textContent = 'Authenticated';
    document.getElementById('auth-status').className = 'status-value status-active';

    // Check blocking status from background script
    chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
      if (response?.blocking) {
        document.getElementById('blocking-status').textContent = 'Active';
        document.getElementById('blocking-status').className = 'status-value status-active';
      } else {
        document.getElementById('blocking-status').textContent = 'Inactive';
        document.getElementById('blocking-status').className = 'status-value status-inactive';
      }
    });
  } else {
    // User not authenticated - show auth section
    mainSection.style.display = 'none';
    authSection.style.display = 'block';
  }
}

// Handle login
async function handleLogin() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('auth-error');
  const loginBtn = document.getElementById('login-btn');

  if (!email || !password) {
    errorDiv.textContent = 'Please enter email and password';
    errorDiv.style.display = 'block';
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';
  errorDiv.style.display = 'none';

  try {
    const { data, error } = await supabase.signInWithPassword(email, password);

    if (error) throw error;

    // Notify background script
    chrome.runtime.sendMessage({ action: 'login' });

    // Update UI
    await updateUI();
  } catch (error) {
    console.error('Login error:', error);
    errorDiv.textContent = error.message || 'Failed to sign in';
    errorDiv.style.display = 'block';
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
}

// Handle logout
async function handleLogout() {
  try {
    await supabase.signOut();
    chrome.runtime.sendMessage({ action: 'logout' });
    await updateUI();
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Handle refresh
function handleRefresh() {
  const refreshBtn = document.getElementById('refresh-btn');
  refreshBtn.disabled = true;
  refreshBtn.textContent = 'Refreshing...';

  chrome.runtime.sendMessage({ action: 'refresh' }, async (response) => {
    await updateUI();
    refreshBtn.disabled = false;
    refreshBtn.textContent = 'Refresh Status';
  });
}

// Open dashboard
function openDashboard() {
  chrome.tabs.create({ url: `${CLARITY_APP_URL}/dashboard` });
}

// Open signup page
function openSignup() {
  chrome.tabs.create({ url: `${CLARITY_APP_URL}/auth` });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  updateUI();

  // Main section buttons
  document.getElementById('refresh-btn').addEventListener('click', handleRefresh);
  document.getElementById('dashboard-btn').addEventListener('click', openDashboard);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('settings-link').addEventListener('click', openDashboard);

  // Auth section
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('signup-link').addEventListener('click', openSignup);

  // Enter key in password field
  document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  });
});
