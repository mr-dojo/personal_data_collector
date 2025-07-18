# PDC Constraints

## Easy In, Easy Out Principles
- Import: Frictionless collection from any source
- Export: On-demand formats (MD/TXT/JSON) for any use case
- Storage: JSON = single source of truth, transparent and readable
- Workflow: Obvious commands, predictable results

## Non-Negotiables
- No cloud dependencies (your data, your hardware)
- No external databases (local JSON only)
- No complex frameworks (stdlib + minimal deps)
- No hidden processes (everything observable and transparent)
- Zero configuration for new users
- Sub-400 lines total codebase

## Dependencies - Keep Minimal
- Gmail API: Required for email monitoring
- requests + beautifulsoup4: Required for scraping
- python-dotenv: Configuration only
- argparse + logging: stdlib only

## Architecture Boundaries
- Storage: Single knowledge_base.json (structured, readable)
- Import: Multiple pathways (email, future: clipboard, browser)
- Export: On-demand CLI flags (--export md/txt/json)
- Processing: Transparent, no black boxes
- Deduplication: Content hashing, fail gracefully if collision

## Failure Modes to Avoid
- Import friction (complicated setup, unclear workflows)
- Export friction (hard to get data out, unreadable formats)
- Silent processes (everything should be observable)
- Dependency creep (justify every new import)
- Complex categorization (start simple, add when needed)