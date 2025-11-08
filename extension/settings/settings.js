// DOM elements
const form = document.getElementById('settingsForm');
const apiKeyInput = document.getElementById('apiKey');
const databaseIdInput = document.getElementById('databaseId');
const testBtn = document.getElementById('testBtn');
const statusDiv = document.getElementById('status');

// Load saved settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);

// Form submission handler
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await saveSettings();
});

// Test connection button handler
testBtn.addEventListener('click', testConnection);

/**
 * Load saved settings from chrome.storage
 */
async function loadSettings() {
  try {
    const { notionApiKey, notionDatabaseId } = await chrome.storage.local.get([
      'notionApiKey',
      'notionDatabaseId'
    ]);

    // Don't show API key - just indicate it's configured
    if (notionApiKey) {
      apiKeyInput.placeholder = 'API key configured (leave blank to keep current)';
    }

    if (notionDatabaseId) {
      databaseIdInput.value = notionDatabaseId;
    }

    // If both are set, show success message
    if (notionApiKey && notionDatabaseId) {
      showStatus('Settings loaded successfully', 'success');
    }
  } catch (error) {
    showStatus(`Error loading settings: ${error.message}`, 'error');
  }
}

/**
 * Save settings to chrome.storage
 */
async function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  const databaseId = databaseIdInput.value.trim().replace(/-/g, '');

  // If API key is blank, check if we have one saved
  const { notionApiKey: savedApiKey } = await chrome.storage.local.get(['notionApiKey']);
  const keyToUse = apiKey || savedApiKey;

  // Basic validation
  if (!keyToUse || !databaseId) {
    showStatus('Please fill in both fields', 'error');
    return;
  }

  // Validate database ID format (32-char hex string)
  if (!/^[a-f0-9]{32}$/i.test(databaseId)) {
    showStatus('Invalid Database ID format', 'error');
    return;
  }

  showStatus('Validating credentials...', 'info');

  // Test the connection before saving
  const isValid = await testNotionConnection(keyToUse, databaseId);

  if (isValid) {
    try {
      await chrome.storage.local.set({
        notionApiKey: keyToUse,
        notionDatabaseId: databaseId
      });
      showStatus('✓ Settings saved successfully!', 'success');
      // Update placeholder after save
      apiKeyInput.value = '';
      apiKeyInput.placeholder = 'API key configured (leave blank to keep current)';
    } catch (error) {
      showStatus(`Error saving settings: ${error.message}`, 'error');
    }
  }
  // Error message already shown by testNotionConnection
}

/**
 * Test connection to Notion API
 */
async function testConnection() {
  const apiKey = apiKeyInput.value.trim();
  const databaseId = databaseIdInput.value.trim().replace(/-/g, '');

  // If API key is blank, use saved one
  const { notionApiKey: savedApiKey } = await chrome.storage.local.get(['notionApiKey']);
  const keyToUse = apiKey || savedApiKey;

  if (!keyToUse || !databaseId) {
    showStatus('Please fill in both fields first', 'error');
    return;
  }

  // Validate database ID format
  if (!/^[a-f0-9]{32}$/i.test(databaseId)) {
    showStatus('Invalid Database ID format', 'error');
    return;
  }

  showStatus('Testing connection...', 'info');

  const isValid = await testNotionConnection(keyToUse, databaseId);

  if (isValid) {
    showStatus('✓ Connection successful!', 'success');
  }
  // Error message already shown by testNotionConnection
}

/**
 * Make a test API call to Notion to validate credentials
 */
async function testNotionConnection(apiKey, databaseId) {
  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28'
      }
    });

    if (!response.ok) {
      // Don't log error details - may contain sensitive info

      // Generic error messages to prevent information disclosure
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        showStatus('❌ Invalid credentials - check API token and Database ID', 'error');
      } else {
        showStatus('❌ Connection failed - check your configuration', 'error');
      }
      return false;
    }

    return true;
  } catch (error) {
    // Don't log - may contain sensitive info
    showStatus('❌ Network error - check your internet connection', 'error');
    return false;
  }
}

/**
 * Show status message
 */
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.classList.remove('hidden');

  // Auto-hide success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.classList.add('hidden');
    }, 3000);
  }
}
