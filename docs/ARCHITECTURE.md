# System Architecture

## Overview

The SIH 2026 Live Submission Tracker uses a centralized collector architecture to minimize requests to the SIH source while serving real-time data to many users.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  OFFICIAL SIH 2026                       │
│         https://sih.gov.in/sih2026PS                    │
│                                                          │
│  Server-rendered HTML table #dataTablePS                 │
│  ~226 PS rows, each with X/500 count                    │
└──────────────────────────┬──────────────────────────────┘
                           │
                    GET HTML (every 60s)
                    1 request total
                           │
┌──────────────────────────▼──────────────────────────────┐
│               PYTHON COLLECTOR (FastAPI)                  │
│                                                          │
│  ┌─────────────────┐   ┌──────────────────────────────┐ │
│  │  SIH2026Source  │   │    APScheduler (60s loop)    │ │
│  │  fetch_page()   │   │    run_collection_cycle()    │ │
│  │  parse(html)    │   └──────────────────────────────┘ │
│  └─────────────────┘                                     │
│                                                          │
│  ┌─────────────────┐   ┌──────────────────────────────┐ │
│  │  Change Detect  │   │    Idempotency Check         │ │
│  │  old vs new     │   │    notificationEvents/       │ │
│  │  count          │   │    {PS_ID}_{COUNT}           │ │
│  └─────────────────┘   └──────────────────────────────┘ │
│                                                          │
│  REST API: /api/ps/:id, /api/ps/:id/history, /api/health│
└─────────────┬───────────────────────────┬───────────────┘
              │                           │
        Firestore writes           FCM Admin SDK
              │                           │
┌─────────────▼───────────────────────────▼───────────────┐
│                     FIRESTORE                            │
│                                                          │
│  problemStatements/{psId}                               │
│    count, capacity, remaining, status                   │
│    lastUpdatedAt, lastSuccessfulFetchAt                 │
│                                                          │
│  problemStatements/{psId}/history/{id}                  │
│    count, previousCount, timestamp                      │
│                                                          │
│  notificationEvents/{psId}_{count}                      │
│    idempotency records                                  │
│                                                          │
│  collectorStatus/current                                │
│    status, lastRunAt, lastError                         │
└──────────────────────────┬──────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
┌──────────▼──────────┐        ┌───────────▼──────────────┐
│    REACT FRONTEND   │        │   FIREBASE CLOUD MSG     │
│                     │        │                          │
│  onSnapshot()       │        │  Topic per PS:           │
│  → live UI updates  │        │  sih2026_ps_SIH26042    │
│  → no page refresh  │        │  → browser push alert   │
└─────────────────────┘        └──────────────────────────┘
```

---

## Components

### 1. SIH2026Source (`collector/sources/sih2026.py`)

**Responsibility:** Source isolation layer. All knowledge of the SIH HTML structure lives here.

- Fetches `https://sih.gov.in/sih2026PS` with browser-like headers
- Parses `#dataTablePS` via BeautifulSoup
- Returns normalized list of PS dicts
- Raises `SOURCE_SCHEMA_CHANGED` if table missing
- Raises `ValueError` on invalid count format (never returns 0 silently)

**Interface:**
```python
class SIH2026Source:
    def fetch_all(self) -> list[dict]: ...
```

### 2. Collector Worker (`collector/worker.py`)

**Responsibility:** Business logic for change detection and orchestration.

```
Every 60 seconds:
  1. fetch_all() → list of all PS data
  2. For each PS:
     a. Get existing Firestore doc
     b. If new: initialize (no notification)
     c. If count increased: update Firestore + history + FCM
     d. If unchanged: update lastSuccessfulFetchAt
     e. If decreased: log anomaly, update count, no notification
  3. Update collectorStatus
```

**Key property:** Firestore is authoritative, not in-memory state. Multiple workers can run safely.

### 3. Firestore Service (`services/firestore.py`)

**Responsibility:** All Firestore reads and writes. No business logic.

Uses Firebase Admin SDK (bypasses Firestore security rules, allowing backend-only writes).

### 4. FCM Notifications (`notifications/fcm.py`)

**Responsibility:** Sending push notifications via FCM topics.

- Topic format: `sih2026_ps_{PS_ID}`
- Only sends when `new_count > old_count`
- Idempotency checked before sending (via `notificationEvents` collection)

### 5. REST API (`api/routes.py`)

**Responsibility:** HTTP endpoints for the frontend.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/ps/{psId}` | Read current Firestore data (frontend also reads directly via SDK) |
| `GET /api/ps/{psId}/history` | History subcollection |
| `POST /api/ps/{psId}/track` | Register interest (included in next collection) |
| `POST /api/ps/{psId}/subscribe` | Register FCM token to PS topic |
| `GET /api/health` | Collector status |

### 6. React Frontend (`frontend/src/`)

**Responsibility:** Real-time UI via Firestore SDK.

- Reads Firestore directly via `onSnapshot` (not via the API) for real-time updates
- Uses API only for track/subscribe operations
- Manages tracked PS list in localStorage
- FCM service worker handles background notifications

---

## Data Flow: New Submission Detected

```
T+0s   SIH count changes: 327 → 328

T+60s  Collector runs fetch_all()
         GET https://sih.gov.in/sih2026PS
         → HTML parsed
         → SIH26042: count=328

       Change detection:
         old_count = 327 (from Firestore)
         new_count = 328
         328 > 327 → SUBMISSION_INCREASE

       Idempotency check:
         notificationEvents/SIH26042_328 exists? → NO
         Proceed

       Firestore update:
         problemStatements/SIH26042
           count: 328
           remaining: 172
           lastCountChangeAt: now

       History entry:
         problemStatements/SIH26042/history/{auto-id}
           count: 328, previousCount: 327

       Notification event:
         notificationEvents/SIH26042_328

       FCM:
         topic: sih2026_ps_SIH26042
         title: "SIH26042 — New submission"
         body: "328 / 500 submissions. 172 slots remaining."

T+60s  Firestore onSnapshot fires in browsers
         → UI updates: 327/500 → 328/500 (no refresh)

T+60s  FCM message delivered to subscribed browsers
         → Push notification shown even if tab is closed
```

---

## Efficiency

| Naive approach | This approach |
|---------------|---------------|
| 1 SIH request per user per minute | 1 SIH request per minute total |
| 500 users × 226 PS = 113,000 req/min | 1 req/min |
| Scales badly | Scales to millions of users |

---

## Error Handling

| Scenario | Action |
|----------|--------|
| SIH site unreachable | Log error, keep Firestore counts, show STALE in UI |
| `#dataTablePS` missing | Raise `SOURCE_SCHEMA_CHANGED`, stop collection cycle |
| Invalid count format | Log `INVALID_COUNT_FORMAT`, skip row |
| Firestore write failure | Log error, retry next cycle |
| FCM send failure | Log error, mark event as failed (retry logic TBD) |
| Count decrease | Log `SUBMISSION_COUNT_DECREASE` anomaly, update count, no notification |
