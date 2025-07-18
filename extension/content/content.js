chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    const content = extractPageContent(request.customTitle);
    sendResponse(content);
  }
  return true;
});

function extractPageContent(customTitle = '') {
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
    hash: generateHash(content + url)
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
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .substring(0, 100000);
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