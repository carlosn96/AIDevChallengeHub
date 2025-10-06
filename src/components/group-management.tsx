'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { type Group } from '@/lib/db-types';
import { createGroup, updateGroup, deleteGroup } from '@/lib/user-actions';
import { 
  Loader2, 
  PlusCircle, 
  Pencil, 
  Trash2, 
  AlertCircle,
  Group as GroupIcon,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type GroupManagementProps = {
  groups: Group[];
};

const groupFormSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
});

export default function GroupManagement({ groups }: GroupManagementProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof groupFormSchema>>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: { name: '' },
  });

  const handleEditClick = (group: Group) => {
    setEditingGroup(group);
    form.reset({ name: group.name });
    setIsDialogOpen(true);
  };

  const handleCreateClick = () => {
    setEditingGroup(null);
    form.reset({ name: '' });
    setIsDialogOpen(true);
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
      setIsDialogOpen(false);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Groups</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {groups.length} {groups.length === 1 ? 'group available' : 'groups available'}
          </p>
        </div>
        <Button 
          onClick={handleCreateClick}
          className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          New Group
        </Button>
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
          {groups.map((group) => (
            <Card key={group.id} className="group flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50">
              <div>
                <CardHeader className="relative pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0">
                        <GroupIcon className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                        {group.name}
                      </CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                </CardHeader>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
    </div>
  );
}
