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
      console.log('Duplicate content detected, skipping storage');
      return { success: true, duplicate: true };
    }
    
    data.unshift(newContent);
    
    const maxItems = 1000;
    if (data.length > maxItems) {
      data = data.slice(0, maxItems);
    }
    
    await chrome.storage.local.set({ pdcData: data });
    
    console.log('Content stored successfully:', newContent.title);
    return { success: true, duplicate: false };
    
  } catch (error) {
    console.error('Failed to store content:', error);
    throw error;
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('PDC Extension installed');
    initializeStorage();
  } else if (details.reason === 'update') {
    console.log('PDC Extension updated');
    migrateData();
  }
});

async function initializeStorage() {
  try {
    const result = await chrome.storage.local.get(['pdcData']);
    if (!result.pdcData) {
      await chrome.storage.local.set({ pdcData: [] });
      console.log('Storage initialized');
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
    
    const updatedData = data.map(item => {
      if (!item.hash) {
        item.hash = generateHash((item.content || '') + (item.url || ''));
        migrated = true;
      }
      
      if (!item.metadata) {
        item.metadata = {};
        migrated = true;
      }
      
      return item;
    });
    
    if (migrated) {
      await chrome.storage.local.set({ pdcData: updatedData });
      console.log('Data migration completed');
    }
  } catch (error) {
    console.error('Failed to migrate data:', error);
  }
}

function generateHash(input) {
  let hash = 0;
  if (input.length === 0) return hash.toString(36);
  
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.pdcData) {
    const newData = changes.pdcData.newValue || [];
    console.log(`Storage updated: ${newData.length} items stored`);
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.action.openPopup();
});