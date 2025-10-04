
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { type Team, type UserProfile, type Project } from '@/lib/db-types';
import { assignProjectToTeam, removeUserFromTeam, deleteTeam } from '@/lib/user-actions';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, Trash2, XCircle, Loader2, AlertTriangle, UserX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from './ui/separator';

type TeamManagementProps = {
  teams: Team[];
  users: UserProfile[];
  projects: Project[];
};

export default function TeamManagement({ teams, users, projects }: TeamManagementProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const usersMap = useMemo(() => new Map(users.map(u => [u.uid, u])), [users]);

  const projectOptions = useMemo(() => [
    { value: 'none', label: 'No project assigned' },
    ...projects.map(p => ({ value: p.id, label: p.name }))
  ], [projects]);

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

  const handleRemoveMember = async (teamId: string, userId: string) => {
    setIsProcessing(true);
    try {
      await removeUserFromTeam(teamId, userId);
      toast({ title: 'Member Removed', description: 'The user has been removed from the team.' });
      const user = usersMap.get(userId);
      if (user) {
        toast({
          variant: 'default',
          title: 'Next Step',
          description: `${user.displayName} will be automatically assigned to a new team shortly.`,
        });
      }
      setSelectedTeam(prev => prev ? { ...prev, memberIds: prev.memberIds.filter(id => id !== userId) } : null);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove member.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    setIsProcessing(true);
    try {
      await deleteTeam(teamId);
      toast({ title: 'Team Deleted', description: 'The team and all its assignments have been removed.' });
      setSelectedTeam(null);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete the team.' });
    } finally {
      setIsProcessing(false);
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

  const teamDetails = selectedTeam ? {
    ...selectedTeam,
    members: selectedTeam.memberIds.map(id => usersMap.get(id)).filter(Boolean) as UserProfile[]
  } : null;

  return (
    <>
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
                <TableRow 
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className="cursor-pointer"
                >
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
                    <Combobox
                      options={projectOptions}
                      value={team.projectId || 'none'}
                      onChange={(value) => handleProjectAssignment(team.id, value)}
                      placeholder='Assign a project...'
                      searchPlaceholder='Search project...'
                      notFoundMessage='No project found.'
                    />
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

      {/* Team Details Dialog */}
      <Dialog open={!!selectedTeam} onOpenChange={(isOpen) => !isOpen && setSelectedTeam(null)}>
        <DialogContent className="sm:max-w-lg">
          {teamDetails && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle>{teamDetails.name}</DialogTitle>
                    <DialogDescription>
                      {teamDetails.members.length} member(s)
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="py-4 space-y-4">
                <h4 className="font-medium">Members</h4>
                <div className="space-y-3">
                  {teamDetails.members.map(member => (
                    <div key={member.uid} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.photoURL || ''} />
                          <AvatarFallback>{member.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{member.displayName}</span>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" disabled={isProcessing}>
                            <UserX className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Remove {member.displayName}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This will remove the member from the team. They will be automatically re-assigned to another team if possible. This does not delete their account.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive hover:bg-destructive/90"
                                    onClick={() => handleRemoveMember(teamDetails.id, member.uid)}
                                >
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    Remove
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <DialogFooter className="flex-col sm:flex-col sm:space-x-0 items-stretch gap-2">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isProcessing}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Team
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <div className="p-3 rounded-full bg-destructive/10 w-fit mb-2">
                                <AlertTriangle className="h-6 w-6 text-destructive" />
                            </div>
                            <AlertDialogTitle>Delete "{teamDetails.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete the team. All members will be unassigned and available for re-assignment. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => handleDeleteTeam(teamDetails.id)}
                            >
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Delete Team
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Close
                  </Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
