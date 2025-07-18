import os
from dotenv import load_dotenv

load_dotenv()

"""
PDC Configuration

Quick setup:
1. Get credentials.json from Google Cloud Console
2. Place in same directory as main.py
3. Run: python main.py

Export examples:
- python main.py --export md > research.md
- python main.py --export txt > notes.txt
"""

# Gmail API Configuration
GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
CREDENTIALS_FILE = 'credentials.json'
TOKEN_FILE = 'token.json'

# PDC Configuration
PDC_SUBJECT_FILTER = "PDC"
DATA_DIR = "data"
KNOWLEDGE_BASE_FILE = os.path.join(DATA_DIR, "knowledge_base.json")

# Web Scraping Configuration
USER_AGENT = "PDC-Bot/1.0 (Personal Data Collector)"
TIMEOUT = 10