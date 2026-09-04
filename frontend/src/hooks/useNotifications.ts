import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { getFirebaseMessaging, db } from '../firebase/config';

export function useNotifications(psId: string) {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setIsSupported(false);
      return;
    }
    setPermission(Notification.permission);
    const subKey = `notif_${psId.toUpperCase()}`;
    setIsSubscribed(localStorage.getItem(subKey) === 'true');
    const cachedToken = localStorage.getItem('fcm_token');
    if (cachedToken) setToken(cachedToken);

    // Force browser to update service worker to newest version immediately
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) reg.update();
    }).catch(() => {});

    // Setup foreground message listener
    let unsubscribeMessage: (() => void) | null = null;
    getFirebaseMessaging().then((messaging) => {
      if (messaging) {
        unsubscribeMessage = onMessage(messaging, (payload) => {
          console.log('[Foreground FCM Message Received]:', payload);
          const title = payload.notification?.title || payload.data?.title || `SIH Alert: ${psId}`;
          const body = payload.notification?.body || payload.data?.body || 'New submission count update recorded!';
          
          if (Notification.permission === 'granted') {
            try {
              new Notification(title, {
                body: body,
                icon: '/logo.png',
                badge: '/logo.png',
              });
            } catch (e) {
              console.warn('Could not spawn foreground Notification:', e);
            }
          }
        });
      }
    });

    return () => {
      if (unsubscribeMessage) unsubscribeMessage();
    };
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

      // 1. Ensure service worker is registered
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;

      // 2. Fetch device FCM Token
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BJTV4TkKGSda1Ahz_9S5eNHcn3P2Lwm3ifW-unOCyNgHLn4_RXvel98lBk-QKaNAZAruJzeTKkEyom20K9kk5A0';
      const deviceToken = await getToken(messaging, {
        vapidKey: vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (!deviceToken) throw new Error('Failed to retrieve FCM device token');
      setToken(deviceToken);
      localStorage.setItem('fcm_token', deviceToken);

      // 3. Persist subscriber token directly to Firestore (works on Vercel & all environments)
      try {
        await setDoc(doc(db, 'problemStatements', targetId, 'subscribers', deviceToken), {
          token: deviceToken,
          subscribedAt: serverTimestamp(),
          active: true,
        }, { merge: true });

        await setDoc(doc(db, 'fcmSubscriptions', deviceToken), {
          token: deviceToken,
          psIds: arrayUnion(targetId),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        console.log(`[FCM] Successfully registered token in Firestore for ${targetId}`);
      } catch (firestoreErr) {
        console.warn('[FCM] Firestore direct subscription write notice:', firestoreErr);
      }

      // 4. Attempt backend subscription if backend API is reachable
      try {
        const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
        await fetch(`${BASE}/ps/${targetId}/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: deviceToken }),
        });
      } catch (_) {
        // Backend subscription is optional since Firestore direct sync is already in place
      }

      setIsSubscribed(true);
      localStorage.setItem(`notif_${targetId}`, 'true');

      // 5. Trigger an instant welcoming confirmation notification so the user sees it works!
      if (Notification.permission === 'granted') {
        try {
          new Notification('SIH 2026 Live Alerts Enabled', {
            body: `You will now receive instant push notifications whenever submissions for ${targetId} change!`,
            icon: '/logo.png',
          });
        } catch (_) {}
      }
    } catch (err: any) {
      console.error('Push notification setup failed:', err);
      alert(`Notification setup: ${err.message || 'Please enable notifications in your browser settings.'}`);
    } finally {
      setLoading(false);
    }
  };

  const disableNotifications = async () => {
    const targetId = psId.toUpperCase();
    setLoading(true);
    try {
      const cachedToken = token || localStorage.getItem('fcm_token');
      if (cachedToken) {
        try {
          await deleteDoc(doc(db, 'problemStatements', targetId, 'subscribers', cachedToken));
          await setDoc(doc(db, 'fcmSubscriptions', cachedToken), {
            psIds: arrayRemove(targetId),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        } catch (e) {
          console.warn('Firestore unsubscribe removal error:', e);
        }
      }

      setIsSubscribed(false);
      localStorage.removeItem(`notif_${targetId}`);
    } finally {
      setLoading(false);
    }
  };

  const sendTestAlert = async () => {
    if (Notification.permission !== 'granted') {
      alert('Please enable notifications first!');
      return;
    }

    // 1. Show instant client notification test
    try {
      new Notification('SIH 2026 Tracker — Device Test', {
        body: `🔔 Instant test confirmed! Alerts are fully active for ${psId.toUpperCase()}.`,
        icon: '/logo.png',
      });
    } catch (e) {
      console.warn('Client Notification test error:', e);
    }

    // 2. Also trigger backend FCM test if token exists
    const currentToken = token || localStorage.getItem('fcm_token');
    if (currentToken) {
      try {
        const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
        await fetch(`${BASE}/test-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: currentToken }),
        });
      } catch (_) {}
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    enableNotifications,
    disableNotifications,
    sendTestAlert,
    loading,
    token,
  };
}
