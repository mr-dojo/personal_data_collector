// DOM elements
const setupRequired = document.getElementById('setupRequired');
const mainInterface = document.getElementById('mainInterface');
const loading = document.getElementById('loading');
const saveBtn = document.getElementById('saveBtn');
const openSettings = document.getElementById('openSettings');
const settingsIcon = document.getElementById('settingsIcon');
const statusDiv = document.getElementById('status');

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

// Event listeners
saveBtn?.addEventListener('click', handleSave);
openSettings?.addEventListener('click', () => chrome.runtime.openOptionsPage());
settingsIcon?.addEventListener('click', () => chrome.runtime.openOptionsPage());

/**
 * Initialize popup - check if credentials are configured
 */
async function init() {
  try {
    const { notionApiKey, notionDatabaseId } = await chrome.storage.local.get([
      'notionApiKey',
      'notionDatabaseId'
    ]);

    // Hide loading
    loading.classList.add('hidden');

    // Check if both credentials are set
    if (notionApiKey && notionDatabaseId) {
      // Show main interface
      mainInterface.classList.remove('hidden');
    } else {
      // Show setup required
      setupRequired.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Initialization error:', error);
    loading.classList.add('hidden');
    setupRequired.classList.remove('hidden');
  }
}

/**
 * Handle save button click
 */
async function handleSave() {
  // Disable button during save
  saveBtn.disabled = true;
  saveBtn.style.opacity = '0.6';
  saveBtn.style.cursor = 'not-allowed';

  showStatus('Reading clipboard...', 'info');

  try {
    // Read clipboard
    const clipboardText = await navigator.clipboard.readText();

    if (!clipboardText || clipboardText.trim() === '') {
      showStatus('Clipboard is empty', 'error');
      return;
    }

    showStatus('Saving to Notion...', 'info');

    // Save to Notion
    await saveToNotion(clipboardText);

    showStatus('✓ Saved! Enrichment will complete in ~60s', 'success');

    // Auto-hide success message after 3 seconds
    setTimeout(() => {
      statusDiv.classList.add('hidden');
    }, 3000);

  } catch (error) {
    console.error('Save error:', error);
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    // Re-enable button
    saveBtn.disabled = false;
    saveBtn.style.opacity = '1';
    saveBtn.style.cursor = 'pointer';
  }
}

/**
 * Save content to Notion database
 */
async function saveToNotion(content) {
  // Get credentials
  const { notionApiKey, notionDatabaseId } = await chrome.storage.local.get([
    'notionApiKey',
    'notionDatabaseId'
  ]);

  if (!notionApiKey || !notionDatabaseId) {
    throw new Error('Notion credentials not configured');
  }

  // Prepare Notion page content
  const pageData = {
    parent: {
      database_id: notionDatabaseId
    },
    properties: {
      // Only the Content property - let n8n enrichment handle the rest
      Content: {
        rich_text: [
          {
            text: {
              content: content.substring(0, 2000) // Notion limit for rich text
            }
          }
        ]
      }
    }
  };

  // If content is longer than 2000 chars, add it as page content blocks
  if (content.length > 2000) {
    pageData.children = createContentBlocks(content);
  }

  // Make API call
  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionApiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(pageData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Notion API error:', response.status, errorText);

    // Parse error for user-friendly message
    if (response.status === 401) {
      throw new Error('Invalid API key');
    } else if (response.status === 404) {
      throw new Error('Database not found - check Database ID');
    } else {
      throw new Error(`Notion API error: ${response.status}`);
    }
  }

  const result = await response.json();
  console.log('Saved to Notion:', result.id);
  return result;
}

/**
 * Create Notion content blocks for long text
 * Splits content into 2000-char chunks (Notion's block limit)
 */
function createContentBlocks(content) {
  const blocks = [];
  const chunkSize = 2000;

  for (let i = 0; i < content.length; i += chunkSize) {
    const chunk = content.substring(i, i + chunkSize);
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: { content: chunk }
          }
        ]
      }
    });
  }

  return blocks;
}

/**
 * Show status message
 */
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.classList.remove('hidden');
}
