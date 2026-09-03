# Deployment Guide

## Architecture Overview

| Component | Service | Notes |
|-----------|---------|-------|
| Frontend | Vercel (recommended) or Firebase Hosting | Static React build |
| Backend | Google Cloud Run | Docker container |
| Database | Firebase Firestore | Managed NoSQL |
| Push | Firebase Cloud Messaging | Included with Firebase |
| Scheduler | Google Cloud Scheduler | Triggers collector every 60s |

---

## Option A: Local Development (Testing)

Run everything locally without any cloud services (except Firebase).

### Prerequisites
- Python 3.11+
- Node.js 18+
- Firebase project configured (see `docs/FIREBASE_SETUP.md`)

### Start Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate         # Windows
# source venv/bin/activate    # macOS/Linux

pip install -r requirements.txt

# Copy and fill in env vars
copy ..\\.env.example .env

python main.py
# → Backend running at http://localhost:8000
# → Collector starts after 5 seconds
# → API docs at http://localhost:8000/docs
```

### Start Frontend
```bash
cd frontend
npm install

# Copy and fill in env vars
copy ..\\.env.example .env.local

npm run dev
# → Frontend at http://localhost:5173
# → /api/* proxied to http://localhost:8000
```

---

## Option B: Production Deployment

### Step 1 — Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

cd frontend

# Build first to verify
npm run build

# Deploy
vercel --prod
```

During deployment, set environment variables in the Vercel dashboard:
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_VAPID_KEY
```

Add a `vercel.json` for React Router support:
```json
{
  "rewrites": [
    { "source": "/((?!api/.*).*)", "destination": "/index.html" }
  ]
}
```

---

### Step 2 — Deploy Backend to Cloud Run

#### Build and Push Docker Image

```bash
cd backend

# Set your project ID
export PROJECT_ID=your-gcp-project-id

# Build
docker build -t gcr.io/$PROJECT_ID/sih-tracker-backend .

# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/sih-tracker-backend
```

#### Deploy to Cloud Run

```bash
gcloud run deploy sih-tracker-backend \
  --image gcr.io/$PROJECT_ID/sih-tracker-backend \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 3 \
  --port 8000 \
  --set-env-vars "FIREBASE_PROJECT_ID=your-project,\
FIREBASE_CLIENT_EMAIL=your-email,\
FIREBASE_PRIVATE_KEY=your-key,\
SIH_SOURCE_URL=https://sih.gov.in/sih2026PS,\
COLLECTOR_INTERVAL_SECONDS=60,\
CORS_ORIGINS=https://your-frontend.vercel.app"
```

The Cloud Run service URL will be something like:
```
https://sih-tracker-backend-xxxx-el.a.run.app
```

---

### Step 3 — Configure Cloud Scheduler (Optional)

If you prefer Cloud Scheduler to trigger collection (instead of the in-process APScheduler):

```bash
# Create a scheduler job to hit the /api/collect endpoint every 60s
gcloud scheduler jobs create http sih-collector \
  --location=asia-south1 \
  --schedule="* * * * *" \
  --uri="https://sih-tracker-backend-xxxx-el.a.run.app/api/collect" \
  --http-method=POST \
  --oidc-service-account-email=scheduler@your-project.iam.gserviceaccount.com
```

> **Note:** The default setup uses APScheduler inside the FastAPI process (no Cloud Scheduler needed). Use Cloud Scheduler only if you want to scale the collector independently.

---

### Step 4 — Deploy Firestore Rules & Indexes

```bash
# From repo root
npm install -g firebase-tools
firebase login
firebase use your-project-id

firebase deploy --only firestore:rules,firestore:indexes
```

---

## Environment Variables Summary

### Backend (Cloud Run)

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | ✅ | Service account email |
| `FIREBASE_PRIVATE_KEY` | ✅ | Service account private key |
| `SIH_SOURCE_URL` | ✅ | SIH 2026 PS page URL |
| `COLLECTOR_INTERVAL_SECONDS` | optional | Default: 60 |
| `CORS_ORIGINS` | ✅ | Comma-separated allowed origins |
| `HOST` | optional | Default: 0.0.0.0 |
| `PORT` | optional | Default: 8000 |

### Frontend (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | ✅ | Firebase app ID |
| `VITE_FIREBASE_VAPID_KEY` | ✅ | FCM VAPID key (for push) |

---

## Monitoring

### Health Check
```bash
curl https://your-backend.run.app/api/health
```

Expected response:
```json
{
  "status": "running",
  "lastRunAt": "2026-09-03T12:04:37+05:30",
  "intervalSeconds": 60,
  "lastError": null
}
```

### Firestore Console
View live data at: https://console.firebase.google.com/project/your-project/firestore

### Cloud Run Logs
```bash
gcloud run services logs read sih-tracker-backend --region=asia-south1
```

---

## Scaling Notes

- The collector is a single instance by default. Cloud Run min-instances=1 keeps it warm.
- Firestore handles thousands of concurrent `onSnapshot` listeners natively.
- FCM topic messages scale automatically — one backend message reaches all subscribers.
- If you need to scale the collector independently, use Cloud Scheduler + a separate Cloud Run job.
