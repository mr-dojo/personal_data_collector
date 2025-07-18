# PDC Evolution Log

## V0.1 - Foundation (Current)
- Gmail API integration with "PDC" filtering
- URL extraction and content scraping
- Single knowledge_base.json storage
- Basic error handling and logging

## V0.2 - Export System (Next)
- CLI flags: --export md/txt/json
- Content deduplication via hashing
- Enhanced logging with --verbose flag
- Preserve all existing functionality

## V0.3 - Usability (Soon)
- One-click browser bookmarklet
- Better content cleaning options
- Export filtering (--recent, --search)
- Simple backup/restore commands

## V0.4 - Context Organization (Later)
- Life domain categorization (work, family, health)
- Smart routing based on content/source
- Multiple knowledge bases with unified export
- Cross-reference detection

## Decision Points Resolved
✅ Storage: Single JSON with on-demand export
✅ Export formats: MD for AI, TXT for humans, JSON for backup
✅ Deduplication: Content hashing, not URL-based
✅ CLI approach: argparse with backward compatibility

## Decision Points Pending
- Browser integration method (bookmarklet vs extension)
- Content size limits (per-item and total)
- Categorization trigger (manual vs automatic)
- Mobile capture workflow (email vs app)

## Success Metrics
- Time from "interesting content" to "exported for AI use" < 30 seconds
- Zero data loss events
- PDC stays under 400 lines of code
- Export files are immediately usable with Claude/ChatGPT
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