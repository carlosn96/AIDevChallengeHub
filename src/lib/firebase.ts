'use client';
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, type Firestore } from "firebase/firestore";

const firebaseConfig = {
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

const configValues = Object.values(firebaseConfig);
const isFirebaseConfigured = configValues.every(val => typeof val === 'string' && val.length > 0);

if (isFirebaseConfigured) {
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
    
    if (app) {
        auth = getAuth(app);
        db = getFirestore(app);

        if (typeof window !== 'undefined') {
            try {
                enableIndexedDbPersistence(db);
            } catch (err: any) {
                 if (err.code === 'failed-precondition') {
                    console.warn("Firestore persistence failed to enable due to multiple tabs.");
                } else if (err.code === 'unimplemented') {
                    console.warn("Firestore persistence is not supported in this browser.");
                }
            }
        }
    }
}

export { app, auth, db, isFirebaseConfigured };
