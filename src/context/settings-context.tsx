'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db, isFirebaseConfigured, firebaseInitializationError } from '@/lib/firebase';
import { getUserRole, type UserRole } from '@/lib/roles';
import { findOrCreateUser, assignStudentToTeam } from '@/lib/user-actions';

//const ALLOWED_DOMAIN = "universidad-une.com"; // primary domain
const ALLOWED_DOMAIN = "gmail.com"; // dev domain

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
      setAuthError({ 
        title: 'Configuration Error', 
        message: firebaseInitializationError || 'Authentication is currently unavailable.' 
      });
      setIsLoading(false);
      return;
    }

    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const userEmail = firebaseUser.email;
          if (userEmail && userEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
            
            const userRole = getUserRole(userEmail);
            
            if (userRole === 'Student') {
              const userProfile = await findOrCreateUser(firebaseUser);
              setUser(firebaseUser);
              setRole('Student');

              // If user is a student and has no team, try to assign one.
              if (userProfile && !userProfile.teamId) {
                  await assignStudentToTeam(userProfile);
              }
            } else if (userRole === 'Teacher' || userRole === 'Admin') {
                // For teachers and admins, we grant access without creating a DB record.
                // Their experience is managed by the role determined from their email.
                setUser(firebaseUser);
                setRole(userRole);
            } else {
              // Not a student, teacher, or admin, or role is null
              await signOut(auth);
              setAuthError({
                title: "Access Denied",
                message: "Your account role could not be determined or is not authorized."
              });
              clearUserData();
            }

          } else {
            await signOut(auth);
            setAuthError({
                title: "Unauthorized Domain",
                message: `Please sign in with an @${ALLOWED_DOMAIN} account.`
            });
            clearUserData();
          }
        } else {
          clearUserData();
        }
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
      setIsLoading(false);
    }
  }, [clearUserData]);

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured || !auth) {
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
        await signInWithPopup(auth, provider);
    } catch (error: any) {
        if (error.code === 'auth/popup-closed-by-user') {
            console.log("Sign-in popup closed by user.");
        } else if (error.code === 'auth/unauthorized-domain' || (error.customData?._tokenResponse?.oauthIdToken && !JSON.parse(atob(error.customData._tokenResponse.oauthIdToken.split('.')[1])).hd === ALLOWED_DOMAIN)) {
             setAuthError({
                title: "Unauthorized Domain",
                message: `Please sign in with an @${ALLOWED_DOMAIN} account.`
            });
        } else if (error.code === 'auth/cancelled-popup-request') {
             console.log("Sign-in popup request cancelled.");
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
