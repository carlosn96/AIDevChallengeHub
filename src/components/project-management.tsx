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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DialogTrigger,
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
} from "@/components/ui/alert-dialog"

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { type Project } from '@/lib/db-types';
import { createProject, updateProject, deleteProject } from '@/lib/user-actions';
import { FolderKanban, Loader2, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

type ProjectManagementProps = {
  projects: Project[];
};

const projectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
});

export default function ProjectManagement({ projects }: ProjectManagementProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const createForm = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const editForm = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
  });

  const handleEditClick = (project: Project) => {
    setEditingProject(project);
    editForm.reset({
      name: project.name,
      description: project.description,
    });
    setIsEditDialogOpen(true);
  };
  
  const handleCreateSubmit = async (values: z.infer<typeof projectSchema>) => {
    setIsSubmitting(true);
    try {
      await createProject(values);
      toast({
        title: 'Project Created',
        description: `"${values.name}" has been successfully created.`,
      });
      createForm.reset();
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: 'There was an error creating the project. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (values: z.infer<typeof projectSchema>) => {
    if (!editingProject) return;

    setIsUpdating(true);
    try {
      await updateProject(editingProject.id, values);
      toast({
        title: 'Project Updated',
        description: `"${values.name}" has been successfully updated.`,
      });
      setIsEditDialogOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error('Failed to update project:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'There was an error updating the project. Please try again.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    setIsDeleting(true);
    try {
      await deleteProject(projectId);
      toast({
        title: 'Project Deleted',
        description: 'The project has been successfully deleted.',
      });
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: 'There was an error deleting the project. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" />
              Create New Project
            </CardTitle>
            <CardDescription>
              Add a new project to the challenge. It will then be available for assignment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-6">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., AI-Powered Fact Checker" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the goals and requirements of the project..."
                          {...field}
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                    <FolderKanban className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <CardTitle>Existing Projects</CardTitle>
                    <CardDescription>A list of all created projects.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-xs truncate">
                        {project.description}
                    </TableCell>
                    <TableCell>
                      {project.createdAt?.toDate ? format(project.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(project)}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit Project</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete Project</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the project "{project.name}" and un-assign it from any teams. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(project.id)}
                                  disabled={isDeleting}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  {isDeleting ? 'Deleting...' : 'Delete'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {projects.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No projects have been created yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

       {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Project</DialogTitle>
                <DialogDescription>
                    Update the details for "{editingProject?.name}".
                </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(handleUpdateSubmit)} className="space-y-6 py-4">
                    <FormField
                        control={editForm.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Project Name</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={editForm.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                    <Textarea {...field} rows={4} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={isUpdating}>Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isUpdating}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isUpdating ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
