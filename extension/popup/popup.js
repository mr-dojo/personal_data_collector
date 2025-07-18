document.addEventListener('DOMContentLoaded', async () => {
  const titleInput = document.getElementById('titleInput');
  const floatingActions = document.getElementById('floatingActions');
  const savePageBtn = document.getElementById('savePageBtn');
  const saveClipboardBtn = document.getElementById('saveClipboardBtn');
  const statusMessage = document.getElementById('statusMessage');

  // Focus input on load
  titleInput.focus();

  // Show floating actions when user types and presses Enter
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      showFloatingActions();
    } else if (e.key === 'Escape') {
      hideFloatingActions();
    }
  });

  // Hide floating actions when clicking outside or pressing Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideFloatingActions();
    }
  });

  function showFloatingActions() {
    floatingActions.classList.remove('hidden');
    floatingActions.classList.add('visible');
    titleInput.style.opacity = '0.3';
    titleInput.style.pointerEvents = 'none';
  }

  function hideFloatingActions() {
    floatingActions.classList.remove('visible');
    floatingActions.classList.add('hidden');
    titleInput.style.opacity = '1';
    titleInput.style.pointerEvents = 'all';
    titleInput.focus();
  }

  function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type} visible`;
    
    setTimeout(() => {
      statusMessage.classList.remove('visible');
    }, 3000);
  }

  // Save Page button functionality
  savePageBtn.addEventListener('click', async () => {
    try {
      savePageBtn.classList.add('loading');
      const customTitle = validateInput(titleInput.value.trim(), 200);
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });
      
      const contentResults = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractContent',
        customTitle: customTitle
      });
      
      if (contentResults) {
        const pageData = contentResults;
        await chrome.runtime.sendMessage({
          action: 'storeContent',
          data: pageData
        });
        
        showStatusMessage('Page saved successfully! ✨', 'success');
        titleInput.value = '';
        hideFloatingActions();
      }
    } catch (error) {
      console.error('Capture error:', error);
      showStatusMessage('Failed to save page', 'error');
    } finally {
      savePageBtn.classList.remove('loading');
    }
  });

  // Save Clipboard button functionality
  saveClipboardBtn.addEventListener('click', async () => {
    try {
      saveClipboardBtn.classList.add('loading');
      const customTitle = validateInput(titleInput.value.trim(), 200);
      
      const text = await navigator.clipboard.readText();
      
      if (!text || text.trim().length === 0) {
        showStatusMessage('Clipboard is empty', 'error');
        return;
      }
      
      const validatedContent = validateInput(text.trim(), 100000);
      
      if (!validatedContent) {
        showStatusMessage('Invalid clipboard content', 'error');
        return;
      }
      
      const clipboardData = {
        title: customTitle || generateDefaultTitle(),
        url: 'clipboard://local',
        content: validatedContent,
        timestamp: Date.now(),
        hash: await generateHash(validatedContent + 'clipboard://local'),
        metadata: {
          source: 'clipboard',
          type: 'text'
        }
      };
      
      await chrome.runtime.sendMessage({
        action: 'storeContent',
        data: clipboardData
      });
      
      showStatusMessage('Clipboard saved successfully! 📋', 'success');
      titleInput.value = '';
      hideFloatingActions();
      
    } catch (error) {
      console.error('Clipboard error:', error);
      showStatusMessage('Failed to save clipboard', 'error');
    } finally {
      saveClipboardBtn.classList.remove('loading');
    }
  });

  // Essential utility functions
  async function generateHash(input) {
    if (!input || typeof input !== 'string') return '';
    
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = new Uint8Array(hashBuffer);
      const hashHex = Array.from(hashArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      return hashHex.substring(0, 12);
    } catch (error) {
      console.error('Hash generation failed:', error);
      return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
  }

  function generateDefaultTitle() {
    const now = new Date();
    return `Note - ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  }

  function validateInput(text, maxLength = 10000) {
    if (!text || typeof text !== 'string') return '';
    
    if (text.length > maxLength) {
      text = text.substring(0, maxLength);
    }
    
    return sanitizeText(text);
  }

  function sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    
    const tempDiv = document.createElement('div');
    tempDiv.textContent = text;
    const sanitized = tempDiv.innerHTML;
    
    return sanitized
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      .trim();
  }

});