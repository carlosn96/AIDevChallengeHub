'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useSettings } from '@/context/settings-context';
import TeamCard from '@/components/team-card';
import ScheduleDashboard from '@/components/schedule-dashboard';
import { type UserProfile, type Team } from '@/lib/db-types';
import { teams, users as staticUsers } from '@/lib/data'; // Keep static data for now

export default function StudentDashboard() {
  const { user } = useSettings();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // In a real app, you would fetch the team data from Firestore as well.
  // For now, we will simulate finding the team from static data.
  const myTeam: Team | undefined = teams.find(team => team.id === userProfile?.teamId);

  useEffect(() => {
    if (!user || !db) return;
    
    const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data() as UserProfile);
      }
    });

    return () => unsub();
  }, [user]);

  if (!userProfile) {
    // We could show a loading state here
    return (
        <div className="grid gap-4 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
            <div className="lg:col-span-2 xl:col-span-3">
                <ScheduleDashboard />
            </div>
        </div>
    );
  }

  if (!myTeam) {
    // This could happen if team data is not yet loaded or consistent
    return (
      <div className="grid gap-4 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
        <div className="lg:col-span-2 xl:col-span-3">
          <p>Finding your team...</p>
          <ScheduleDashboard />
        </div>
      </div>
    );
  }

  // We are using static user data for avatars. In a real app, you'd fetch member profiles.
  const teamMembers = staticUsers.filter(u => myTeam.memberIds.includes(u.id));

  return (
    <div className="grid gap-4 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
      <div className="lg:col-span-1 xl:col-span-1">
        <TeamCard team={myTeam} members={teamMembers} currentUserId={user.uid} />
      </div>
      <div className="lg:col-span-2 xl:col-span-3">
        <ScheduleDashboard />
      </div>
    </div>
  );
}
