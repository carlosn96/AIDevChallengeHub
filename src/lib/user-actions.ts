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
    const role = await getUserRole(user.email);
    const newUserProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: role,
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
           const teamData = teamDocInTransaction.data();
           const memberIds = teamData.memberIds || [];
           if (memberIds.includes(userProfile.uid)) {
              console.log(`User ${userProfile.uid} is already a member of a valid team: ${userProfileInTransaction.teamId}. No action needed.`);
              return;
           }
        }
      }

      console.log(`User ${userProfile.uid} needs a team. Finding or creating one.`);
      
      const teamsRef = collection(db, 'teams');
      const q = query(
        teamsRef,
        where('memberCount', '<', MAX_TEAM_MEMBERS),
        limit(1)
      );
      
      // Execute the query to find an open team. Note: getDocs is not a transactional read.
      // We will re-check the team's status inside the transaction.
      const querySnapshot = await getDocs(q);

      let teamId: string;
      let teamRef;

      if (!querySnapshot.empty) {
        // Found a potential team. We must now read it transactionally.
        const potentialTeamDoc = querySnapshot.docs[0];
        teamRef = potentialTeamDoc.ref;
        const teamDocInTransaction = await transaction.get(teamRef);

        if (teamDocInTransaction.exists()) {
            const teamData = teamDocInTransaction.data();
            const currentMemberIds = teamData.memberIds || [];
            
            // Re-verify count and membership inside the transaction
            if (currentMemberIds.length < MAX_TEAM_MEMBERS && !currentMemberIds.includes(userProfile.uid)) {
              teamId = teamDocInTransaction.id;
              console.log(`Found open team inside transaction: ${teamId}`);
              
              const newMemberIds = [...currentMemberIds, userProfile.uid];
              
              transaction.update(teamRef, {
                memberIds: newMemberIds,
                memberCount: newMemberIds.length,
              });

              // Update the user's profile with the new teamId
              transaction.update(userRef, { teamId });
              console.log(`User ${userProfile.uid} successfully assigned to team ${teamId}.`);
              return; // Exit after successful assignment
            }
        }
      }
      
      // If we reach here, it means either no open teams were found, or the one we found was filled.
      // So, we create a new team.
      console.log("No open teams found or candidate team was filled. Creating a new one.");
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
      
      // Finally, update the user's profile with the new teamId
      transaction.update(userRef, { teamId });
      console.log(`User ${userProfile.uid} successfully assigned to new team ${teamId}.`);
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
