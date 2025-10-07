'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import ScheduleDashboard from '@/components/schedule-dashboard';
import StudentDashboard from '@/components/student-dashboard';
import ManagerDashboard from '@/components/manager-dashboard';
import { useSettings } from '@/context/settings-context';
import { LoadingScreen } from '@/components/loading-screen';
import { type Team, type Project, type Rubric } from '@/lib/db-types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect } from 'react';
import { Calendar, Edit, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function TeacherEvaluationList() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [projects, setProjects] = useState<Map<string, Project>>(new Map());
    const [rubrics, setRubrics] = useState<Map<string, Rubric>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!db) return;

        const teamsQuery = query(collection(db, 'teams'));

        const unsubTeams = onSnapshot(teamsQuery, (snapshot) => {
            const allTeams: Team[] = [];
            snapshot.forEach(doc => {
                allTeams.push({ id: doc.id, ...doc.data() } as Team);
            });
            
            const fetchedTeams = allTeams.filter(team => team.projectId && team.rubricId);

            const projectIds: string[] = [];
            const rubricIds: string[] = [];

            fetchedTeams.forEach(team => {
                if (team.projectId) projectIds.push(team.projectId);
                if (team.rubricId) rubricIds.push(team.rubricId);
            });

            setTeams(fetchedTeams);

            if (projectIds.length > 0) {
                 const projectsQuery = query(collection(db, 'projects'), where('__name__', 'in', [...new Set(projectIds)]));
                 onSnapshot(projectsQuery, (projSnapshot) => {
                     const projMap = new Map<string, Project>();
                     projSnapshot.forEach(doc => projMap.set(doc.id, { id: doc.id, ...doc.data()} as Project));
                     setProjects(projMap);
                 });
            }
             if (rubricIds.length > 0) {
                 const rubricsQuery = query(collection(db, 'rubrics'), where('__name__', 'in', [...new Set(rubricIds)]));
                 onSnapshot(rubricsQuery, (rubricSnapshot) => {
                     const rubMap = new Map<string, Rubric>();
                     rubricSnapshot.forEach(doc => rubMap.set(doc.id, { id: doc.id, ...doc.data()} as Rubric));
                     setRubrics(rubMap);
                 });
            }
            setIsLoading(false);
        });

        return () => unsubTeams();
    }, []);

    if (isLoading) {
        return <div className="text-center p-8">Loading evaluations...</div>;
    }

    return (
        <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Teams Ready for Evaluation</h2>
            {teams.length === 0 ? (
                <p className="text-muted-foreground">No teams are currently ready for evaluation.</p>
            ) : (
                <div className="space-y-3">
                    {teams.map(team => (
                        <div key={team.id} className="flex justify-between items-center p-3 border rounded-lg">
                           <div>
                             <p className="font-semibold">{team.name}</p>
                             <p className="text-sm text-muted-foreground">
                               Project: {projects.get(team.projectId!)?.name || '...'}
                             </p>
                             <p className="text-xs text-muted-foreground">
                               Rubric: {rubrics.get(team.rubricId!)?.name || '...'}
                             </p>
                           </div>
                           <Link href={`/dashboard/evaluation/${team.id}`} passHref>
                                <Button variant="outline">
                                    <Edit className="mr-2 h-4 w-4" /> Evaluate
                                </Button>
                           </Link>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}


export default function DashboardPage() {
  const { user, role, isLoading } = useSettings();
  const [activeTab, setActiveTab] = useState('schedule');


  if (isLoading || !user || !role) {
    return <LoadingScreen />;
  }

  // Render the appropriate dashboard based on the user's role
  if (role === 'Manager') {
    return <ManagerDashboard />;
  }

  if (role === 'Student') {
    return <StudentDashboard />;
  }
  
  if (role === 'Teacher' || role === 'Admin') {
    const tabItems = [
        { value: 'schedule', label: 'Schedule', icon: Calendar },
        { value: 'evaluations', label: 'Evaluations', icon: Edit },
    ];

    return (
      <div className="w-full space-y-4">
         <h1 className="text-2xl font-bold">Dashboard</h1>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="md:hidden mb-4">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full h-11 text-base">
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

            <TabsList className="hidden md:grid w-full grid-cols-2 h-11">
                <TabsTrigger value="schedule" className="h-full">
                    <Calendar className="mr-2 h-5 w-5" /> Schedule
                </TabsTrigger>
                <TabsTrigger value="evaluations" className="h-full">
                    <Edit className="mr-2 h-5 w-5" /> Evaluations
                </TabsTrigger>
            </TabsList>
            
            <TabsContent value="schedule">
                <ScheduleDashboard />
            </TabsContent>
            <TabsContent value="evaluations">
                <TeacherEvaluationList />
            </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Fallback for any other case or if role is null
  return (
    <div>
      <h1 className="text-2xl font-bold">Access Not Configured</h1>
      <p>Your role does not have a configured dashboard view. Please contact an administrator.</p>
    </div>
  );
}

    
