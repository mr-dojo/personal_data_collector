#!/usr/bin/env python3
"""
Personal Data Collector (PDC)
Open Source Data Sovereignty Tool

Usage: python main.py

Version: 0.2.0
"""
import argparse
import logging
import json
import os
import re
import hashlib
from datetime import datetime
from typing import List, Dict, Optional

import requests
from bs4 import BeautifulSoup
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from config import *

class PDC:
    def __init__(self, verbose=False):
        self.setup_logging(verbose)
        self.setup_directories()
        self.gmail_service = self.setup_gmail_service()
        
    def setup_logging(self, verbose):
        level = logging.DEBUG if verbose else logging.INFO
        logging.basicConfig(
            format='[%(levelname)s] %(message)s',
            level=level
        )
        self.logger = logging.getLogger('PDC')
        
    def setup_directories(self):
        """Create necessary directories"""
        os.makedirs(DATA_DIR, exist_ok=True)
        
    def setup_gmail_service(self):
        """Set up Gmail API service"""
        creds = None
        
        if os.path.exists(TOKEN_FILE):
            creds = Credentials.from_authorized_user_file(TOKEN_FILE, GMAIL_SCOPES)
            
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists(CREDENTIALS_FILE):
                    self.logger.error(f"Missing {CREDENTIALS_FILE}")
                    self.logger.info("📋 Get credentials: https://console.cloud.google.com/")
                    return None
                    
                flow = InstalledAppFlow.from_client_secrets_file(
                    CREDENTIALS_FILE, GMAIL_SCOPES)
                creds = flow.run_local_server(port=0)
                
            with open(TOKEN_FILE, 'w') as token:
                token.write(creds.to_json())
                
        return build('gmail', 'v1', credentials=creds)
    
    def get_pdc_emails(self) -> List[Dict]:
        """Get unread emails with PDC in subject"""
        if not self.gmail_service:
            return []
            
        try:
            # Search for unread emails with PDC in subject
            query = f'is:unread subject:"{PDC_SUBJECT_FILTER}"'
            results = self.gmail_service.users().messages().list(
                userId='me', q=query, maxResults=10
            ).execute()
            
            messages = results.get('messages', [])
            emails = []
            
            for message in messages:
                msg = self.gmail_service.users().messages().get(
                    userId='me', id=message['id']
                ).execute()
                
                email_data = self.parse_email(msg)
                if email_data:
                    emails.append(email_data)
                    
            return emails
            
        except Exception as e:
            self.logger.error(f"Gmail error: {e}")
            return []
    
    def parse_email(self, message) -> Optional[Dict]:
        """Parse Gmail message into structured data"""
        headers = message['payload'].get('headers', [])
        
        subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
        sender = next((h['value'] for h in headers if h['name'] == 'From'), '')
        date_received = next((h['value'] for h in headers if h['name'] == 'Date'), '')
        
        # Extract email body
        body = self.extract_email_body(message['payload'])
        
        return {
            'id': message['id'],
            'subject': subject,
            'sender': sender,
            'date_received': date_received,
            'body': body,
            'urls': self.extract_urls(body)
        }
    
    def extract_email_body(self, payload) -> str:
        """Extract text content from email payload"""
        body = ""
        
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body'].get('data', '')
                    if data:
                        import base64
                        body += base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
        else:
            if payload['mimeType'] == 'text/plain':
                data = payload['body'].get('data', '')
                if data:
                    import base64
                    body += base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                    
        return body.strip()
    
    def extract_urls(self, text: str) -> List[str]:
        """Extract URLs from text"""
        url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        return re.findall(url_pattern, text)
    
    def scrape_url(self, url: str) -> Optional[Dict]:
        """Scrape content from URL"""
        try:
            headers = {'User-Agent': USER_AGENT}
            response = requests.get(url, headers=headers, timeout=TIMEOUT)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.extract()
            
            # Get title
            title = soup.find('title')
            title_text = title.get_text().strip() if title else url
            
            # Get main content
            content = soup.get_text()
            lines = (line.strip() for line in content.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            content = ' '.join(chunk for chunk in chunks if chunk)
            
            return {
                'url': url,
                'title': title_text,
                'content': content[:5000],  # Limit content length
                'scraped_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Scraping failed for {url}: {e}")
            return None
    
    def content_hash(self, data: Dict) -> str:
        """Generate a hash for deduplication based on title+content"""
        content_str = f"{data.get('title', '')}{data.get('content', '')}"
        return hashlib.md5(content_str.encode()).hexdigest()
    
    def save_to_knowledge_base(self, data: Dict):
        """Save data to local knowledge base with deduplication"""
        # Create unique ID
        content_hash = self.content_hash(data)
        record = {
            'id': f"{data['source_type']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{content_hash[:8]}",
            'title': data.get('title', 'Untitled'),
            'content': data.get('content', ''),
            'source_type': data['source_type'],
            'source_url': data.get('source_url', ''),
            'date_captured': datetime.now().isoformat(),
            'email_sender': data.get('email_sender', ''),
            'metadata': data.get('metadata', {})
        }
        # Load existing knowledge base
        knowledge_base = []
        if os.path.exists(KNOWLEDGE_BASE_FILE):
            try:
                with open(KNOWLEDGE_BASE_FILE, 'r', encoding='utf-8') as f:
                    knowledge_base = json.load(f)
            except Exception as e:
                self.logger.warning(f"Failed to load knowledge base: {e}")
                knowledge_base = []
        # Deduplication check
        for rec in knowledge_base:
            if self.content_hash(rec) == content_hash:
                self.logger.info(f"Duplicate detected, skipping: {record['title'][:50]}...")
                return None
        # Add new record
        knowledge_base.append(record)
        # Save updated knowledge base
        try:
            with open(KNOWLEDGE_BASE_FILE, 'w', encoding='utf-8') as f:
                json.dump(knowledge_base, f, indent=2, ensure_ascii=False)
            self.logger.info(f"Saved: {record['title'][:50]}...")
        except Exception as e:
            self.logger.error(f"Failed to save knowledge base: {e}")
        return record['id']
    
    def process_emails(self):
        """Main processing loop"""
        self.logger.info("Starting PDC - Personal Data Collector")
        self.logger.info("📧 Checking for PDC emails...")
        
        emails = self.get_pdc_emails()
        if not emails:
            self.logger.info("📬 No PDC emails found")
            return
            
        self.logger.info(f"📬 Found {len(emails)} PDC email(s)")
        
        for email in emails:
            self.logger.info(f"\n📧 Processing: {email['subject']}")
            
            # Process URLs in email
            if email['urls']:
                for url in email['urls']:
                    self.logger.info(f"🌐 Scraping: {url}")
                    scraped_content = self.scrape_url(url)
                    
                    if scraped_content:
                        data = {
                            'title': scraped_content['title'],
                            'content': scraped_content['content'],
                            'source_type': 'url',
                            'source_url': url,
                            'email_sender': email['sender'],
                            'metadata': {
                                'email_subject': email['subject'],
                                'email_id': email['id']
                            }
                        }
                        self.save_to_knowledge_base(data)
            
            # Process email content directly if no URLs
            else:
                data = {
                    'title': email['subject'].replace(PDC_SUBJECT_FILTER, '').strip() or 'Email Content',
                    'content': email['body'],
                    'source_type': 'email',
                    'email_sender': email['sender'],
                    'metadata': {
                        'email_id': email['id'],
                        'date_received': email['date_received']
                    }
                }
                self.save_to_knowledge_base(data)
            
        self.logger.info(f"\n✅ Processed {len(emails)} emails")
        self.logger.info(f"📁 Knowledge base: {KNOWLEDGE_BASE_FILE}")

    def export_content(self, fmt: str):
        """Export knowledge base in the requested format (md, txt, json)"""
        if not os.path.exists(KNOWLEDGE_BASE_FILE):
            self.logger.error("Knowledge base not found.")
            return
        try:
            with open(KNOWLEDGE_BASE_FILE, 'r', encoding='utf-8') as f:
                knowledge_base = json.load(f)
        except Exception as e:
            self.logger.error(f"Failed to load knowledge base: {e}")
            return
        if fmt == 'json':
            print(json.dumps(knowledge_base, indent=2, ensure_ascii=False))
        elif fmt == 'txt':
            for rec in knowledge_base:
                print(f"Title: {rec['title']}\nContent: {rec['content']}\n{'-'*40}")
        elif fmt == 'md':
            for rec in knowledge_base:
                print(f"## {rec['title']}\n\n{rec['content']}\n\n---\n")
        else:
            self.logger.error(f"Unknown export format: {fmt}")

def main():
    parser = argparse.ArgumentParser(description="Personal Data Collector (PDC)")
    parser.add_argument('--export', choices=['md', 'txt', 'json'], help='Export knowledge base in specified format')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
    args = parser.parse_args()

    pdc = PDC(verbose=args.verbose)

    if args.export:
        pdc.export_content(args.export)
    else:
        pdc.process_emails()

if __name__ == "__main__":
    main()