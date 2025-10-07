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
  CardFooter,
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
  DialogClose
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { type Group, type UserProfile } from '@/lib/db-types';
import { createGroup, updateGroup, deleteGroup, assignGroupToUser } from '@/lib/user-actions';
import { 
  Loader2, 
  PlusCircle, 
  Pencil, 
  Trash2, 
  AlertCircle,
  Group as GroupIcon,
  MoreVertical,
  Users,
  UserPlus,
  Download
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Combobox } from './ui/combobox';
import { Badge } from './ui/badge';

type GroupManagementProps = {
  groups: Group[];
  users: UserProfile[];
};

const groupFormSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
});

export default function GroupManagement({ groups, users }: GroupManagementProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<Group | null>(null);

  const studentsByGroup = useMemo(() => {
    const map = new Map<string, UserProfile[]>();
    for (const user of users) {
      if (user.groupId) {
        if (!map.has(user.groupId)) {
          map.set(user.groupId, []);
        }
        map.get(user.groupId)!.push(user);
      }
    }
    return map;
  }, [users]);
  
  const groupsMap = useMemo(() => {
    return new Map(groups.map(g => [g.id, g.name]));
  }, [groups]);

  const groupOptions = useMemo(() => [
    { value: 'none', label: 'No Group' },
    ...groups.map(g => ({ value: g.id, label: g.name }))
  ], [groups]);
  
  const unassignedStudents = useMemo(() => {
    return users.filter(user => user.role === 'Student' && !user.groupId);
  }, [users]);


  const form = useForm<z.infer<typeof groupFormSchema>>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: { name: '' },
  });

  const handleEditClick = (group: Group) => {
    setEditingGroup(group);
    form.reset({ name: group.name });
    setIsFormDialogOpen(true);
  };

  const handleCreateClick = () => {
    setEditingGroup(null);
    form.reset({ name: '' });
    setIsFormDialogOpen(true);
  };
  
  const handleSubmit = async (values: z.infer<typeof groupFormSchema>) => {
    setIsSubmitting(true);
    try {
      if (editingGroup) {
        await updateGroup(editingGroup.id, values);
        toast({ title: 'Group Updated', description: `"${values.name}" has been updated.` });
      } else {
        await createGroup(values);
        toast({ title: 'Group Created', description: `"${values.name}" has been created.` });
      }
      setIsFormDialogOpen(false);
    } catch (error) {
      console.error('Failed to save group:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'There was an error saving the group.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (groupId: string) => {
    setIsDeleting(true);
    try {
      await deleteGroup(groupId);
      toast({ title: 'Group Deleted' });
    } catch (error) {
      console.error('Failed to delete group:', error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: 'There was an error deleting the group.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGroupReassignment = async (userId: string, newGroupId: string) => {
    try {
      await assignGroupToUser(userId, newGroupId === 'none' ? null : newGroupId);
      toast({
        title: 'Group Reassigned',
        description: 'The student has been moved to the new group.',
      });
    } catch (error) {
      console.error('Failed to reassign group:', error);
      toast({
        variant: 'destructive',
        title: 'Reassignment Failed',
        description: 'Could not reassign the student to the new group.',
      });
    }
  };

  const handleDownload = () => {
    const studentUsers = users.filter(user => user.role === 'Student');
    
    let csvContent = "data:text/csv;charset=utf-8,Student Name,Email,Group Name\n";
    
    studentUsers.forEach(user => {
      const groupName = user.groupId ? (groupsMap.get(user.groupId) || 'N/A') : 'Unassigned';
      const row = [
        `"${user.displayName || ''}"`,
        `"${user.email || ''}"`,
        `"${groupName}"`
      ].join(',');
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_groups.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Groups</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {groups.length} {groups.length === 1 ? 'group available' : 'groups available'}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleDownload} variant="outline" className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Download List
          </Button>
          <Button 
            onClick={handleCreateClick}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity w-full sm:w-auto"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            New Group
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <GroupIcon className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground mb-2">No groups yet</p>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Create student groups to organize participants.
            </p>
            <Button onClick={handleCreateClick} variant="outline" className="border-primary/50 hover:bg-primary/10">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const members = studentsByGroup.get(group.id) || [];
            return (
              <Card 
                key={group.id} 
                className="group flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50"
              >
                <div onClick={() => setViewingGroup(group)} className="cursor-pointer flex-1 flex flex-col">
                  <CardHeader className="relative pb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0">
                        <GroupIcon className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                        {group.name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
                    </div>
                  </CardContent>
                </div>
                <CardFooter className="pt-0">
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingGroup(group)}>
                          <Users className="h-4 w-4 mr-2" />
                          View Members
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditClick(group)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-full bg-destructive/10">
                                  <AlertCircle className="h-5 w-5 text-destructive" />
                                </div>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              </div>
                              <AlertDialogDescription>
                                This will permanently delete the group <strong>"{group.name}"</strong> and unassign it from all students. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(group.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isDeleting ? 'Deleting...' : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Unassigned Students Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <UserPlus className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Unassigned Students</CardTitle>
              <CardDescription>
                Students who are not yet part of any group.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {unassignedStudents.length > 0 ? (
            <ScrollArea className="h-80">
              <div className="space-y-3 pr-4">
                {unassignedStudents.map(student => (
                  <div key={student.uid} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/50">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={student.photoURL || undefined} alt={student.displayName || 'student'} />
                        <AvatarFallback>
                          {student.displayName?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{student.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                      </div>
                    </div>
                    <div className="w-[180px]">
                      <Combobox
                        options={groupOptions.filter(opt => opt.value !== 'none')}
                        value={student.groupId || 'none'}
                        onChange={(value) => handleGroupReassignment(student.uid, value)}
                        placeholder="Assign group..."
                        searchPlaceholder="Search groups..."
                        notFoundMessage="No group found."
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>All students are assigned to a group.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-4">
            <p className="text-xs text-muted-foreground">
                Showing {unassignedStudents.length} unassigned student(s).
            </p>
        </CardFooter>
      </Card>


      {/* Edit/Create Group Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit Group' : 'Create New Group'}</DialogTitle>
            <DialogDescription>
              {editingGroup ? 'Update the name of this group.' : 'Add a new group for students.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Group Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Group A" {...field} className="h-10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? (editingGroup ? 'Saving...' : 'Creating...') : (editingGroup ? 'Save Changes' : 'Create Group')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* View Members Dialog */}
      <Dialog open={!!viewingGroup} onOpenChange={(open) => !open && setViewingGroup(null)}>
        <DialogContent className="sm:max-w-lg">
          {viewingGroup && (
            <>
              <DialogHeader>
                <DialogTitle>Members of "{viewingGroup.name}"</DialogTitle>
                <DialogDescription>
                  List of all students assigned to this group. You can reassign groups here.
                </DialogDescription>
              </DialogHeader>
              <Separator />
              <ScrollArea className="py-4 max-h-[60vh]">
                {(studentsByGroup.get(viewingGroup.id) || []).length > 0 ? (
                  <div className="space-y-3">
                    {(studentsByGroup.get(viewingGroup.id) || []).map(student => (
                      <div key={student.uid} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/50">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Avatar className="h-9 w-9">
                            <AvatarImage src={student.photoURL || undefined} alt={student.displayName || 'student'} />
                            <AvatarFallback>
                                {student.displayName?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{student.displayName}</p>
                            <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                            </div>
                        </div>
                        <div className="w-[180px]">
                            <Combobox
                                options={groupOptions}
                                value={student.groupId || 'none'}
                                onChange={(value) => handleGroupReassignment(student.uid, value)}
                                placeholder="Assign group..."
                                searchPlaceholder="Search groups..."
                                notFoundMessage="No group found."
                                className="h-9 text-xs"
                            />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No students are currently in this group.
                  </p>
                )}
              </ScrollArea>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Close</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

    