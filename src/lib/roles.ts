'use client';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export type UserRole = 'Student' | 'Teacher' | 'Admin' | null;

// Regex patterns for email prefixes
const studentPattern = /^[a-zA-Z]+\.[a-zA-Z]+$/;
const teacherPattern = /^[a-zA-Z]+\.[a-zA-Z]+$/;
const adminPattern = /^[a-zA-Z][a-zA-Z]+$/;

/**
 * Checks if a user is an application administrator.
 * This checks for the user's email in the /permissions/administrators document.
 * @param email The user's email address.
 * @returns A promise that resolves to true if the user is an admin, false otherwise.
 */
const isAppAdmin = async (email: string): Promise<boolean> => {
  if (!db) return false;
  try {
    const adminDocRef = doc(db, 'permissions', 'administrators');
    const adminDocSnap = await getDoc(adminDocRef);

    if (adminDocSnap.exists()) {
      const adminData = adminDocSnap.data();
      const adminEmails: string[] = adminData.emails || [];
      return adminEmails.includes(email);
    }
    return false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

/**
 * Determines the user's role based on their email address.
 * It first checks for special App Admin privileges from the database.
 * Then, it falls back to email-based patterns for other roles.
 * @param email The user's full email address.
 * @returns The role of the user, or null if no role matches.
 */
export async function getUserRole(email: string): Promise<UserRole> {
  if (!email || !email.includes('@')) {
    return null;
  }

  // Highest priority: check if the user is a designated App Administrator.
  if (await isAppAdmin(email)) {
    return 'Admin';
  }

  const prefix = email.split('@')[0];
  /*
  // Students are identified by specific numeric or alphanumeric patterns
  if (studentPattern.test(prefix)) {
    return 'Student';
  }

  // Teachers must have a dot (e.g., john.doe)
  if (teacherPattern.test(prefix)) {
    return 'Teacher';
  }

  // Admins must NOT have a dot (e.g., jdoe)
  if (adminPattern.test(prefix) && !prefix.includes('.')) {
    return 'Admin';
  }
  */

  // If no pattern matches, return null.
  // return null;
  
  // Development environment fallback
  return 'Student';
}
