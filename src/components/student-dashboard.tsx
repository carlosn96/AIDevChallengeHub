'use client';

import { teams, users as staticUsers, type Team } from '@/lib/data';
import TeamCard from '@/components/team-card';
import ScheduleDashboard from '@/components/schedule-dashboard';
import { useSettings } from '@/context/settings-context';

export default function StudentDashboard() {
  const { user } = useSettings();

  // This is a simulation. In a real app, you'd fetch this from your backend.
  // For now, we'll just use the first static user and find their team.
  // We also assume the logged-in user maps to 'user-1' for this demo.
  const currentUserId = 'user-1'; 
  const myTeam: Team | undefined = teams.find(team => team.memberIds.includes(currentUserId));

  if (!myTeam) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold">Error</h1>
        <p>Could not find your team. Please contact an administrator.</p>
      </div>
    );
  }

  const teamMembers = staticUsers.filter(user => myTeam.memberIds.includes(user.id));

  return (
    <div className="grid gap-4 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
      <div className="lg:col-span-1 xl:col-span-1">
        <TeamCard team={myTeam} members={teamMembers} currentUserId={currentUserId} />
      </div>
      <div className="lg:col-span-2 xl:col-span-3">
        <ScheduleDashboard />
      </div>
    </div>
  );
}
