document.addEventListener('DOMContentLoaded', async () => {
  const captureBtn = document.getElementById('captureBtn');
  const clipboardBtn = document.getElementById('clipboardBtn');
  const titleInput = document.getElementById('titleInput');
  const exportMdBtn = document.getElementById('exportMd');
  const exportTxtBtn = document.getElementById('exportTxt');
  const exportJsonBtn = document.getElementById('exportJson');
  const status = document.getElementById('status');
  const totalItems = document.getElementById('totalItems');
  const storageUsed = document.getElementById('storageUsed');
  const notesHeader = document.getElementById('notesHeader');
  const notesToggle = document.getElementById('notesToggle');
  const notesContainer = document.getElementById('notesContainer');
  const notesList = document.getElementById('notesList');
  const emptyNotes = document.getElementById('emptyNotes');

  await updateStats();
  await loadNotes();
  
  // Force hide naming modal on startup (multiple attempts to ensure it's hidden)
  function forceHideModal() {
    const namingContainer = document.getElementById('postActionNaming');
    if (namingContainer) {
      namingContainer.classList.add('hidden');
      namingContainer.style.display = 'none';
      console.log('Modal force hidden on startup');
    } else {
      console.log('Modal container not found on startup');
    }
  }
  
  // Hide immediately and after a short delay
  forceHideModal();
  setTimeout(forceHideModal, 100);
  setTimeout(forceHideModal, 500);

  captureBtn.addEventListener('click', async () => {
    try {
      captureBtn.disabled = true;
      captureBtn.textContent = 'Capturing...';
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const customTitle = validateInput(titleInput.value.trim(), 200);
      
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
        
        showStatus('Page captured successfully!', 'success');
        const hadCustomTitle = customTitle && customTitle.length > 0;
        console.log('Capture complete - customTitle:', customTitle, 'hadCustomTitle:', hadCustomTitle);
        titleInput.value = '';
        await updateStats();
        await loadNotes();
        
        // Start post-action naming if no custom title was provided and pageData is valid
        if (!hadCustomTitle && pageData && pageData.hash && pageData.title) {
          console.log('Starting post-action naming for page capture');
          modalAllowed = true; // Allow modal to show for this action
          startPostActionNaming(pageData.title, pageData.hash);
        } else {
          console.log('Not starting post-action naming. hadCustomTitle:', hadCustomTitle, 'pageData valid:', !!(pageData && pageData.hash && pageData.title));
        }
      }
    } catch (error) {
      console.error('Capture error:', error);
      showStatus('Failed to capture page', 'error');
    } finally {
      captureBtn.disabled = false;
      captureBtn.textContent = 'Save Page';
    }
  });

  clipboardBtn.addEventListener('click', async () => {
    try {
      clipboardBtn.disabled = true;
      clipboardBtn.textContent = 'Reading...';
      
      const text = await navigator.clipboard.readText();
      
      if (!text || text.trim().length === 0) {
        showStatus('Clipboard is empty', 'error');
        return;
      }
      
      const customTitle = validateInput(titleInput.value.trim(), 200);
      const validatedContent = validateInput(text.trim(), 100000);
      
      if (!validatedContent) {
        showStatus('Invalid clipboard content', 'error');
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
      
      showStatus('Clipboard content saved!', 'success');
      titleInput.value = '';
      titleInput.focus();
      await updateStats();
      await loadNotes();
      
      // Start post-action naming if no custom title was provided and clipboardData is valid
      const hasCustomTitle = customTitle && customTitle.length > 0;
      console.log('Clipboard complete - customTitle:', customTitle, 'hasCustomTitle:', hasCustomTitle);
      if (!hasCustomTitle && clipboardData && clipboardData.hash && clipboardData.title) {
        console.log('Starting post-action naming for clipboard');
        modalAllowed = true; // Allow modal to show for this action
        startPostActionNaming(clipboardData.title, clipboardData.hash);
      } else {
        console.log('Not starting post-action naming. hasCustomTitle:', hasCustomTitle, 'clipboardData valid:', !!(clipboardData && clipboardData.hash && clipboardData.title));
      }
      
    } catch (error) {
      console.error('Clipboard error:', error);
      showStatus('Failed to read clipboard', 'error');
    } finally {
      clipboardBtn.disabled = false;
      clipboardBtn.textContent = 'Paste';
    }
  });

  notesHeader.addEventListener('click', toggleNotes);
  
  exportMdBtn.addEventListener('click', () => exportData('markdown'));
  exportTxtBtn.addEventListener('click', () => exportData('text'));
  exportJsonBtn.addEventListener('click', () => exportData('json'));

  async function updateStats() {
    try {
      const result = await chrome.storage.local.get(['pdcData']);
      const data = result.pdcData || [];
      
      totalItems.textContent = data.length;
      
      const bytesUsed = await chrome.storage.local.getBytesInUse();
      const kbUsed = Math.round(bytesUsed / 1024);
      storageUsed.textContent = `${kbUsed} KB`;
    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  }

  async function exportData(format) {
    try {
      const result = await chrome.storage.local.get(['pdcData']);
      const data = result.pdcData || [];
      
      if (data.length === 0) {
        showStatus('No data to export', 'error');
        return;
      }

      let content;
      let filename;
      let mimeType;

      switch (format) {
        case 'markdown':
          content = formatAsMarkdown(data);
          filename = 'pdc-export.md';
          mimeType = 'text/markdown';
          break;
        case 'text':
          content = formatAsText(data);
          filename = 'pdc-export.txt';
          mimeType = 'text/plain';
          break;
        case 'json':
          content = JSON.stringify(data, null, 2);
          filename = 'pdc-export.json';
          mimeType = 'application/json';
          break;
      }

      downloadFile(content, filename, mimeType);
      showStatus(`Exported ${data.length} items as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      showStatus('Export failed', 'error');
    }
  }

  function formatAsMarkdown(data) {
    return data.map(item => {
      const date = new Date(item.timestamp).toLocaleDateString();
      return `# ${item.title}\n\n**URL:** ${item.url}\n**Date:** ${date}\n\n${item.content}\n\n---\n`;
    }).join('\n');
  }

  function formatAsText(data) {
    return data.map(item => {
      const date = new Date(item.timestamp).toLocaleDateString();
      return `${item.title}\nURL: ${item.url}\nDate: ${date}\n\n${item.content}\n\n${'='.repeat(50)}\n`;
    }).join('\n');
  }

  function downloadFile(content, filename, mimeType) {
    // Validate inputs
    if (!content || typeof content !== 'string') {
      showStatus('Invalid content for download', 'error');
      return;
    }
    
    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Validate MIME type
    const allowedMimeTypes = ['text/markdown', 'text/plain', 'application/json'];
    if (!allowedMimeTypes.includes(mimeType)) {
      showStatus('Invalid file type', 'error');
      return;
    }
    
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = sanitizedFilename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      showStatus('Download failed', 'error');
    }
  }

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.classList.remove('hidden');
    
    setTimeout(() => {
      status.classList.add('hidden');
    }, 3000);
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

  function generateDefaultTitle() {
    const now = new Date();
    return `Note - ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  }

  function sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    
    // Remove any HTML tags and decode HTML entities
    const tempDiv = document.createElement('div');
    tempDiv.textContent = text;
    const sanitized = tempDiv.innerHTML;
    
    // Additional sanitization: remove potentially dangerous characters
    return sanitized
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/data:/gi, '') // Remove data: URLs
      .replace(/vbscript:/gi, '') // Remove vbscript: URLs
      .trim();
  }

  function validateInput(text, maxLength = 10000) {
    if (!text || typeof text !== 'string') return '';
    
    // Limit length to prevent storage exhaustion
    if (text.length > maxLength) {
      text = text.substring(0, maxLength);
    }
    
    return sanitizeText(text);
  }

  function toggleNotes() {
    const isCollapsed = notesContainer.classList.contains('collapsed');
    
    if (isCollapsed) {
      notesContainer.classList.remove('collapsed');
      notesToggle.classList.remove('collapsed');
      notesToggle.textContent = '▼';
    } else {
      notesContainer.classList.add('collapsed');
      notesToggle.classList.add('collapsed');
      notesToggle.textContent = '▶';
    }
  }

  async function loadNotes() {
    try {
      const result = await chrome.storage.local.get(['pdcData']);
      const data = result.pdcData || [];
      
      if (data.length === 0) {
        emptyNotes.style.display = 'block';
        // Clear existing notes safely
        while (notesList.firstChild) {
          notesList.removeChild(notesList.firstChild);
        }
        
        // Create empty state elements safely
        const emptyNotesDiv = document.createElement('div');
        emptyNotesDiv.className = 'empty-notes';
        emptyNotesDiv.id = 'emptyNotes';
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'empty-notes-icon';
        iconDiv.textContent = '📝';
        
        const textDiv = document.createElement('div');
        textDiv.textContent = 'No notes yet. Start capturing content!';
        
        emptyNotesDiv.appendChild(iconDiv);
        emptyNotesDiv.appendChild(textDiv);
        notesList.appendChild(emptyNotesDiv);
        return;
      }
      
      emptyNotes.style.display = 'none';
      // Clear existing notes safely
      while (notesList.firstChild) {
        notesList.removeChild(notesList.firstChild);
      }
      
      data.forEach((note, index) => {
        const noteElement = createNoteElement(note, index);
        notesList.appendChild(noteElement);
      });
      
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  }

  function createNoteElement(note, index) {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note-item';
    noteDiv.dataset.index = index;
    
    // Sanitize and validate inputs
    const sanitizedTitle = sanitizeText(note.title || 'Untitled');
    const sanitizedContent = sanitizeText(note.content || '');
    const title = sanitizedTitle.length > 50 ? sanitizedTitle.substring(0, 50) + '...' : sanitizedTitle;
    
    const date = new Date(note.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Create elements safely using DOM methods
    const noteHeader = document.createElement('div');
    noteHeader.className = 'note-header';
    
    const noteInfo = document.createElement('div');
    noteInfo.className = 'note-info';
    
    const noteTitleDiv = document.createElement('div');
    noteTitleDiv.className = 'note-title';
    noteTitleDiv.title = sanitizedTitle;
    noteTitleDiv.textContent = title;
    
    const noteDateDiv = document.createElement('div');
    noteDateDiv.className = 'note-date';
    noteDateDiv.textContent = date;
    
    const noteActions = document.createElement('div');
    noteActions.className = 'note-actions';
    
    const expandBtn = document.createElement('button');
    expandBtn.className = 'note-btn expand-btn';
    expandBtn.dataset.index = index;
    expandBtn.textContent = '▼';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'note-btn copy-btn';
    copyBtn.dataset.index = index;
    copyBtn.textContent = '📋';
    
    const noteContent = document.createElement('div');
    noteContent.className = 'note-content';
    noteContent.id = `noteContent${index}`;
    noteContent.textContent = sanitizedContent;
    
    // Assemble the DOM structure
    noteInfo.appendChild(noteTitleDiv);
    noteInfo.appendChild(noteDateDiv);
    noteActions.appendChild(expandBtn);
    noteActions.appendChild(copyBtn);
    noteHeader.appendChild(noteInfo);
    noteHeader.appendChild(noteActions);
    noteDiv.appendChild(noteHeader);
    noteDiv.appendChild(noteContent);
    
    // Add event listeners for this note
    expandBtn.addEventListener('click', () => toggleNoteContent(index));
    copyBtn.addEventListener('click', () => copyNoteContent(index));
    
    return noteDiv;
  }

  function toggleNoteContent(index) {
    const content = document.getElementById(`noteContent${index}`);
    const expandBtn = content.parentElement.querySelector('.expand-btn');
    
    if (content.classList.contains('expanded')) {
      content.classList.remove('expanded');
      expandBtn.textContent = '▼';
    } else {
      content.classList.add('expanded');
      expandBtn.textContent = '▲';
    }
  }

  async function copyNoteContent(index) {
    try {
      const result = await chrome.storage.local.get(['pdcData']);
      const data = result.pdcData || [];
      const note = data[index];
      
      if (note) {
        await navigator.clipboard.writeText(note.content);
        showStatus('Note copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('Failed to copy note:', error);
      showStatus('Failed to copy note', 'error');
    }
  }

  // Global variables to track modal state
  let currentNamingTimer = null;
  let namingEventListeners = [];
  let modalAllowed = false; // Flag to prevent modal from showing until explicitly allowed

  function startPostActionNaming(defaultTitle, contentId) {
    try {
      // Debug logging
      console.log('Starting post-action naming with title:', defaultTitle, 'and ID:', contentId);
      
      // Check if modal is allowed to show
      if (!modalAllowed) {
        console.log('Modal blocked - not allowed to show yet');
        return;
      }
      
      const namingContainer = document.getElementById('postActionNaming');
      const titleInput = document.getElementById('postActionTitle');
      const timerSpan = document.getElementById('countdownTimer');
      const confirmBtn = document.getElementById('confirmNameBtn');
      
      if (!namingContainer || !titleInput || !timerSpan || !confirmBtn) {
        console.error('Required DOM elements not found for post-action naming');
        return;
      }

      // Clean up any existing modal state
      hideNamingModal();
      
      namingContainer.classList.remove('hidden');
      titleInput.value = sanitizeText(defaultTitle) || '';
      
      let countdown = 10;
      timerSpan.textContent = `${countdown}s`;
      
      currentNamingTimer = setInterval(() => {
        countdown--;
        timerSpan.textContent = `${countdown}s`;
        
        if (countdown <= 0) {
          clearInterval(currentNamingTimer);
          completeNaming(titleInput.value, contentId);
        }
      }, 1000);
      
      const stopTimer = () => {
        if (currentNamingTimer) {
          clearInterval(currentNamingTimer);
          currentNamingTimer = null;
        }
        timerSpan.textContent = 'Press Enter';
      };
      
      // Input event listener
      const inputHandler = () => {
        stopTimer();
        titleInput.removeEventListener('input', inputHandler);
      };
      titleInput.addEventListener('input', inputHandler);
      namingEventListeners.push({ element: titleInput, event: 'input', handler: inputHandler });
      
      // Keydown event listener
      const keydownHandler = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          stopTimer();
          completeNaming(titleInput.value, contentId);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          hideNamingModal();
        }
      };
      titleInput.addEventListener('keydown', keydownHandler);
      namingEventListeners.push({ element: titleInput, event: 'keydown', handler: keydownHandler });
      
      // Confirm button event listener
      const confirmHandler = () => {
        stopTimer();
        completeNaming(titleInput.value, contentId);
      };
      confirmBtn.addEventListener('click', confirmHandler);
      namingEventListeners.push({ element: confirmBtn, event: 'click', handler: confirmHandler });
      
      // Modal background click to dismiss
      const modalClickHandler = (e) => {
        if (e.target === namingContainer) {
          hideNamingModal();
        }
      };
      namingContainer.addEventListener('click', modalClickHandler);
      namingEventListeners.push({ element: namingContainer, event: 'click', handler: modalClickHandler });
      
      // Focus the input after a brief delay
      setTimeout(() => {
        titleInput.focus();
        titleInput.select();
      }, 100);
      
    } catch (error) {
      console.error('Error in post-action naming:', error);
      showStatus('Naming feature unavailable', 'error');
    }
  }

  function hideNamingModal() {
    const namingContainer = document.getElementById('postActionNaming');
    if (namingContainer) {
      namingContainer.classList.add('hidden');
      namingContainer.style.display = 'none';
      console.log('Modal hidden via hideNamingModal');
    }
    
    // Clean up timer
    if (currentNamingTimer) {
      clearInterval(currentNamingTimer);
      currentNamingTimer = null;
    }
    
    // Clean up event listeners
    namingEventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    namingEventListeners = [];
    
    // Reset modal permission
    modalAllowed = false;
  }

  function completeNaming(finalTitle, contentId) {
    try {
      chrome.storage.local.get(['pdcData'], (result) => {
        try {
          const data = result.pdcData || [];
          const itemIndex = data.findIndex(item => item.hash === contentId);
          
          if (itemIndex !== -1) {
            const validatedTitle = validateInput(finalTitle, 200) || generateDefaultTitle();
            data[itemIndex].title = validatedTitle;
            
            chrome.storage.local.set({pdcData: data}, () => {
              if (chrome.runtime.lastError) {
                console.error('Storage error:', chrome.runtime.lastError);
                showStatus('Failed to update title', 'error');
                hideNamingModal();
                return;
              }
              
              hideNamingModal();
              updateStats();
              loadNotes();
              showStatus('Title updated!', 'success');
            });
          } else {
            hideNamingModal();
            showStatus('Item not found', 'error');
          }
        } catch (error) {
          console.error('Error processing naming completion:', error);
          hideNamingModal();
          showStatus('Failed to update title', 'error');
        }
      });
    } catch (error) {
      console.error('Error in complete naming:', error);
      hideNamingModal();
      showStatus('Naming update failed', 'error');
    }
  }

});