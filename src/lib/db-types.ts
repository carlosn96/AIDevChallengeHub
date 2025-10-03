import type { Timestamp } from 'firebase/firestore';

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'Student' | 'Teacher' | 'Admin' | null;
  teamId?: string;
  createdAt: Timestamp;
};

export type Team = {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: Timestamp;
};
