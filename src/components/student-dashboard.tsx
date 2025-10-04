'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useSettings } from '@/context/settings-context';
import TeamCard from '@/components/team-card';
import ScheduleDashboard from '@/components/schedule-dashboard';
import { type UserProfile, type Team as DbTeam } from '@/lib/db-types';
import { getTeamMembers, assignStudentToTeam } from '@/lib/user-actions';
import { Loader2, Users, Calendar, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentDashboard() {
  const { user } = useSettings();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [myTeam, setMyTeam] = useState<DbTeam | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) {
      setIsLoading(false);
      return;
    }
  
    // Reset states on user change
    setIsLoading(true);
    setUserProfile(null);
    setMyTeam(null);
    setTeamMembers([]);
  
    const unsubUser = onSnapshot(
      doc(db, 'users', user.uid),
      (userDoc) => {
        if (userDoc.exists()) {
          const profile = userDoc.data() as UserProfile;
          setUserProfile(profile);
  
          if (profile.teamId) {
            const unsubTeam = onSnapshot(
              doc(db, 'teams', profile.teamId),
              async (teamDoc) => {
                if (teamDoc.exists()) {
                  setMyTeam({ id: teamDoc.id, ...teamDoc.data() } as DbTeam);
                } else {
                  console.warn(`User ${profile.uid} has an invalid teamId: ${profile.teamId}. Re-assigning...`);
                  setMyTeam(null);
                  await assignStudentToTeam(profile);
                }
                setIsLoading(false);
              },
              (error) => {
                console.error('Error fetching team:', error);
                setIsLoading(false);
              }
            );
            return () => unsubTeam();
          } else {
            // User has a profile but no teamId, trigger assignment
            if (profile.role === 'Student') {
              console.log(`User ${profile.uid} has no team. Assigning...`);
              assignStudentToTeam(profile);
            }
            setIsLoading(false); // Stop loading to show "Team Pending"
          }
        } else {
          // User document doesn't exist, which might be a transitional state
          console.warn(`User document for ${user.uid} not found.`);
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('Error fetching user profile:', error);
        setIsLoading(false);
      }
    );
  
    return () => unsubUser();
  }, [user]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (myTeam && Array.isArray(myTeam.memberIds) && myTeam.memberIds.length > 0) {
        try {
          const members = await getTeamMembers(myTeam.memberIds);
          setTeamMembers(members);
        } catch (error) {
          console.error("Failed to fetch team members:", error);
          setTeamMembers([]);
        }
      } else {
        setTeamMembers([]);
      }
    };

    if (myTeam) {
      fetchTeamMembers();
    }
  }, [myTeam]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Skeleton className="h-[400px] w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-8">
            <Skeleton className="h-[600px] w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // No team assigned state
  if (userProfile && !myTeam) {
    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                  Welcome, {userProfile.displayName || 'Student'}
                </h1>
                <p className="text-muted-foreground">
                  Get ready for the AIDevChallenge 2025
                </p>
              </div>
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </div>
        </div>

        {/* No Team Card */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Card className="border-dashed border-2 border-muted-foreground/25">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Team Pending</CardTitle>
                <CardDescription>
                  You haven’t been assigned to a team yet. The organizers will assign you soon.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center text-sm text-muted-foreground">
                <p>In the meantime, check out the event schedule →</p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <ScheduleDashboard />
          </div>
        </div>
      </div>
    );
  }

  // Full dashboard with team
  return (
    <div className="space-y-6">
      {/* Welcome Header with Stats */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                {myTeam?.name || 'Your Team'}
              </h1>
              <p className="text-muted-foreground">
                Welcome back, {userProfile?.displayName}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50">
                <Users className="h-4 w-4 text-primary" />
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">Members</p>
                  <p className="text-sm font-semibold">{teamMembers.length}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50">
                <Calendar className="h-4 w-4 text-accent" />
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm font-semibold text-green-500">Active</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Team Card - Sidebar */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="sticky top-20">
            <TeamCard
              team={myTeam!}
              members={teamMembers}
              currentUserId={user?.uid || ''}
            />
          </div>
        </div>

        {/* Schedule Dashboard - Main Content */}
        <div className="lg:col-span-8 xl:col-span-9">
          <ScheduleDashboard />
        </div>
      </div>
    </div>
  );
}
