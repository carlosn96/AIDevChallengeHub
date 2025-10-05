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
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { type Project } from '@/lib/db-types';
import { createProject, updateProject, deleteProject } from '@/lib/user-actions';
import { 
  Loader2, 
  PlusCircle, 
  Pencil, 
  Trash2, 
  AlertCircle,
  Package,
  Calendar,
  MoreVertical,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from './ui/badge';

type ProjectManagementProps = {
  projects: Project[];
};

const projectFormSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  ods: z.string().optional(),
});

const projectSubmitSchema = projectFormSchema.extend({
  ods: z.preprocess((val) => {
    if (typeof val !== 'string' || !val.trim()) return [];
    return val.split(',').map(item => item.trim()).filter(Boolean).map(Number);
  }, z.array(z.number().int().min(1).max(17, "SDG numbers must be between 1 and 17.")).optional()),
});


export default function ProjectManagement({ projects }: ProjectManagementProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const createForm = useForm<z.infer<typeof projectFormSchema>>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      ods: '',
    },
  });

  const editForm = useForm<z.infer<typeof projectFormSchema>>({
    resolver: zodResolver(projectFormSchema),
  });

  const handleEditClick = (project: Project) => {
    setEditingProject(project);
    editForm.reset({
      name: project.name,
      description: project.description,
      ods: project.ods?.join(', ') || '',
    });
    setIsEditDialogOpen(true);
  };
  
  const handleCreateSubmit = async (values: z.infer<typeof projectFormSchema>) => {
    const parsed = projectSubmitSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.errors.forEach(err => {
        createForm.setError(err.path[0] as keyof typeof values, { message: err.message });
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await createProject(parsed.data);
      toast({
        title: 'Project Created',
        description: `"${values.name}" has been created successfully.`,
      });
      createForm.reset();
      setIsCreateDialogOpen(false);
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

  const handleUpdateSubmit = async (values: z.infer<typeof projectFormSchema>) => {
    if (!editingProject) return;

    const parsed = projectSubmitSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.errors.forEach(err => {
        editForm.setError(err.path[0] as keyof typeof values, { message: err.message });
      });
      return;
    }

    setIsUpdating(true);
    try {
      await updateProject(editingProject.id, parsed.data);
      toast({
        title: 'Project Updated',
        description: `"${values.name}" has been updated successfully.`,
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
        description: 'The project has been deleted successfully.',
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
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {projects.length} {projects.length === 1 ? 'project available' : 'projects available'}
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground mb-2">
              No projects yet
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Create your first project to start assigning challenges to teams.
            </p>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              variant="outline"
              className="border-primary/50 hover:bg-primary/10"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card 
              key={project.id} 
              className="group flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50"
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div>
                <CardHeader className="relative pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(project)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive focus:text-destructive"
                            >
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
                                This will permanently delete the project <strong>"{project.name}"</strong> and 
                                unassign it from all teams. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isDeleting}>
                                Cancel
                              </AlertDialogCancel>
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="relative">
                  <CardDescription className="line-clamp-3 text-sm leading-relaxed">
                    {project.description}
                  </CardDescription>

                  {project.ods && project.ods.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
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
                </CardContent>
              </div>
              
              <CardFooter className="relative pt-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {project.createdAt?.toDate 
                      ? format(project.createdAt.toDate(), 'MMM d, yyyy') 
                      : 'N/A'}
                  </span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <PlusCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Add a new project to assign to teams.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-5 py-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Project Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., AI Diagnostic System" 
                        {...field}
                        className="h-10"
                      />
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
                    <FormLabel className="text-sm font-medium">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the project's goals and requirements..."
                        {...field}
                        rows={5}
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="ods"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Impacted SDGs</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 3, 10, 17" 
                        {...field}
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the SDG numbers separated by commas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSubmitting}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Pencil className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle>Edit Project</DialogTitle>
                <DialogDescription>
                  Update the details for "{editingProject?.name}"
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateSubmit)} className="space-y-5 py-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Project Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-10" />
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
                    <FormLabel className="text-sm font-medium">Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={5} className="resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="ods"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Impacted SDGs</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 3, 10, 17" 
                        {...field}
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the SDG numbers separated by commas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isUpdating}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={isUpdating}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                >
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
