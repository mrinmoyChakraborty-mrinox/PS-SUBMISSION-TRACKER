importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Config is injected via self.__FIREBASE_CONFIG from the page, or you can hardcode here
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebase.initializeApp(event.data.config);
    const messaging = firebase.messaging();
    
    messaging.onBackgroundMessage((payload) => {
      const { title, body } = payload.notification;
      const psId = payload.data?.psId;
      
      self.registration.showNotification(title, {
        body,
        icon: '/sih-icon-192.png',
        badge: '/sih-badge-72.png',
        data: { url: `/ps/${psId}` },
        tag: `sih-${psId}`,
        renotify: true,
      });
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
