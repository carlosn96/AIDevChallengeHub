export type UserRole = 'Student' | 'Teacher' | 'Admin' | null;

// Regex patterns for email prefixes
const studentPattern = /^(a\d{5,9}|\d{5,10}|[a-zA-Z0-9]{5,10})$/;
const teacherPattern = /^[a-zA-Z]+\.[a-zA-Z]+$/;
const adminPattern = /^[a-zA-Z][a-zA-Z]+$/;

/**
 * Determines the user's role based on their email address.
 * @param email The user's full email address.
 * @returns The role of the user, or null if no role matches.
 */
export function getUserRole(email: string): UserRole {
  if (!email || !email.includes('@')) {
    return null;
  }

  const prefix = email.split('@')[0];

  if (teacherPattern.test(prefix)) {
    return 'Teacher';
  }

  if (adminPattern.test(prefix)) {
    // Admin pattern is less specific, so it could catch teacher patterns if not checked first.
    // To be safer, we check if it's not a teacher pattern.
    if (prefix.includes('.')) return 'Teacher';
    // A more specific check for admin could be initials + lastname, e.g. jdoe
    // The provided pattern is simple, we will assume it does not contain a dot.
    return 'Admin';
  }
  
  if (studentPattern.test(prefix)) {
    // Student pattern can be broad, let's add extra checks to avoid false positives
    if (prefix.includes('.')) return null; // Students shouldn't have dots
    return 'Student';
  }

  return null;
}
