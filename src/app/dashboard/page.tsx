import { Team, User, users, teams } from '@/lib/data';
import TeamCard from '@/components/team-card';
import ScheduleDashboard from '@/components/schedule-dashboard';

export default function DashboardPage() {
  // Simulate fetching the logged-in user and their team
  const currentUser: User = users[0];
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

  const teamMembers = users.filter(user => myTeam.memberIds.includes(user.id));

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