# Notifications Documentation

## Overview

The SIH 2026 Tracker sends browser push notifications when a PS submission count increases. This document covers the FCM setup, topic strategy, service worker, and notification flow.

---

## Notification Trigger

A notification is sent **only** when:

```python
new_count > old_count
```

| Scenario | Notification Sent? |
|----------|-------------------|
| Count increases (327 → 328) | ✅ YES |
| Count unchanged (327 → 327) | ❌ NO |
| Count decreases (328 → 327) | ❌ NO (anomaly, not a new submission) |
| First observation | ❌ NO (initialization, no baseline yet) |

---

## FCM Topic Strategy

Each PS gets its own FCM topic:

```
sih2026_ps_{PS_ID}
```

Examples:
```
sih2026_ps_SIH26042
sih2026_ps_SIH26091
sih2026_ps_SIH26120
```

**Why topics instead of tokens?**

- Tokens require storing each user's FCM token server-side
- Topics allow the collector to notify all subscribers with a single API call
- No need to manage token lists
- Topic subscriptions are managed client-side by the FCM SDK

---

## Notification Payload

```json
{
  "topic": "sih2026_ps_SIH26042",
  "notification": {
    "title": "SIH26042 — New submission",
    "body": "328 / 500 submissions. 172 slots remaining."
  },
  "data": {
    "psId": "SIH26042",
    "count": "328",
    "capacity": "500",
    "remaining": "172",
    "url": "/ps/SIH26042"
  },
  "webpush": {
    "headers": {
      "Urgency": "high"
    },
    "notification": {
      "icon": "/sih-icon-192.png",
      "badge": "/sih-badge-72.png",
      "tag": "sih-SIH26042",
      "renotify": true
    },
    "fcm_options": {
      "link": "/ps/SIH26042"
    }
  }
}
```

---

## User Subscription Flow

```
1. User enters "SIH26042" and clicks Track
2. User clicks "Enable Notifications"
3. Browser asks: "Allow notifications?"
4. User clicks Allow
   → Browser generates FCM registration token
5. App subscribes token to topic "sih2026_ps_SIH26042"
   via Firebase SDK: messaging.subscribeToTopic(token, topic)
   OR via backend: POST /api/ps/SIH26042/subscribe {token}
6. Subscription stored in localStorage
7. Service worker registered (firebase-messaging-sw.js)
```

---

## FCM Service Worker

File: `frontend/public/firebase-messaging-sw.js`

The service worker handles notifications when the browser tab is **closed or in background**:

```javascript
// Receives background message from FCM
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  const psId = payload.data.psId;
  
  self.registration.showNotification(title, {
    body,
    icon: '/sih-icon-192.png',
    tag: `sih-${psId}`,       // Groups multiple alerts for same PS
    renotify: true,            // Show new alert even if tagged one exists
    data: { url: `/ps/${psId}` }
  });
});
```

When the user **clicks** the notification:

```javascript
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  
  // Focus existing tab if open, otherwise open new tab
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url)) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
```

**Result:** Clicking the notification opens `/ps/SIH26042` which shows the latest count from Firestore.

---

## Foreground Notifications

When the user has the app tab open (foreground), FCM delivers messages differently. The app handles this via:

```typescript
// In useNotifications.ts
onMessage(messaging, (payload) => {
  // Show a toast/banner in the UI
  showToast(`${psId}: New submission! ${count}/${capacity}`);
});
```

---

## Notification Idempotency

Before sending any notification, the collector checks:

```python
event_id = f"{ps_id}_{new_count}"  # e.g., "SIH26042_328"

if await firestore.notification_event_exists(event_id):
    logger.info(f"Duplicate notification prevented: {event_id}")
    return  # Skip

# Create event record FIRST
await firestore.create_notification_event(event_id, ...)

# Then send FCM
await fcm.send_ps_notification(ps_id, new_count, capacity)
```

This prevents duplicate notifications if:
- The collector restarts mid-cycle
- Multiple collector instances run simultaneously

---

## Threshold Notifications (Future)

The MVP sends notifications for every new submission. Future versions can add threshold alerts:

| Threshold | Event ID |
|-----------|---------|
| 400/500 reached | `SIH26042_THRESHOLD_400` |
| 450/500 reached | `SIH26042_THRESHOLD_450` |
| 490/500 reached | `SIH26042_THRESHOLD_490` |
| 500/500 (FULL) | `SIH26042_THRESHOLD_500` |

Each threshold fires exactly once using the same idempotency mechanism.

---

## Browser Compatibility

| Browser | Push Notifications |
|---------|------------------|
| Chrome (desktop) | ✅ |
| Chrome (Android) | ✅ |
| Firefox | ✅ |
| Safari (macOS 13+) | ✅ |
| Safari (iOS 16.4+) | ✅ (installed PWA only) |
| Safari (iOS browser) | ❌ |

The app gracefully handles unsupported browsers — the notification bell is hidden or shows an "unsupported" state.

---

## Unsubscribing

When the user clicks "Disable Notifications":

```typescript
await messaging.unsubscribeFromTopic(token, topic);
localStorage.removeItem(`notification_${psId}`);
```
