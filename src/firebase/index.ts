'use client';

import { initializeApp, getApps, type FirebaseOptions, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { useFirebase, useUser } from './client-provider';

function getFirebaseConfig(): FirebaseOptions {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
        throw new Error('Firebase configuration is missing or incomplete. Make sure NEXT_PUBLIC_FIREBASE_* environment variables are set in your .env file.');
    }

    return firebaseConfig;
}


let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

export function initializeFirebase() {
  if (typeof window !== 'undefined') {
    const apps = getApps();
    if (!apps.length) {
      const firebaseConfig = getFirebaseConfig();
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      firestore = getFirestore(app);
    } else {
      app = apps[0];
      auth = getAuth(app);
      firestore = getFirestore(app);
    }
  }
  
  return { app, auth, firestore };
}

export { useUser, useFirebase };
