import requests
import re
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from app.config import settings
from app.collector.parser import parse_submission_count

import logging

logger = logging.getLogger(__name__)

try:
    from curl_cffi import requests as curl_requests
    HAS_CURL_CFFI = True
except ImportError:
    HAS_CURL_CFFI = False

try:
    import cloudscraper
    HAS_CLOUDSCRAPER = True
except ImportError:
    HAS_CLOUDSCRAPER = False

class SIH2026Source:
    """Source handler for SIH 2026 Problem Statements page."""
    BASE_URL = settings.SIH_SOURCE_URL
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Sec-Ch-Ua": '"Not-A.Brand";v="99", "Chromium";v="124", "Google Chrome";v="124"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
    }
    
    def fetch_page(self) -> str:
        """Fetches the HTML page from SIH source URL.
        
        Uses Cloudflare Worker proxy as the primary fetcher when WORKER_PROXY_URL is set.
        """
        if settings.WORKER_PROXY_URL:
            url = settings.WORKER_PROXY_URL.strip()
            if not (url.startswith("http://") or url.startswith("https://")):
                url = f"https://{url}"

            headers: dict = {}
            if settings.WORKER_PROXY_SECRET:
                headers["X-Proxy-Secret"] = settings.WORKER_PROXY_SECRET

            logger.info(f"Fetching SIH page via Cloudflare Worker: {url}")
            res = requests.get(url, headers=headers, timeout=30)
            res.raise_for_status()
            logger.info("Successfully fetched SIH page via Cloudflare Worker proxy ✓")
            return res.text

        # Direct fetch fallback (for local dev/testing)
        logger.info(f"Direct fetching from SIH URL: {self.BASE_URL}")
        session = requests.Session()
        session.headers.update(self.HEADERS)
        response = session.get(self.BASE_URL, timeout=30)
        response.raise_for_status()
        return response.text
        
    def parse(self, html: str) -> List[Dict[str, Any]]:
        """Parses the HTML and extracts PS data."""
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table", id="dataTablePS")
        if not table:
            raise RuntimeError("SOURCE_SCHEMA_CHANGED: table#dataTablePS not found")
            
        tbody = table.find("tbody")
        if not tbody:
            raise RuntimeError("SOURCE_SCHEMA_CHANGED: tbody not found in table#dataTablePS")
            
        results = []
        ps_id_pattern = re.compile(r"^SIH26\d{3}$")
        
        for tr in tbody.find_all("tr"):
            cells = tr.find_all("td")
            if len(cells) < 8:
                continue
                
            title = cells[2].get_text(strip=True)
            category = cells[3].get_text(strip=True)
            ps_id_raw = cells[4].get_text(strip=True)
            raw_count = cells[5].get_text(strip=True)
            theme = cells[6].get_text(strip=True)
            deadline = cells[7].get_text(strip=True)
            
            # Use match instead of search for exact match
            match = ps_id_pattern.match(ps_id_raw)
            if not match:
                # Might be a different cell or invalid data, skip or could be logged
                continue
                
            ps_id = match.group(0)
            
            # parse count
            count_data = parse_submission_count(raw_count)
            
            results.append({
                "ps_id": ps_id,
                "title": title,
                "category": category,
                "theme": theme,
                "deadline": deadline,
                "count": count_data["count"],
                "capacity": count_data["capacity"],
                "raw": count_data["raw"]
            })
            
        return results

    def fetch_all(self) -> List[Dict[str, Any]]:
        """Fetches and parses all PS data from the source."""
        html = self.fetch_page()
        return self.parse(html)
