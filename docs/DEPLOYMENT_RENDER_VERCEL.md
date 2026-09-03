# Deploying SIH 2026 Submission Tracker to Render & Vercel

This guide walks you through deploying:
- **Backend (Python / FastAPI / Collector)** to **Render** (as a Web Service)
- **Frontend (React / Vite / TypeScript)** to **Vercel**

---

## 1. Environment Variables Overview

### 🔹 Backend Environment Variables (Set in Render Dashboard)

| Variable | Recommended Value | Description |
| :--- | :--- | :--- |
| `SIH_SOURCE_URL` | `https://sih.gov.in/sih2026PS` | Official SIH 2026 PS page URL |
| `COLLECTOR_INTERVAL_SECONDS` | `60` | Scrape interval in seconds |
| `FIREBASE_PROJECT_ID` | `your-firebase-project-id` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com` | Firebase Admin service account email |
| `FIREBASE_PRIVATE_KEY` | `"-----BEGIN RSA PRIVATE KEY-----\n..."` | Firebase Admin private key (**include quotes and keep `\n` literal**) |
| `CORS_ORIGINS` | `https://your-app.vercel.app,*` | Allowed CORS origins (your Vercel frontend URL or `*`) |

---

### 🔹 Frontend Environment Variables (Set in Vercel Dashboard)

| Variable | Example / Format | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://sih-tracker-backend.onrender.com/api` | Your Render backend API endpoint |
| `VITE_FIREBASE_API_KEY` | `AIzaSy...` | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | `your-firebase-project-id` | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` | Firebase Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789012` | Firebase Sender ID |
| `VITE_FIREBASE_APP_ID` | `1:123456789012:web:abc123` | Firebase Web App ID |
| `VITE_FIREBASE_VAPID_KEY` | `BHxxxxxxxx...` | FCM Web Push VAPID key |

---

## 2. Deploying Backend to Render

### Option A: Manual Web Service Setup (Recommended)

1. **Push your Repository to GitHub / GitLab**.
2. Log in to [Render Console](https://dashboard.render.com/).
3. Click **New +** → **Web Service**.
4. Connect your GitHub repository.
5. Configure the service settings:
   - **Name**: `sih-tracker-backend`
   - **Region**: Choose closest to target users (e.g. `Singapore`)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Scroll down to **Environment Variables** and add all the Backend variables listed in Section 1.
7. Click **Create Web Service**.

Once deployed, Render will provide a public URL like:
`https://sih-tracker-backend.onrender.com`

Verify backend health by opening:
`https://sih-tracker-backend.onrender.com/api/health`

---

### Option B: Render Blueprint (`render.yaml`)

We have already created a `render.yaml` file in the root of your project:
1. In Render Dashboard, click **New +** → **Blueprint**.
2. Connect your repository.
3. Render will auto-detect `render.yaml`.
4. Enter the secret values (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) when prompted.
5. Click **Apply**.

---

## 3. Deploying Frontend to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository.
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click Edit → select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables** section and add all Frontend variables listed in Section 1 (make sure `VITE_API_BASE_URL` points to your Render backend URL e.g. `https://sih-tracker-backend.onrender.com/api`).
6. Click **Deploy**.

`frontend/vercel.json` has already been generated to handle SPA routing (rewriting dynamic client routes like `/ps/SIH26042` to `/index.html`).

---

## 4. Post-Deployment Verification Checklist

1. Open your Vercel URL (e.g., `https://sih-tracker.vercel.app`).
2. Search for `SIH26042`.
3. Verify live count loads and status dot shows `● LIVE`.
4. Click **Enable Notifications** and grant browser notification permissions.
5. Verify Render logs in Render Dashboard (`https://dashboard.render.com`) show `Collection cycle complete`.
