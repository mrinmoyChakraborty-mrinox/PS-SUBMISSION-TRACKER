# System Architecture & Technical Specifications

## Overview

The SIH 2026 Live Submission Tracker uses a **distributed, leader-elected collector architecture** paired with **high-speed Firestore batch ingestion** to mirror submission counts from the SIH 2026 Portal into Firebase Firestore in real time.

---

## 🏛️ High-Level System Architecture

```text
┌───────────────────────────────────────────────────────────┐
│                    OFFICIAL SIH PORTAL                    │
│                https://sih.gov.in/sih2026PS               │
│                                                           │
│  Dynamic JavaScript DataTable (#dataTablePS)             │
│  233+ Problem Statements split across paginated views      │
└─────────────────────────────┬─────────────────────────────┘
                              │
                    Playwright Headless Chrome
                    (Dynamic 100-item pagination)
                              │
┌─────────────────────────────▼─────────────────────────────┐
│              DISTRIBUTED COLLECTOR NODE SYSTEM             │
│                                                           │
│  ┌─────────────────────────┐   ┌────────────────────────┐ │
│  │   Leader Election Lock  │   │  Playwright Ingestion  │ │
│  │  collectorStatus/leader │   │  Full Page Parsing     │ │
│  └─────────────────────────┘   └────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────┐   ┌────────────────────────┐ │
│  │  Firestore getAll()     │   │  Atomic db.batch()     │ │
│  │  500-doc Batch Reads    │   │  High-Speed Writes     │ │
│  └─────────────────────────┘   └────────────────────────┘ │
└──────────────┬───────────────────────────┬────────────────┘
               │                           │
         Firestore Writes             FCM Admin SDK
               │                           │
┌──────────────▼───────────────────────────▼────────────────┐
│                    FIREBASE FIRESTORE                     │
│                                                           │
│  problemStatements/{psId}                                │
│    count, capacity, remaining, percentage, status         │
│                                                           │
│  problemStatements/{psId}/history/{id}                   │
│    count, previousCount, timestamp                        │
│                                                           │
│  collectorStatus/leaderLease                              │
│    leaderId, expiresAt, status                            │
└──────────────────────────────┬────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
     React Frontend                       Firebase Cloud Messaging
   (Firestore onSnapshot)                 (Topic Push Alerts)
```

---

## 🔑 Core Technical Innovations

### 1. 🤖 Playwright Scraper (`collector/sources/sih2026.py`)
- Standard HTTP clients (requests/httpx) fail when SIH page relies on client-side JS rendering or Cloudflare Worker dynamic challenges.
- Uses headless Chromium with Playwright to load the page.
- Selects `100` items per page in `#dataTablePS_length` dropdown and iterates pagination controls (`a#dataTablePS_next`).
- Scrapes all **233+ Problem Statements** in ~3 seconds.

### 2. ⚡ Distributed Leader Election (`collector/node.py` & `services/firestore.py`)
- Prevents split-brain state or duplicate write cycles when running multiple instances on Render or server nodes.
- Firestore document `collectorStatus/leaderLease` acts as an distributed lock:
  - Active node holds lease with a heartbeat duration (default: 120 seconds).
  - Node renews lease every cycle.
  - If a leader node crashes, lease expires and standby node claims leadership automatically.

### 3. 🚀 High-Speed Batch Ingestion (`collector/worker.py` & `services/firestore.py`)
- **Old Approach**: Iterated 233+ items sequentially with individual `doc.get()` and `doc.set()` network calls. Took **~120 seconds** per cycle.
- **New Batch Approach**:
  1. Calls `firestore.get_all_ps_batch()` using `db.getAll()` (reads all 233 documents in **1 single network roundtrip**).
  2. Compares old vs new counts in memory.
  3. Uses `db.batch()` to write all updated documents atomically in a single network batch call.
  4. Cycle duration reduced to **1.2 seconds**.

### 4. 🔄 Real-Time Client Synchronization & Resilient Fallbacks
- Frontend uses `onSnapshot` to subscribe directly to `problemStatements/{psId}`.
- Field normalization layer handles `ps_id` -> `psId` compatibility seamlessly.
- Automatic fallback to REST API `/api/ps/{psId}` if client Firestore socket experiences network timeouts.

---

## 📊 Error & Anomaly Handling

| Scenario | Handling Strategy |
|----------|-------------------|
| **Cloudflare / SIH Downtime** | Collector logs warning, preserves existing Firestore state, and updates node status to `stale`. |
| **Schema Changes** | Parser verifies table existence; raises `SOURCE_SCHEMA_CHANGED` if `#dataTablePS` is missing. |
| **Submission Count Decrease** | Logs `SUBMISSION_COUNT_DECREASE` anomaly; updates Firestore silently without triggering FCM alerts. |
| **Node Crash** | Leader lease expires within 120s; standby node assumes active leadership automatically. |

---

## 📈 Performance Benchmarks

- **Parsing Speed**: 233+ PS parsed in 3.1s via Playwright.
- **Firestore Batch Write**: 233 PS updated in 1.18s via `db.batch()`.
- **UI Update Latency**: < 100ms from Firestore mutation to browser rendering.
