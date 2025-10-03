'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, onAuthStateChanged, type Auth, type User } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

interface FirebaseContextType {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  user: User | null;
  loading: boolean;
  error: string | null;
}

const LoadingScreen = () => (
    <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="text-center">
            <p className="text-xl font-semibold text-primary">Loading...</p>
        </div>
    </div>
)

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

// This component now handles the entire Firebase initialization lifecycle.
export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [firebaseState, setFirebaseState] = useState<{
    app: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
    user: User | null;
    loading: boolean;
    error: string | null;
  }>({
    loading: true,
    user: null,
    error: null,
    // @ts-ignore - these will be initialized in useEffect
    app: null, 
    // @ts-ignore
    auth: null,
    // @ts-ignore
    firestore: null
  });

  useEffect(() => {
    try {
      // Assemble the config object directly inside the client-side `useEffect`.
      const firebaseConfig: FirebaseOptions = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      // Validate the configuration.
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        throw new Error('Firebase configuration is missing or incomplete in .env file. Please add your Firebase project credentials to the .env file in the root of your project.');
      }

      // Initialize Firebase App, Auth, and Firestore.
      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const firestore = getFirestore(app);

      // Set up the authentication state listener.
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setFirebaseState(prevState => ({ ...prevState, user, loading: false }));
      }, (error) => {
        console.error("Auth State Change Error:", error);
        setFirebaseState(prevState => ({ ...prevState, error: error.message, loading: false }));
      });
      
      // Update state with initialized instances
      setFirebaseState(prevState => ({...prevState, app, auth, firestore }));

      // Cleanup the listener on unmount.
      return () => unsubscribe();
    } catch (e: any) {
      console.error("Firebase Initialization Error:", e);
      setFirebaseState(prevState => ({ ...prevState, error: e.message, loading: false }));
    }
  }, []);

  const contextValue = useMemo(() => firebaseState, [firebaseState]);

  if (contextValue.loading) {
    return <LoadingScreen />;
  }

  if (contextValue.error && !contextValue.app) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background text-red-500">
        <div className="text-center p-4 rounded-md border border-red-500/50 bg-red-500/10">
          <h1 className="text-xl font-bold mb-2">Firebase Error</h1>
          <p>{contextValue.error}</p>
        </div>
      </div>
    );
  }
  
  if (!contextValue.app) {
     return <LoadingScreen />;
  }

  return (
    <FirebaseContext.Provider value={contextValue}>
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
  if (context === undefined) {
    throw new Error('useUser must be used within a FirebaseClientProvider');
  }
  return { user: context.user, loading: context.loading, error: context.error };
};
