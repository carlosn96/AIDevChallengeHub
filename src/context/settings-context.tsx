'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db, isFirebaseConfigured, firebaseInitializationError } from '@/lib/firebase';
import { getUserRole, type UserRole } from '@/lib/roles';
import { findOrCreateUser, assignStudentToTeam } from '@/lib/user-actions';
import { type LoginSettings } from '@/lib/db-types';
import { doc, onSnapshot } from 'firebase/firestore';

const ALLOWED_DOMAINS = ["gmail.com", "universidad-une.com"]; // dev and primary domains

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
  loginSettings: LoginSettings | null;
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
  const [loginSettings, setLoginSettings] = useState<LoginSettings | null>(null);

  const clearUserData = useCallback(() => {
    setUser(null);
    setRole(null);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setAuthError({ 
        title: 'Configuration Error', 
        message: firebaseInitializationError || 'Authentication is currently unavailable.' 
      });
      setIsLoading(false);
      return;
    }

    const settingsUnsub = onSnapshot(doc(db, 'settings', 'login'), (doc) => {
      if (doc.exists()) {
        setLoginSettings(doc.data() as LoginSettings);
      } else {
        setLoginSettings({ enabled: true, disabledMessage: 'Login is temporarily disabled.' });
      }
    });

    if (auth) {
      const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
        setIsLoading(true);
        setAuthError(null);

        if (firebaseUser) {
          const userEmail = firebaseUser.email;
          const userDomain = userEmail?.split('@')[1];

          if (!userEmail || !userDomain || !ALLOWED_DOMAINS.includes(userDomain)) {
            await signOut(auth);
            setAuthError({ title: "Unauthorized Domain", message: "Please sign in with an authorized domain account." });
            clearUserData();
            setIsLoading(false);
            return;
          }
          
          const userRole = await getUserRole(userEmail);

          if (!userRole) {
            await signOut(auth);
            setAuthError({ title: "Access Denied", message: "Your account role is not authorized for this application." });
            clearUserData();
            setIsLoading(false);
            return;
          }
          
          if (loginSettings && !loginSettings.enabled && userRole !== 'Manager') {
            await signOut(auth);
            setAuthError({ title: "Login Disabled", message: loginSettings.disabledMessage });
            clearUserData();
            setIsLoading(false);
            return;
          }

          setUser(firebaseUser);
          setRole(userRole);

          if (userRole === 'Student') {
            const userProfile = await findOrCreateUser(firebaseUser);
            if (userProfile && !userProfile.teamId) {
                await assignStudentToTeam(userProfile);
            }
          }

        } else {
          clearUserData();
        }
        setIsLoading(false);
      });
      
      return () => {
          authUnsub();
          settingsUnsub();
      };
    } else {
      setIsLoading(false);
      return () => {
          settingsUnsub();
      };
    }
  }, [clearUserData, loginSettings]);

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured || !auth) {
        setAuthError({ title: 'Service Unavailable', message: 'The authentication service is currently unavailable. Please try again later.' });
        return;
    }
    
    // Immediate feedback for non-managers if they try to sign in when it is disabled.
    // The authoritative check remains in onAuthStateChanged
    if (loginSettings && !loginSettings.enabled) {
        const tempRole = user ? role : null;
        if (tempRole && tempRole !== 'Manager') {
            setAuthError({ title: "Login Disabled", message: loginSettings.disabledMessage });
            return;
        }
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    setIsSigningIn(true);
    setAuthError(null);

    try {
        await signInWithPopup(auth, provider);
        // onAuthStateChanged will handle the rest of the logic
    } catch (error: any) {
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            console.log("Sign-in popup was not completed.");
        } else {
            setAuthError({ title: "Authentication Error", message: "Could not complete the sign-in process. Please try again." });
            console.error("Google Sign-In Error:", error);
        }
    } finally {
        setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (!isFirebaseConfigured || !auth) return;
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
    loginSettings,
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
