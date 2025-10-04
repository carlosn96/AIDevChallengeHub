'use client';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export type UserRole = 'Student' | 'Teacher' | 'Admin' | 'Manager' | null;

/**
 * Checks if a user is an application manager by checking their email
 * in the /permissions/managers document.
 * @param email The user's email address.
 * @returns A promise that resolves to true if the user is a manager, false otherwise.
 */
const isAppManager = async (email: string): Promise<boolean> => {
  if (!db) return false;
  try {
    const managerDocRef = doc(db, 'permissions', 'managers');
    const managerDocSnap = await getDoc(managerDocRef);

    if (managerDocSnap.exists()) {
      const managerData = managerDocSnap.data();
      const managerEmails: string[] = managerData.emails || [];
      return managerEmails.includes(email);
    }
    return false;
  } catch (error) {
    console.error("Error checking manager status:", error);
    return false;
  }
};

/**
 * Determines the user's role based on their email address.
 * It first checks for special App Manager privileges from the database.
 * Then, it falls back to email-based patterns for other roles.
 * @param email The user's full email address.
 * @returns The role of the user, or null if no role matches.
 */
export async function getUserRole(email: string): Promise<UserRole> {
  if (!email || !email.includes('@')) {
    return null;
  }

  // Highest priority: check if the user is a designated App Manager.
  if (await isAppManager(email)) {
    return 'Manager';
  }
  
  // In a real scenario, you might have more complex logic here based on email patterns,
  // but for this challenge, we will default non-managers to 'Student' or 'Teacher' based on a simple heuristic.
  // For the purpose of this application, we'll assume any .com address not in the manager list is a student.
  if (email.endsWith('.com')) {
     return 'Teacher';
  }

  // Fallback for other domains or more complex rules.
  // For development, we'll default to student.
  return 'Student';
}
