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

const areAllConfigValuesPresent = Object.values(firebaseConfig).every(val => typeof val === 'string' && val.length > 0);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (areAllConfigValuesPresent) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    
    auth = getAuth(app);
    db = getFirestore(app);

    if (typeof window !== 'undefined') {
      enableIndexedDbPersistence(db).catch((err: any) => {
        if (err.code === 'failed-precondition') {
          console.warn("Firestore persistence failed to enable due to multiple tabs.");
        } else if (err.code === 'unimplemented') {
          console.warn("Firestore persistence is not supported in this browser.");
        }
      });
    }
  } catch (error) {
    console.error("Firebase initialization error:", error);
    // If initialization fails, ensure services are null
    app = null;
    auth = null;
    db = null;
  }
} else {
    console.log("Firebase configuration is missing or incomplete.");
}

export const isFirebaseConfigured = !!app;

export { app, auth, db };
