
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { type Team, type UserProfile } from '@/lib/db-types';
import { createTeam, updateTeam, deleteTeam } from '@/lib/user-actions';
import { 
  Loader2, 
  PlusCircle, 
  Pencil, 
  Trash2, 
  AlertCircle,
  Briefcase,
  Search,
  Users,
  UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from './ui/badge';

type TeamCrudManagementProps = {
  teams: Team[];
  users: UserProfile[];
};

const teamFormSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
});

export default function TeamCrudManagement({ teams, users }: TeamCrudManagementProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<z.infer<typeof teamFormSchema>>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: { name: '' },
  });
  
  const filteredTeams = useMemo(() => {
    return teams.filter(team => team.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [teams, searchTerm]);
  
  const unassignedStudentsCount = useMemo(() => {
    return users.filter(user => user.role === 'Student' && !user.teamId).length;
  }, [users]);

  const handleCreateClick = () => {
    setEditingTeam(null);
    form.reset({ name: '' });
    setIsFormDialogOpen(true);
  };

  const handleEditClick = (team: Team) => {
    setEditingTeam(team);
    form.reset({ name: team.name });
    setIsFormDialogOpen(true);
  };

  const handleSubmit = async (values: z.infer<typeof teamFormSchema>) => {
    setIsSubmitting(true);
    try {
      if (editingTeam) {
        await updateTeam(editingTeam.id, values.name);
        toast({ title: 'Team Updated', description: `"${values.name}" has been updated.` });
      } else {
        await createTeam(values.name);
        toast({ title: 'Team Created', description: `"${values.name}" has been created.` });
      }
      setIsFormDialogOpen(false);
    } catch (error) {
      console.error('Failed to save team:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'There was an error saving the team.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (teamId: string) => {
    setIsDeleting(true);
    try {
      await deleteTeam(teamId);
      toast({ title: 'Team Deleted' });
    } catch (error) {
      console.error('Failed to delete team:', error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: 'There was an error deleting the team.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                <Briefcase className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg md:text-xl">Team Administration (CRUD)</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Manually create, edit, and delete teams.
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by team name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button 
                onClick={handleCreateClick}
                className="w-full sm:w-auto shrink-0"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                New Team
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTeams.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-1">No Teams Found</h3>
                <p className="text-sm">
                    {searchTerm ? 'No teams match your search.' : 'No teams have been created yet.'}
                </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>
                        <Badge variant="secondary">
                            <Users className="h-3 w-3 mr-1.5" />
                            {team.memberCount || 0}
                        </Badge>
                    </TableCell>
                    <TableCell>
                      {team.createdAt ? format(team.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(team)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-full bg-destructive/10">
                                <AlertCircle className="h-5 w-5 text-destructive" />
                                </div>
                                <AlertDialogTitle>Delete "{team.name}"?</AlertDialogTitle>
                            </div>
                            <AlertDialogDescription>
                              This will permanently delete the team. Any assigned members will be unassigned. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(team.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {unassignedStudentsCount > 0 && (
          <CardFooter>
            <Alert variant="destructive">
              <UserCheck className="h-4 w-4" />
              <AlertTitle>Pending Assignments</AlertTitle>
              <AlertDescription>
                There are {unassignedStudentsCount} student(s) not yet assigned to a team. You can assign them in the "Team Assignments" tab.
              </AlertDescription>
            </Alert>
          </CardFooter>
        )}
      </Card>

      {/* Create/Edit Team Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
            <DialogDescription>
              {editingTeam ? 'Update the name of this team.' : 'Create a new team. You can assign members later.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Team Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., The Innovators" {...field} className="h-10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? (editingTeam ? 'Saving...' : 'Creating...') : (editingTeam ? 'Save Changes' : 'Create Team')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
