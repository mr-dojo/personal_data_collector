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

  captureBtn.addEventListener('click', async () => {
    try {
      captureBtn.disabled = true;
      captureBtn.textContent = 'Capturing...';
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const customTitle = titleInput.value.trim();
      
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
        const hadCustomTitle = customTitle.length > 0;
        titleInput.value = '';
        await updateStats();
        await loadNotes();
        
        // Start post-action naming if no custom title was provided
        if (!hadCustomTitle) {
          startPostActionNaming(pageData.title, pageData.hash);
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
      
      const customTitle = titleInput.value.trim();
      const clipboardData = {
        title: customTitle || generateDefaultTitle(),
        url: 'clipboard://local',
        content: text.trim(),
        timestamp: Date.now(),
        hash: generateHash(text.trim() + 'clipboard://local'),
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
      
      // Start post-action naming if no custom title was provided
      if (!customTitle) {
        startPostActionNaming(clipboardData.title, clipboardData.hash);
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
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.classList.remove('hidden');
    
    setTimeout(() => {
      status.classList.add('hidden');
    }, 3000);
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

  function generateDefaultTitle() {
    const now = new Date();
    return `Note - ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
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
        notesList.innerHTML = '<div class="empty-notes" id="emptyNotes"><div class="empty-notes-icon">📝</div><div>No notes yet. Start capturing content!</div></div>';
        return;
      }
      
      emptyNotes.style.display = 'none';
      notesList.innerHTML = '';
      
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
    
    const title = note.title.length > 50 ? note.title.substring(0, 50) + '...' : note.title;
    const date = new Date(note.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    noteDiv.innerHTML = `
      <div class="note-header">
        <div class="note-info">
          <div class="note-title" title="${note.title}">${title}</div>
          <div class="note-date">${date}</div>
        </div>
        <div class="note-actions">
          <button class="note-btn expand-btn" onclick="toggleNoteContent(${index})">▼</button>
          <button class="note-btn copy-btn" onclick="copyNoteContent(${index})">📋</button>
        </div>
      </div>
      <div class="note-content" id="noteContent${index}">${note.content}</div>
    `;
    
    return noteDiv;
  }

  window.toggleNoteContent = function(index) {
    const content = document.getElementById(`noteContent${index}`);
    const expandBtn = content.parentElement.querySelector('.expand-btn');
    
    if (content.classList.contains('expanded')) {
      content.classList.remove('expanded');
      expandBtn.textContent = '▼';
    } else {
      content.classList.add('expanded');
      expandBtn.textContent = '▲';
    }
  };

  window.copyNoteContent = async function(index) {
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
  };

  function startPostActionNaming(defaultTitle, contentId) {
    const namingContainer = document.getElementById('postActionNaming');
    const titleInput = document.getElementById('postActionTitle');
    const timerSpan = document.getElementById('countdownTimer');
    const confirmBtn = document.getElementById('confirmNameBtn');
    
    namingContainer.classList.remove('hidden');
    titleInput.value = defaultTitle;
    titleInput.focus();
    
    let countdown = 10;
    timerSpan.textContent = `${countdown}s`;
    
    const timer = setInterval(() => {
      countdown--;
      timerSpan.textContent = `${countdown}s`;
      
      if (countdown <= 0) {
        clearInterval(timer);
        completeNaming(titleInput.value, contentId);
      }
    }, 1000);
    
    const stopTimer = () => {
      clearInterval(timer);
      timerSpan.textContent = 'Press Enter';
    };
    
    titleInput.addEventListener('input', stopTimer, { once: true });
    
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        clearInterval(timer);
        completeNaming(titleInput.value, contentId);
      }
    });
    
    confirmBtn.addEventListener('click', () => {
      clearInterval(timer);
      completeNaming(titleInput.value, contentId);
    });
  }

  function completeNaming(finalTitle, contentId) {
    chrome.storage.local.get(['pdcData'], (result) => {
      const data = result.pdcData || [];
      const itemIndex = data.findIndex(item => item.hash === contentId);
      
      if (itemIndex !== -1) {
        data[itemIndex].title = finalTitle || generateDefaultTitle();
        chrome.storage.local.set({pdcData: data});
        
        document.getElementById('postActionNaming').classList.add('hidden');
        updateStats();
        loadNotes();
        showStatus('Title updated!', 'success');
      }
    });
  }

  window.startPostActionNaming = startPostActionNaming;
});