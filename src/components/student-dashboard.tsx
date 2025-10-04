'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useSettings } from '@/context/settings-context';
import TeamCard from '@/components/team-card';
import ScheduleDashboard from '@/components/schedule-dashboard';
import { type UserProfile, type Team as DbTeam } from '@/lib/db-types';
import { type User as StaticUser, users as staticUsers } from '@/lib/data'; 

export default function StudentDashboard() {
  const { user } = useSettings();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [myTeam, setMyTeam] = useState<DbTeam | null>(null);
  const [teamMembers, setTeamMembers] = useState<StaticUser[]>([]);

  useEffect(() => {
    if (!user || !db) return;
    
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        const profile = doc.data() as UserProfile;
        setUserProfile(profile);
        
        if (profile.teamId) {
          const unsubTeam = onSnapshot(doc(db, 'teams', profile.teamId), (teamDoc) => {
            if (teamDoc.exists()) {
              setMyTeam({ id: teamDoc.id, ...teamDoc.data() } as DbTeam);
            }
          });
          // Note: In a real app, you might want to manage this subscription more carefully
          return () => unsubTeam();
        }
      }
    });

    return () => unsubUser();
  }, [user]);

  useEffect(() => {
    if (myTeam && Array.isArray(myTeam.memberIds)) {
      // In a real app, you would fetch member profiles from Firestore based on myTeam.memberIds.
      // For this example, we continue to filter from static data for avatar URLs etc.
      const members = staticUsers.filter(u => myTeam.memberIds.includes(u.id));
      setTeamMembers(members);
    }
  }, [myTeam]);


  if (!userProfile) {
    return (
        <div className="grid gap-4 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
            <div className="lg:col-span-2 xl:col-span-3">
                <ScheduleDashboard />
            </div>
        </div>
    );
  }

  if (!myTeam) {
    return (
      <div className="grid gap-4 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
        <div className="lg:col-span-2 xl:col-span-3">
          <p>Finding your team...</p>
          <ScheduleDashboard />
        </div>
      </div>
    );
  }

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
