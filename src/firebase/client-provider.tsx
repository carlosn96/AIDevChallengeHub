'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps, type FirebaseOptions, type FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, type Auth, type User } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

interface FirebaseContextType {
  app: FirebaseApp | undefined;
  auth: Auth | undefined;
  firestore: Firestore | undefined;
  user: User | null;
  loading: boolean;
  error: string | null;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [firebaseInstances, setFirebaseInstances] = useState<{
    app: FirebaseApp | undefined;
    auth: Auth | undefined;
    firestore: Firestore | undefined;
  }>({ app: undefined, auth: undefined, firestore: undefined });

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
        throw new Error('Firebase configuration is missing. Make sure NEXT_PUBLIC_FIREBASE_* environment variables are set.');
      }

      const apps = getApps();
      const app = !apps.length ? initializeApp(firebaseConfig) : apps[0];
      const auth = getAuth(app);
      const firestore = getFirestore(app);
      
      setFirebaseInstances({ app, auth, firestore });

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      }, (error) => {
        setError(error.message);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }, []);

  return (
    <FirebaseContext.Provider value={{ ...firebaseInstances, user, loading, error }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseClientProvider');
  }
  return context;
};

export const useUser = () => {
    const context = useFirebase();
    return { user: context.user, loading: context.loading, error: context.error };
};
