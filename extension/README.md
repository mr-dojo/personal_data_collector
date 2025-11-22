# Clipboard to Notion

A simple, secure Chrome extension that saves your clipboard content directly to any Notion database.

## What It Does

**One thing, done well**: Reads your clipboard and creates a new page in your Notion database with that content.

No assumptions. No workflows. No dependencies. Just a simple tool that connects Point A (your clipboard) to Point B (your Notion database).

## Features

- **One-click save**: Copy text → Click extension → Content saved to Notion
- **Secure**: API credentials encrypted in Chrome's local storage
- **No backend**: Direct connection to Notion API via HTTPS
- **Lightweight**: ~200 lines of code, minimal dependencies
- **Flexible**: Works with any Notion database that has a "Content" property

## Security

- API keys stored in Chrome's encrypted `storage.local` API
- Credentials never leave your machine except in HTTPS requests to Notion
- No logging of sensitive data
- Input validation on API keys and database IDs
- Minimum permissions (only clipboard read + Notion API access)

## Setup

### 1. Create a Notion Integration

1. Visit [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Name it (e.g., "Clipboard to Notion")
4. Select your workspace
5. Capabilities: Read, Update, Insert content
6. Copy the **Internal Integration Token** (starts with `secret_` or `ntn_`)

### 2. Connect Integration to Database (Crucial Step!)

1. Open your target database in Notion
2. Click **"..."** (top right)
3. Click **"Add connections"**
4. Select your integration (search for the name you gave it)

> **Note:** If you don't do this step, the extension will get a "Database not found" error.

### 3. Get Database ID

From your database URL:
```
https://notion.so/workspace/abc123def456?v=...

Copy the ID between the last `/` and the `?`

### 4. Install Extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **"Load unpacked"**
4. Select the `extension` folder
5. Extension appears in your toolbar

### 5. Configure

1. Click the extension icon
2. Click **"Open Settings"**
3. Paste your **API Token** and **Database ID**
4. Click **"Test Connection"** to verify
5. Click **"Save Settings"**

## Usage

1. Copy any text (Cmd+C / Ctrl+C)
2. Click the extension icon
3. Click **"Save Clipboard to Notion"**
4. Done

## Requirements

Your Notion database must have a **Content** property (type: Text or Rich Text).

That's it. The extension will create a new page with your clipboard content in that property.

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Invalid API key" | Verify token starts with `secret_` and integration is connected to database |
| "Database not found" | Double-check Database ID from URL |
| "Clipboard is empty" | Copy text before clicking save |

## Technical Details

**Permissions:**
- `storage` - Store API credentials locally
- `clipboardRead` - Read clipboard on user click
- `https://api.notion.com/*` - Send content to Notion

**API Calls:**
- Settings: `GET /v1/databases/{id}` to validate connection
- Save: `POST /v1/pages` to create page with clipboard content

**Content Handling:**
- First 2000 characters stored in Content property
- Additional content split into 2000-char blocks as page content
- Content sent as-is (what you copy is what gets saved)

## File Structure

```
extension/
├── manifest.json        # Extension configuration
├── popup/
│   ├── popup.html       # Main popup UI
│   ├── popup.css        # Popup styling
│   └── popup.js         # Save logic + Notion API
├── settings/
│   ├── settings.html    # Settings page UI
│   ├── settings.css     # Settings styling
│   └── settings.js      # Credential storage + validation
└── icons/               # Extension icons
```

## What This Is (and Isn't)

**This is:**
- A simple Lego block for building your own workflows
- A secure clipboard → Notion transport
- A foundation you can extend or integrate however you want

**This is not:**
- An automated workflow (you click, it saves, that's it)
- A data enrichment tool (it saves exactly what you copy)
- Tied to any specific use case (use it however you want)

## Version

**v2.0.0** - Simple, focused, secure

## License

MIT - Use it however you want

---

Built for people who want simple tools that do one thing well.
