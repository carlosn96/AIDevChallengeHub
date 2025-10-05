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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { type Activity } from '@/lib/db-types';
import { createActivity, updateActivity, deleteActivity } from '@/lib/user-actions';
import { 
  Loader2, 
  PlusCircle, 
  Pencil, 
  Trash2, 
  AlertCircle,
  ListChecks,
  Calendar,
  MoreVertical,
  Target,
  FlaskConical,
  Mic,
  Star
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

type ActivityManagementProps = {
  activities: Activity[];
};

const activitySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  type: z.enum(['workshop', 'conference', 'task']),
  sdg: z.string().optional().transform((val, ctx) => {
    if (!val || val.trim() === '') return undefined;
    const number = Number(val);
    if (isNaN(number)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "SDG must be a valid number." });
      return z.NEVER;
    }
    if (number < 1 || number > 17) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "SDG number must be between 1 and 17." });
      return z.NEVER;
    }
    return number;
  }),
});

const activityTypeIcons: { [key: string]: React.ReactNode } = {
  workshop: <FlaskConical className="h-4 w-4 text-purple-500" />,
  conference: <Mic className="h-4 w-4 text-blue-500" />,
  task: <Star className="h-4 w-4 text-yellow-500" />,
};

const activityTypeTranslations: { [key: string]: string } = {
  workshop: 'Workshop',
  conference: 'Conference',
  task: 'Task',
};

export default function ActivityManagement({ activities }: ActivityManagementProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: { title: '', description: '', type: 'workshop', sdg: '' },
  });

  const handleEditClick = (activity: Activity) => {
    setEditingActivity(activity);
    form.reset({
      title: activity.title,
      description: activity.description,
      type: activity.type,
      sdg: activity.sdg?.toString() || '',
    });
    setIsEditDialogOpen(true);
  };
  
  const handleCreateSubmit = async (values: z.infer<typeof activitySchema>) => {
    setIsSubmitting(true);
    try {
      await createActivity(values);
      toast({ title: 'Activity Created', description: `"${values.title}" has been created successfully.` });
      form.reset({ title: '', description: '', type: 'workshop', sdg: '' });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create activity:', error);
      toast({ variant: 'destructive', title: 'Creation Failed', description: 'There was an error creating the activity.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (values: z.infer<typeof activitySchema>) => {
    if (!editingActivity) return;

    setIsUpdating(true);
    try {
      await updateActivity(editingActivity.id, values);
      toast({ title: 'Activity Updated', description: `"${values.title}" has been updated successfully.` });
      setIsEditDialogOpen(false);
      setEditingActivity(null);
    } catch (error) {
      console.error('Failed to update activity:', error);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'There was an error updating the activity.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (activityId: string) => {
    setIsDeleting(true);
    try {
      await deleteActivity(activityId);
      toast({ title: 'Activity Deleted', description: 'The activity has been deleted successfully.' });
    } catch (error) {
      console.error('Failed to delete activity:', error);
      toast({ variant: 'destructive', title: 'Deletion Failed', description: 'There was an error deleting the activity.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const DialogForm = ({ form, onSubmit, isSubmitting: isBusy, isEdit = false }: { 
      form: typeof form, 
      onSubmit: (values: z.infer<typeof activitySchema>) => void,
      isSubmitting: boolean,
      isEdit: boolean
  }) => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
        <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem>
                <FormLabel>Activity Title</FormLabel>
                <FormControl><Input placeholder="e.g., SDG Workshop on Clean Water" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="Describe the activity's objectives..." {...field} rows={4} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {Object.entries(activityTypeTranslations).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="sdg" render={({ field }) => (
                <FormItem>
                    <FormLabel>Related SDG (Optional)</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 6" {...field} /></FormControl>
                    <FormDescription>A number from 1 to 17.</FormDescription>
                    <FormMessage />
                </FormItem>
            )} />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline" disabled={isBusy}>Cancel</Button></DialogClose>
          <Button type="submit" disabled={isBusy}>
            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Activity'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Activities</h2>
          <p className="text-muted-foreground text-sm mt-1">{activities.length} activities available to assign.</p>
        </div>
        <Button onClick={() => { form.reset({ title: '', description: '', type: 'workshop', sdg: '' }); setIsCreateDialogOpen(true); }}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Activity
        </Button>
      </div>

      {activities.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ListChecks className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No activities created yet</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">Create activities like workshops or special tasks that can be assigned to teams.</p>
            <Button onClick={() => { form.reset({ title: '', description: '', type: 'workshop', sdg: '' }); setIsCreateDialogOpen(true); }} variant="outline">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create First Activity
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => (
            <Card key={activity.id} className="group flex flex-col justify-between">
              <div>
                <CardHeader className="relative pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2.5 rounded-lg bg-muted flex-shrink-0">
                        {activityTypeIcons[activity.type]}
                      </div>
                      <CardTitle className="text-lg truncate">{activity.title}</CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(activity)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the activity <strong>"{activity.title}"</strong> and unassign it from all teams.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(activity.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <CardDescription className="line-clamp-3">{activity.description}</CardDescription>
                  <div className="flex items-center gap-4 mt-4">
                    <Badge variant="outline">{activityTypeTranslations[activity.type]}</Badge>
                    {activity.sdg && <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Target className="h-3 w-3 mr-1.5" />SDG {activity.sdg}</Badge>}
                  </div>
                </CardContent>
              </div>
              <CardFooter className="relative pt-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Created: {activity.createdAt?.toDate ? format(activity.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}</span>
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
            <DialogTitle>Create New Activity</DialogTitle>
            <DialogDescription>Add a new activity that can be assigned to teams.</DialogDescription>
          </DialogHeader>
          <DialogForm form={form} onSubmit={handleCreateSubmit} isSubmitting={isSubmitting} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
            <DialogDescription>Update the details for "{editingActivity?.title}".</DialogDescription>
          </DialogHeader>
          <DialogForm form={form} onSubmit={handleUpdateSubmit} isSubmitting={isUpdating} isEdit />
        </DialogContent>
      </Dialog>
    </div>
  );
}
