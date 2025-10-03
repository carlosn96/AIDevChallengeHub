'use client';
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, type Firestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let isFirebaseConfigured = false;
let firebaseInitializationError: string | null = null;

const areAllConfigValuesPresent = Object.values(firebaseConfig).every(val => typeof val === 'string' && val.length > 0);

if (areAllConfigValuesPresent) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseConfigured = true;

    if (typeof window !== 'undefined') {
      enableIndexedDbPersistence(db).catch((err: any) => {
        if (err.code === 'failed-precondition') {
          console.warn("Firestore persistence failed to enable due to multiple tabs.");
        } else if (err.code === 'unimplemented') {
          console.warn("Firestore persistence is not supported in this browser.");
        }
      });
    }
  } catch (error: any) {
    console.error("Firebase initialization error:", error);
    firebaseInitializationError = error.message || "An unknown error occurred during Firebase initialization.";
    app = null;
    auth = null;
    db = null;
    isFirebaseConfigured = false;
  }
} else {
    const missingKeys = Object.entries(firebaseConfig)
      .filter(([, value]) => !value)
      .map(([key]) => key);
    firebaseInitializationError = `Firebase configuration is missing or incomplete. Missing keys: ${missingKeys.join(', ')}`;
    console.log(firebaseInitializationError);
    isFirebaseConfigured = false;
}


export { app, auth, db, isFirebaseConfigured, firebaseInitializationError };
