import re
import logging
import asyncio
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Optional
from app.config import settings
from app.collector.parser import parse_submission_count

logger = logging.getLogger(__name__)

# Column indices in table#dataTablePS (0-based)
# Confirmed from real SIH 2026 page structure
COL_TITLE    = 2
COL_CATEGORY = 3
COL_PS_ID    = 4
COL_COUNT    = 5
COL_THEME    = 6
COL_DEADLINE = 7

PS_ID_PATTERN = re.compile(r"^SIH26\d{3}$")


class SIH2026Source:
    """Async source handler for SIH 2026 Problem Statements page.

    Uses Playwright headless Chromium as a real browser so it passes
    Cloudflare's JS integrity check.  All methods are async — call
    them with `await` from inside the running event loop; never wrap
    with asyncio.run().
    """

    BASE_URL: str = settings.SIH_SOURCE_URL

    # Shared browser instance reused across cycles to avoid repeated
    # cold-start overhead.  Managed via init_browser / close_browser.
    _browser = None
    _playwright = None

    # ── Browser lifecycle ──────────────────────────────────────────────────

    @classmethod
    async def init_browser(cls) -> None:
        """Launch a single headless Chromium instance for reuse."""
        if cls._browser is not None:
            return
        from playwright.async_api import async_playwright
        cls._playwright = await async_playwright().start()
        cls._browser = await cls._playwright.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
            ],
        )
        logger.info("Headless Chromium browser started")

    @classmethod
    async def close_browser(cls) -> None:
        """Shut down the shared browser and Playwright context."""
        if cls._browser:
            await cls._browser.close()
            cls._browser = None
        if cls._playwright:
            await cls._playwright.stop()
            cls._playwright = None
        logger.info("Headless Chromium browser closed")

    # ── Fetch ─────────────────────────────────────────────────────────────

    async def fetch_page(self) -> str:
        """Fetch the SIH page HTML using the shared headless Chromium instance.

        Waits for table#dataTablePS to appear in the DOM so we know the
        DataTable has finished rendering before we extract HTML.

        Returns the full rendered page HTML.
        Raises RuntimeError on navigation failure or bot-block detection.
        """
        if self._browser is None:
            await self.init_browser()

        logger.info(f"Fetching SIH page: {self.BASE_URL}")

        context = await self._browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            locale="en-US",
            viewport={"width": 1280, "height": 900},
        )
        page = await context.new_page()

        try:
            response = await page.goto(
                self.BASE_URL,
                wait_until="domcontentloaded",
                timeout=30_000,
            )

            status  = response.status if response else 0
            final_url = page.url

            logger.info(f"HTTP status: {status}")
            logger.info(f"Final URL:   {final_url}")

            if status >= 400:
                raise RuntimeError(
                    f"HTTP {status} from {self.BASE_URL} "
                    f"(final URL: {final_url})"
                )

            # Wait for the DataTable to render
            try:
                await page.wait_for_selector(
                    "table#dataTablePS tbody tr",
                    timeout=20_000,
                )
            except Exception:
                # Still try — page.content() may already have what we need
                logger.warning(
                    "table#dataTablePS rows not found within timeout; "
                    "proceeding with current HTML"
                )

            html = await page.content()
            title = await page.title()
            logger.info(f"Page title:  {title}")
            logger.info(f"HTML length: {len(html):,} bytes")
            return html

        finally:
            await page.close()
            await context.close()

    # ── Parse ─────────────────────────────────────────────────────────────

    def parse(self, html: str) -> List[Dict[str, Any]]:
        """Parse rendered HTML and return a list of PS dicts.

        Uses dynamic column-header detection with known-index fallback.
        Raises RuntimeError if the table is missing (bot block / schema change).
        """
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table", id="dataTablePS")
        if not table:
            raise RuntimeError(
                "SOURCE_SCHEMA_CHANGED: table#dataTablePS not found — "
                "possible bot block or page schema change"
            )

        tbody = table.find("tbody")
        if not tbody:
            raise RuntimeError(
                "SOURCE_SCHEMA_CHANGED: tbody missing from table#dataTablePS"
            )

        # Dynamic header → column index mapping (resilient to column reordering)
        col_ps_id    = COL_PS_ID
        col_count    = COL_COUNT
        col_title    = COL_TITLE
        col_category = COL_CATEGORY
        col_theme    = COL_THEME
        col_deadline = COL_DEADLINE

        thead = table.find("thead")
        if thead:
            headers = [th.get_text(strip=True).lower()
                       for th in thead.find_all("th")]
            for i, h in enumerate(headers):
                if "ps number" in h or "ps no" in h or "ps id" in h:
                    col_ps_id = i
                elif "submitted idea" in h or "submissions" in h or "submitted count" in h:
                    col_count = i
                elif "title" in h or "problem statement title" in h:
                    col_title = i
                elif "category" in h:
                    col_category = i
                elif "theme" in h:
                    col_theme = i
                elif "deadline" in h or "last date" in h:
                    col_deadline = i

        results: List[Dict[str, Any]] = []
        min_cols = max(col_ps_id, col_count, col_title,
                       col_category, col_theme, col_deadline) + 1

        for tr in tbody.find_all("tr", recursive=False):
            cells = tr.find_all("td", recursive=False)
            if len(cells) < min_cols:
                continue

            ps_id_raw = cells[col_ps_id].get_text(strip=True)
            if not PS_ID_PATTERN.match(ps_id_raw):
                continue

            ps_id     = ps_id_raw
            raw_count = cells[col_count].get_text(strip=True)
            title_val = cells[col_title].get_text(strip=True)
            category  = cells[col_category].get_text(strip=True)
            theme     = cells[col_theme].get_text(strip=True)
            deadline  = cells[col_deadline].get_text(strip=True)

            try:
                count_data = parse_submission_count(raw_count)
            except ValueError as exc:
                logger.warning(f"Skipping {ps_id}: bad count {raw_count!r}: {exc}")
                continue

            results.append({
                "ps_id":    ps_id,
                "title":    title_val,
                "category": category,
                "theme":    theme,
                "deadline": deadline,
                "count":    count_data["count"],
                "capacity": count_data["capacity"],
                "raw":      count_data["raw"],
            })

        row_count = len(results)
        logger.info(f"SIH table found: true | Rows parsed: {row_count}")
        if results:
            s = results[0]
            logger.info(f"Sample: {s['ps_id']} -> {s['raw']}")

        return results

    # ── Public entry point ────────────────────────────────────────────────

    async def fetch_all(self) -> List[Dict[str, Any]]:
        """Fetch the SIH page and return all parsed PS records.

        This is the primary entry point for the collector worker.
        Must be awaited — never wrapped in asyncio.run().
        """
        html = await self.fetch_page()
        return self.parse(html)

    def find_by_id(
        self,
        records: List[Dict[str, Any]],
        ps_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Return the record for a specific PS ID from an already-fetched list."""
        for r in records:
            if r["ps_id"] == ps_id:
                return r
        return None
