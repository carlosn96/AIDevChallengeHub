'use client';

import { type FirebaseOptions } from 'firebase/app';

export const firebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function getFirebaseConfig(): FirebaseOptions {
    if (!firebaseConfig || !firebaseConfig.apiKey) {
        throw new Error('Firebase configuration is missing or incomplete in .env file. Please add your Firebase project credentials to the .env file in the root of your project.');
    }
    return firebaseConfig;
}
