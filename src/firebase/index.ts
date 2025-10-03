'use client';

import { initializeApp, getApps, type FirebaseOptions, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { useFirebase, useUser } from './client-provider';

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

function initializeFirebase() {
  if (typeof window !== 'undefined') {
    const apps = getApps();
    if (apps.length > 0) {
      app = apps[0];
      auth = getAuth(app);
      firestore = getFirestore(app);
    }
  }
  return { app, auth, firestore };
}

export { useUser, useFirebase, initializeFirebase };
