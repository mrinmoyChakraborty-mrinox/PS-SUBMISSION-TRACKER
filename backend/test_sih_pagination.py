import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = await context.new_page()
        
        print("Navigating to SIH page...")
        await page.goto("https://sih.gov.in/sih2026PS", wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_selector("table#dataTablePS tbody tr", timeout=20000)
        
        initial_rows = len(await page.query_selector_all("table#dataTablePS tbody > tr"))
        print(f"Initial DOM rows: {initial_rows}")
        
        select_elem = await page.query_selector("select[name='dataTablePS_length']")
        if select_elem:
            options = await page.eval_on_selector_all(
                "select[name='dataTablePS_length'] option",
                "els => els.map(e => ({val: e.value, text: e.textContent}))"
            )
            print(f"Dropdown options: {options}")
            
            # Find largest option value
            vals = [opt['val'] for opt in options]
            target_val = "100" if "100" in vals else ("-1" if "-1" in vals else vals[-1])
            
            print(f"Selecting page size option: {target_val}")
            await page.select_option("select[name='dataTablePS_length']", target_val)
            
            # Wait for data table to refresh rows
            await page.wait_for_timeout(2000)
            
            new_rows = len(await page.query_selector_all("table#dataTablePS tbody > tr"))
            print(f"Rows after changing page length to {target_val}: {new_rows}")
            
            # If there are pagination buttons (e.g. Next / Page 2 / Page 3), loop through pages to get all rows
            all_rows_html = []
            
            # First page HTML
            html = await page.content()
            soup = BeautifulSoup(html, "html.parser")
            table = soup.find("table", id="dataTablePS")
            if table:
                tbody = table.find("tbody")
                if tbody:
                    all_rows_html.extend(tbody.find_all("tr", recursive=False))
                    
            print(f"Page 1 rows extracted: {len(all_rows_html)}")
            
            # Check for next page buttons
            next_btn = await page.query_selector("li.next:not(.disabled) a, a#dataTablePS_next:not(.disabled)")
            page_num = 1
            while next_btn and page_num < 20:
                is_disabled = await next_btn.eval_on_selector("..", "el => el.classList.contains('disabled')") if next_btn else True
                if is_disabled:
                    break
                    
                page_num += 1
                print(f"Clicking Next page -> Page {page_num}...")
                await next_btn.click()
                await page.wait_for_timeout(1500)
                
                page_html = await page.content()
                soup = BeautifulSoup(page_html, "html.parser")
                table = soup.find("table", id="dataTablePS")
                if table:
                    tbody = table.find("tbody")
                    if tbody:
                        all_rows_html.extend(tbody.find_all("tr", recursive=False))
                        
                next_btn = await page.query_selector("li.next:not(.disabled) a, a#dataTablePS_next:not(.disabled)")
                
            print(f"TOTAL ROWS EXTRACTED ACROSS ALL PAGES: {len(all_rows_html)}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
