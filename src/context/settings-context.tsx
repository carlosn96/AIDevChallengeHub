'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db, isFirebaseConfigured, firebaseInitializationError } from '@/lib/firebase';
import { getUserRole, type UserRole } from '@/lib/roles';
import { findOrCreateUser, assignStudentToTeam } from '@/lib/user-actions';
import { type LoginSettings, type UserProfile } from '@/lib/db-types';
import { doc, onSnapshot } from 'firebase/firestore';

//const ALLOWED_DOMAINS = ["gmail.com", "universidad-une.com", "alumnos.udg.mx", "admin.com"];
const ALLOWED_DOMAINS = ["universidad-une.com"]; // for production env

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

  const handleSignOutAndSetError = useCallback(async (error: AuthError) => {
    if (auth) {
      await signOut(auth);
    }
    clearUserData();
    setAuthError(error);
    setIsLoading(false);
    setIsProcessingLogin(false);
  }, [clearUserData]);

  // EFFECT 1: Listen for settings changes
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

    return () => settingsUnsub();
  }, []);

  // EFFECT 2: Handle authentication state
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setIsLoading(false);
      return;
    }

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isProcessingLogin) return;

      if (!firebaseUser) {
        clearUserData();
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setIsProcessingLogin(true);
      setAuthError(null);

      try {
        const userEmail = firebaseUser.email;
        const userRole = await getUserRole(userEmail || '');
        const userDomain = userEmail?.split('@')[1];

        // This check must happen *after* role is determined
        if (loginSettings && !loginSettings.enabled && userRole !== 'Manager') {
          await handleSignOutAndSetError({ title: "Login Disabled", message: loginSettings.disabledMessage });
          return;
        }

        if (!userEmail || !userDomain || !ALLOWED_DOMAINS.includes(userDomain)) {
          await handleSignOutAndSetError({ title: "Unauthorized Domain", message: "Please sign in with an authorized domain account." });
          return;
        }

        if (!userRole) {
          await handleSignOutAndSetError({ title: "Access Denied", message: "Your account role is not authorized for this application." });
          return;
        }

        const userProfile = await findOrCreateUser(firebaseUser, userRole);
        
        if (userRole === 'Student' && userProfile && !userProfile.teamId) {
          await assignStudentToTeam(userProfile);
        }

        // Now that all background processing is done, set the final state
        setUser(firebaseUser);
        setRole(userRole);

      } catch (error) {
        console.error('Auth processing error:', error);
        await handleSignOutAndSetError({
          title: 'Authentication Error',
          message: 'An unexpected error occurred during login. Please try again.'
        });
      } finally {
        setIsLoading(false);
        setIsProcessingLogin(false);
      }
    });
    
    return () => authUnsub();
  }, [isProcessingLogin, loginSettings]); // Correct dependencies

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured || !auth) {
      setAuthError({ 
        title: 'Service Unavailable', 
        message: 'The authentication service is currently unavailable. Please try again later.' 
      });
      return;
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    setIsSigningIn(true);
    setAuthError(null);

    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.log("Sign-in popup was not completed by the user.");
      } else {
        setAuthError({ 
          title: "Authentication Error", 
          message: "Could not complete the sign-in process. Please try again." 
        });
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
      // Let onAuthStateChanged handle the state clearing
    } catch (error: any) {
      console.error("Sign Out Error:", error);
      setAuthError({ 
        title: 'Sign Out Error', 
        message: "There was a problem signing you out. Please try again." 
      });
    }
  };

  const value = {
    user,
    role,
    isLoading: isLoading || isProcessingLogin || (auth?.currentUser && !role), // More robust loading state
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
