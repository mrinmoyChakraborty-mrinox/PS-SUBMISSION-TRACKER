# SIH 2026 Live Submission Tracker

> An independent, community-built, distributed tracker for Smart India Hackathon 2026 Problem Statement submission counts. Data is rendered and collected directly from the official [SIH 2026 PS portal](https://sih.gov.in/sih2026PS).

⚠️ **This is NOT an official SIH service.** It is an independent open-source tool that reads publicly available data.

---

## 🚀 Key Features

- 🔴 **Real-time Firestore Sync** — Instant UI count updates via `onSnapshot` listener with zero page refresh.
- 🤖 **Playwright Headless Collector** — Fully parses JS-rendered DataTables and paginates through all **233+ Problem Statements**.
- ⚡ **Distributed Leader Lock System** — Multi-node failover with atomic Firestore leader leases (`collectorStatus/leaderLease`).
- 📦 **High-Speed Batch Ingestion** — Uses Firestore `getAll()` batch reads and atomic `db.batch()` writes (under 1.5 seconds per cycle).
- 🔔 **FCM Push Notifications** — Direct browser push alerts when a problem statement receives new submissions.
- 📈 **Historical Analytics** — Interactive submission count history charts (1H, 6H, 12H, 24H, 7D ranges).
- 📱 **Mobile & Desktop Responsive** — Ultra-modern glassmorphic UI built with React, Vite, TypeScript, and Tailwind CSS.

---

## 🏛️ System Architecture

```text
               SIH 2026 Portal (sih.gov.in/sih2026PS)
                                  │
      ┌───────────────────────────┴───────────────────────────┐
      ▼                                                       ▼
Node 1 (Leader)                                      Node 2 (Standby)
Playwright Headless Chromium                         Wait for Lease Expiry
                                  │
                                  │ Parses 233+ PS via 100-item pagination
                                  ▼
               Firestore High-Speed Batch Operations
                  - getAll() 500-doc batch reads
                  - atomic db.batch() writes
                                  │
          ┌───────────────────────┴───────────────────────┐
          ▼                                               ▼
   React Web App                                  FCM Push Service
(Firestore onSnapshot)                     (Topic: sih2026_ps_{PS_ID})
```

---

## 📁 Repository Structure

```text
sih-submission-tracker/
├── frontend/               # React + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/     # PSCard, HistoryChart, StatsPanel, NotificationBell, etc.
│   │   ├── pages/          # HomePage, PSPage
│   │   ├── hooks/          # usePSData, useHistory, useNotifications, useTrackedPS
│   │   ├── services/       # API client
│   │   └── firebase/       # Firebase web initialization
│   └── public/
│       └── firebase-messaging-sw.js   # FCM background service worker
│
├── backend/                # Python + FastAPI + Playwright + APScheduler
│   ├── app/
│   │   ├── collector/
│   │   │   ├── sources/sih2026.py   # Playwright scraper & BeautifulSoup parser
│   │   │   ├── node.py              # Distributed leader election node
│   │   │   ├── parser.py            # Count parser
│   │   │   └── worker.py            # Batch collection worker
│   │   ├── services/firestore.py    # Firestore batch operations & leader lease
│   │   ├── notifications/fcm.py     # FCM topic notification service
│   │   ├── api/routes.py            # REST API endpoints
│   │   └── config.py                # Environment settings
│   ├── tests/                       # Pytest unit & mock tests
│   ├── run_node.py                  # Distributed collector entrypoint
│   └── main.py                      # FastAPI server & scheduler entrypoint
│
└── docs/                    # Technical documentation & architecture guides
```

---

## 🛠️ REST API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/ps/{ps_id}` | Fetch current PS document from Firestore / cache |
| `POST` | `/ps/{ps_id}/track` | Force-register PS for periodic tracking |
| `GET` | `/ps/{ps_id}/history` | Retrieve submission change history entries |
| `POST` | `/ps/{ps_id}/subscribe` | Register FCM push notification token for a PS topic |
| `GET` | `/health` | Service status, active leader info, and run cycle stats |

---

## ⚡ Quick Start (Local Setup)

### 1. Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
playwright install chromium

python main.py
```
*Backend runs on `http://localhost:8000`.*

### 2. Distributed Collector Node Setup

```bash
cd backend
venv\Scripts\activate
python run_node.py
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 📜 License

MIT License — Community-built tracker, not affiliated with SIH or the Ministry of Education / Government of India.
