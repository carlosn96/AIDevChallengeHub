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

const projectSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  ods: z.string().optional().transform((val, ctx) => {
    if (!val || val.trim() === '') return [];
    const numbers = val.split(',').map(item => item.trim()).filter(Boolean).map(Number);
    if (numbers.some(isNaN)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Todos los ODS deben ser números válidos."
      });
      return z.NEVER;
    }
    if (numbers.some(n => n < 1 || n > 17)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Los números de ODS deben estar entre 1 y 17."
      });
      return z.NEVER;
    }
    return [...new Set(numbers)]; // Remove duplicates
  }),
});

export default function ProjectManagement({ projects }: ProjectManagementProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const createForm = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      ods: '',
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
      ods: project.ods?.join(', ') || '',
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
      setIsCreateDialogOpen(false);
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
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Proyectos</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {projects.length} {projects.length === 1 ? 'proyecto disponible' : 'proyectos disponibles'}
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Nuevo Proyecto
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
              No hay proyectos aún
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Crea tu primer proyecto para comenzar a asignar desafíos a los equipos
            </p>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              variant="outline"
              className="border-primary/50 hover:bg-primary/10"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Crear Primer Proyecto
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
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
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
                        ODS Impactados
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {project.ods.map(odsNum => (
                          <Badge key={odsNum} variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                            ODS {odsNum}
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
                <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
                <DialogDescription>
                  Agrega un proyecto para asignar a los equipos
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
              <FormField
                control={createForm.control}
                name="ods"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">ODS Impactados</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ej: 3, 10, 17" 
                        {...field}
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription>
                      Introduce los números de los ODS separados por comas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSubmitting}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Creando...' : 'Crear Proyecto'}
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
              <FormField
                control={editForm.control}
                name="ods"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">ODS Impactados</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ej: 3, 10, 17" 
                        {...field}
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription>
                      Introduce los números de los ODS separados por comas.
                    </FormDescription>
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
