import re
import logging
import asyncio
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from app.config import settings
from app.collector.parser import parse_submission_count

logger = logging.getLogger(__name__)


class SIH2026Source:
    """Source handler for SIH 2026 Problem Statements page.

    Uses Playwright headless Chromium to fetch the page, which executes
    JavaScript and passes Cloudflare's browser integrity checks.
    """

    BASE_URL = settings.SIH_SOURCE_URL

    def fetch_page(self) -> str:
        """Fetch the SIH page HTML using Playwright headless Chromium.

        Playwright runs a real Chrome browser that executes JavaScript and
        passes Cloudflare's bot protection (JS challenge, browser integrity).
        Returns the full rendered HTML of the page.
        """
        return asyncio.run(self._fetch_with_playwright())

    async def _fetch_with_playwright(self) -> str:
        """Async inner method that launches Playwright and fetches the page."""
        from playwright.async_api import async_playwright

        logger.info(f"Launching headless Chromium to fetch: {self.BASE_URL}")

        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                ],
            )

            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                locale="en-US",
                viewport={"width": 1280, "height": 900},
            )

            page = await context.new_page()

            response = await page.goto(
                self.BASE_URL,
                wait_until="networkidle",
                timeout=60000,
            )

            if response is None or response.status >= 400:
                status = response.status if response else "unknown"
                await browser.close()
                raise RuntimeError(
                    f"Playwright fetch failed — HTTP {status} from {self.BASE_URL}"
                )

            html = await page.content()
            await browser.close()

            logger.info(
                f"Playwright fetch succeeded — {len(html):,} bytes received"
            )
            return html

    def parse(self, html: str) -> List[Dict[str, Any]]:
        """Parse the rendered HTML and extract PS submission data."""
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table", id="dataTablePS")
        if not table:
            raise RuntimeError(
                "SOURCE_SCHEMA_CHANGED: table#dataTablePS not found"
            )

        tbody = table.find("tbody")
        if not tbody:
            raise RuntimeError(
                "SOURCE_SCHEMA_CHANGED: tbody not found in table#dataTablePS"
            )

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

            match = ps_id_pattern.match(ps_id_raw)
            if not match:
                continue

            ps_id = match.group(0)
            count_data = parse_submission_count(raw_count)

            results.append(
                {
                    "ps_id": ps_id,
                    "title": title,
                    "category": category,
                    "theme": theme,
                    "deadline": deadline,
                    "count": count_data["count"],
                    "capacity": count_data["capacity"],
                    "raw": count_data["raw"],
                }
            )

        return results

    def fetch_all(self) -> List[Dict[str, Any]]:
        """Fetch and parse all PS data from the SIH source."""
        html = self.fetch_page()
        return self.parse(html)
