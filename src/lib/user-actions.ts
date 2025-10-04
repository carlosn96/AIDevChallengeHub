
import { db } from '@/lib/firebase';
import { 
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp,
  limit,
  runTransaction,
  updateDoc
} from 'firebase/firestore';
import { type User } from 'firebase/auth';
import { type UserProfile, type Team } from './db-types';
import { getUserRole } from './roles';

const MAX_TEAM_MEMBERS = 3;

/**
 * Retrieves a user's profile from Firestore.
 * @param uid The user's unique ID.
 * @returns The user profile object or null if not found.
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!db) return null;
  const userDocRef = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);
  return userDocSnap.exists() ? (userDocSnap.data() as UserProfile) : null;
};

/**
 * Finds a user by email, or creates a new one if they don't exist.
 * This prevents duplicate user profiles for the same email address.
 * It also syncs the UID if it has changed (e.g., different auth provider).
 * @param user The Firebase Auth User object.
 * @returns The user's profile.
 */
export const findOrCreateUser = async (user: User): Promise<UserProfile | null> => {
  if (!db || !user.email) return null;

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where("email", "==", user.email), limit(1));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    // User with this email already exists
    const existingUserDoc = querySnapshot.docs[0];
    const existingUserProfile = existingUserDoc.data() as UserProfile;
    
    console.log(`User with email ${user.email} already exists.`);

    if (existingUserProfile.uid !== user.uid) {
      console.warn(`Existing user has a different UID. Auth UID: ${user.uid}, DB UID: ${existingUserProfile.uid}`);
    }

    // Optionally update display name and photo, as they might change.
    if (existingUserProfile.displayName !== user.displayName || existingUserProfile.photoURL !== user.photoURL) {
      await updateDoc(existingUserDoc.ref, {
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
    }
    
    return { ...existingUserProfile, uid: existingUserDoc.id };
  } else {
    // No user with this email, so create a new profile document.
    console.log(`Creating new user profile for ${user.uid} with email ${user.email}`);
    const newUserProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: getUserRole(user.email),
      createdAt: serverTimestamp() as any,
    };
    
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, newUserProfile);
    
    return newUserProfile;
  }
};


/**
 * Assigns a student user to a team with available spots, or creates a new team.
 * This operation is performed within a transaction to ensure atomicity and prevent race conditions.
 * @param userProfile The profile of the user to be assigned.
 */
export const assignStudentToTeam = async (userProfile: UserProfile) => {
  if (!db || userProfile.role !== 'Student') {
    return; // Only assign students.
  }

  console.log(`Attempting to assign team for student ${userProfile.uid}`);
  const userRef = doc(db, 'users', userProfile.uid);
  
  try {
    await runTransaction(db, async (transaction) => {
      // First, check if the user *already* has a valid team in a transaction-safe way.
      const userDocInTransaction = await transaction.get(userRef);
      const userProfileInTransaction = userDocInTransaction.data() as UserProfile;
      
      if (userProfileInTransaction.teamId) {
        const currentTeamRef = doc(db, 'teams', userProfileInTransaction.teamId);
        const teamDocInTransaction = await transaction.get(currentTeamRef);
        if (teamDocInTransaction.exists()) {
          console.log(`User ${userProfile.uid} is already in a valid team: ${userProfileInTransaction.teamId}. No action needed.`);
          return; // Exit if user already has a valid team.
        }
      }

      console.log(`User ${userProfile.uid} needs a team. Finding or creating one.`);
      
      const teamsRef = collection(db, 'teams');
      const q = query(
        teamsRef,
        where('memberCount', '<', MAX_TEAM_MEMBERS),
        limit(1)
      );
      
      // Execute the query within the transaction context.
      const querySnapshot = await getDocs(q);

      let teamId: string;
      let teamRef;

      if (!querySnapshot.empty) {
        // Found a team with an open spot
        const teamDoc = querySnapshot.docs[0];
        teamRef = teamDoc.ref;
        teamId = teamDoc.id;
        console.log(`Found open team: ${teamId}`);

        const currentMemberIds = teamDoc.data().memberIds || [];
        // Use a Set to prevent duplicates
        const newMemberIds = Array.from(new Set([...currentMemberIds, userProfile.uid]));
        
        transaction.update(teamRef, {
          memberIds: newMemberIds,
          memberCount: newMemberIds.length,
        });

      } else {
        // No open teams found, create a new one
        console.log("No open teams found, creating a new one.");
        const newTeamRef = doc(collection(db, 'teams'));
        teamId = newTeamRef.id;
        teamRef = newTeamRef;

        const newTeamData: Omit<Team, 'id'> = {
          name: `Team ${teamId.substring(0, 6)}`,
          memberIds: [userProfile.uid],
          memberCount: 1,
          createdAt: serverTimestamp() as any,
        };
        transaction.set(teamRef, newTeamData);
      }
      
      // Finally, update the user's profile with the new teamId
      transaction.update(userRef, { teamId });
      console.log(`User ${userProfile.uid} successfully assigned to team ${teamId}.`);
    });
  } catch (e) {
    console.error("Team assignment transaction failed: ", e);
  }
};

/**
 * Updates the name of a team in Firestore.
 * @param teamId The ID of the team to update.
 * @param newName The new name for the team.
 */
export const updateTeamName = async (teamId: string, newName: string) => {
  if (!db) {
    throw new Error("Firestore is not initialized.");
  }
  if (!teamId || !newName) {
    throw new Error("Team ID and new name are required.");
  }

  const teamRef = doc(db, 'teams', teamId);
  await updateDoc(teamRef, {
    name: newName,
  });
};

/**
 * Retrieves the profiles of all members of a team.
 * @param memberIds An array of user IDs.
 * @returns A promise that resolves to an array of UserProfile objects.
 */
export const getTeamMembers = async (memberIds: string[]): Promise<UserProfile[]> => {
  if (!db || memberIds.length === 0) {
    return [];
  }

  const usersRef = collection(db, 'users');
  // Firestore 'in' queries are limited to 30 items.
  // If you expect more, you'll need to batch the requests.
  if (memberIds.length > 30) {
    console.warn("Fetching more than 30 team members, this may require batching.");
  }
  const q = query(usersRef, where('uid', 'in', memberIds));
  
  try {
    const querySnapshot = await getDocs(q);
    const members = querySnapshot.docs.map(doc => doc.data() as UserProfile);
    return members;
  } catch (error) {
    console.error("Error fetching team members: ", error);
    return [];
  }
};
