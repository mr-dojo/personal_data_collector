chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    extractPageContent(request.customTitle).then(content => {
      sendResponse(content);
    }).catch(error => {
      console.error('Content extraction failed:', error);
      sendResponse({ error: 'Failed to extract content' });
    });
    return true; // Keep the message channel open for async response
  }
  return true;
});

async function extractPageContent(customTitle = '') {
  const title = customTitle || extractTitle() || generateDefaultTitle();
  const url = window.location.href;
  const content = extractMainContent();
  const metadata = extractMetadata();
  
  return {
    title,
    url,
    content,
    metadata,
    timestamp: Date.now(),
    hash: await generateHash(content + url)
  };
}

function generateDefaultTitle() {
  const now = new Date();
  return `Note - ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
}

function extractTitle() {
  const selectors = [
    'h1',
    '.title',
    '.post-title',
    '.article-title',
    '[property="og:title"]',
    'title'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.getAttribute('content') || element.textContent;
      if (text && text.trim()) {
        return text.trim();
      }
    }
  }
  
  return document.title || 'Untitled';
}

function extractMainContent() {
  const contentSelectors = [
    'article',
    '[role="main"]',
    '.content',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.post-body',
    '.story-body',
    'main'
  ];
  
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element && hasSignificantContent(element)) {
      return cleanContent(element.innerText);
    }
  }
  
  const fallbackContent = extractFallbackContent();
  return cleanContent(fallbackContent);
}

function extractFallbackContent() {
  const paragraphs = Array.from(document.querySelectorAll('p'))
    .filter(p => p.innerText.trim().length > 30)
    .map(p => p.innerText.trim());
    
  if (paragraphs.length > 0) {
    return paragraphs.join('\n\n');
  }
  
  const textNodes = getTextNodes(document.body)
    .filter(text => text.trim().length > 30)
    .slice(0, 20);
    
  return textNodes.join('\n\n');
}

function getTextNodes(element) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        
        const tagName = parent.tagName.toLowerCase();
        const skipTags = ['script', 'style', 'nav', 'header', 'footer', 'aside'];
        
        if (skipTags.includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        
        return node.textContent.trim().length > 0 ? 
          NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );
  
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node.textContent.trim());
  }
  
  return textNodes;
}

function hasSignificantContent(element) {
  const text = element.innerText || '';
  const words = text.trim().split(/\s+/).length;
  return words >= 50;
}

function extractMetadata() {
  const metadata = {};
  
  const metaTags = document.querySelectorAll('meta[property], meta[name]');
  metaTags.forEach(tag => {
    const property = tag.getAttribute('property') || tag.getAttribute('name');
    const content = tag.getAttribute('content');
    
    if (property && content) {
      const key = property.replace(/^og:/, '').replace(/^twitter:/, '');
      if (['title', 'description', 'author', 'site_name', 'type'].includes(key)) {
        metadata[key] = content;
      }
    }
  });
  
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) {
    metadata.canonical_url = canonicalLink.href;
  }
  
  const publishTime = document.querySelector('time[datetime], [property="article:published_time"]');
  if (publishTime) {
    metadata.published_time = publishTime.getAttribute('datetime') || publishTime.getAttribute('content');
  }
  
  return metadata;
}

function cleanContent(text) {
  if (!text || typeof text !== 'string') return '';
  
  try {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove style tags
      .substring(0, 100000);
  } catch (error) {
    console.error('Content cleaning failed:', error);
    return text.substring(0, 100000);
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