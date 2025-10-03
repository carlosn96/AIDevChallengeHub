'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, provider, isFirebaseConfigured } from '@/lib/firebase';

const ALLOWED_DOMAIN = "universidad-une.com";

type AuthError = {
  title: string;
  message: string;
};

type SettingsContextType = {
  user: User | null;
  isLoading: boolean;
  isSigningIn: boolean;
  isFirebaseConfigured: boolean;
  authError: AuthError | null;
  handleGoogleSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);

  const clearUserData = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    if (!auth) {
        setIsLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setIsLoading(true);
        if (firebaseUser) {
            setUser(firebaseUser);
        } else {
            clearUserData();
        }
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [clearUserData]);

  const handleGoogleSignIn = async () => {
    if (!auth || !provider) {
        setAuthError({ title: 'Configuration Error', message: 'Firebase is not configured correctly.' });
        return;
    }
    setIsSigningIn(true);
    setAuthError(null);

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const email = user.email;

        if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
            await signOut(auth);
            setAuthError({
                title: "Dominio no Autorizado",
                message: `El acceso está restringido a cuentas del dominio @${ALLOWED_DOMAIN}. Por favor, utiliza tu cuenta institucional.`
            });
            setIsSigningIn(false);
            return;
        }
        // onAuthStateChanged will handle setting the user
    } catch (error: any) {
        if (error.code !== 'auth/popup-closed-by-user') {
            setAuthError({ title: "Authentication Error", message: error.message });
        }
        console.error("Google Sign-In Error:", error);
    } finally {
        setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      clearUserData();
    } catch (error: any) {
      console.error("Sign Out Error:", error);
      setAuthError({ title: 'Sign-Out Error', message: error.message });
    }
  };

  const value = {
    user,
    isLoading,
    isSigningIn,
    isFirebaseConfigured,
    authError,
    handleGoogleSignIn,
    handleSignOut,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
