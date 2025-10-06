
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ListChecks, Plus, Trash2, Edit, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { type Activity } from '@/lib/db-types';
import { createActivity, updateActivity, deleteActivity } from '@/lib/user-actions';
import { useToast } from '@/hooks/use-toast';

type ActivityManagementProps = {
  activities: Activity[];
};

export default function ActivityManagement({ activities }: ActivityManagementProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    product: '',
  });

  const handleOpenDialog = (activity?: Activity) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData({
        title: activity.title,
        description: activity.description || '',
        product: activity.product || '',
      });
    } else {
      setEditingActivity(null);
      setFormData({ title: '', description: '', product: '' });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingActivity(null);
    setFormData({ title: '', description: '', product: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Activity title is required.',
      });
      return;
    }

    setIsProcessing(true);
    try {
      if (editingActivity) {
        await updateActivity(editingActivity.id, formData);
        toast({
          title: 'Activity Updated',
          description: 'The activity has been successfully updated.',
        });
      } else {
        await createActivity(formData);
        toast({
          title: 'Activity Created',
          description: 'The activity has been successfully created.',
        });
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save activity:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save activity. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (activityId: string) => {
    setIsProcessing(true);
    try {
      await deleteActivity(activityId);
      toast({
        title: 'Activity Deleted',
        description: 'The activity has been successfully deleted.',
      });
    } catch (error) {
      console.error('Failed to delete activity:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete activity. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                <ListChecks className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg md:text-xl">Activities</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  {activities.length} {activities.length === 1 ? 'activity' : 'activities'} available to assign.
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={() => handleOpenDialog()} 
              size="sm"
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Activity
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="mb-4 p-4 rounded-full bg-muted">
                <ListChecks className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
              </div>
              <h3 className="text-base md:text-lg font-semibold mb-2">No activities created yet</h3>
              <p className="text-xs md:text-sm text-muted-foreground mb-6 max-w-sm">
                Create activities like workshops or special tasks that can be assigned to teams.
              </p>
              <Button onClick={() => handleOpenDialog()} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create First Activity
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {activities.map((activity) => (
                <Card key={activity.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg line-clamp-2">
                      {activity.title}
                    </CardTitle>
                    {activity.description && (
                      <CardDescription className="text-xs md:text-sm line-clamp-3">
                        {activity.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(activity)}
                        className="flex-1"
                      >
                        <Edit className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                        <span className="text-xs md:text-sm">Edit</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isProcessing}
                            className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                            <span className="text-xs md:text-sm">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-base md:text-lg">
                              Delete "{activity.title}"?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-xs md:text-sm">
                              This will permanently delete this activity. Teams assigned to this activity will lose access. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
                              onClick={() => handleDelete(activity.id)}
                            >
                              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Delete Activity
                            </AlertDialogAction>
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

      {/* Create/Edit Activity Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              {editingActivity ? 'Edit Activity' : 'Create New Activity'}
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              {editingActivity
                ? 'Update the details of this activity.'
                : 'Add a new activity that can be assigned to teams.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Activity Title *
              </label>
              <Input
                id="title"
                placeholder="e.g., Workshop: AI Fundamentals"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="text-sm md:text-base"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description (Optional)
              </label>
              <Textarea
                id="description"
                placeholder="Provide details about this activity..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="text-sm md:text-base resize-none"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="product" className="text-sm font-medium">
                Deliverable Product (Optional)
              </label>
              <Input
                id="product"
                placeholder="e.g., PDF Document, Video, Code Repository"
                value={formData.product}
                onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                className="text-sm md:text-base"
              />
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={isProcessing}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isProcessing}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingActivity ? 'Update Activity' : 'Create Activity'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
