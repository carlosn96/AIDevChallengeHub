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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { type Project } from '@/lib/db-types';
import { createProject, updateProject, deleteProject } from '@/lib/user-actions';
import { 
  FolderKanban, 
  Loader2, 
  PlusCircle, 
  Pencil, 
  Trash2, 
  AlertCircle,
  Sparkles,
  Package
} from 'lucide-react';
import { format } from 'date-fns';

type ProjectManagementProps = {
  projects: Project[];
};

const projectSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
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
        title: 'Proyecto Creado',
        description: `"${values.name}" ha sido creado exitosamente.`,
      });
      createForm.reset();
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Crear',
        description: 'Hubo un error al crear el proyecto. Intenta nuevamente.',
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
        title: 'Proyecto Actualizado',
        description: `"${values.name}" ha sido actualizado exitosamente.`,
      });
      setIsEditDialogOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error('Failed to update project:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Actualizar',
        description: 'Hubo un error al actualizar el proyecto. Intenta nuevamente.',
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
        title: 'Proyecto Eliminado',
        description: 'El proyecto ha sido eliminado exitosamente.',
      });
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Eliminar',
        description: 'Hubo un error al eliminar el proyecto. Intenta nuevamente.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl border border-primary/30">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Gestión de Proyectos
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Crea y administra proyectos para el desafío
              </p>
            </div>
          </div>
          <Badge variant="outline" className="hidden sm:flex items-center gap-2 border-primary/30 bg-primary/5">
            <Sparkles className="h-3 w-3 text-primary" />
            {projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'}
          </Badge>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Create Form */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20 border-border/50 shadow-lg">
            <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                  <PlusCircle className="h-4 w-4 text-primary" />
                </div>
                Crear Proyecto
              </CardTitle>
              <CardDescription>
                Agrega un nuevo proyecto al desafío
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-5">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Nombre del Proyecto</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ej: Sistema de IA para Diagnóstico" 
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
                        <FormLabel className="text-sm font-medium">Descripción</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe los objetivos y requisitos del proyecto..."
                            {...field}
                            rows={5}
                            className="resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Creando...' : 'Crear Proyecto'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Projects Table */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl border border-primary/30">
                  <FolderKanban className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Proyectos Existentes</CardTitle>
                  <CardDescription>Lista de todos los proyectos creados</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="p-4 rounded-full bg-muted/50 mb-4">
                    <Package className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-foreground mb-2">
                    No hay proyectos aún
                  </p>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Crea tu primer proyecto usando el formulario de la izquierda
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/50">
                        <TableHead className="font-semibold">Nombre</TableHead>
                        <TableHead className="font-semibold">Descripción</TableHead>
                        <TableHead className="font-semibold">Creado</TableHead>
                        <TableHead className="text-right font-semibold">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((project) => (
                        <TableRow 
                          key={project.id} 
                          className="hover:bg-muted/50 transition-colors border-b border-border/30"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-primary" />
                              {project.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-xs">
                            <div className="line-clamp-2">{project.description}</div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <Badge variant="secondary" className="font-normal">
                              {project.createdAt?.toDate 
                                ? format(project.createdAt.toDate(), 'MMM d, yyyy') 
                                : 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors" 
                                onClick={() => handleEditClick(project)}
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Editar Proyecto</span>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Eliminar Proyecto</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="p-2 rounded-full bg-destructive/10">
                                        <AlertCircle className="h-5 w-5 text-destructive" />
                                      </div>
                                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    </div>
                                    <AlertDialogDescription>
                                      Esto eliminará permanentemente el proyecto <strong>"{project.name}"</strong> y 
                                      lo desasignará de todos los equipos. Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isDeleting}>
                                      Cancelar
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(project.id)}
                                      disabled={isDeleting}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                      {isDeleting ? 'Eliminando...' : 'Eliminar'}
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Pencil className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle>Editar Proyecto</DialogTitle>
                <DialogDescription>
                  Actualiza los detalles de "{editingProject?.name}"
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
                    <FormLabel className="text-sm font-medium">Nombre del Proyecto</FormLabel>
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
                    <FormLabel className="text-sm font-medium">Descripción</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={5} className="resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isUpdating}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={isUpdating}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                >
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}