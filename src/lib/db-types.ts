import type { Timestamp } from 'firebase/firestore';

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'Student' | 'Teacher' | 'Admin' | 'Manager' | null;
  teamId?: string;
  groupId?: string;
  createdAt: Timestamp;
};

export type Team = {
  id: string;
  name: string;
  memberIds: string[];
  projectId?: string;
  activityIds?: string[];
  memberCount: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type Group = {
  id: string;
  name: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  ods?: number[]; // Sustainable Development Goals (SDGs)
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type Activity = {
  id: string;
  title: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type Day = {
  id: string;
  title: string;
  date: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type ScheduleEvent = {
  id: string;
  dayId: string;
  title: string;
  type: 'conference' | 'workshop' | 'challenge' | 'ceremony';
  startTime: Timestamp;
  endTime: Timestamp;
  description: string;
  location: string;
  updatedAt?: Timestamp;
};

export type LoginSettings = {
  enabled: boolean;
  disabledMessage: string;
};
