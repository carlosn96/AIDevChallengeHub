'use client';

import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { type Rubric, type RubricCriterion } from '@/lib/db-types';
import { createRubric, updateRubric, deleteRubric } from '@/lib/user-actions';
import { FileCheck, Plus, Trash2, Edit, Loader2, X, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

type RubricManagementProps = {
  rubrics: Rubric[];
};

const criterionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Criterion name is required.'),
  maxScore: z.coerce.number().min(1, 'Max score must be at least 1.'),
});

const rubricFormSchema = z.object({
  name: z.string().min(3, 'Rubric name must be at least 3 characters.'),
  criteria: z.array(criterionSchema).min(1, 'At least one criterion is required.'),
});

export default function RubricManagement({ rubrics }: RubricManagementProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);

  const form = useForm<z.infer<typeof rubricFormSchema>>({
    resolver: zodResolver(rubricFormSchema),
    defaultValues: { name: '', criteria: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'criteria',
  });

  const handleOpenDialog = (rubric?: Rubric) => {
    if (rubric) {
      setEditingRubric(rubric);
      form.reset({ name: rubric.name, criteria: rubric.criteria });
    } else {
      setEditingRubric(null);
      form.reset({ name: '', criteria: [{ id: uuidv4(), name: '', maxScore: 5 }] });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
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
      handleCloseDialog();
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
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" /> New Rubric
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rubrics.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No rubrics created</h3>
              <p className="mt-2 text-sm text-muted-foreground">Get started by creating your first rubric.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rubrics.map((rubric) => (
                <Card key={rubric.id}>
                  <CardHeader>
                    <CardTitle>{rubric.name}</CardTitle>
                    <CardDescription>{rubric.criteria.length} criteria</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(rubric)} className="flex-1">
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={isProcessing} className="flex-1">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{rubric.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(rubric.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
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
              <div>
                <FormLabel>Criteria</FormLabel>
                <div className="space-y-4 mt-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2 p-3 border rounded-lg">
                      <div className="grid grid-cols-6 gap-3 flex-1">
                        <FormField control={form.control} name={`criteria.${index}.name`} render={({ field }) => (
                          <FormItem className="col-span-4">
                            <FormLabel className="sr-only">Criterion Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Criterion Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`criteria.${index}.maxScore`} render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className="sr-only">Max Score</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Max Score" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {form.formState.errors.criteria?.root && (
                     <p className="text-sm font-medium text-destructive flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {form.formState.errors.criteria.root.message}
                    </p>
                  )}
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ id: uuidv4(), name: '', maxScore: 5 })}>
                  <Plus className="mr-2 h-4 w-4" /> Add Criterion
                </Button>
              </div>
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

// We need a UUID library. Let's add it.
// I will check if it's already in package.json. No, it's not. I'll add 'uuid' and '@types/uuid'.
