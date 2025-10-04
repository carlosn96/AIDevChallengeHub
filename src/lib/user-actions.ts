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
 * Checks if a user exists, and if not, creates their profile.
 * This function is intended to be called upon user login for ANY valid user.
 * @param user The Firebase Auth User object.
 * @returns The user's profile, either existing or newly created.
 */
export const findOrCreateUser = async (user: User): Promise<UserProfile | null> => {
  if (!db) return null;
  const userProfile = await getUserProfile(user.uid);

  if (userProfile) {
    console.log(`User ${user.uid} already exists.`);
    return userProfile;
  }

  console.log(`Creating new user profile for ${user.uid}`);
  const newUserProfile: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: getUserRole(user.email!),
    createdAt: serverTimestamp() as any,
  };
  
  const userDocRef = doc(db, 'users', user.uid);
  await setDoc(userDocRef, newUserProfile);
  
  return newUserProfile;
};


/**
 * Assigns a student user to a team with available spots, or creates a new team.
 * This operation is performed within a transaction to ensure atomicity.
 * @param userProfile The profile of the user to be assigned.
 */
export const assignStudentToTeam = async (userProfile: UserProfile) => {
  if (!db || userProfile.role !== 'Student' || userProfile.teamId) {
    return; // Only assign students without a team
  }

  console.log(`Assigning team for student ${userProfile.uid}`);
  const teamsRef = collection(db, 'teams');
  const userRef = doc(db, 'users', userProfile.uid);
  
  try {
    await runTransaction(db, async (transaction) => {
      // Find teams that are not full
      const q = query(
        teamsRef, 
        where('memberCount', '<', MAX_TEAM_MEMBERS), 
        limit(1)
      );
      
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
        const newMemberIds = [...currentMemberIds, userProfile.uid];
        
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

        const newTeamData = {
          name: `Team ${teamId.substring(0, 6)}`, // Simple name for now
          memberIds: [userProfile.uid],
          memberCount: 1,
          createdAt: serverTimestamp(),
        };
        transaction.set(teamRef, newTeamData);
      }
      
      // Finally, update the user's profile with the new teamId
      transaction.update(userRef, { teamId });
    });
    console.log(`Successfully assigned user ${userProfile.uid} to team.`);
  } catch (e) {
    console.error("Transaction failed: ", e);
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