'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Calendar, FolderKanban, Loader2, Settings } from 'lucide-react';
import { type Team, type UserProfile, type Project, type ScheduleEvent, type Day, type LoginSettings } from '@/lib/db-types';
import TeamManagement from './team-management';
import ProjectManagement from './project-management';
import ScheduleManagement from './schedule-management';
import SettingsManagement from './settings-management';


export default function ManagerDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEvent[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [loginSettings, setLoginSettings] = useState<LoginSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) {
        setIsLoading(false);
        return;
    };

    const unsubscribes: (() => void)[] = [];
    const collections = {
        teams: collection(db, 'teams'),
        users: collection(db, 'users'),
        projects: collection(db, 'projects'),
        schedule: collection(db, 'schedule'),
        days: collection(db, 'days'),
        loginSettings: doc(db, 'settings', 'login'),
    };

    unsubscribes.push(onSnapshot(query(collections.teams, orderBy('createdAt', 'desc')), (snapshot) => {
        setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    }));

    unsubscribes.push(onSnapshot(query(collections.users, orderBy('createdAt', 'desc')), (snapshot) => {
        setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    }));
    
    unsubscribes.push(onSnapshot(query(collections.projects, orderBy('createdAt', 'desc')), (snapshot) => {
        setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    }));

    unsubscribes.push(onSnapshot(query(collections.schedule, orderBy('startTime', 'asc')), (snapshot) => {
        setSchedule(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleEvent)));
    }));
    
    unsubscribes.push(onSnapshot(query(collections.days, orderBy('date', 'asc')), (snapshot) => {
        setDays(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Day)));
    }));

    unsubscribes.push(onSnapshot(collections.loginSettings, (snapshot) => {
        if (snapshot.exists()) {
            setLoginSettings(snapshot.data() as LoginSettings);
        } else {
            // Initialize with default settings if it doesn't exist
            setLoginSettings({ enabled: true, disabledMessage: 'Login is currently disabled by an administrator.' });
        }
        setIsLoading(false);
    }));


    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading Manager Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Manager Dashboard
        </h1>
        <p className="text-muted-foreground">
          Oversee teams, schedule, and projects for the AIDevChallenge 2025.
        </p>
      </div>

      <Tabs defaultValue="teams" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="teams" className="h-full">
            <Users className="mr-2" />
            Team Management
          </TabsTrigger>
          <TabsTrigger value="schedule" className="h-full">
            <Calendar className="mr-2" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="projects" className="h-full">
            <FolderKanban className="mr-2" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="settings" className="h-full">
            <Settings className="mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="teams" className="mt-6">
            <TeamManagement teams={teams} users={users} projects={projects} />
        </TabsContent>
        <TabsContent value="schedule" className="mt-6">
            <ScheduleManagement schedule={schedule} days={days} />
        </TabsContent>
        <TabsContent value="projects" className="mt-6">
            <ProjectManagement projects={projects} />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
            <SettingsManagement settings={loginSettings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
