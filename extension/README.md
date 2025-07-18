# Personal Data Collector - Browser Extension

Easy In, Easy Out - Collect your personal data with one click directly from your browser.

## Overview

The PDC Browser Extension helps you collect and leverage your thoughts, things you read, things you want, meeting/call transcripts YOUR future use:

- **One-click capture** directly from any webpage
- **Zero configuration** - install and start collecting immediately  
- **Local storage** - your data stays in your browser, under your control
- **Instant export** - get your data in Markdown, Text, or JSON format
- **Smart deduplication** - automatically prevents saving the same content twice

## Installation

### From Source (Developer Mode)

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `extension` folder
5. The PDC icon should appear in your toolbar

### From Chrome Web Store (Coming Soon)

The extension will be available on the Chrome Web Store once the initial release is complete.

## Usage

### Capturing Content

1. Navigate to any webpage you want to save
2. Click the PDC extension icon in your toolbar
3. (Optional) Add a custom title in the text field
4. Click "Capture This Page"
5. The page content is instantly saved to local storage

### Viewing Your Data

The popup shows your collection statistics:
- Total number of captured items
- Storage space used
- Real-time updates as you capture content

### Exporting Your Data

Click any export button to download your entire collection:

- **Markdown** - Perfect for AI tools like Claude or ChatGPT
- **Text** - Human-readable format for notes and research
- **JSON** - Programmatic access for custom tools

## Technical Details

### Architecture

- **Manifest V3** compatible for future-proofing
- **Content Script** extracts clean content from web pages
- **Background Script** handles storage and deduplication
- **Popup Interface** provides user controls and export functions

### Storage

- Uses Chrome's `storage.local` API for persistence
- Content is automatically deduplicated using content hashes
- No external servers or cloud dependencies
- Maximum 1000 items stored (oldest removed automatically)

### Content Extraction

The extension intelligently extracts content using:

1. Semantic HTML elements (`<article>`, `<main>`, etc.)
2. Common content class names (`.content`, `.post-content`, etc.)
3. Paragraph clustering for sites without semantic markup
4. Metadata extraction (title, description, publish date)

### Permissions

- `activeTab` - Access the current tab for content extraction
- `storage` - Save captured content locally

## File Structure

```
extension/
├── manifest.json          # Extension configuration
├── popup/
│   ├── popup.html        # User interface
│   └── popup.js          # UI logic and export functions
├── content/
│   └── content.js        # Page content extraction
├── background/
│   └── background.js     # Storage and background processing
└── icons/
    └── *.png            # Extension icons (16, 32, 48, 128px)
```

## Development

### Local Development

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the PDC extension card
4. Test your changes

### Building for Production

The extension is built with vanilla JavaScript, HTML, and CSS - no build process required.

Before publishing:
1. Replace placeholder icons with proper PNG files
2. Update version in `manifest.json`
3. Test on multiple websites and browsers

## Compatibility

- **Chrome** 88+ (Manifest V3 support)
- **Edge** 88+
- **Brave** (Chromium-based versions)
- **Other Chromium browsers** with Manifest V3 support

## Privacy & Security

- All data stays local in your browser
- No network requests or external dependencies
- No user tracking or analytics
- Open source for complete transparency

## Contributing

This extension follows the same "Easy In, Easy Out" philosophy as the original PDC:

- Keep the codebase simple and readable
- Minimize dependencies and complexity
- Prioritize user control and data ownership
- Maintain backward compatibility when possible

## License

MIT - Your data, your rules.
