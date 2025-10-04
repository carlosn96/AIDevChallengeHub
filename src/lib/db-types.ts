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
  memberCount: number;
  createdAt: Timestamp;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  createdAt: Timestamp;
};

export type ScheduleEvent = {
  id: string;
  title: string;
  type: 'conference' | 'workshop' | 'challenge' | 'ceremony';
  day: 'Day 1' | 'Day 2' | 'Day 3';
  startTime: Timestamp;
  endTime: Timestamp;
  description: string;
  location: string;
};
