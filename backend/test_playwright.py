"""
Quick test: Can Playwright + headless Chromium bypass sih.gov.in's WAF?
Run this after 'playwright install chromium':
  venv\Scripts\python test_playwright.py
"""
import asyncio
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        print("Navigating to sih.gov.in/sih2026PS ...")
        response = await page.goto(
            "https://sih.gov.in/sih2026PS",
            wait_until="networkidle",
            timeout=30000
        )
        
        status = response.status
        html = await page.content()
        
        print(f"HTTP Status: {status}")
        print(f"HTML length: {len(html)} bytes")
        
        if "dataTablePS" in html:
            print("✅ SUCCESS — table#dataTablePS found!")
        elif status == 403:
            print("❌ BLOCKED — still getting 403")
        else:
            print(f"⚠️  Got status {status} but no table found")
            print("First 500 chars:", html[:500])
        
        await browser.close()

asyncio.run(test())
