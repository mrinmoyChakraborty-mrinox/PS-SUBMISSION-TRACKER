# Deploying SIH 2026 Submission Tracker to Render & Vercel

This guide walks you through deploying:
- **Backend (Python / FastAPI API Server)** to **Render** (as a Web Service)
- **Frontend (React / Vite / TypeScript)** to **Vercel**
- **Distributed Collector Node (Local PC / Multi-Node / High Uptime)**

---

## 1. Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │    Distributed Collector Node(s)       │
                      │  (Local PC, Secondary PC, GitHub Cron) │
                      └──────────────────┬─────────────────────┘
                                         │ Scrapes sih.gov.in (Indian Residential IP)
                                         ▼ Writes every 60s
                               ┌──────────────────┐
                               │ Firebase         │
                               │ Firestore        │
                               └────────┬─────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 │                                             │
                 ▼ Reads API data                              ▼ Live updates (onSnapshot)
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│ Render Backend (FastAPI)         │        │ Vercel Frontend (React / Vite)   │
│ - Lightweight API server         │        │ - UI Dashboard & Search          │
│ - Serves /api/ps/:id & /health   │        │ - Realtime listener              │
│ - Zero Cloudflare WAF block      │        │ - Web Push Notifications         │
└──────────────────────────────────┘        └──────────────────────────────────┘
```

---

## 2. Environment Variables Overview

### 🔹 Backend Environment Variables (Set in Render Dashboard)

| Variable | Recommended Value | Description |
| :--- | :--- | :--- |
| `SIH_SOURCE_URL` | `https://sih.gov.in/sih2026PS` | Official SIH 2026 PS page URL |
| `COLLECTOR_INTERVAL_SECONDS` | `60` | Scrape interval in seconds |
| `FIREBASE_PROJECT_ID` | `your-firebase-project-id` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com` | Firebase Admin service account email |
| `FIREBASE_PRIVATE_KEY` | `"-----BEGIN RSA PRIVATE KEY-----\n..."` | Firebase Admin private key |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |

---

### 🔹 Frontend Environment Variables (Set in Vercel Dashboard)

| Variable | Example / Format | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://sih-tracker-backend.onrender.com/api` | Render backend API base URL |
| `VITE_FIREBASE_API_KEY` | `AIzaSy...` | Firebase Web API Key |
| `VITE_FIREBASE_PROJECT_ID` | `pstracker-79b97` | Firebase Project ID |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `337339813729` | Firebase Sender ID |
| `VITE_FIREBASE_APP_ID` | `1:337339813729:web:...` | Firebase Web App ID |
| `VITE_FIREBASE_VAPID_KEY` | `your-vapid-key` | FCM Web Push VAPID key |

---

## 3. Distributed Collector Node Setup (High Uptime)

To ensure **100% uptime** with zero Cloudflare WAF bot blocking issues:

### Running on your Local PC / Machine:
```bash
cd backend
venv\Scripts\python collector_node.py
```

### Multi-Node Capability (Leader Lease & Automatic Failover):
1. Each collector node registers a heartbeat in Firestore `system/collectorNodes`.
2. A single active leader holds the lease in `system/collectorLease`.
3. If Node A goes offline or loses internet for >45 seconds, Node B automatically claims the leader lease and continues collection!
4. Write operations are completely **idempotent** (`{psId}_{count}` notification deduplication).

---

## 4. Deploying Backend to Render

1. Log in to [Render Console](https://dashboard.render.com/).
2. Click **New +** → **Web Service**.
3. Connect your repository (`rootDir`: `backend`).
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables and click **Create Web Service**.

---

## 5. Deploying Frontend to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Import project (`rootDir`: `frontend`).
3. Set `VITE_API_BASE_URL` to `https://<your-render-app>.onrender.com/api`.
4. Click **Deploy**.

---

## 6. Verification Checklist

1. Open Vercel URL (e.g., `https://sih-tracker.vercel.app/ps/SIH26001`).
2. Verify `GET /api/ps/SIH26001` returns data or initial tracking status.
3. Test direct page refresh on `/ps/SIH26001` (Vercel rewrite handles SPA routing).
4. Run `python collector_node.py` locally and verify `Collection cycle completed successfully`.
