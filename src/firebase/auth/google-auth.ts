'use client';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const ALLOWED_DOMAIN = "universidad-une.com";

export const handleGoogleSignIn = async () => {
    const auth = getAuth(); // Get auth instance on demand
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        if (user.email && !user.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
            await signOut(auth);
            throw new Error(`Access denied. Only emails from @${ALLOWED_DOMAIN} are allowed.`);
        }
        
        return user;
    } catch (error: any) {
        if (error.code === 'auth/popup-closed-by-user') {
            console.log("Sign-in popup closed by user.");
            return null;
        }
        console.error("Google Sign-In Error:", error);
        throw new Error(error.message || "An unknown error occurred during sign-in.");
    }
};

export const handleSignOut = async () => {
    const auth = getAuth(); // Get auth instance on demand
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Sign Out Error:", error);
        throw error;
    }
}
