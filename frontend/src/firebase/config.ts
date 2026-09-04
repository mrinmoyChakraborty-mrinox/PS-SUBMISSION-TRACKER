import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBN2PSORimiPywgIFgWohA-ArH42dAWAXw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'sihtrackerv2.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'sihtrackerv2',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'sihtrackerv2.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '851602603334',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:851602603334:web:cecf543ea75cc1e6393947',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const getFirebaseMessaging = async () => {
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
};
