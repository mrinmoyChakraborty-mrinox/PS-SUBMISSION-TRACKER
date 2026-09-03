# SIH 2026 — Source Research Document

## Summary

This document records the verified facts about the SIH 2026 Problem Statement data source as of September 2026.

---

## Official Source URL

```
https://sih.gov.in/sih2026PS
```

This is the **only verified live source** for SIH 2026 PS submission counts.

---

## Transport

| Property | Value |
|----------|-------|
| Protocol | HTTPS |
| Method | GET |
| Content-Type | `text/html` |
| Authentication | None required |
| Dynamic JS rendering | NOT required (table present in HTML response) |

---

## HTML Structure

The returned HTML page contains a DataTable rendered server-side:

```html
<table id="dataTablePS">
  <thead>
    <tr>
      <th>S.No.</th>
      <th>Organization</th>
      <th>Problem Statement Title</th>
      <th>Category</th>
      <th>PS Number</th>
      <th>Submitted Idea(s) Count</th>
      <th>Theme</th>
      <th>Deadline for Idea Submission</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>Ministry of Education</td>
      <td>AI-Based Attendance System</td>
      <td>Software</td>
      <td>SIH26001</td>
      <td>1/500</td>
      <td>Education</td>
      <td>20 September 2026</td>
    </tr>
    <!-- more rows -->
  </tbody>
</table>
```

---

## Column Mapping

| Index | `td[N]` | Field | Example |
|-------|---------|-------|---------|
| 0 | `td[0]` | Serial number | `1` |
| 1 | `td[1]` | Organization / Ministry | `Ministry of Education` |
| 2 | `td[2]` | Problem Statement Title | `AI-Based Attendance System` |
| 3 | `td[3]` | Category | `Software` or `Hardware` |
| 4 | `td[4]` | **PS Number (ID)** | `SIH26001` |
| 5 | `td[5]` | **Submitted Idea(s) Count** | `1/500` |
| 6 | `td[6]` | Theme | `Education` |
| 7 | `td[7]` | Deadline | `20 September 2026` |

---

## Submission Count Format

```
{submitted}/{capacity}
```

Examples observed:

```
0/500
1/500
327/500
499/500
500/500
```

Current observed capacity: **500 per PS**

The parser reads the actual capacity from the source and does NOT hardcode 500.

---

## PS ID Format

```
SIH26{NUMBER}
```

Where `{NUMBER}` is a 3-digit zero-padded integer.

Examples:
- `SIH26001`
- `SIH26042`
- `SIH26226`

Total PS count observed in the current dataset: **~226 problem statements**

---

## Individual PS Anchors / Modals

The SIH page contains fragment anchors such as:

```
https://sih.gov.in/sih2026PS#ViewProblemStatement26001
```

**Important:** These are client-side HTML anchor identifiers or JavaScript modal triggers. They are NOT separate HTTP endpoints. Making a GET request to this URL returns the same full HTML page — the fragment is ignored by the server.

Therefore the collector:
- Makes **one** GET request to `https://sih.gov.in/sih2026PS`
- Extracts **all PS rows** from the table in a single pass
- Does **not** make one request per PS

---

## Verified by Independent Scraper

A community SIH 2026 scraper independently confirms this source:

```python
# Source: community scraper (github.com/...)
import urllib.request
from bs4 import BeautifulSoup

url = "https://sih.gov.in/sih2026PS"
response = urllib.request.urlopen(url)
soup = BeautifulSoup(response.read(), "html.parser")
table = soup.find("table", {"id": "dataTablePS"})
# td[4] = PS Number, td[5] = submitted count
```

---

## Request Headers

Use browser-like headers to avoid potential bot rejection:

```python
headers = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,"
        "application/xml;q=0.9,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.5",
}
```

---

## Known Risks / Change Indicators

| Risk | Mitigation |
|------|-----------|
| Table ID changes | `SOURCE_SCHEMA_CHANGED` error raised |
| Column order changes | Parser validates PS ID format (regex) |
| Count format changes | `ValueError` raised, no silent zero |
| JS rendering required | Use Playwright if static parse fails |
| Site goes down | Collector logs error, retains last Firestore value |

---

## What NOT to Do

❌ Do not invent a separate SIH API endpoint (none currently verified)  
❌ Do not make one HTTP request per PS  
❌ Do not fetch SIH from user browsers (CORS, scale)  
❌ Do not use Playwright unless static HTML no longer contains the counter  
❌ Do not hardcode `500` as capacity — read from source  
❌ Do not silently return `0` on parse failure  

---

## Last Verified

**Date:** September 2026  
**Method:** Direct HTML fetch + BeautifulSoup parse  
**Result:** `#dataTablePS` present in static HTML response, counts in `X/Y` format
