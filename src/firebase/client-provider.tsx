'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { FirebaseProvider } from './provider';
import { LoadingScreen } from '@/components/loading-screen';

// This component now handles the entire Firebase initialization lifecycle.
export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [instances, setInstances] = useState<{
    app: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const firebaseConfig: FirebaseOptions = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        throw new Error('Firebase configuration is missing. Please add your Firebase project credentials to the .env file.');
      }
      
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      const auth = getAuth(app);
      const firestore = getFirestore(app);
      setInstances({ app, auth, firestore });

    } catch (e: any) {
      console.error("Firebase Initialization Error:", e);
      setError(e.message);
    }
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background text-red-500">
        <div className="text-center p-4 rounded-md border border-red-500/50 bg-red-500/10">
          <h1 className="text-xl font-bold mb-2">Firebase Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!instances) {
    return <LoadingScreen />;
  }

  return (
    <FirebaseProvider
      app={instances.app}
      auth={instances.auth}
      firestore={instances.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
