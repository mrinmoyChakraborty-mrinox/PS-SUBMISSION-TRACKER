import { useState, useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { getFirebaseMessaging } from '../firebase/config';

export function useNotifications(psId: string) {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setIsSupported(false);
      return;
    }
    setPermission(Notification.permission);
    const subKey = `notif_${psId.toUpperCase()}`;
    setIsSubscribed(localStorage.getItem(subKey) === 'true');
  }, [psId]);

  const enableNotifications = async () => {
    const targetId = psId.toUpperCase();
    setLoading(true);
    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging) throw new Error('FCM not supported in this browser');

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') throw new Error('Browser notification permission denied');

      // Register service worker explicitly
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      
      // Inject Firebase web config into background service worker
      if (registration.active) {
        registration.active.postMessage({
          type: 'FIREBASE_CONFIG',
          config: {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID,
          }
        });
      }

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      const token = await getToken(messaging, { 
        vapidKey: vapidKey || undefined,
        serviceWorkerRegistration: registration 
      });
      
      const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
      const res = await fetch(`${BASE}/ps/${targetId}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (!res.ok) throw new Error('Failed to register subscription on server');

      setIsSubscribed(true);
      localStorage.setItem(`notif_${targetId}`, 'true');
    } catch (err) {
      console.error('Push notification setup failed:', err);
      alert('Notification setup failed: Make sure browser permissions are allowed.');
    } finally {
      setLoading(false);
    }
  };

  const disableNotifications = async () => {
    const targetId = psId.toUpperCase();
    setLoading(true);
    try {
      setIsSubscribed(false);
      localStorage.removeItem(`notif_${targetId}`);
    } finally {
      setLoading(false);
    }
  };

  return { isSupported, permission, isSubscribed, enableNotifications, disableNotifications, loading };
}
