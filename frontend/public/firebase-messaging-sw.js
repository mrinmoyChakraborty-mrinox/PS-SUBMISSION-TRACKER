// Firebase Messaging Service Worker for SIH 2026 Live Submission Tracker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// 1. Immediate activation so all users instantly get the latest service worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 2. Initialize Firebase with current sihtrackerv2 config
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

// 3. Setup Firebase Background Message Handler
try {
  const messaging = firebase.messaging();
  
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] onBackgroundMessage payload:', payload);

    const title = payload.notification?.title || payload.data?.title || 'SIH 2026 Live Submission Alert';
    const body = payload.notification?.body || payload.data?.body || 'New submission count update recorded.';
    const psId = payload.data?.psId || '';
    const url = payload.data?.url || (psId ? `/ps/${psId}` : '/');

    const options = {
      body: body,
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [200, 100, 200],
      data: { url: url, psId: psId },
      tag: psId ? `sih-${psId}` : 'sih-alert',
      renotify: true,
      requireInteraction: true
    };

    return self.registration.showNotification(title, options);
  });
} catch (e) {
  console.warn('[SW] Firebase background messaging init error:', e);
}

// 4. Click action handler: opens or focuses the specific PS page
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
