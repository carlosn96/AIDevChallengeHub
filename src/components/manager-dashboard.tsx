'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Calendar, FolderKanban, Loader2, Settings, ListChecks } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Team, type UserProfile, type Project, type ScheduleEvent, type Day, type LoginSettings, type Activity } from '@/lib/db-types';
import TeamManagement from './team-management';
import ProjectManagement from './project-management';
import ScheduleManagement from './schedule-management';
import SettingsManagement from './settings-management';
import ActivityManagement from './activity-management';


export default function ManagerDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEvent[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loginSettings, setLoginSettings] = useState<LoginSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('teams');

  useEffect(() => {
    if (!db) {
        setIsLoading(false);
        return;
    };

    const unsubscribes: (() => void)[] = [];
    let loadingCounter = 7; // Increased to 7 for activities
    const onDataLoaded = () => {
        loadingCounter--;
        if (loadingCounter === 0) {
            setIsLoading(false);
        }
    };

    unsubscribes.push(onSnapshot(query(collection(db, 'teams'), orderBy('createdAt', 'desc')), (snapshot) => {
        setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
        onDataLoaded();
    }, () => onDataLoaded()));

    unsubscribes.push(onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), (snapshot) => {
        setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
        onDataLoaded();
    }, () => onDataLoaded()));
    
    unsubscribes.push(onSnapshot(query(collection(db, 'projects'), orderBy('createdAt', 'desc')), (snapshot) => {
        setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
        onDataLoaded();
    }, () => onDataLoaded()));

    unsubscribes.push(onSnapshot(query(collection(db, 'schedule'), orderBy('startTime', 'asc')), (snapshot) => {
        setSchedule(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleEvent)));
        onDataLoaded();
    }, () => onDataLoaded()));
    
    unsubscribes.push(onSnapshot(query(collection(db, 'days'), orderBy('date', 'asc')), (snapshot) => {
        setDays(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Day)));
        onDataLoaded();
    }, () => onDataLoaded()));
    
    unsubscribes.push(onSnapshot(query(collection(db, 'activities'), orderBy('createdAt', 'desc')), (snapshot) => {
        setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
        onDataLoaded();
    }, () => onDataLoaded()));

    unsubscribes.push(onSnapshot(doc(db, 'settings', 'login'), (snapshot) => {
        if (snapshot.exists()) {
            setLoginSettings(snapshot.data() as LoginSettings);
        } else {
            setLoginSettings({ enabled: true, disabledMessage: 'Login is currently disabled by an administrator.' });
        }
        onDataLoaded();
    }, () => onDataLoaded()));


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

  const tabItems = [
    { value: 'teams', label: 'Team Management', icon: Users },
    { value: 'schedule', label: 'Schedule', icon: Calendar },
    { value: 'projects', label: 'Projects', icon: FolderKanban },
    { value: 'activities', label: 'Activities', icon: ListChecks },
    { value: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Manager Dashboard
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Oversee teams, schedule, and projects for the AIDevChallenge 2025.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Mobile: Select Dropdown */}
        <div className="md:hidden mb-4">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full h-12 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tabItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SelectItem key={item.value} value={item.value} className="text-base py-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Tabs */}
        <TabsList className="hidden md:grid w-full grid-cols-5 h-12 mb-6">
          <TabsTrigger value="teams" className="h-full">
            <Users className="mr-2 h-5 w-5" />
            Team Management
          </TabsTrigger>
          <TabsTrigger value="schedule" className="h-full">
            <Calendar className="mr-2 h-5 w-5" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="projects" className="h-full">
            <FolderKanban className="mr-2 h-5 w-5" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="activities" className="h-full">
            <ListChecks className="mr-2 h-5 w-5" />
            Activities
          </TabsTrigger>
          <TabsTrigger value="settings" className="h-full">
            <Settings className="mr-2 h-5 w-5" />
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="teams" className="mt-0">
            <TeamManagement teams={teams} users={users} projects={projects} activities={activities} />
        </TabsContent>
        <TabsContent value="schedule" className="mt-0">
            <ScheduleManagement schedule={schedule} days={days} />
        </TabsContent>
        <TabsContent value="projects" className="mt-0">
            <ProjectManagement projects={projects} />
        </TabsContent>
        <TabsContent value="activities" className="mt-0">
            <ActivityManagement activities={activities} />
        </TabsContent>
        <TabsContent value="settings" className="mt-0">
            <SettingsManagement settings={loginSettings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
