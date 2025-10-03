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
  runTransaction
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
  const userDocRef = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);
  return userDocSnap.exists() ? (userDocSnap.data() as UserProfile) : null;
};

/**
 * Checks if a user exists, and if not, creates their profile and assigns them to a team.
 * This function is intended to be called upon user login.
 * @param user The Firebase Auth User object.
 */
export const findOrCreateUser = async (user: User) => {
  const userProfile = await getUserProfile(user.uid);

  if (userProfile) {
    console.log(`User ${user.uid} already exists.`);
    return; // User already exists, no action needed.
  }

  // User does not exist, create a new profile.
  console.log(`Creating new user profile for ${user.uid}`);
  const newUserProfile: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: getUserRole(user.email!),
    createdAt: serverTimestamp() as any, // Let the server set the timestamp
  };

  // The assignment logic should only run for students who are not yet in a team.
  if (newUserProfile.role === 'Student' && !newUserProfile.teamId) {
    await assignUserToTeam(newUserProfile);
  } else {
    // For non-students or students somehow already with a teamId, just save their profile.
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, newUserProfile);
  }
};

/**
 * Assigns a user to a team with available spots, or creates a new team if none are available.
 * This operation is performed within a transaction to ensure atomicity.
 * @param userProfile The profile of the user to be assigned.
 */
export const assignUserToTeam = async (userProfile: UserProfile) => {
  console.log(`Assigning team for user ${userProfile.uid}`);
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
      
      const querySnapshot = await transaction.get(q);

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
      transaction.set(userRef, { ...userProfile, teamId });
    });
    console.log(`Successfully assigned user ${userProfile.uid} to team.`);
  } catch (e) {
    console.error("Transaction failed: ", e);
  }
};
