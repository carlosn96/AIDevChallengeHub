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
  const [isProcessingLogin, setIsProcessingLogin] = useState(false);


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
      const newLoginSettings = doc.exists() 
        ? (doc.data() as LoginSettings) 
        : { enabled: true, disabledMessage: 'Login is temporarily disabled.' };
      setLoginSettings(newLoginSettings);
    });

    if (!auth) {
      setIsLoading(false);
      return () => settingsUnsub();
    }

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (isProcessingLogin) return;
        setIsLoading(true);

        if (firebaseUser) {
            setIsProcessingLogin(true);
            const userEmail = firebaseUser.email;
            const userRole = await getUserRole(userEmail || '');

            if (loginSettings && !loginSettings.enabled && userRole !== 'Manager') {
                setAuthError({ title: "Login Disabled", message: loginSettings.disabledMessage });
                await signOut(auth);
                clearUserData();
                setIsLoading(false);
                setIsProcessingLogin(false);
                return;
            }

            const userDomain = userEmail?.split('@')[1];
            if (!userEmail || !userDomain || !ALLOWED_DOMAINS.includes(userDomain)) {
                setAuthError({ title: "Unauthorized Domain", message: "Please sign in with an authorized domain account." });
                await signOut(auth);
                clearUserData();
                setIsLoading(false);
                setIsProcessingLogin(false);
                return;
            }

            if (!userRole) {
                setAuthError({ title: "Access Denied", message: "Your account role is not authorized for this application." });
                await signOut(auth);
                clearUserData();
                setIsLoading(false);
                setIsProcessingLogin(false);
                return;
            }
            
            // If all checks pass, set the user
            setUser(firebaseUser);
            setRole(userRole);

            if (userRole === 'Student') {
                const userProfile = await findOrCreateUser(firebaseUser);
                if (userProfile && !userProfile.teamId) {
                    await assignStudentToTeam(userProfile);
                }
            }
            setIsProcessingLogin(false);
        } else {
            clearUserData();
        }
        setIsLoading(false);
    });
    
    return () => {
        authUnsub();
        settingsUnsub();
    };
  }, [loginSettings]);

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured || !auth) {
        setAuthError({ title: 'Service Unavailable', message: 'The authentication service is currently unavailable. Please try again later.' });
        return;
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    setIsSigningIn(true);
    setAuthError(null);

    try {
        await signInWithPopup(auth, provider);
        // onAuthStateChanged will handle the rest of the logic.
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
      setAuthError(null);
    } catch (error: any) {
      console.error("Sign Out Error:", error);
      setAuthError({ title: 'Sign Out Error', message: "There was a problem signing you out. Please try again." });
    }
  };

  const value = {
    user,
    role,
    isLoading: isLoading && !isProcessingLogin,
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
