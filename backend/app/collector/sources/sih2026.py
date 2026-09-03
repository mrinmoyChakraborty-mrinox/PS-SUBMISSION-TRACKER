import requests
import re
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from app.config import settings
from app.collector.parser import parse_submission_count

class SIH2026Source:
    """Source handler for SIH 2026 Problem Statements page."""
    BASE_URL = settings.SIH_SOURCE_URL
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
    }
    
    def fetch_page(self) -> str:
        """Fetches the HTML page from the SIH source URL."""
        response = requests.get(self.BASE_URL, headers=self.HEADERS, timeout=30)
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
