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
  updateDoc,
  deleteDoc,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { type User } from 'firebase/auth';
import { type UserProfile, type Team, type ScheduleEvent, type Project, type Day, type LoginSettings } from './db-types';
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
           const memberIds = new Set(teamData.memberIds || []);
           if (memberIds.has(userProfile.uid)) {
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
      
      const querySnapshot = await getDocs(q);

      let teamId: string;
      let teamRef;

      if (!querySnapshot.empty) {
        const potentialTeamDoc = querySnapshot.docs[0];
        teamRef = potentialTeamDoc.ref;
        const teamDocInTransaction = await transaction.get(teamRef);

        if (teamDocInTransaction.exists()) {
            const teamData = teamDocInTransaction.data();
            const currentMemberIds = new Set(teamData.memberIds || []);
            
            if (currentMemberIds.size < MAX_TEAM_MEMBERS && !currentMemberIds.has(userProfile.uid)) {
              teamId = teamDocInTransaction.id;
              console.log(`Found open team inside transaction: ${teamId}`);
              
              currentMemberIds.add(userProfile.uid);
              
              transaction.update(teamRef, {
                memberIds: Array.from(currentMemberIds),
                memberCount: currentMemberIds.size,
              });

              transaction.update(userRef, { teamId });
              console.log(`User ${userProfile.uid} successfully assigned to team ${teamId}.`);
              return;
            }
        }
      }
      
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
  if (memberIds.length > 30) {
    console.warn("Fetching more than 30 team members, this may require batching.");
  }
  const q = query(usersRef, where('uid', 'in', memberIds.slice(0, 30)));
  
  try {
    const querySnapshot = await getDocs(q);
    const members = querySnapshot.docs.map(doc => doc.data() as UserProfile);
    return members;
  } catch (error) {
    console.error("Error fetching team members: ", error);
    return [];
  }
};

// --- Manager Actions ---

// Day Actions
export const createDay = async (day: Omit<Day, 'id' | 'createdAt'>): Promise<string> => {
  if (!db) throw new Error("Firestore is not initialized.");
  const newDocRef = await addDoc(collection(db, 'days'), {
    ...day,
    createdAt: serverTimestamp(),
  });
  return newDocRef.id;
};

export const updateDay = async (dayId: string, data: Partial<Omit<Day, 'id'>>) => {
  if (!db) throw new Error("Firestore is not initialized.");
  await updateDoc(doc(db, 'days', dayId), data);
};

export const deleteDay = async (dayId: string) => {
  if (!db) throw new Error("Firestore is not initialized.");
  const batch = writeBatch(db);

  // 1. Delete the day document
  batch.delete(doc(db, 'days', dayId));

  // 2. Find and delete all events associated with this day
  const eventsQuery = query(collection(db, 'schedule'), where('dayId', '==', dayId));
  const eventsSnapshot = await getDocs(eventsQuery);
  eventsSnapshot.forEach(eventDoc => {
    batch.delete(eventDoc.ref);
  });

  await batch.commit();
};


// Event Actions
export const createOrUpdateEvent = async (
    event: Omit<ScheduleEvent, 'id' | 'startTime' | 'endTime'> & {
        id?: string;
        startTime: Date | Timestamp;
        endTime: Date | Timestamp;
    }
): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");

    // Convert JS Dates to Firestore Timestamps if necessary
    const eventData = {
        ...event,
        startTime: event.startTime instanceof Date ? Timestamp.fromDate(event.startTime) : event.startTime,
        endTime: event.endTime instanceof Date ? Timestamp.fromDate(event.endTime) : event.endTime,
    };
    
    if (eventData.id) {
        const eventRef = doc(db, 'schedule', eventData.id);
        const { id, ...dataToUpdate } = eventData;
        await updateDoc(eventRef, dataToUpdate);
        return eventData.id;
    } else {
        const { id, ...dataToCreate } = eventData;
        const newDocRef = await addDoc(collection(db, 'schedule'), dataToCreate);
        return newDocRef.id;
    }
};

export const deleteEvent = async (eventId: string) => {
  if (!db) throw new Error("Firestore is not initialized.");
  const eventRef = doc(db, 'schedule', eventId);
  await deleteDoc(eventRef);
};


// Project Actions
export const createProject = async (project: Omit<Project, 'id' | 'createdAt'>): Promise<string> => {
  if (!db) throw new Error("Firestore is not initialized.");
  const collectionRef = collection(db, 'projects');
  const newDocRef = await addDoc(collectionRef, {
    ...project,
    createdAt: serverTimestamp(),
  });
  return newDocRef.id;
};

export const updateProject = async (projectId: string, data: Partial<Omit<Project, 'id'>>) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, data);
};

export const deleteProject = async (projectId: string) => {
  if (!db) throw new Error("Firestore is not initialized.");
  const batch = writeBatch(db);

  // 1. Delete the project document
  const projectRef = doc(db, 'projects', projectId);
  batch.delete(projectRef);

  // 2. Find all teams assigned to this project and un-assign them
  const teamsRef = collection(db, 'teams');
  const q = query(teamsRef, where('projectId', '==', projectId));
  const querySnapshot = await getDocs(q);
  
  querySnapshot.forEach((teamDoc) => {
    batch.update(teamDoc.ref, { projectId: null });
  });

  // 3. Commit the batch
  await batch.commit();
};

export const assignProjectToTeam = async (teamId: string, projectId: string | null) => {
  if (!db) throw new Error("Firestore is not initialized.");
  const teamRef = doc(db, 'teams', teamId);
  await updateDoc(teamRef, {
    projectId: projectId,
  });
};

// Settings Actions
export const updateLoginSettings = async (settings: LoginSettings) => {
  if (!db) throw new Error("Firestore is not initialized.");
  const settingsRef = doc(db, 'settings', 'login');
  await setDoc(settingsRef, settings, { merge: true });
};
