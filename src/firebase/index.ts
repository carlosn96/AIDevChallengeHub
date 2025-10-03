'use client';

import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { useFirebase, useUser } from './client-provider';

export function initializeFirebase(firebaseConfig?: FirebaseOptions) {
  const apps = getApps();
  const app = apps.length > 0 ? apps[0] : (firebaseConfig ? initializeApp(getFirebaseConfig()) : undefined);

  if (!app) {
    throw new Error("Firebase has not been initialized. Please ensure your environment variables are set up correctly.");
  }

  const auth = getAuth(app);
  const firestore = getFirestore(app);

  return { app, auth, firestore };
}

function getFirebaseConfig(): FirebaseOptions {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        throw new Error('Firebase configuration is missing. Make sure NEXT_PUBLIC_FIREBASE_* environment variables are set.');
    }

    return firebaseConfig;
}


export { useUser, useFirebase };
