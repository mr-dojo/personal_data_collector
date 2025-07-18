chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'storeContent') {
    storeContent(request.data).then(result => {
      sendResponse(result);
    }).catch(error => {
      console.error('Storage error:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});

async function storeContent(newContent) {
  try {
    const result = await chrome.storage.local.get(['pdcData']);
    let data = result.pdcData || [];
    
    const isDuplicate = data.some(item => item.hash === newContent.hash);
    
    if (isDuplicate) {
      return { success: true, duplicate: true };
    }
    
    data.unshift(newContent);
    
    const maxItems = 1000;
    if (data.length > maxItems) {
      data = data.slice(0, maxItems);
    }
    
    await chrome.storage.local.set({ pdcData: data });
    
    return { success: true, duplicate: false };
    
  } catch (error) {
    console.error('Failed to store content:', error);
    throw error;
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    initializeStorage();
  } else if (details.reason === 'update') {
    migrateData();
  }
});

async function initializeStorage() {
  try {
    const result = await chrome.storage.local.get(['pdcData']);
    if (!result.pdcData) {
      await chrome.storage.local.set({ pdcData: [] });
    }
  } catch (error) {
    console.error('Failed to initialize storage:', error);
  }
}

async function migrateData() {
  try {
    const result = await chrome.storage.local.get(['pdcData']);
    const data = result.pdcData || [];
    
    let migrated = false;
    
    const updatedData = await Promise.all(data.map(async (item) => {
      if (!item.hash) {
        item.hash = await generateHash((item.content || '') + (item.url || ''));
        migrated = true;
      }
      
      if (!item.metadata) {
        item.metadata = {};
        migrated = true;
      }
      
      return item;
    }));
    
    if (migrated) {
      await chrome.storage.local.set({ pdcData: updatedData });
    }
  } catch (error) {
    console.error('Failed to migrate data:', error);
  }
}

async function generateHash(input) {
  if (!input || typeof input !== 'string') return '';
  
  try {
    // Use Web Crypto API for secure hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    const hashHex = Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Return first 12 characters for storage efficiency
    return hashHex.substring(0, 12);
  } catch (error) {
    console.error('Hash generation failed:', error);
    // Fallback to timestamp + random for uniqueness
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  // Storage monitoring for future debugging if needed
  // Removed verbose logging for production security
});

chrome.action.onClicked.addListener((tab) => {
  chrome.action.openPopup();
});