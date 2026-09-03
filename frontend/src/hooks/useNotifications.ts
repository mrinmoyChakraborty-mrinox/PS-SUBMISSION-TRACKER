import { useState, useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { getFirebaseMessaging } from '../firebase/config';

export function useNotifications(psId: string) {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!('Notification' in window)) {
      setIsSupported(false);
      return;
    }
    setPermission(Notification.permission);
    const subKey = `notif_${psId}`;
    setIsSubscribed(localStorage.getItem(subKey) === 'true');
  }, [psId]);

  const enableNotifications = async () => {
    setLoading(true);
    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging) throw new Error('FCM not supported');

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') throw new Error('Permission not granted');

      const token = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
      
      const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
      const res = await fetch(`${BASE}/ps/${psId}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (!res.ok) throw new Error('Failed to subscribe on backend');

      setIsSubscribed(true);
      localStorage.setItem(`notif_${psId}`, 'true');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const disableNotifications = async () => {
    setLoading(true);
    try {
      // In a real app, you'd unsubscribe the token from the backend topic.
      // For this demo, we'll just clear local state.
      setIsSubscribed(false);
      localStorage.removeItem(`notif_${psId}`);
    } finally {
      setLoading(false);
    }
  };

  return { isSupported, permission, isSubscribed, enableNotifications, disableNotifications, loading };
}
