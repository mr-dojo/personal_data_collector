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

  showStatus('Validating credentials...', 'info');

  // Test the connection before saving
  const result = await testNotionConnection(apiKey, databaseId);

  if (result.success) {
    try {
      await chrome.storage.local.set({
        notionApiKey: apiKey,
        notionDatabaseId: databaseId
      });
      showStatus('✓ Settings saved successfully!', 'success');
    } catch (error) {
      showStatus(`Error saving settings: ${error.message}`, 'error');
    }
  } else {
    showStatus(result.error || 'Invalid credentials. Please check your API key and Database ID.', 'error');
  }
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

  const result = await testNotionConnection(apiKey, databaseId);

  if (result.success) {
    showStatus('✓ Connection successful!', 'success');
  } else {
    showStatus(result.error || 'Connection failed. Please check your credentials.', 'error');
  }
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

      if (response.status === 401) {
        return { success: false, error: 'Invalid API key (401). Check your token.' };
      } else if (response.status === 404) {
        return { success: false, error: 'Database not found (404). Ensure the integration is added to this specific database.' };
      } else {
        return { success: false, error: `Notion API error: ${response.status}` };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Connection test failed:', error);
    return { success: false, error: `Network error: ${error.message}` };
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
