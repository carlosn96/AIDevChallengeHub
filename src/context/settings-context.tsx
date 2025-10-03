'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { getUserRole, type UserRole } from '@/lib/roles';

// --- DEV MODE: Dummy User ---
const DUMMY_USER: User = {
  uid: 'dev-user-id',
  email: 'dev.user@universidad-une.com',
  displayName: 'Development User',
  photoURL: 'https://i.pravatar.cc/150?u=dev-user',
  providerId: 'google.com',
  emailVerified: true,
  // This is a dummy object; it doesn't need all properties
} as User;
// --- END DEV MODE ---

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
  // --- DEV MODE ---
  handleDevLogin: (role: UserRole) => void;
  // --- END DEV MODE ---
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false); // --- DEV MODE: Set to false ---
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(true);

  const clearUserData = useCallback(() => {
    setUser(null);
    setRole(null);
  }, []);

  // --- DEV MODE: Auth listener commented out ---
  /*
  useEffect(() => {
    if (!auth) {
        setIsFirebaseConfigured(false);
        setIsLoading(false);
        return;
    }
    setIsFirebaseConfigured(true);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
            setUser(firebaseUser);
            if (firebaseUser.email) {
              setRole(getUserRole(firebaseUser.email));
            }
        } else {
            clearUserData();
        }
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [clearUserData]);
  */
  // --- END DEV MODE ---

  // --- DEV MODE: handleDevLogin function ---
  const handleDevLogin = (devRole: UserRole) => {
    let email = 'dev.user@universidad-une.com';
    if (devRole === 'Student') email = 'a1234567@universidad-une.com';
    if (devRole === 'Teacher') email = 'name.lastname@universidad-une.com';
    if (devRole === 'Admin') email = 'jdoe@universidad-une.com';

    setUser({ ...DUMMY_USER, email });
    setRole(devRole);
    setIsLoading(false);
  };
  // --- END DEV MODE ---

  const handleGoogleSignIn = async () => {
    if (!auth) {
        setAuthError({ title: 'Service Unavailable', message: 'The authentication service is currently unavailable. Please try again later.' });
        return;
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
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
        if (error.code === 'auth/unauthorized-domain') {
             setAuthError({
                title: "Unauthorized Domain",
                message: "This application is not authorized to run on this domain. Contact the administrator."
            });
        } else if (error.code !== 'auth/popup-closed-by-user') {
            setAuthError({ title: "Authentication Error", message: "Could not complete the sign-in process. Please try again." });
        }
        console.error("Google Sign-In Error:", error);
    } finally {
        setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    // --- DEV MODE: Sign out logic ---
    clearUserData();
    return;
    // --- END DEV MODE ---
    /*
    if (!auth) return;
    try {
      await signOut(auth);
      clearUserData();
    } catch (error: any) {
      console.error("Sign Out Error:", error);
      setAuthError({ title: 'Sign Out Error', message: "There was a problem signing you out. Please try again." });
    }
    */
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
    // --- DEV MODE ---
    handleDevLogin,
    // --- END DEV MODE ---
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
