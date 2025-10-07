'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { type Rubric, type RubricCriterion } from '@/lib/db-types';
import { createRubric, updateRubric, deleteRubric, TEMPORARY_migrateRubricIds } from '@/lib/user-actions';
import { FileCheck, Plus, Trash2, Edit, Loader2, X, AlertCircle, Eye, DatabaseZap } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Alert, AlertTitle } from './ui/alert';

type RubricManagementProps = {
  rubrics: Rubric[];
};

const criterionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Criterion name is required.'),
  descriptions: z.array(z.string()).length(6, 'There must be exactly 6 descriptions for scores 0-5.'),
});

const rubricFormSchema = z.object({
  name: z.string().min(3, 'Rubric name must be at least 3 characters.'),
  criteria: z.array(criterionSchema).min(1, 'At least one criterion is required.'),
});

const defaultDescriptions = Array(6).fill('');

export default function RubricManagement({ rubrics }: RubricManagementProps) {
  const { toast } = useToast();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);
  const [viewingRubric, setViewingRubric] = useState<Rubric | null>(null);

  const form = useForm<z.infer<typeof rubricFormSchema>>({
    resolver: zodResolver(rubricFormSchema),
    defaultValues: { name: '', criteria: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'criteria',
  });

  const handleOpenFormDialog = (rubric?: Rubric) => {
    if (rubric) {
      setEditingRubric(rubric);
      form.reset({ name: rubric.name, criteria: rubric.criteria });
    } else {
      setEditingRubric(null);
      form.reset({ name: '', criteria: [{ id: uuidv4(), name: '', descriptions: [...defaultDescriptions] }] });
    }
    setIsFormDialogOpen(true);
  };

  const handleOpenViewDialog = (rubric: Rubric) => {
    setViewingRubric(rubric);
    setIsViewDialogOpen(true);
  };

  const handleSubmit = async (values: z.infer<typeof rubricFormSchema>) => {
    setIsProcessing(true);
    try {
      if (editingRubric) {
        await updateRubric(editingRubric.id, values);
        toast({ title: 'Rubric Updated' });
      } else {
        await createRubric(values);
        toast({ title: 'Rubric Created' });
      }
      setIsFormDialogOpen(false);
    } catch (error) {
      console.error('Failed to save rubric:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save rubric.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (rubricId: string) => {
    setIsProcessing(true);
    try {
      await deleteRubric(rubricId);
      toast({ title: 'Rubric Deleted' });
    } catch (error) {
      console.error('Failed to delete rubric:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete rubric.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      const result = await TEMPORARY_migrateRubricIds();
      toast({
        title: 'Migration Complete',
        description: `Updated ${result.rubricsUpdated} rubrics and ${result.evaluationsUpdated} evaluations.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Migration Failed',
        description: 'An error occurred during data migration.',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                <FileCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Rubric Management</CardTitle>
                <CardDescription>Create and manage evaluation rubrics.</CardDescription>
              </div>
            </div>
            <Button onClick={() => handleOpenFormDialog()}>
              <Plus className="mr-2 h-4 w-4" /> New Rubric
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <DatabaseZap className="h-4 w-4" />
            <AlertTitle>Temporary Data Migration</AlertTitle>
            <div className="flex justify-between items-center">
              <p>Click to fix unique ID issues in existing rubrics.</p>
              <Button onClick={handleMigration} disabled={isMigrating} size="sm">
                {isMigrating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <DatabaseZap className="mr-2 h-4 w-4" />}
                {isMigrating ? 'Migrating...' : 'Run Migration'}
              </Button>
            </div>
          </Alert>
          {rubrics.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No rubrics created</h3>
              <p className="mt-2 text-sm text-muted-foreground">Get started by creating your first rubric.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rubrics.map((rubric) => (
                <Card key={rubric.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle>{rubric.name}</CardTitle>
                    <CardDescription>{rubric.criteria.length} criteria</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    {/* Optionally show some criteria info here */}
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenViewDialog(rubric)} className="flex-1">
                      <Eye className="mr-2 h-4 w-4" /> View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenFormDialog(rubric)} className="flex-1">
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{rubric.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(rubric.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Rubric Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Viewing Rubric: {viewingRubric?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto p-1">
            {viewingRubric?.criteria.map((criterion, index) => (
              <div key={criterion.id} className="mb-6">
                <h4 className="font-semibold text-lg mb-2">{index + 1}. {criterion.name}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {criterion.descriptions.map((desc, score) => (
                    <div key={score} className="p-3 border rounded-lg bg-muted/50">
                      <Badge variant="secondary" className="mb-2">Score: {score}</Badge>
                      <p className="text-sm text-muted-foreground">{desc || 'No description'}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Rubric Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingRubric ? 'Edit Rubric' : 'Create New Rubric'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Rubric Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Final Project Evaluation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                     <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    <FormField control={form.control} name={`criteria.${index}.name`} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Criterion {index + 1} Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Originality" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {Array.from({ length: 6 }).map((_, score) => (
                        <FormField key={score} control={form.control} name={`criteria.${index}.descriptions.${score}`} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Score {score} Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder={`Description for a score of ${score}...`} {...field} rows={3} className="resize-none" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

               {form.formState.errors.criteria?.root && (
                 <p className="text-sm font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {form.formState.errors.criteria.root.message}
                </p>
              )}
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ id: uuidv4(), name: '', descriptions: [...defaultDescriptions] })
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Add Criterion
              </Button>

              <Separator />

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isProcessing}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRubric ? 'Save Changes' : 'Create Rubric'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
