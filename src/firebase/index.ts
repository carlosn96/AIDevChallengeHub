'use client';

import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export function initializeFirebase(firebaseConfig?: FirebaseOptions) {
  const apps = getApps();
  const app = apps.length > 0 ? apps[0] : (firebaseConfig ? initializeApp(firebaseConfig) : undefined);

  if (!app) {
    throw new Error("Firebase has not been initialized. Please ensure your environment variables are set up correctly.");
  }

  const auth = getAuth(app);
  const firestore = getFirestore(app);

  return { app, auth, firestore };
}

export { useUser } from './auth/use-user';
