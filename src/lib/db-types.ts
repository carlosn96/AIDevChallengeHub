import type { Timestamp } from 'firebase/firestore';

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'Student' | 'Teacher' | 'Admin' | 'Manager' | null;
  teamId?: string;
  createdAt: Timestamp;
};

export type Team = {
  id: string;
  name: string;
  memberIds: string[];
  projectId?: string;
  activityIds?: string[]; // NEW
  memberCount: number;
  createdAt: Timestamp;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  ods?: number[]; // Sustainable Development Goals (SDGs)
  createdAt: Timestamp;
};

// NEW Activity Type
export type Activity = {
  id: string;
  title: string;
  description: string;
  type: 'workshop' | 'conference' | 'task';
  sdg?: number; // Optional related SDG
  createdAt: Timestamp;
};

export type Day = {
  id: string;
  title: string;
  date: Timestamp;
  createdAt: Timestamp;
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
};

export type LoginSettings = {
  enabled: boolean;
  disabledMessage: string;
};
