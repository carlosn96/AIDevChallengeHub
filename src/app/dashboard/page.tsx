'use client';

import { teams, users as staticUsers, type Team } from '@/lib/data';
import TeamCard from '@/components/team-card';
import ScheduleDashboard from '@/components/schedule-dashboard';
import { useUser } from '@/firebase';

export default function DashboardPage() {
  const { user } = useUser();

  // This is a simulation. In a real app, you'd fetch this from your backend based on the logged-in user.
  // For now, we'll just use the first static user and find their team.
  const currentUser = staticUsers[0];
  const myTeam: Team | undefined = teams.find(team => team.memberIds.includes(currentUser.id));

  if (!myTeam) {
    // This case should ideally not happen with automatic team assignment
    return (
      <div>
        <h1 className="text-2xl font-bold">Error</h1>
        <p>Could not find your team. Please contact an administrator.</p>
      </div>
    );
  }

  const teamMembers = staticUsers.filter(user => myTeam.memberIds.includes(user.id));

  if (!user) {
    return null; // or a loading indicator
  }

  return (
    <div className="grid gap-4 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
      <div className="lg:col-span-1 xl:col-span-1">
        <TeamCard team={myTeam} members={teamMembers} />
      </div>
      <div className="lg:col-span-2 xl:col-span-3">
        <ScheduleDashboard />
      </div>
    </div>
  );
}
