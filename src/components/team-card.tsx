
'use client';

import { useState } from 'react';
import type { Team, User } from '@/lib/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Pencil, Save, X, Loader2 } from 'lucide-react';
import { updateTeamName } from '@/lib/user-actions';
import { useToast } from '@/hooks/use-toast';

type TeamCardProps = {
  team: Team;
  members: User[];
  currentUserId: string;
};

export default function TeamCard({ team, members, currentUserId }: TeamCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [teamName, setTeamName] = useState(team.name);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-muted rounded-md">
                    <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <CardDescription>Your Team</CardDescription>
                    {!isEditing ? (
                        <CardTitle className="flex items-center gap-2">
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
                <div className="flex items-center gap-1">
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
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Team members:</p>
        <ul className="space-y-3">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                {member.avatarUrl && (
                  <AvatarImage src={member.avatarUrl} alt={member.name} />
                )}
                <AvatarFallback>
                  {member.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
              <div className='flex items-center'>
                <span className="font-medium">{member.name}</span>
                {member.id === currentUserId && (
                    <Badge variant="outline" className="ml-2">
                    You
                    </Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
