document.addEventListener('DOMContentLoaded', async () => {
  const captureBtn = document.getElementById('captureBtn');
  const titleInput = document.getElementById('titleInput');
  const exportMdBtn = document.getElementById('exportMd');
  const exportTxtBtn = document.getElementById('exportTxt');
  const exportJsonBtn = document.getElementById('exportJson');
  const status = document.getElementById('status');
  const totalItems = document.getElementById('totalItems');
  const storageUsed = document.getElementById('storageUsed');

  await updateStats();

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
        titleInput.value = '';
        await updateStats();
      }
    } catch (error) {
      console.error('Capture error:', error);
      showStatus('Failed to capture page', 'error');
    } finally {
      captureBtn.disabled = false;
      captureBtn.textContent = 'Capture This Page';
    }
  });

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
});