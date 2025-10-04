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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { type Project } from '@/lib/db-types';
import { createProject } from '@/lib/user-actions';
import { FolderKanban, Loader2, PlusCircle } from 'lucide-react';
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

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof projectSchema>) => {
    setIsSubmitting(true);
    try {
      await createProject(values);
      toast({
        title: 'Project Created',
        description: `"${values.name}" has been successfully created.`,
      });
      form.reset();
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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-sm truncate">
                        {project.description}
                    </TableCell>
                    <TableCell>
                      {project.createdAt?.toDate ? format(project.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
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
    </div>
  );
}
