
'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { type Team, type UserProfile, type Project } from '@/lib/db-types';
import { assignProjectToTeam } from '@/lib/user-actions';
import { useToast } from '@/hooks/use-toast';
import { Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

type TeamManagementProps = {
  teams: Team[];
  users: UserProfile[];
  projects: Project[];
};

export default function TeamManagement({ teams, users, projects }: TeamManagementProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const usersMap = useMemo(() => new Map(users.map(u => [u.uid, u])), [users]);

  const handleProjectAssignment = async (teamId: string, projectId: string) => {
    try {
      await assignProjectToTeam(teamId, projectId === 'none' ? null : projectId);
      toast({
        title: 'Project Assigned',
        description: 'The team has been successfully assigned to the new project.',
      });
    } catch (error) {
      console.error('Failed to assign project:', error);
      toast({
        variant: 'destructive',
        title: 'Assignment Failed',
        description: 'There was an error assigning the project. Please try again.',
      });
    }
  };

  const filteredTeams = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase().trim();
    if (!lowercasedSearchTerm) {
      return teams;
    }
    return teams.filter(team => {
      const teamNameMatch = team.name.toLowerCase().includes(lowercasedSearchTerm);
      const memberNameMatch = team.memberIds.some(memberId => {
        const member = usersMap.get(memberId);
        return member?.displayName?.toLowerCase().includes(lowercasedSearchTerm);
      });
      return teamNameMatch || memberNameMatch;
    });
  }, [teams, searchTerm, usersMap]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
                <CardTitle>Teams</CardTitle>
                <CardDescription>View and manage all participant teams.</CardDescription>
            </div>
            </div>
            <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Filter by team or member..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                />
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team Name</TableHead>
              <TableHead>Members</TableHead>
              <TableHead className="w-[300px]">Assigned Project</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeams.map((team) => (
              <TableRow key={team.id}>
                <TableCell className="font-medium">{team.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {team.memberIds.map((memberId) => {
                        const member = usersMap.get(memberId);
                        if (!member) return null;
                        return (
                          <Avatar key={memberId} className="border-2 border-background h-8 w-8">
                            <AvatarImage src={member.photoURL || ''} alt={member.displayName || ''} />
                            <AvatarFallback>
                              {member.displayName?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        );
                      })}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      ({team.memberIds.length} members)
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    defaultValue={team.projectId || 'none'}
                    onValueChange={(value) => handleProjectAssignment(team.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign a project..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">No project assigned</span>
                      </SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredTeams.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {teams.length > 0 ? 'No teams found matching your filter.' : 'No teams have been formed yet.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
