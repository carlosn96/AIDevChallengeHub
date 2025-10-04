import { addDays, addHours, startOfDay } from 'date-fns';

export type User = {
  id: string;
  name: string;
  avatarUrl: string;
};

export type Team = {
  id: string;
  name: string;
  memberIds: string[];
};

export type ScheduleEvent = {
  id: string;
  title: string;
  type: 'conference' | 'workshop' | 'challenge' | 'ceremony';
  day: 'Day 1' | 'Day 2' | 'Day 3';
  startTime: Date;
  endTime: Date;
  description: string;
  location: string;
};

// Placeholder avatars from Unsplash
const userAvatars = [
    "https://images.unsplash.com/photo-1521119989659-a83eee488004?q=80&w=400",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400",
    "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?q=80&w=400",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400",
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=400",
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=400",
    "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=400"
];


export const users: User[] = [
  { id: 'user-1', name: 'Elena Rodriguez', avatarUrl: userAvatars[0] },
  { id: 'user-2', name: 'Ben Carter', avatarUrl: userAvatars[1] },
  { id: 'user-3', name: 'Aisha Khan', avatarUrl: userAvatars[2] },
  { id: 'user-4', name: 'Kenji Tanaka', avatarUrl: userAvatars[3] },
  { id: 'user-5', name: 'Sofia Rossi', avatarUrl: userAvatars[4] },
  { id: 'user-6', name: 'David Chen', avatarUrl: userAvatars[5] },
  { id: 'user-7', name: 'Fatima Al-Jamil', avatarUrl: userAvatars[6] },
  { id: 'user-8', name: 'Liam Murphy', avatarUrl: userAvatars[7] },
];

export const teams: Team[] = [
  {
    id: 'team-1',
    name: 'QuantumLeapers',
    memberIds: ['user-1', 'user-5'],
  },
  {
    id: 'team-2',
    name: 'CyberPioneers',
    memberIds: ['user-2', 'user-6'],
  },
  {
    id: 'team-3',
    name: 'DataVortex',
    memberIds: ['user-3', 'user-7'],
  },
  {
    id: 'team-4',
    name: 'SynapseBuilders',
    memberIds: ['user-4', 'user-8'],
  },
];

const today = startOfDay(new Date());

/**
 * @deprecated The schedule is now fetched dynamically from Firestore. This data is for reference only.
 */
export const schedule: ScheduleEvent[] = [
  {
    id: 'evt-1',
    title: 'Opening Ceremony & Keynote',
    type: 'ceremony',
    day: 'Day 1',
    startTime: addHours(today, 9),
    endTime: addHours(today, 10),
    description: 'Kicking off the event with an inspiring keynote on the future of AI.',
    location: 'Main Auditorium',
  },
  {
    id: 'evt-2',
    title: 'Workshop: Advanced LLM Techniques',
    type: 'workshop',
    day: 'Day 1',
    startTime: addHours(today, 10, 30),
    endTime: addHours(today, 12, 30),
    description: 'A deep dive into prompt engineering and fine-tuning for large language models.',
    location: 'Workshop Room A',
  },
  {
    id: 'evt-3',
    title: 'Challenge 1: AI for Sustainability',
    type: 'challenge',
    day: 'Day 1',
    startTime: addHours(today, 13, 30),
    endTime: addHours(today, 17, 30),
    description: 'Teams begin developing their solutions for the first challenge focused on environmental impact.',
    location: 'Hacker Zone',
  },
  {
    id: 'evt-4',
    title: 'Conference: The Ethics of AI',
    type: 'conference',
    day: 'Day 2',
    startTime: addHours(addDays(today, 1), 9),
    endTime: addHours(addDays(today, 1), 10),
    description: 'A panel discussion with industry leaders on the responsible development of AI.',
    location: 'Main Auditorium',
  },
  {
    id: 'evt-5',
    title: 'Challenge 2: Healthcare Innovation',
    type: 'challenge',
    day: 'Day 2',
    startTime: addHours(addDays(today, 1), 10, 30),
    endTime: addHours(addDays(today, 1), 17, 30),
    description: 'The second challenge pushes teams to innovate in the med-tech space.',
    location: 'Hacker Zone',
  },
  {
    id: 'evt-6',
    title: 'Workshop: Deploying AI at Scale',
    type: 'workshop',
    day: 'Day 2',
    startTime: addHours(addDays(today, 1), 14),
    endTime: addHours(addDays(today, 1), 16),
    description: 'Learn best practices for deploying and scaling machine learning models in production.',
    location: 'Workshop Room B',
  },
  {
    id: 'evt-7',
    title: 'Final Presentations & Judging',
    type: 'challenge',
    day: 'Day 3',
    startTime: addHours(addDays(today, 2), 9),
    endTime: addHours(addDays(today, 2), 13),
    description: 'Teams present their final projects to the judging panel.',
    location: 'Main Auditorium',
  },
  {
    id: 'evt-8',
    title: 'Awards & Closing Ceremony',
    type: 'ceremony',
    day: 'Day 3',
    startTime: addHours(addDays(today, 2), 15),
    endTime: addHours(addDays(today, 2), 16, 30),
    description: 'Announcing the winners and celebrating the achievements of all participants.',
    location: 'Main Auditorium',
  },
];
