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

    if (notionApiKey) {
      apiKeyInput.value = notionApiKey;
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
  const databaseId = databaseIdInput.value.trim();

  // Basic validation
  if (!apiKey || !databaseId) {
    showStatus('Please fill in both fields', 'error');
    return;
  }

  // Remove format check - let Notion API validate the token
  showStatus('Validating credentials...', 'info');

  // Test the connection before saving
  const isValid = await testNotionConnection(apiKey, databaseId);

  if (isValid) {
    try {
      await chrome.storage.local.set({
        notionApiKey: apiKey,
        notionDatabaseId: databaseId
      });
      showStatus('✓ Settings saved successfully!', 'success');
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
  const databaseId = databaseIdInput.value.trim();

  if (!apiKey || !databaseId) {
    showStatus('Please fill in both fields first', 'error');
    return;
  }

  showStatus('Testing connection...', 'info');

  const isValid = await testNotionConnection(apiKey, databaseId);

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
      const errorText = await response.text();
      console.error('Notion API error:', response.status, errorText);

      // Show more helpful error messages
      if (response.status === 401) {
        showStatus('❌ Invalid API token - check your integration token', 'error');
      } else if (response.status === 404) {
        showStatus('❌ Database not found - check Database ID and integration access', 'error');
      } else if (response.status === 403) {
        showStatus('❌ Access denied - make sure integration is connected to the database', 'error');
      } else {
        showStatus(`❌ Notion API error: ${response.status}`, 'error');
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('Connection test failed:', error);
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
