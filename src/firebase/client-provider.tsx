'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, onAuthStateChanged, type Auth, type User } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Define the configuration directly in the provider.
const getFirebaseConfig = (): FirebaseOptions => {
    const firebaseConfig: FirebaseOptions = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        throw new Error('Firebase configuration is missing or incomplete in .env file. Please add your Firebase project credentials to the .env file in the root of your project.');
    }

    return firebaseConfig;
}


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

  if (loading) {
     return (
        <div className="flex items-center justify-center h-screen w-screen bg-background">
            <p className="text-xl font-semibold text-primary">Loading Firebase...</p>
        </div>
    )
  }

  if (error && !firebaseInstances) {
    return (
        <div className="flex items-center justify-center h-screen w-screen bg-background text-red-500">
            <div className="text-center p-4 rounded-md border border-red-500/50 bg-red-500/10">
                <h1 className="text-xl font-bold mb-2">Firebase Error</h1>
                <p>{error}</p>
            </div>
        </div>
    )
 }
 
  if (!firebaseInstances) {
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
    const context = useContext(FirebaseContext);
    // In this simplified setup, we can directly return what we need.
    return { user: context.user, loading: context.loading, error: context.error };
};
