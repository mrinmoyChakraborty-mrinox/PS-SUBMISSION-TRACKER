# SIH 2026 Live Submission Tracker

> An independent, community-built tracker for Smart India Hackathon 2026 Problem Statement submission counts. Data is sourced directly from the publicly available [SIH 2026 PS portal](https://sih.gov.in/sih2026PS).

⚠️ **This is NOT an official SIH service.** It is an independent tool that reads publicly available data.

---

## Features

- 🔴 **Live counts** — Firestore real-time updates, no page refresh needed
- 🔔 **Push notifications** — Browser notifications when a new submission arrives
- 📈 **Submission history** — Chart of how counts change over time
- 📱 **Mobile-first** — Works great on Android Chrome and desktop
- ⚡ **Centralized collector** — One Python process polls SIH every 60s, not one per user
- 🛡️ **Safe** — No login required, no SIH credentials, no data manipulation

---

## Architecture

```
SIH 2026 (sih.gov.in/sih2026PS)
         │
         │  GET HTML every 60 seconds
         ▼
Python Collector (FastAPI + APScheduler)
         │
         │  BeautifulSoup parses #dataTablePS
         │  Compares counts, detects changes
         ▼
Firestore (problemStatements + history + events)
         │
    ┌────┴────┐
    ▼         ▼
React UI    FCM Push
(onSnapshot) (per PS topic)
```

---

## Project Structure

```
sih-submission-tracker/
├── frontend/               # React + Vite + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # HomePage, PSPage
│   │   ├── hooks/          # usePSData, useHistory, useNotifications, useTrackedPS
│   │   ├── services/       # API client
│   │   ├── firebase/       # Firebase config
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Formatters, validators
│   └── public/
│       └── firebase-messaging-sw.js   # FCM service worker
│
├── backend/                # Python + FastAPI
│   ├── app/
│   │   ├── collector/
│   │   │   ├── sources/sih2026.py   # SIH HTML scraper
│   │   │   ├── parser.py            # Count parser
│   │   │   └── worker.py            # Collector loop
│   │   ├── services/firestore.py    # Firestore operations
│   │   ├── notifications/fcm.py     # FCM notifications
│   │   ├── api/routes.py            # REST API
│   │   └── config.py                # Environment config
│   ├── tests/
│   │   ├── fixtures/sih2026_sample.html
│   │   ├── test_parser.py
│   │   └── test_worker.py
│   └── main.py
│
├── docs/
│   ├── SIH_SOURCE_RESEARCH.md
│   ├── ARCHITECTURE.md
│   ├── FIREBASE_SETUP.md
│   ├── NOTIFICATIONS.md
│   └── DEPLOYMENT.md
│
├── firestore.rules
├── firestore.indexes.json
├── .env.example
└── README.md
```

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- Python 3.11+
- A Firebase project (see [Firebase Setup Guide](docs/FIREBASE_SETUP.md))

### 1. Clone and configure

```bash
# Copy environment files
cp .env.example backend/.env
cp .env.example frontend/.env.local

# Edit both files and fill in your Firebase credentials
```

### 2. Start the Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

Backend starts at `http://localhost:8000`

API docs: `http://localhost:8000/docs`

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts at `http://localhost:5173`

The Vite dev server proxies `/api/*` to the backend automatically.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/ps/{psId}` | Get current PS data |
| `GET` | `/api/ps/{psId}/history` | Get submission history |
| `POST` | `/api/ps/{psId}/track` | Register PS for tracking |
| `POST` | `/api/ps/{psId}/subscribe` | Subscribe FCM token to PS topic |
| `GET` | `/api/health` | Collector status |

### Example Response — `GET /api/ps/SIH26042`

```json
{
  "psId": "SIH26042",
  "title": "AI-Based Smart Irrigation System",
  "category": "Software",
  "theme": "Agriculture",
  "count": 327,
  "capacity": 500,
  "remaining": 173,
  "percentage": 65.4,
  "status": "live",
  "lastUpdatedAt": "2026-09-03T12:04:37+05:30"
}
```

---

## Firebase Setup

See [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) for step-by-step instructions including:

1. Creating a Firebase project
2. Enabling Firestore
3. Setting up Firebase Cloud Messaging
4. Generating service account credentials
5. Getting your VAPID key
6. Deploying Firestore rules and indexes

---

## Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

Tests use a local HTML fixture (`tests/fixtures/sih2026_sample.html`) and do NOT make live requests to SIH.

---

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for:

- **Frontend** → Vercel or Firebase Hosting
- **Backend** → Google Cloud Run (Docker)
- **Scheduler** → Cloud Scheduler triggering the collector endpoint

### Docker (Backend)

```bash
cd backend
docker build -t sih-tracker-backend .
docker run -p 8000:8000 --env-file .env sih-tracker-backend
```

---

## Environment Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `SIH_SOURCE_URL` | backend/.env | SIH 2026 PS page URL |
| `COLLECTOR_INTERVAL_SECONDS` | backend/.env | Polling interval (default: 60) |
| `FIREBASE_PROJECT_ID` | backend/.env | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | backend/.env | Service account email |
| `FIREBASE_PRIVATE_KEY` | backend/.env | Service account private key |
| `VITE_FIREBASE_API_KEY` | frontend/.env.local | Firebase web API key |
| `VITE_FIREBASE_PROJECT_ID` | frontend/.env.local | Firebase project ID |
| `VITE_FIREBASE_VAPID_KEY` | frontend/.env.local | FCM VAPID key for push |

---

## Data Source

Data is sourced from:

> **Smart India Hackathon 2026 — Problem Statements Portal**  
> https://sih.gov.in/sih2026PS

The collector reads the publicly available HTML table (`#dataTablePS`) from this page every 60 seconds. No SIH credentials are required or used.

---

## License

MIT — Community tool, not affiliated with SIH or the Government of India.
