'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, FolderKanban, Loader2, Settings, ListChecks, Group, Briefcase, FileCheck, Trophy, ArrowLeft, Activity as ActivityIcon, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Team, type UserProfile, type Project, type ScheduleEvent, type Day, type LoginSettings, type Activity, type Group as GroupType, type Rubric } from '@/lib/db-types';
import TeamManagement from './team-management';
import TeamCrudManagement from './team-crud-management';
import ProjectManagement from './project-management';
import ScheduleManagement from './schedule-management';
import SettingsManagement from './settings-management';
import ActivityManagement from './activity-management';
import GroupManagement from './group-management';
import RubricManagement from './rubric-management';
import EvaluationResults from './evaluation-results';


export default function ManagerDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEvent[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loginSettings, setLoginSettings] = useState<LoginSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
        setIsLoading(false);
        return;
    };

    const unsubscribes: (() => void)[] = [];
    let loadingCounter = 9;
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
        setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
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
    
    unsubscribes.push(onSnapshot(query(collection(db, 'groups'), orderBy('createdAt', 'desc')), (snapshot) => {
        setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupType)));
        onDataLoaded();
    }, () => onDataLoaded()));

    unsubscribes.push(onSnapshot(query(collection(db, 'rubrics'), orderBy('createdAt', 'desc')), (snapshot) => {
        setRubrics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rubric)));
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

  const menuItems = [
    { 
      id: 'teams', 
      label: 'Team Assignments', 
      icon: Users, 
      color: 'from-blue-500 to-cyan-500',
      description: 'Assign members to teams'
    },
    { 
      id: 'teams-crud', 
      label: 'Team Administration', 
      icon: Briefcase, 
      color: 'from-purple-500 to-pink-500',
      description: 'Create and manage teams'
    },
    { 
      id: 'schedule', 
      label: 'Schedule', 
      icon: Calendar, 
      color: 'from-green-500 to-emerald-500',
      description: 'Manage event schedule'
    },
    { 
      id: 'projects', 
      label: 'Projects', 
      icon: FolderKanban, 
      color: 'from-orange-500 to-red-500',
      description: 'Oversee all projects'
    },
    { 
      id: 'activities', 
      label: 'Activities', 
      icon: ListChecks, 
      color: 'from-teal-500 to-cyan-500',
      description: 'Manage activities'
    },
    { 
      id: 'groups', 
      label: 'Groups', 
      icon: Group, 
      color: 'from-indigo-500 to-blue-500',
      description: 'Organize user groups'
    },
    { 
      id: 'rubrics', 
      label: 'Rubrics', 
      icon: FileCheck, 
      color: 'from-amber-500 to-orange-500',
      description: 'Setup evaluation rubrics'
    },
    { 
      id: 'results', 
      label: 'Results', 
      icon: Trophy, 
      color: 'from-yellow-500 to-amber-500',
      description: 'View evaluation results'
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings, 
      color: 'from-gray-500 to-slate-500',
      description: 'System configuration'
    },
  ];

  // Si hay una vista activa, mostrarla
  if (activeView) {
    return (
      <div className="space-y-4 md:space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setActiveView(null)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">
              {menuItems.find(m => m.id === activeView)?.label}
            </h2>
            <p className="text-sm text-muted-foreground">
              {menuItems.find(m => m.id === activeView)?.description}
            </p>
          </div>
        </div>

        <div className="mt-6">
          {activeView === 'teams' && <TeamManagement teams={teams} users={users} projects={projects} activities={activities} groups={groups} rubrics={rubrics} />}
          {activeView === 'teams-crud' && <TeamCrudManagement teams={teams} users={users} />}
          {activeView === 'schedule' && <ScheduleManagement schedule={schedule} days={days} />}
          {activeView === 'projects' && <ProjectManagement projects={projects} />}
          {activeView === 'activities' && <ActivityManagement activities={activities} />}
          {activeView === 'groups' && <GroupManagement groups={groups} users={users} />}
          {activeView === 'rubrics' && <RubricManagement rubrics={rubrics} />}
          {activeView === 'results' && <EvaluationResults teams={teams} projects={projects} />}
          {activeView === 'settings' && <SettingsManagement settings={loginSettings} />}
        </div>
      </div>
    );
  }

  // Vista principal del dashboard
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent">
          Manager Dashboard
        </h1>
        <p className="text-base md:text-lg text-muted-foreground">
          AIDevChallenge 2025 - Central Command Center
        </p>
      </div>

      {/* Navigation Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Management Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card 
                key={item.id}
                className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden border-2 hover:border-primary/50"
                onClick={() => setActiveView(item.id)}
              >
                <div className={`h-2 bg-gradient-to-r ${item.color}`} />
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${item.color} shadow-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="group-hover:text-primary transition-colors">
                      {item.label}
                    </span>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {item.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
