// Firebase Messaging Service Worker for SIH 2026 Live Submission Tracker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize Firebase directly at root of service worker with current project config
const firebaseConfig = {
  apiKey: "AIzaSyBN2PSORimiPywgIFgWohA-ArH42dAWAXw",
  authDomain: "sihtrackerv2.firebaseapp.com",
  projectId: "sihtrackerv2",
  storageBucket: "sihtrackerv2.firebasestorage.app",
  messagingSenderId: "851602603334",
  appId: "1:851602603334:web:cecf543ea75cc1e6393947"
};

try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
} catch (err) {
  console.error('[SW] Firebase init error:', err);
}

let messaging = null;
try {
  messaging = firebase.messaging();
} catch (e) {
  console.warn('[SW] Firebase messaging unsupported in this context:', e);
}

// Background push notification handler via Firebase SDK
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Received background message:', payload);
    const title = payload.notification?.title || payload.data?.title || 'SIH 2026 Submission Alert';
    const body = payload.notification?.body || payload.data?.body || 'New problem statement update recorded.';
    const psId = payload.data?.psId || '';
    const url = payload.data?.url || (psId ? `/ps/${psId}` : '/');

    const notificationOptions = {
      body: body,
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [200, 100, 200],
      data: { url: url, psId: psId },
      tag: psId ? `sih-${psId}` : 'sih-general-alert',
      renotify: true,
      requireInteraction: true
    };

    return self.registration.showNotification(title, notificationOptions);
  });
}

// Native push event listener as a secondary safeguard
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const rawText = event.data.text();
    let data = {};
    try {
      data = JSON.parse(rawText);
    } catch (_) {
      data = { body: rawText };
    }

    const title = data.notification?.title || data.title || 'SIH 2026 Live Alert';
    const body = data.notification?.body || data.body || 'Live count updated!';
    const psId = data.data?.psId || data.psId || '';
    const url = data.data?.url || (psId ? `/ps/${psId}` : '/');

    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [200, 100, 200],
        data: { url: url, psId: psId },
        tag: psId ? `sih-${psId}` : 'sih-alert',
        renotify: true
      })
    );
  } catch (err) {
    console.error('[SW] Push event handling error:', err);
  }
});

// Notification click event handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
