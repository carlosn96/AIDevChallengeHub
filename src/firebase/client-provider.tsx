'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeFirebase } from '.';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';

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
    const { app, auth, firestore } = initializeFirebase();
    setFirebaseInstances({ app, auth, firestore });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    }, (error) => {
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
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
