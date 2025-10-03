'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
import { getUserRole, type UserRole } from '@/lib/roles';
import { findOrCreateUser } from '@/lib/user-actions';

const ALLOWED_DOMAIN = "universidad-une.com";

type AuthError = {
  title: string;
  message: string;
};

type SettingsContextType = {
  user: User | null;
  role: UserRole | null;
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
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);

  const clearUserData = useCallback(() => {
    setUser(null);
    setRole(null);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
        setIsLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            setUser(firebaseUser);
            const userRole = firebaseUser.email ? getUserRole(firebaseUser.email) : null;
            setRole(userRole);

            if (userRole === 'Student') {
              await findOrCreateUser(firebaseUser);
            }
        } else {
            clearUserData();
        }
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [clearUserData]);

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured) {
        setAuthError({ title: 'Service Unavailable', message: 'The authentication service is currently unavailable. Please try again later.' });
        return;
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
      hd: ALLOWED_DOMAIN,
    });

    setIsSigningIn(true);
    setAuthError(null);

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const email = user.email;

        if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
            await signOut(auth);
            setAuthError({
                title: "Unauthorized Domain",
                message: `Access is restricted to accounts from the @${ALLOWED_DOMAIN} domain. Please use your institutional account.`
            });
            setIsSigningIn(false);
            return;
        }
    } catch (error: any) {
        if (error.code === 'auth/popup-closed-by-user') {
            console.log("Sign-in popup closed by user.");
        } else if (error.code === 'auth/unauthorized-domain') {
             setAuthError({
                title: "Unauthorized Domain",
                message: `Please sign in with an @${ALLOWED_DOMAIN} account.`
            });
        } else {
            setAuthError({ title: "Authentication Error", message: "Could not complete the sign-in process. Please try again." });
            console.error("Google Sign-In Error:", error);
        }
    } finally {
        setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (!isFirebaseConfigured) return;
    try {
      await signOut(auth);
      clearUserData();
    } catch (error: any) {
      console.error("Sign Out Error:", error);
      setAuthError({ title: 'Sign Out Error', message: "There was a problem signing you out. Please try again." });
    }
  };

  const value = {
    user,
    role,
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
