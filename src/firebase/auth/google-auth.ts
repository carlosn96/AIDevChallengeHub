'use client';
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, provider } from '@/lib/firebase';

const ALLOWED_DOMAIN = "universidad-une.com";

export const handleGoogleSignIn = async () => {
    if (!auth || !provider) {
        throw new Error("Firebase has not been initialized correctly.");
    }
    
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Domain validation
        // if (user.email && !user.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        //     await signOut(auth); // Sign out the user immediately if domain is not allowed
        //     throw new Error(`Access denied. Only emails from @${ALLOWED_DOMAIN} are allowed.`);
        // }
        
        return user;
    } catch (error: any) {
        if (error.code === 'auth/popup-closed-by-user') {
            console.log("Sign-in popup closed by user.");
            return null;
        }
        console.error("Google Sign-In Error:", error);
        // Re-throw a more user-friendly error message to be displayed in the UI
        throw new Error(error.message || "An unknown error occurred during sign-in.");
    }
};

export const handleSignOut = async () => {
    if (!auth) {
        throw new Error("Firebase has not been initialized correctly.");
    }
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Sign Out Error:", error);
        throw error;
    }
}
