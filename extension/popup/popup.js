document.addEventListener('DOMContentLoaded', async () => {
  const titleInput = document.getElementById('titleInput');
  const actionOverlay = document.getElementById('actionOverlay');
  const menuContainer = document.getElementById('menuContainer');
  const menuTrigger = document.getElementById('menuTrigger');
  const menuItems = document.getElementById('menuItems');
  const submitButton = document.getElementById('submitButton');
  const savePageBtn = document.getElementById('savePageBtn');
  const saveClipboardBtn = document.getElementById('saveClipboardBtn');
  const notesBtn = document.getElementById('notesBtn');
  const exportBtn = document.getElementById('exportBtn');
  const notesSection = document.getElementById('notesSection');
  const closeNotes = document.getElementById('closeNotes');
  const notesList = document.getElementById('notesList');
  const statusMessage = document.getElementById('statusMessage');

  // Focus input on load
  titleInput.focus();

  // Show menu container when input is focused or has content
  titleInput.addEventListener('focus', () => {
    menuContainer.classList.add('visible');
  });

  titleInput.addEventListener('input', () => {
    if (titleInput.value.trim()) {
      menuContainer.classList.add('visible');
    } else {
      menuContainer.classList.remove('visible');
    }
  });

  // Menu trigger functionality
  menuTrigger.addEventListener('click', () => {
    const isExpanded = menuTrigger.classList.contains('expanded');
    if (isExpanded) {
      menuTrigger.classList.remove('expanded');
      menuItems.classList.remove('visible');
    } else {
      menuTrigger.classList.add('expanded');
      menuItems.classList.add('visible');
    }
  });

  // Submit functionality
  function handleSubmit() {
    const filename = titleInput.value.trim();
    if (filename) {
      showActionOverlay(filename);
    } else {
      showStatusMessage('Please enter a filename', 'error');
    }
  }

  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      hideActionOverlay();
    }
  });

  submitButton.addEventListener('click', handleSubmit);

  // Hide action overlay when pressing Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideActionOverlay();
    }
  });

  function showActionOverlay(filename) {
    actionOverlay.classList.remove('hidden');
    actionOverlay.classList.add('visible');
    
    // Store the filename for later use
    actionOverlay.dataset.filename = filename;
  }

  function hideActionOverlay() {
    actionOverlay.classList.remove('visible');
    actionOverlay.classList.add('hidden');
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
      const customTitle = validateInput(actionOverlay.dataset.filename || titleInput.value.trim(), 200);
      
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
        
        showStatusMessage('Web page saved successfully!', 'success');
        titleInput.value = '';
        hideActionOverlay();
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
      const customTitle = validateInput(actionOverlay.dataset.filename || titleInput.value.trim(), 200);
      
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
      
      showStatusMessage('Clipboard content saved successfully!', 'success');
      titleInput.value = '';
      hideActionOverlay();
      
    } catch (error) {
      console.error('Clipboard error:', error);
      showStatusMessage('Failed to save clipboard', 'error');
    } finally {
      saveClipboardBtn.classList.remove('loading');
    }
  });

  // Export functionality
  exportBtn.addEventListener('click', async () => {
    try {
      const result = await chrome.storage.local.get(['pdcData']);
      const data = result.pdcData || [];
      
      if (data.length === 0) {
        showStatusMessage('No notes to export', 'error');
        closeMenu();
        return;
      }
      
      // Export as JSON by default
      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        itemCount: data.length,
        items: data
      };
      
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const a = document.createElement('a');
      a.href = url;
      a.download = `notes-export-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showStatusMessage(`Exported ${data.length} notes!`, 'success');
      closeMenu();
      
    } catch (error) {
      console.error('Export error:', error);
      showStatusMessage('Failed to export notes', 'error');
    }
  });

  // Notes functionality
  notesBtn.addEventListener('click', () => {
    showNotesSection();
    closeMenu();
  });

  closeNotes.addEventListener('click', () => {
    hideNotesSection();
  });

  function closeMenu() {
    menuTrigger.classList.remove('expanded');
    menuItems.classList.remove('visible');
  }

  function showNotesSection() {
    document.body.classList.add('expanded');
    notesSection.classList.add('expanded');
    loadNotes();
  }

  function hideNotesSection() {
    notesSection.classList.add('collapsing');
    setTimeout(() => {
      notesSection.classList.remove('expanded', 'collapsing');
      document.body.classList.remove('expanded');
    }, 500);
  }

  async function loadNotes() {
    try {
      const result = await chrome.storage.local.get(['pdcData']);
      const data = result.pdcData || [];
      
      if (data.length === 0) {
        notesList.innerHTML = '<div class="empty-notes">No notes yet. Create your first note!</div>';
        return;
      }
      
      const notesHTML = data.map((note, index) => `
        <div class="note-item" data-index="${index}">
          <div class="note-title">${sanitizeText(note.title || 'Untitled')}</div>
          <div class="note-content">${sanitizeText((note.content || '').substring(0, 150))}${note.content && note.content.length > 150 ? '...' : ''}</div>
          <div class="note-actions">
            <button class="note-action copy" onclick="copyNote(${index})">Copy</button>
            <button class="note-action delete" onclick="deleteNote(${index})">Delete</button>
          </div>
        </div>
      `).join('');
      
      notesList.innerHTML = notesHTML;
    } catch (error) {
      console.error('Error loading notes:', error);
      notesList.innerHTML = '<div class="empty-notes">Error loading notes</div>';
    }
  }

  // Make functions global for onclick handlers
  window.copyNote = async (index) => {
    try {
      const result = await chrome.storage.local.get(['pdcData']);
      const data = result.pdcData || [];
      
      if (data[index]) {
        const noteText = `${data[index].title || 'Untitled'}\n\n${data[index].content || ''}`;
        await navigator.clipboard.writeText(noteText);
        showStatusMessage('Note copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('Error copying note:', error);
      showStatusMessage('Failed to copy note', 'error');
    }
  };

  window.deleteNote = async (index) => {
    try {
      const result = await chrome.storage.local.get(['pdcData']);
      const data = result.pdcData || [];
      
      if (data[index]) {
        data.splice(index, 1);
        await chrome.storage.local.set({ pdcData: data });
        showStatusMessage('Note deleted!', 'success');
        loadNotes(); // Refresh the notes list
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      showStatusMessage('Failed to delete note', 'error');
    }
  };

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

  function sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string') return 'untitled';
    
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 100)
      .toLowerCase() || 'untitled';
  }

});