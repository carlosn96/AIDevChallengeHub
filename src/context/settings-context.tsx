'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db, isFirebaseConfigured, firebaseInitializationError } from '@/lib/firebase';
import { getUserRole, type UserRole } from '@/lib/roles';
import { findOrCreateUser, assignStudentToTeam } from '@/lib/user-actions';
import { type LoginSettings } from '@/lib/db-types';
import { doc, getDoc } from 'firebase/firestore';

const ALLOWED_DOMAINS = ["universidad-une.com"];
//const ALLOWED_DOMAINS = ["gmail.com", "universidad-une.com", "alumnos.udg.mx", "admin.com"]; for dev env

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
  loginSettings: LoginSettings | null; // Keep for initial check
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

  const clearState = useCallback(() => {
    setUser(null);
    setRole(null);
    setAuthError(null);
    setIsLoading(false);
    setIsSigningIn(false);
  }, []);

  const handleSignOutAndSetError = useCallback(async (error: AuthError) => {
    if (auth) {
      await signOut(auth);
    }
    clearState();
    setAuthError(error);
    setIsLoading(false);
  }, [clearState]);
  
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      if (!isFirebaseConfigured) {
        setAuthError({ 
          title: 'Configuration Error', 
          message: firebaseInitializationError || 'Authentication is currently unavailable.' 
        });
      }
      setIsLoading(false);
      return;
    }

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        clearState();
        return;
      }
      
      setIsLoading(true);
      setAuthError(null);

      try {
        // Fetch login settings once on auth change to perform checks
        const settingsDoc = await getDoc(doc(db!, 'settings', 'login'));
        const currentLoginSettings = settingsDoc.exists() 
          ? (settingsDoc.data() as LoginSettings) 
          : { enabled: true, disabledMessage: 'Login is temporarily disabled.' };
        setLoginSettings(currentLoginSettings);

        const userEmail = firebaseUser.email;
        const userRole = await getUserRole(userEmail || '');
        const userDomain = userEmail?.split('@')[1];

        if (currentLoginSettings && !currentLoginSettings.enabled && userRole !== 'Manager') {
          await handleSignOutAndSetError({ title: "Login Disabled", message: currentLoginSettings.disabledMessage });
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

        const userProfile = await findOrCreateUser(firebaseUser);
        
        if (userRole === 'Student' && userProfile && !userProfile.teamId) {
          assignStudentToTeam(userProfile).catch(err => {
            console.error("Failed to assign student to team in background:", err);
          });
        }
        
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
      }
    });
    
    return () => authUnsub();
  }, [handleSignOutAndSetError]);

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
      // onAuthStateChanged will handle clearing state
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
