'use client';

import { useState, useMemo } from 'react';
import type { UserProfile, Project, Activity } from '@/lib/db-types';
import type { Team } from '@/lib/db-types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Pencil, Save, X, Loader2, FileCode, HelpCircle, Target, ListChecks, FlaskConical, Mic, Star } from 'lucide-react';
import { updateTeamName } from '@/lib/user-actions';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from './ui/scroll-area';

const activityTypeIcons: { [key: string]: React.ReactNode } = {
  workshop: <FlaskConical className="h-4 w-4" />,
  conference: <Mic className="h-4 w-4" />,
  task: <Star className="h-4 w-4" />,
};

type TeamCardProps = {
  team: Team;
  members: UserProfile[];
  currentUserId: string;
  project: Project | null;
  activities: Activity[];
};

export default function TeamCard({ team, members, currentUserId, project, activities }: TeamCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [teamName, setTeamName] = useState(team?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.uid === currentUserId) return -1;
      if (b.uid === currentUserId) return 1;
      return (a.displayName || '').localeCompare(b.displayName || '');
    });
  }, [members, currentUserId]);


  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTeamName(team.name);
  };

  const handleSave = async () => {
    if (teamName.trim() === team.name.trim()) {
      setIsEditing(false);
      return;
    }
    if (teamName.trim().length === 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Team name cannot be empty.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateTeamName(team.id, teamName.trim());
      toast({
        title: 'Success',
        description: 'Team name updated successfully.',
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update team name. Please try again.',
      });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!team) {
    return null;
  }

  return (
    <Card className="flex flex-col h-[700px] lg:h-auto">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-muted rounded-md">
                    <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                    <CardDescription>Your Team</CardDescription>
                    {!isEditing ? (
                        <CardTitle className="flex items-center gap-2 truncate">
                        {teamName}
                        </CardTitle>
                    ) : (
                        <div className="flex items-center gap-2 mt-1">
                        <Input
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            disabled={isSaving}
                            className="h-9"
                        />
                        </div>
                    )}
                </div>
            </div>
            {!isEditing ? (
            <Button variant="ghost" size="icon" onClick={handleEdit} className="h-8 w-8 flex-shrink-0">
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit team name</span>
            </Button>
            ) : (
                <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={handleSave} disabled={isSaving} className="h-8 w-8 text-green-500 hover:text-green-500">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        <span className="sr-only">Save team name</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleCancel} disabled={isSaving} className="h-8 w-8 text-destructive hover:text-destructive">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Cancel edit</span>
                    </Button>
                </div>
            )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-shrink-0">
        <p className="text-sm text-muted-foreground">Team members:</p>
        <div className="h-[140px] overflow-y-auto">
          <ul className="space-y-3">
            {sortedMembers.map((member) => (
              <li key={member.uid} className="flex items-center gap-3">
                <Avatar className="h-9 w-9 flex-shrink-0">
                  {member.photoURL && (
                    <AvatarImage src={member.photoURL} alt={member.displayName || 'member'} />
                  )}
                  <AvatarFallback>
                    {member.displayName
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div className='flex items-center min-w-0 flex-1'>
                  <span className="font-medium truncate">{member.displayName}</span>
                  {member.uid === currentUserId && (
                      <Badge variant="outline" className="ml-2 flex-shrink-0">
                      You
                      </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 flex-1 overflow-y-auto">
          <div className="w-full flex-shrink-0">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-primary" />
                  Assigned Project
              </h3>
              <div className="h-[80px]">
                {project ? (
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="text-sm bg-muted/50 border border-border/50 rounded-md px-3 py-2 cursor-pointer hover:bg-muted transition-colors">
                                <p className="font-semibold truncate">{project.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{project.description}</p>
                            </div>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-3">
                                    <FileCode className="h-5 w-5 text-primary" />
                                    {project.name}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="py-4 text-sm text-muted-foreground space-y-4">
                                <p>{project.description}</p>
                                {project.ods && project.ods.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                                      <Target className="h-3 w-3" />
                                      Impacted SDGs
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {project.ods.map(odsNum => (
                                        <Badge key={odsNum} variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                                          SDG {odsNum}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <HelpCircle className="h-4 w-4" />
                        <span>No project assigned yet.</span>
                    </div>
                )}
              </div>
          </div>
          <Separator className="flex-shrink-0" />
          <div className="w-full flex-shrink-0">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  Assigned Activities
              </h3>
              <div className="h-[140px]">
                {activities.length > 0 ? (
                    <ScrollArea className="h-full">
                      <div className="space-y-2 pr-4">
                        {activities.map(activity => (
                          <Dialog key={activity.id}>
                            <DialogTrigger asChild>
                                <div className="text-sm w-full bg-muted/50 border border-border/50 rounded-md px-3 py-2 cursor-pointer hover:bg-muted transition-colors">
                                    <p className="font-semibold truncate">{activity.title}</p>
                                </div>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-3">
                                        <ListChecks className="h-5 w-5 text-primary" />
                                        {activity.title}
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="py-4 text-sm text-muted-foreground space-y-4">
                                    <p>{activity.description}</p>
                                </div>
                            </DialogContent>
                          </Dialog>
                        ))}
                      </div>
                    </ScrollArea>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <HelpCircle className="h-4 w-4" />
                        <span>No activities assigned yet.</span>
                    </div>
                )}
              </div>
          </div>
      </CardFooter>
    </Card>
  );
}