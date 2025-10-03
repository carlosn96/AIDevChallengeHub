'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, type Auth, type User } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFirebaseConfig } from './config';

interface FirebaseContextType {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  user: User | null;
  loading: boolean;
  error: string | null;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [firebaseInstances, setFirebaseInstances] = useState<{
    app: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
  } | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const config = getFirebaseConfig();
      const app = getApps().length ? getApps()[0] : initializeApp(config);
      const auth = getAuth(app);
      const firestore = getFirestore(app);
      
      setFirebaseInstances({ app, auth, firestore });

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      }, (error) => {
        console.error("Auth State Change Error:", error);
        setError(error.message);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e: any) {
      console.error("Firebase Initialization Error:", e);
      setError(e.message);
      setLoading(false);
    }
  }, []);

  if (!firebaseInstances) {
     if (error) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-background text-red-500">
                <div className="text-center p-4 rounded-md border border-red-500/50 bg-red-500/10">
                    <h1 className="text-xl font-bold mb-2">Firebase Error</h1>
                    <p>{error}</p>
                </div>
            </div>
        )
     }
    return (
        <div className="flex items-center justify-center h-screen w-screen bg-background">
            <p className="text-xl font-semibold text-primary">Initializing Firebase...</p>
        </div>
    )
  }

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
