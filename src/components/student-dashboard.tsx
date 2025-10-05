'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useSettings } from '@/context/settings-context';
import TeamCard from '@/components/team-card';
import ScheduleDashboard from '@/components/schedule-dashboard';
import { type UserProfile, type Team as DbTeam, type Project, type Activity } from '@/lib/db-types';
import { getTeamMembers, getActivitiesByIds } from '@/lib/user-actions';
import { Loader2, Users, Calendar, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentDashboard() {
  const { user, isLoading: isAuthLoading } = useSettings();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [myTeam, setMyTeam] = useState<DbTeam | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [assignedProject, setAssignedProject] = useState<Project | null>(null);
  const [assignedActivities, setAssignedActivities] = useState<Activity[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Effect 1: Listen for the user's own profile document
  useEffect(() => {
    if (!user?.uid || !db) {
        if (!isAuthLoading) setIsDataLoading(false);
        return;
    }

    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        const profile = doc.data() as UserProfile;
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setIsDataLoading(false);
    });

    return () => unsubUser();
  }, [user?.uid, isAuthLoading]);

  // Effect 2: Listen for team, project, and member data, triggered by changes to userProfile
  useEffect(() => {
    const teamId = userProfile?.teamId;

    if (!teamId || !db) {
      setMyTeam(null);
      setTeamMembers([]);
      setAssignedProject(null);
      setAssignedActivities([]);
      return;
    }

    const unsubTeam = onSnapshot(doc(db, 'teams', teamId), async (teamDoc) => {
      if (teamDoc.exists()) {
        const teamData = { id: teamDoc.id, ...teamDoc.data() } as DbTeam;
        setMyTeam(teamData);

        // Fetch Members
        if (teamData.memberIds && teamData.memberIds.length > 0) {
            try {
              const members = await getTeamMembers(teamData.memberIds);
              setTeamMembers(members);
            } catch (error) {
              console.error("Failed to fetch team members:", error);
              setTeamMembers([]);
            }
        } else {
            setTeamMembers([]);
        }

        // Fetch Project
        if (teamData.projectId) {
            const projectSnap = await getDoc(doc(db, 'projects', teamData.projectId));
            setAssignedProject(projectSnap.exists() ? { id: projectSnap.id, ...projectSnap.data() } as Project : null);
        } else {
            setAssignedProject(null);
        }

        // Fetch Activities
        if (teamData.activityIds && teamData.activityIds.length > 0) {
          try {
            const activities = await getActivitiesByIds(teamData.activityIds);
            setAssignedActivities(activities);
          } catch (error) {
            console.error("Failed to fetch assigned activities:", error);
            setAssignedActivities([]);
          }
        } else {
          setAssignedActivities([]);
        }

      } else {
        setMyTeam(null);
      }
    });

    return () => unsubTeam();
  }, [userProfile?.teamId]);


  if (isAuthLoading || isDataLoading) {
    return (
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 md:p-6 h-[120px]">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <h1 className="text-lg md:text-xl font-bold">
                Loading your dashboard...
              </h1>
              <p className="text-muted-foreground text-xs md:text-sm">
                  Please wait while we get everything ready.
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4 xl:col-span-3">
            <Skeleton className="h-[700px] lg:h-[800px] w-full rounded-xl" />
          </div>
          <div className="lg:col-span-8 xl:col-span-9">
            <Skeleton className="h-[700px] lg:h-[800px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (userProfile && !myTeam) {
    return (
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 md:p-6">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1 md:mb-2">
                  Welcome, {userProfile.displayName || 'Student'}
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  Get ready for the AIDevChallenge 2025
                </p>
              </div>
              <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-primary animate-pulse" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4 xl:col-span-3">
            <Card className="border-dashed border-2 border-muted-foreground/25 h-[700px]">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-xl">Team Pending</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  You are being assigned to a team. This should only take a moment.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                 <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 xl:col-span-9">
            <ScheduleDashboard />
          </div>
        </div>
      </div>
    );
  }

  // Full dashboard with team
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 md:p-6">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
        <div className="relative">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1 md:mb-2 truncate">
                  {myTeam?.name || 'Your Team'}
                </h1>
                <p className="text-sm md:text-base text-muted-foreground truncate">
                  Welcome back, {userProfile?.displayName}
                </p>
              </div>

              <div className="flex gap-2 md:gap-3 shrink-0">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50">
                  <Users className="h-4 w-4 text-primary shrink-0" />
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground leading-none">Members</p>
                    <p className="text-sm font-semibold leading-none mt-1">{teamMembers.length}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50">
                  <Calendar className="h-4 w-4 text-accent shrink-0" />
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground leading-none">Status</p>
                    <p className="text-sm font-semibold text-green-500 leading-none mt-1">Active</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="lg:sticky lg:top-4">
            {myTeam && <TeamCard
              team={myTeam}
              members={teamMembers}
              currentUserId={user?.uid || ''}
              project={assignedProject}
              activities={assignedActivities}
            />}
          </div>
        </div>

        <div className="lg:col-span-8 xl:col-span-9">
          <ScheduleDashboard />
        </div>
      </div>
    </div>
  );
}
