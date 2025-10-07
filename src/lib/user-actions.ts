
import { db, auth } from '@/lib/firebase';
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
  orderBy,
} from 'firebase/firestore';
import { type User, updateProfile as updateAuthProfile, deleteUser as deleteAuthUser } from 'firebase/auth';
import { type UserProfile, type Team, type ScheduleEvent, type Project, type Day, type LoginSettings, type Activity, type Group, type Rubric, type Evaluation } from './db-types';
import { type UserRole, getUserRole } from './roles';
import { v4 as uuidv4 } from 'uuid';

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
  const role = await getUserRole(user.email);

  if (!querySnapshot.empty) {
    // User with this email already exists
    const existingUserDoc = querySnapshot.docs[0];
    const existingUserProfile = existingUserDoc.data() as UserProfile;
    
    console.log(`User with email ${user.email} already exists.`);

    if (existingUserProfile.uid !== user.uid) {
      console.warn(`Existing user has a different UID. Auth UID: ${user.uid}, DB UID: ${existingUserProfile.uid}`);
    }

    // Optionally update display name, photo, and role as they might change.
    const updates: Partial<UserProfile> = {};
    if (existingUserProfile.displayName !== user.displayName) {
        updates.displayName = user.displayName;
    }
    if (existingUserProfile.photoURL !== user.photoURL) {
        updates.photoURL = user.photoURL;
    }
    if (existingUserProfile.role !== role) {
        updates.role = role;
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(existingUserDoc.ref, updates);
    }
    
    return { ...existingUserProfile, ...updates, uid: existingUserDoc.id };
  } else {
    // No user with this email, so create a new profile document.
    console.log(`Creating new user profile for ${user.uid} with email ${user.email}`);
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
    updatedAt: serverTimestamp(),
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

/**
 * Retrieves a set of activities by their IDs.
 * @param activityIds An array of activity IDs.
 * @returns A promise that resolves to an array of Activity objects.
 */
export const getActivitiesByIds = async (activityIds: string[]): Promise<Activity[]> => {
  if (!db || !activityIds || activityIds.length === 0) {
    return [];
  }
  const activitiesRef = collection(db, 'activities');
  const q = query(activitiesRef, where('__name__', 'in', activityIds));

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
  } catch (error) {
    console.error("Error fetching activities by IDs: ", error);
    return [];
  }
};


// --- Manager Actions ---

/**
 * Creates a new team manually.
 * @param name The name of the new team.
 */
export const createTeam = async (name: string): Promise<string> => {
  if (!db) throw new Error("Firestore is not initialized.");
  const newTeamData: Omit<Team, 'id'> = {
    name: name,
    memberIds: [],
    memberCount: 0,
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
  };
  const newDocRef = await addDoc(collection(db, 'teams'), newTeamData);
  return newDocRef.id;
};

/**
 * Updates a team's name manually.
 * @param teamId The ID of the team to update.
 * @param name The new name for the team.
 */
export const updateTeam = async (teamId: string, name: string) => {
  if (!db) throw new Error("Firestore is not initialized.");
  const teamRef = doc(db, 'teams', teamId);
  await updateDoc(teamRef, {
    name,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Reassigns a user from one team to another.
 * This is an atomic transaction.
 * @param userId The ID of the user to reassign.
 * @param oldTeamId The ID of the user's current team.
 * @param newTeamId The ID of the new team, or null to unassign.
 */
export const reassignUserToTeam = async (
  userId: string,
  oldTeamId: string,
  newTeamId: string | null
) => {
  if (!db) throw new Error("Firestore is not initialized.");
  if (oldTeamId === newTeamId) return;

  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', userId);
    const oldTeamRef = doc(db, 'teams', oldTeamId);
    
    // --- READS FIRST ---
    const oldTeamDoc = await transaction.get(oldTeamRef);
    if (!oldTeamDoc.exists()) {
      throw `Team with ID ${oldTeamId} does not exist.`;
    }
    const oldTeamData = oldTeamDoc.data() as Team;

    let newTeamData: Team | null = null;
    let newTeamRef: any = null;
    if (newTeamId) {
      newTeamRef = doc(db, 'teams', newTeamId);
      const newTeamDoc = await transaction.get(newTeamRef);
      if (!newTeamDoc.exists()) {
        throw `Team with ID ${newTeamId} does not exist.`;
      }
      newTeamData = newTeamDoc.data() as Team;
    }
    
    // --- THEN WRITES ---
    
    // 1. Update the user's teamId
    transaction.update(userRef, { teamId: newTeamId });

    // 2. Remove user from the old team
    const updatedOldMemberIds = oldTeamData.memberIds.filter(id => id !== userId);
    transaction.update(oldTeamRef, {
      memberIds: updatedOldMemberIds,
      memberCount: updatedOldMemberIds.length,
    });

    // 3. Add user to the new team (if a new team is provided)
    if (newTeamId && newTeamData && newTeamRef) {
      const updatedNewMemberIds = [...newTeamData.memberIds, userId];
      transaction.update(newTeamRef, {
        memberIds: updatedNewMemberIds,
        memberCount: updatedNewMemberIds.length,
      });
    }
  });
};


/**
 * Removes a user from their currently assigned team.
 * This function is non-destructive to the user account. It only updates the team and user documents.
 * @param teamId The ID of the team.
 * @param userId The ID of the user to remove.
 */
export const removeUserFromTeam = async (teamId: string, userId: string) => {
  if (!db) throw new Error("Firestore is not initialized.");
  const batch = writeBatch(db);

  // 1. Update the user document to remove their teamId
  const userRef = doc(db, 'users', userId);
  batch.update(userRef, { teamId: null });

  // 2. Update the team document to remove the user
  const teamRef = doc(db, 'teams', teamId);
  const teamSnap = await getDoc(teamRef);
  if (teamSnap.exists()) {
    const teamData = teamSnap.data() as Team;
    const updatedMemberIds = teamData.memberIds.filter(id => id !== userId);
    batch.update(teamRef, {
      memberIds: updatedMemberIds,
      memberCount: updatedMemberIds.length,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
};

/**
 * Deletes a team and un-assigns all its members.
 * This is non-destructive to user accounts.
 * @param teamId The ID of the team to delete.
 */
export const deleteTeam = async (teamId: string) => {
  if (!db) throw new Error("Firestore is not initialized.");
  const batch = writeBatch(db);
  const teamRef = doc(db, 'teams', teamId);

  // 1. Get the team document to find its members
  const teamSnap = await getDoc(teamRef);
  if (!teamSnap.exists()) {
    throw new Error("Team not found!");
  }
  const teamData = teamSnap.data() as Team;

  // 2. For each member, update their user profile to remove teamId
  if (teamData.memberIds && teamData.memberIds.length > 0) {
    teamData.memberIds.forEach(userId => {
      const userRef = doc(db, 'users', userId);
      batch.update(userRef, { teamId: null });
    });
  }

  // 3. Delete the team document
  batch.delete(teamRef);

  await batch.commit();
};


// Day Actions
export const createDay = async (day: Omit<Day, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  if (!db) throw new Error("Firestore is not initialized.");
  const newDocRef = await addDoc(collection(db, 'days'), {
    ...day,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return newDocRef.id;
};

export const updateDay = async (dayId: string, data: Partial<Omit<Day, 'id'>>) => {
  if (!db) throw new Error("Firestore is not initialized.");
  await updateDoc(doc(db, 'days', dayId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
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
    event: Omit<ScheduleEvent, 'id' | 'startTime' | 'endTime' | 'updatedAt'> & {
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
        updatedAt: serverTimestamp(),
    };
    
    if (eventData.id) {
        const eventRef = doc(db, 'schedule', eventData.id);
        const { id, ...dataToUpdate } = eventData;
        await updateDoc(eventRef, dataToUpdate);
        return eventData.id;
    } else {
        const { id, ...dataToCreate } = eventData;
        const newDocRef = await addDoc(collection(db, 'schedule'), {
          ...dataToCreate,
          createdAt: serverTimestamp() // Add createdAt for new events
        });
        return newDocRef.id;
    }
};

export const deleteEvent = async (eventId: string) => {
  if (!db) throw new Error("Firestore is not initialized.");
  const eventRef = doc(db, 'schedule', eventId);
  await deleteDoc(eventRef);
};


// Project Actions
export const createProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  if (!db) throw new Error("Firestore is not initialized.");
  const collectionRef = collection(db, 'projects');
  const newDocRef = await addDoc(collectionRef, {
    ...project,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return newDocRef.id;
};

export const updateProject = async (projectId: string, data: Partial<Omit<Project, 'id'>>) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
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
    updatedAt: serverTimestamp(),
  });
};

export const assignRubricToTeam = async (teamId: string, rubricId: string | null) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, {
        rubricId: rubricId,
        updatedAt: serverTimestamp(),
    });
};

// Activity Actions
export async function createActivity(data: { title: string; description?: string, product?: string }) {
  if (!db) throw new Error('Firebase not initialized');
  
  const activityRef = collection(db, 'activities');
  const newActivity = {
    title: data.title,
    description: data.description || '',
    product: data.product || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(activityRef, newActivity);
  return docRef.id;
}

export async function updateActivity(
  activityId: string, 
  data: { title: string; description?: string, product?: string }
) {
  if (!db) throw new Error('Firebase not initialized');
  
  const activityRef = doc(db, 'activities', activityId);
  await updateDoc(activityRef, {
    title: data.title,
    description: data.description || '',
    product: data.product || '',
    updatedAt: serverTimestamp(),
  });
}

export async function deleteActivity(activityId: string) {
  if (!db) throw new Error('Firebase not initialized');
  
  const activityRef = doc(db, 'activities', activityId);
  await deleteDoc(activityRef);
}

export async function assignActivitiesToTeam(teamId: string, activityIds: string[]) {
  if (!db) throw new Error('Firebase not initialized');
  
  const teamRef = doc(db, 'teams', teamId);
  await updateDoc(teamRef, {
    activityIds: activityIds,
    updatedAt: serverTimestamp(),
  });
}

export async function submitDeliverable(teamId: string, activityId: string, url: string) {
  if (!db) throw new Error('Firebase not initialized');

  const teamRef = doc(db, 'teams', teamId);
  await updateDoc(teamRef, {
    [`deliverables.${activityId}`]: url,
    updatedAt: serverTimestamp(),
  });
}


// Settings Actions
export const updateLoginSettings = async (settings: LoginSettings) => {
  if (!db) throw new Error("Firestore is not initialized.");
  const settingsRef = doc(db, 'settings', 'login');
  await setDoc(settingsRef, settings, { merge: true });
};


// User Profile Actions
export const updateUserProfile = async (uid: string, data: { displayName?: string; groupId?: string | null }) => {
    if (!db || !auth?.currentUser) throw new Error("Authentication or Firestore not initialized.");

    const userDocRef = doc(db, 'users', uid);
    
    // Prepare Firestore update data
    const updateData: { [key: string]: any } = {
        updatedAt: serverTimestamp(),
    };
    if (data.displayName !== undefined) {
        updateData.displayName = data.displayName;
    }
    // Handle groupId, allowing it to be set to null
    if (data.groupId !== undefined) {
        updateData.groupId = data.groupId;
    }
    
    // Update Firebase Auth profile if displayName is being changed
    if (data.displayName && auth.currentUser.displayName !== data.displayName) {
        await updateAuthProfile(auth.currentUser, {
            displayName: data.displayName
        });
    }

    // Update Firestore document
    await updateDoc(userDocRef, updateData);
};

export const deleteUserAccount = async (uid: string) => {
    if (!db) throw new Error("Firestore is not initialized.");

    const userDocRef = doc(db, 'users', uid);
    // This is a soft delete. We will mark the user as deleted.
    // In a real-world scenario, you would need a Cloud Function to handle the actual deletion from Firebase Auth
    // and to clean up other user-related data.
    await updateDoc(userDocRef, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
    });

    // We can also remove them from their team
    const userProfile = await getUserProfile(uid);
    if (userProfile?.teamId) {
        await removeUserFromTeam(userProfile.teamId, uid);
    }
};

// Group Actions
export const getGroups = async (): Promise<Group[]> => {
  if (!db) return [];
  const groupsRef = collection(db, "groups");
  const q = query(groupsRef, orderBy("name", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
};

export const createGroup = async (group: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const collectionRef = collection(db, 'groups');
    const newDocRef = await addDoc(collectionRef, {
      ...group,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newDocRef.id;
  };
  
  export const updateGroup = async (groupId: string, data: Partial<Omit<Group, 'id'>>) => {
      if (!db) throw new Error("Firestore is not initialized.");
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
  };
  
  export const deleteGroup = async (groupId: string) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const batch = writeBatch(db);
  
    // 1. Delete the group document
    const groupRef = doc(db, 'groups', groupId);
    batch.delete(groupRef);
  
    // 2. Find all users in this group and un-assign them
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('groupId', '==', groupId));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((userDoc) => {
      batch.update(userDoc.ref, { groupId: null });
    });
  
    // 3. Commit the batch
    await batch.commit();
  };

  export const assignGroupToUser = async (userId: string, groupId: string | null) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      groupId: groupId,
      updatedAt: serverTimestamp(),
    });
  };

// Rubric Actions
export const createRubric = async (data: Omit<Rubric, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  if (!db) throw new Error("Firestore is not initialized.");
  const collectionRef = collection(db, 'rubrics');
  const newDocRef = await addDoc(collectionRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return newDocRef.id;
};

export const updateRubric = async (rubricId: string, data: Partial<Omit<Rubric, 'id'>>) => {
  if (!db) throw new Error("Firestore is not initialized.");
  const rubricRef = doc(db, 'rubrics', rubricId);
  await updateDoc(rubricRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteRubric = async (rubricId: string) => {
  if (!db) throw new Error("Firestore is not initialized.");
  const rubricRef = doc(db, 'rubrics', rubricId);
  await deleteDoc(rubricRef);
};

// Evaluation Actions
export const getAllEvaluations = async (): Promise<Evaluation[]> => {
  if (!db) return [];
  const evaluationsRef = collection(db, 'evaluations');
  const snapshot = await getDocs(evaluationsRef);
  if (snapshot.empty) return [];
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation));
};

export const getEvaluation = async (teamId: string, projectId: string, evaluatorUid: string): Promise<Evaluation | null> => {
  if (!db) return null;
  const q = query(
    collection(db, 'evaluations'),
    where('teamId', '==', teamId),
    where('projectId', '==', projectId),
    where('evaluatorUid', '==', evaluatorUid),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Evaluation;
};

export const saveEvaluation = async (evaluationData: Omit<Evaluation, 'createdAt' | 'updatedAt'>): Promise<string> => {
  if (!db) throw new Error("Firestore not initialized");

  const { id, ...data } = evaluationData;

  const dataToSave = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (id) {
    const evalRef = doc(db, 'evaluations', id);
    await updateDoc(evalRef, dataToSave);
    return id;
  } else {
    const evalRef = collection(db, 'evaluations');
    const newDoc = await addDoc(evalRef, {
      ...dataToSave,
      createdAt: serverTimestamp(),
    });
    return newDoc.id;
  }
};

export const deleteEvaluationsForTeam = async (teamId: string) => {
  if (!db) throw new Error("Firestore is not initialized.");

  const q = query(collection(db, "evaluations"), where("teamId", "==", teamId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.log(`No evaluations found for team ${teamId}.`);
    return;
  }

  const batch = writeBatch(db);
  querySnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
};
