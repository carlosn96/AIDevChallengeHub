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
    title: 'Ceremonia de Apertura y Keynote',
    type: 'ceremony',
    day: 'Day 1',
    startTime: addHours(today, 9),
    endTime: addHours(today, 10),
    description: 'Iniciando el evento con una inspiradora keynote sobre el futuro de la IA.',
    location: 'Auditorio Principal',
  },
  {
    id: 'evt-2',
    title: 'Taller: Técnicas Avanzadas de LLM',
    type: 'workshop',
    day: 'Day 1',
    startTime: addHours(today, 10, 30),
    endTime: addHours(today, 12, 30),
    description: 'Una inmersión profunda en la ingeniería de prompts y el ajuste fino para modelos de lenguaje grandes.',
    location: 'Sala de Talleres A',
  },
  {
    id: 'evt-3',
    title: 'Reto 1: IA para la Sostenibilidad',
    type: 'challenge',
    day: 'Day 1',
    startTime: addHours(today, 13, 30),
    endTime: addHours(today, 17, 30),
    description: 'Los equipos comienzan a desarrollar sus soluciones para el primer reto enfocado en el impacto ambiental.',
    location: 'Zona Hacker',
  },
  {
    id: 'evt-4',
    title: 'Conferencia: La Ética de la IA',
    type: 'conference',
    day: 'Day 2',
    startTime: addHours(addDays(today, 1), 9),
    endTime: addHours(addDays(today, 1), 10),
    description: 'Una mesa redonda con líderes de la industria sobre el desarrollo responsable de la IA.',
    location: 'Auditorio Principal',
  },
  {
    id: 'evt-5',
    title: 'Reto 2: Innovación en el Sector Salud',
    type: 'challenge',
    day: 'Day 2',
    startTime: addHours(addDays(today, 1), 10, 30),
    endTime: addHours(addDays(today, 1), 17, 30),
    description: 'El segundo reto impulsa a los equipos a innovar en el espacio de la tecnología médica.',
    location: 'Zona Hacker',
  },
  {
    id: 'evt-6',
    title: 'Taller: Desplegando IA a Escala',
    type: 'workshop',
    day: 'Day 2',
    startTime: addHours(addDays(today, 1), 14),
    endTime: addHours(addDays(today, 1), 16),
    description: 'Aprende las mejores prácticas para desplegar y escalar modelos de machine learning en producción.',
    location: 'Sala de Talleres B',
  },
  {
    id: 'evt-7',
    title: 'Presentaciones Finales y Juzgamiento',
    type: 'challenge',
    day: 'Day 3',
    startTime: addHours(addDays(today, 2), 9),
    endTime: addHours(addDays(today, 2), 13),
    description: 'Los equipos presentan sus proyectos finales al panel de jueces.',
    location: 'Auditorio Principal',
  },
  {
    id: 'evt-8',
    title: 'Premiación y Ceremonia de Clausura',
    type: 'ceremony',
    day: 'Day 3',
    startTime: addHours(addDays(today, 2), 15),
    endTime: addHours(addDays(today, 2), 16, 30),
    description: 'Anunciando a los ganadores y celebrando los logros de todos los participantes.',
    location: 'Auditorio Principal',
  },
];
