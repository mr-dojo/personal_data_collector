# Personal Data Collector - Chrome Extension

Dead-simple browser extension that saves clipboard content directly to your Notion PDC database for enrichment.

## Features

- **One-click save**: Copy text → Click extension → Saved to Notion
- **Secure storage**: API credentials encrypted in Chrome's local storage
- **Zero complexity**: No backend needed - just extension → Notion API
- **Simple & lightweight**: Minimal dependencies and straightforward setup

## Setup Instructions

### 1. Create Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Click **"+ New integration"**
3. Name: `PDC Browser Extension`
4. Select your workspace
5. Capabilities: Read, Update, Insert content
6. Copy the **Internal Integration Token** (starts with `secret_`)

### 2. Connect Integration to Database

1. Open your PDC database in Notion
2. Click the **"..."** menu (top right)
3. Click **"Add connections"**
4. Select **"PDC Browser Extension"**

### 3. Get Database ID

Your database URL looks like:
```
https://notion.so/workspace/abc123def456?v=...
                          ^^^^^^^^^^^^
                          This is your Database ID
```

Copy the ID between the last `/` and the `?`

### 4. Install Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **"Load unpacked"**
4. Select this `extension` folder
5. Extension should now appear in your toolbar

### 5. Configure Extension

1. Click the PDC extension icon
2. You'll see "Setup Required"
3. Click **"Open Settings"**
4. Paste your **API Token** and **Database ID**
5. Click **"Test Connection"** to verify
6. Click **"Save Settings"**

## Usage

1. Copy any text (Cmd+C / Ctrl+C)
2. Click the PDC extension icon
3. Click **"Save Clipboard to PDC"**
4. Done! ✓ Content saved to your database

## Requirements

Your Notion database must have a **Content** property (type: Rich Text).

That's the only required field for the basic setup.

## Troubleshooting

**"Invalid API key" error**
- Check that your token starts with `secret_`
- Verify the integration is connected to your database in Notion

**"Database not found" error**
- Double-check the Database ID from your URL
- Make sure the integration has access to the database

**"Clipboard is empty" error**
- Copy some text first before clicking save

**Extension doesn't appear after installing**
- Refresh the extensions page (`chrome://extensions`)
- Make sure Developer mode is enabled

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

## Security

- API credentials are stored in Chrome's encrypted `storage.local`
- Only your extension can access the stored credentials
- Credentials never leave your machine except in HTTPS requests to Notion
- Follow least-privilege: scope integration to only your PDC database

## Version

**v2.0.0** - Simplified Notion-first architecture

---

Built with ❤️ for data sovereignty
