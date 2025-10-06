'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { type Team, type UserProfile, type Project, type Activity, type Group } from '@/lib/db-types';
import { assignProjectToTeam, removeUserFromTeam, deleteTeam, assignActivitiesToTeam, reassignUserToTeam } from '@/lib/user-actions';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, Trash2, Loader2, AlertTriangle, UserX, ListChecks, FolderKanban, ChevronRight, Group as GroupIcon, CheckCircle, Clock, Link as LinkIcon } from 'lucide-react';
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
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import Link from 'next/link';

type TeamManagementProps = {
  teams: Team[];
  users: UserProfile[];
  projects: Project[];
  activities: Activity[];
  groups: Group[];
};

export default function TeamManagement({ teams, users, projects, activities, groups }: TeamManagementProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [isSavingActivities, setIsSavingActivities] = useState(false);

  useEffect(() => {
    if (selectedTeam) {
      setSelectedActivities(selectedTeam.activityIds || []);
    }
  }, [selectedTeam]);

  const usersMap = useMemo(() => new Map(users.map(u => [u.uid, u])), [users]);
  const projectsMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);
  const groupsMap = useMemo(() => new Map(groups.map(g => [g.id, g])), [groups]);

  const projectOptions = useMemo(() => [
    { value: 'none', label: 'No project assigned' },
    ...projects.map(p => ({ value: p.id, label: p.name }))
  ], [projects]);

  const teamOptions = useMemo(() => [
    { value: 'none', label: 'Unassign' },
    ...teams.map(t => ({ value: t.id, label: t.name }))
  ], [teams]);


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
  
  const handleReassignMember = async (userId: string, currentTeamId: string, newTeamId: string) => {
    if (currentTeamId === newTeamId) return;
    
    setIsProcessing(true);
    try {
      await reassignUserToTeam(userId, currentTeamId, newTeamId === 'none' ? null : newTeamId);
      toast({ title: 'Member Reassigned', description: 'The user has been moved to a new team.' });
      
      // Manually update local state for faster UI response
      const updatedSelectedTeam = teams.find(t => t.id === selectedTeam?.id);
      if (updatedSelectedTeam) {
        setSelectedTeam(updatedSelectedTeam);
      } else {
        setSelectedTeam(null);
      }

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to reassign member.' });
    } finally {
      setIsProcessing(false);
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
  
  const handleAssignActivities = async () => {
    if (!selectedTeam) return;
    setIsSavingActivities(true);
    try {
      await assignActivitiesToTeam(selectedTeam.id, selectedActivities);
      toast({ title: 'Activities Assigned', description: `Activities for ${selectedTeam.name} have been updated.`});
      setIsActivityDialogOpen(false);
      setSelectedTeam(prev => prev ? { ...prev, activityIds: selectedActivities } : null);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to assign activities.' });
    } finally {
      setIsSavingActivities(false);
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg md:text-xl">Team Management</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  View and manage all participant teams.
                </CardDescription>
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
          {/* Desktop: Table View */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead className="w-[300px]">Assigned Project</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                        <span className="text-xs text-muted-foreground">
                          ({team.memberIds.length} members)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Combobox
                        options={projectOptions}
                        value={team.projectId || 'none'}
                        onChange={(value) => handleProjectAssignment(team.id, value)}
                        placeholder='Assign a project...'
                        searchPlaceholder='Search project...'
                        notFoundMessage='No project found.'
                      />
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm" onClick={() => { 
                        setSelectedTeam(team);
                        setIsActivityDialogOpen(true);
                      }}>
                        <ListChecks className="mr-2 h-4 w-4" />
                        Activities
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile/Tablet: Card View */}
          <div className="lg:hidden space-y-3">
            {filteredTeams.map((team) => {
              const project = team.projectId ? projectsMap.get(team.projectId) : null;
              return (
                <Card 
                  key={team.id} 
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedTeam(team)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base md:text-lg mb-1 truncate">
                          {team.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{team.memberIds.length} member{team.memberIds.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Members Avatars */}
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {team.memberIds.slice(0, 5).map((memberId) => {
                          const member = usersMap.get(memberId);
                          if (!member) return null;
                          return (
                            <Avatar key={memberId} className="border-2 border-background h-7 w-7 md:h-8 md:w-8">
                              <AvatarImage src={member.photoURL || ''} alt={member.displayName || ''} />
                              <AvatarFallback className="text-xs">
                                {member.displayName?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          );
                        })}
                        {team.memberIds.length > 5 && (
                          <div className="h-7 w-7 md:h-8 md:w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                            <span className="text-xs font-medium">+{team.memberIds.length - 5}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Project Badge */}
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-3 w-3 text-muted-foreground" />
                      {project ? (
                        <Badge variant="secondary" className="text-xs truncate max-w-full">
                          {project.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No project assigned</span>
                      )}
                    </div>

                    {/* Activities Badge */}
                    {team.activityIds && team.activityIds.length > 0 && (
                      <div className="flex items-center gap-2">
                        <ListChecks className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs">
                          {team.activityIds.length} activit{team.activityIds.length !== 1 ? 'ies' : 'y'}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredTeams.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {teams.length > 0 ? 'No teams found matching your filter.' : 'No teams have been formed yet.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Details Dialog */}
      <Dialog open={!!selectedTeam && !isActivityDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSelectedTeam(null);
        }
      }}>
        <DialogContent className="max-w-[90vw] sm:max-w-2xl">
          {teamDetails && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="truncate">{teamDetails.name}</DialogTitle>
                    <DialogDescription>
                      {teamDetails.members.length} member(s)
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                {/* Project Assignment */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assigned Project</label>
                  <Combobox
                    options={projectOptions}
                    value={teamDetails.projectId || 'none'}
                    onChange={(value) => handleProjectAssignment(teamDetails.id, value)}
                    placeholder='Assign a project...'
                    searchPlaceholder='Search project...'
                    notFoundMessage='No project found.'
                  />
                </div>

                {/* Activities Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Activities</label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsActivityDialogOpen(true);
                      }}
                    >
                      <ListChecks className="mr-2 h-3 w-3" />
                      Manage
                    </Button>
                  </div>
                   <div className="p-2 border rounded-md">
                    {teamDetails.activityIds && teamDetails.activityIds.length > 0 ? (
                      <div className="space-y-2">
                        {teamDetails.activityIds.map(actId => {
                          const activity = activities.find(a => a.id === actId);
                          if (!activity) return null;
                          
                          const deliverableUrl = teamDetails.deliverables?.[actId];
                          const hasDeliverable = !!deliverableUrl;
                          
                          return (
                            <div key={actId} className="text-xs flex justify-between items-center">
                              <span>{activity.title}</span>
                              {hasDeliverable ? (
                                <a href={deliverableUrl} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                                  <Badge variant="secondary" className="text-green-500 border-green-500/20 bg-green-500/10 hover:bg-green-500/20">
                                    <LinkIcon className="mr-1 h-3 w-3" />
                                    Submitted
                                  </Badge>
                                </a>
                              ) : (
                                <Badge variant="outline">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Pending
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No activities assigned</p>
                    )}
                   </div>
                </div>

                <Separator />

                {/* Members Section */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Members</h4>
                  <div className="space-y-2">
                    {teamDetails.members.map(member => (
                      <div key={member.uid} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 rounded-lg hover:bg-accent/50">
                        <div className="flex items-center gap-3 flex-1 min-w-0 mb-2 sm:mb-0">
                          <Avatar className="h-9 w-9 flex-shrink-0">
                            <AvatarImage src={member.photoURL || ''} />
                            <AvatarFallback>{member.displayName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block">{member.displayName}</span>
                            {member.groupId && groupsMap.has(member.groupId) && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  <GroupIcon className="mr-1.5 h-3 w-3" />
                                  {groupsMap.get(member.groupId)?.name}
                                </Badge>
                            )}
                          </div>
                        </div>
                        <div className="w-full sm:w-[200px]">
                            <Combobox
                                options={teamOptions.filter(opt => opt.value !== teamDetails.id)}
                                value={teamDetails.id}
                                onChange={(value) => handleReassignMember(member.uid, teamDetails.id, value)}
                                placeholder="Reassign team..."
                                searchPlaceholder="Search teams..."
                                notFoundMessage="No team found."
                                className="h-9 text-xs"
                            />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isProcessing} className="w-full sm:w-auto">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Team
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                    <AlertDialogHeader>
                      <div className="p-3 rounded-full bg-destructive/10 w-fit mb-2">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                      </div>
                      <AlertDialogTitle>Delete "{teamDetails.name}"?</AlertDialogTitle>
                      <AlertDialogDescription className="text-xs md:text-sm">
                        This will permanently delete the team. All members will be unassigned and available for re-assignment. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
                        onClick={() => handleDeleteTeam(teamDetails.id)}
                      >
                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Delete Team
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="w-full sm:w-auto">
                    Close
                  </Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Assign Activities Dialog */}
      <Dialog open={isActivityDialogOpen} onOpenChange={(isOpen) => {
        setIsActivityDialogOpen(isOpen);
        if (!isOpen) {
          setTimeout(() => setSelectedTeam(null), 100);
        }
      }}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">
              Assign Activities for {selectedTeam?.name}
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Select the activities to assign to this team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[50vh] overflow-y-auto">
            {activities.length > 0 ? (
              activities.map(activity => (
                <div key={activity.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-accent/50">
                  <Checkbox
                    id={`activity-${activity.id}`}
                    checked={selectedActivities.includes(activity.id)}
                    onCheckedChange={(checked) => {
                      setSelectedActivities(prev => 
                        checked 
                        ? [...prev, activity.id]
                        : prev.filter(id => id !== activity.id)
                      );
                    }}
                    className="mt-1"
                  />
                  <label
                    htmlFor={`activity-${activity.id}`}
                    className="text-sm font-medium leading-tight cursor-pointer flex-1"
                  >
                    {activity.title}
                    {activity.description && (
                      <span className="block text-xs text-muted-foreground font-normal mt-1">
                        {activity.description}
                      </span>
                    )}
                  </label>
                </div>
              ))
            ) : (
              <p className="text-xs md:text-sm text-muted-foreground text-center py-4">
                No activities available to assign.
              </p>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto order-2 sm:order-1">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              onClick={handleAssignActivities} 
              disabled={isSavingActivities || activities.length === 0}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {isSavingActivities && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    