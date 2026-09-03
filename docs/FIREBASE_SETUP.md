# Firebase Setup Guide

## Overview

This app uses Firebase for:
1. **Firestore** — Real-time database for PS counts and history
2. **Firebase Cloud Messaging (FCM)** — Browser push notifications

---

## Step 1 — Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project**
3. Name it (e.g., `sih-2026-tracker`)
4. Disable Google Analytics (optional for this use case)
5. Click **Create project**

---

## Step 2 — Enable Firestore

1. In the Firebase Console sidebar, click **Build → Firestore Database**
2. Click **Create database**
3. Choose **Production mode** (we'll deploy proper security rules)
4. Select a region close to your users (e.g., `asia-south1` for India)
5. Click **Enable**

### Deploy Security Rules

Once Firestore is enabled, deploy the rules from this repo:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login
firebase login

# Initialize (from repo root)
firebase init firestore

# Deploy rules and indexes
firebase deploy --only firestore:rules,firestore:indexes
```

Or manually paste the contents of `firestore.rules` into the Firebase Console under **Firestore → Rules**.

---

## Step 3 — Enable Firebase Cloud Messaging

1. In Firebase Console, go to **Build → Cloud Messaging**
2. Cloud Messaging is enabled by default for all projects

### Get VAPID Key (for Web Push)

1. Go to **Project Settings → Cloud Messaging**
2. Scroll to **Web configuration**
3. Click **Generate key pair**
4. Copy the key pair value — this is your **VAPID key** (`VITE_FIREBASE_VAPID_KEY`)

---

## Step 4 — Create a Web App

1. In Firebase Console, click the ⚙️ gear icon → **Project settings**
2. Scroll to **Your apps** section
3. Click the `</>` (Web) icon
4. Register the app (e.g., name: `SIH Tracker Web`)
5. **Do NOT** enable Firebase Hosting (we'll deploy to Vercel)
6. Copy the config object:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

These values go into `frontend/.env.local`:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
VITE_FIREBASE_VAPID_KEY=BHxxxxxxxx...
```

---

## Step 5 — Create a Service Account (Backend)

The Python backend uses Firebase Admin SDK, which requires a service account.

1. Go to **Project Settings → Service accounts**
2. Click **Generate new private key**
3. Download the JSON file (keep it secure — never commit it)
4. Extract these values from the JSON file into `backend/.env`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEo...\n-----END RSA PRIVATE KEY-----\n"
```

> [!IMPORTANT]
> The private key must have `\n` escaped as literal `\n` in the `.env` file (not actual newlines). The Python config handles the unescaping.

> [!CAUTION]
> **NEVER** commit the service account JSON file or your private key to version control. Add them to `.gitignore`.

---

## Step 6 — Deploy Firestore Indexes

The app requires composite indexes for history queries. Deploy them:

```bash
firebase deploy --only firestore:indexes
```

Or manually create the indexes in Firebase Console → Firestore → Indexes:

| Collection | Fields | Order |
|-----------|--------|-------|
| `history` (subcollection) | `timestamp` | DESCENDING |
| `notificationEvents` | `psId` ASC, `sentAt` DESC | — |

---

## Firestore Data Structure

After the collector runs, Firestore will look like:

```
problemStatements/
  SIH26001/
    psId: "SIH26001"
    title: "AI-Based Attendance System"
    category: "Software"
    theme: "Education"
    count: 42
    capacity: 500
    remaining: 458
    percentage: 8.4
    raw: "42/500"
    status: "live"
    firstSeenAt: <timestamp>
    lastUpdatedAt: <timestamp>
    lastCountChangeAt: <timestamp>
    lastSuccessfulFetchAt: <timestamp>
    source: "official-sih"

    history/
      <auto-id>/
        count: 42
        previousCount: 41
        timestamp: <timestamp>

notificationEvents/
  SIH26001_42/
    psId: "SIH26001"
    count: 42
    previousCount: 41
    sentAt: <timestamp>

collectorStatus/
  current/
    status: "running"
    lastRunAt: <timestamp>
    lastError: null
    intervalSeconds: 60
```

---

## Testing the Setup

After setup, verify everything works:

```bash
# Start the backend
cd backend && python main.py

# Check health endpoint
curl http://localhost:8000/api/health

# Check if Firestore is being populated (after ~60 seconds)
curl http://localhost:8000/api/ps/SIH26001
```

If Firestore is connected and the collector is running, you should see PS data in the API response.
