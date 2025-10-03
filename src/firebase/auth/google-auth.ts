'use client';
import { initializeFirebase } from '@/firebase';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";

const { auth } = initializeFirebase();
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const ALLOWED_DOMAIN = "universidad-une.com";

export const handleGoogleSignIn = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        if (user.email && !user.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
            await signOut(auth);
            throw new Error(`Access denied. Only emails from @${ALLOWED_DOMAIN} are allowed.`);
        }
        
        return user;
    } catch (error: any) {
        // Handle specific error codes if needed
        if (error.code === 'auth/popup-closed-by-user') {
            // Don't throw an error if the user closes the popup
            return null;
        }
        console.error("Google Sign-In Error:", error);
        throw error; // Re-throw the error to be caught by the UI
    }
};

export const handleSignOut = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Sign Out Error:", error);
        throw error;
    }
}
