import { addDays, addHours, startOfDay } from 'date-fns';

export type User = {
  id: string;
  name: string;
  avatarId: string;
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

export const users: User[] = [
  { id: 'user-1', name: 'Elena Rodriguez', avatarId: 'user-1' },
  { id: 'user-2', name: 'Ben Carter', avatarId: 'user-2' },
  { id: 'user-3', name: 'Aisha Khan', avatarId: 'user-3' },
  { id: 'user-4', name: 'Kenji Tanaka', avatarId: 'user-4' },
  { id: 'user-5', name: 'Sofia Rossi', avatarId: 'user-5' },
  { id: 'user-6', name: 'David Chen', avatarId: 'user-6' },
  { id: 'user-7', name: 'Fatima Al-Jamil', avatarId: 'user-7' },
  { id: 'user-8', name: 'Liam Murphy', avatarId: 'user-8' },
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

export const schedule: ScheduleEvent[] = [
  {
    id: 'evt-1',
    title: 'Opening Ceremony & Keynote',
    type: 'ceremony',
    day: 'Day 1',
    startTime: addHours(today, 9),
    endTime: addHours(today, 10),
    description: 'Kickstarting the event with an inspiring keynote on the future of AI.',
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
    location: 'Workshop Hall A',
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
    description: 'A panel discussion with industry leaders on responsible AI development.',
    location: 'Main Auditorium',
  },
  {
    id: 'evt-5',
    title: 'Challenge 2: Healthcare Innovation',
    type: 'challenge',
    day: 'Day 2',
    startTime: addHours(addDays(today, 1), 10, 30),
    endTime: addHours(addDays(today, 1), 17, 30),
    description: 'The second challenge pushes teams to innovate in the medical technology space.',
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
    location: 'Workshop Hall B',
  },
  {
    id: 'evt-7',
    title: 'Final Pitches & Judging',
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
