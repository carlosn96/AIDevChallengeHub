export type UserRole = 'Student' | 'Teacher' | 'Admin' | null;

// Regex patterns for email prefixes
//const studentPattern = /^(a\d{5,9}|\d{5,10})$/;
const studentPattern = /^[a-zA-Z]+\.[a-zA-Z]+$/;
const teacherPattern = /^[a-zA-Z]+\.[a-zA-Z]+$/;
const adminPattern = /^[a-zA-Z][a-zA-Z]+$/;

/**
 * Determines the user's role based on their email address.
 * The order of checks is important: Teacher, then Admin, then Student.
 * @param email The user's full email address.
 * @returns The role of the user, or null if no role matches.
 */
export function getUserRole(email: string): UserRole {
  if (!email || !email.includes('@')) {
    return null;
  }

  const prefix = email.split('@')[0];

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
  
  

  // If no pattern matches, return null
  return null;
}
