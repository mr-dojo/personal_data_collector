Personal Data Collector (PDC)
Easy In, Easy Out - Open source tool for personal data sovereignty
Why PDC?
Everyone else is using your data (Google, Meta, OpenAI) while you get nothing back. PDC flips this: collect YOUR data, export it instantly, use it on YOUR terms.
Core Philosophy

Easy Import: Frictionless collection from any source
Easy Export: Instant access in multiple formats (MD/TXT/JSON)
Simplicity: Zero-config setup, obvious workflows
Transparency: No black boxes, readable storage

Features

📧 Gmail integration with "PDC" subject filtering
🌐 Automatic web scraping for URLs in emails
📤 Flexible export system (Markdown, text, JSON)
🔄 Content deduplication via hashing
💾 Local JSON storage (no cloud dependencies)
🔒 Complete data ownership
🪶 Lightweight (~300 lines of code)

Quick Start

Install dependencies:
bashpip install -r requirements.txt

Get Gmail credentials:

Go to Google Cloud Console
Enable Gmail API
Download credentials as credentials.json


Collect data:
bashcdpython main.py                    # Process PDC emails
python main.py --verbose          # With detailed logging

Export your data:
bashpython main.py --export md        # Markdown (great for AI tools)
python main.py --export txt       # Plain text (human readable)
python main.py --export json      # JSON (programmatic use)


How It Works

Send yourself emails with "PDC: Your Title Here" in the subject line
Include URLs in the email body - PDC automatically scrapes them
OR just include text - PDC saves the email content directly
The title after "PDC:" becomes the saved content title
Export anytime in the format you need

Example Workflow
bash# Email yourself: "PDC: Interesting React Tips" with URL in body
# OR: "PDC: My Project Ideas" with just text in body
python main.py                      # Collects and saves content

# Later, export for AI analysis:
python main.py --export md > my_research.md
# Copy/paste into Claude, ChatGPT, etc.
Data Sovereignty

Your data stays on YOUR computer - no corporate servers
Transparent storage - readable JSON you can inspect
Easy export - get your data out anytime, any format
No vendor lock-in - simple formats work everywhere

File Structure
pdc/
├── main.py              # Core PDC logic
├── config.py            # Simple configuration
├── credentials.json     # Your Gmail API credentials
├── requirements.txt     # Minimal dependencies
└── data/
    └── knowledge_base.json  # Your collected data
License
MIT - Build whatever you want with this. Your data, your rules.