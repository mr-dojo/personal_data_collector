# PDC Evolution Log

## V0.1 - Current (Email + URL Scraping + Export)
- Gmail API integration with "PDC" filtering
- URL extraction and content scraping
- Single knowledge_base.json storage
- Content deduplication via hashing
- Export system (MD/TXT/JSON formats)
- CLI with --export flags
- Under 400 lines total

## V0.2 - Next Phase (Clipboard Integration)
- Monitor clipboard for auto-save capability
- Hotkey for manual save trigger
- Same storage format, enhanced input methods
- Keep email processing as backup method

## V0.3 - Browser Integration
- Bookmarklet for one-click web page save
- Browser extension (if needed)
- Mobile sharing capability
- Universal "save to PDC" from any context

## V0.4 - Organization (When Volume Justifies)
- Split into life domain JSON files (5-7 categories)
- Smart routing based on content/context
- Cross-domain search capability
- Maintain single-file export option

## Future Considerations
- File monitoring (PDFs, docs, images)
- Content summarization (external LLM calls)
- Simple web interface (read-only)
- Sync between devices (manual, not automatic)

## Decision Points - Deferred
- GUI vs command-line first: CLI winning
- Single vs multiple users: Single confirmed
- Raw vs processed content: Raw confirmed
- Auto vs manual categorization: Manual when needed
- Local vs cloud: Local forever

## Success Metrics
- Daily usage without friction
- Easy data export for AI context
- Zero maintenance overhead
- Content volume growth without performance issues
.gemini/context.md (Gemini CLI specific)
markdown# PDC Project Context

This is a personal data sovereignty tool focused on simplicity and local control.

## Key Principles
- Minimal viable changes only
- Observable failures (clear error messages)
- No premature optimization
- Dependencies must justify themselves

## Current Architecture
pdc/
├── main.py (core logic)
├── config.py (settings)
├── data/knowledge_base.json (storage)
└── requirements.txt (minimal deps)

## Common Tasks
- Adding new data sources (follow email pattern)
- Improving error handling (maintain current structure)
- Storage enhancements (preserve JSON format)
- Export features (new modules, don't modify core)