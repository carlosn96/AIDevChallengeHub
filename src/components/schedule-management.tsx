'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
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
import { type ScheduleEvent } from '@/lib/db-types';
import { createOrUpdateEvent, deleteEvent } from '@/lib/user-actions';
import { format } from 'date-fns';
import {
  Loader2,
  PlusCircle,
  Pencil,
  Trash2,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  Mic,
  FlaskConical,
  Trophy,
  Award,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

type ScheduleManagementProps = {
  schedule: ScheduleEvent[];
};

const eventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  type: z.enum(['conference', 'workshop', 'challenge', 'ceremony']),
  day: z.enum(['Day 1', 'Day 2', 'Day 3']),
  location: z.string().min(2, 'Location is required.'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
}).refine(data => data.endTime > data.startTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
});

const getBaseDateForDay = (day: 'Day 1' | 'Day 2' | 'Day 3'): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    if (day === 'Day 2') return new Date(today.setDate(today.getDate() + 1));
    if (day === 'Day 3') return new Date(today.setDate(today.getDate() + 2));
    return today;
};
  

const eventTypeIcons = {
  conference: <Mic className="h-4 w-4" />,
  workshop: <FlaskConical className="h-4 w-4" />,
  challenge: <Trophy className="h-4 w-4" />,
  ceremony: <Award className="h-4 w-4" />,
};

const eventTypeColors: { [key: string]: string } = {
  conference: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  workshop: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  challenge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  ceremony: 'bg-green-500/10 text-green-400 border-green-500/30',
};

const typeTranslations: { [key: string]: string } = {
  'conference': 'Conference',
  'workshop': 'Workshop',
  'challenge': 'Challenge',
  'ceremony': 'Ceremony',
};


export default function ScheduleManagement({ schedule }: ScheduleManagementProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
  });

  const handleCreateOrEdit = (event: ScheduleEvent | null) => {
    setEditingEvent(event);
    if (event) {
        form.reset({
            ...event,
            startTime: format(new Date(event.startTime), 'HH:mm'),
            endTime: format(new Date(event.endTime), 'HH:mm'),
        });
    } else {
        form.reset({
            title: '',
            description: '',
            type: 'conference',
            day: 'Day 1',
            location: '',
            startTime: '09:00',
            endTime: '10:00',
        });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof eventSchema>) => {
    setIsSubmitting(true);
    
    const baseDate = getBaseDateForDay(values.day);
    const [startHours, startMinutes] = values.startTime.split(':').map(Number);
    const [endHours, endMinutes] = values.endTime.split(':').map(Number);
  
    const startTime = new Date(baseDate);
    startTime.setHours(startHours, startMinutes);
  
    const endTime = new Date(baseDate);
    endTime.setHours(endHours, endMinutes);

    const eventData = {
        ...values,
        id: editingEvent?.id,
        startTime,
        endTime,
    };

    try {
      await createOrUpdateEvent(eventData as any);
      toast({
        title: editingEvent ? 'Event Updated' : 'Event Created',
        description: `"${values.title}" has been successfully saved.`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save event:', error);
      toast({
        variant: 'destructive',
        title: 'Error Saving Event',
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
        await deleteEvent(eventId);
        toast({
            title: "Event Deleted",
            description: "The event has been successfully removed.",
        });
    } catch (error) {
        console.error('Failed to delete event:', error);
        toast({
            variant: "destructive",
            title: "Error Deleting Event",
            description: "An unexpected error occurred. Please try again.",
        });
    }
  };

  const sortedSchedule = useMemo(() => 
    [...schedule].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [schedule]
  );
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Schedule Management</h2>
            <p className="text-muted-foreground text-sm mt-1">
                {schedule.length} {schedule.length === 1 ? 'event' : 'events'} planned
            </p>
        </div>
        <Button onClick={() => handleCreateOrEdit(null)} className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
          <PlusCircle className="mr-2" />
          Create Event
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
          {sortedSchedule.length === 0 ? (
             <div className="p-12 text-center text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold">No Events Scheduled</h3>
                <p className="text-sm">Create the first event to get started.</p>
             </div>
          ) : (
            sortedSchedule.map((event, index) => (
                <div key={event.id} className="p-4 group hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                                <Badge className={`${eventTypeColors[event.type]}`}>
                                    {eventTypeIcons[event.type]}
                                    <span className="ml-2 capitalize font-medium">{typeTranslations[event.type]}</span>
                                </Badge>
                                <Badge variant="outline">{event.day}</Badge>
                            </div>
                            <h3 className="font-semibold text-lg">{event.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                            
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mt-3">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span>{`${format(new Date(event.startTime), 'HH:mm')} - ${format(new Date(event.endTime), 'HH:mm')}`}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{event.location}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4 sm:mt-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => handleCreateOrEdit(event)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                            
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete the event <strong>"{event.title}"</strong>. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(event.id)} className="bg-destructive hover:bg-destructive/90">
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </div>
            ))
          )}
          </div>
        </CardContent>
      </Card>
      

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
            <DialogDescription>
                {editingEvent ? `Update the details for "${editingEvent.title}"` : 'Fill in the details for the new event.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Opening Keynote" {...field} />
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
                      <Textarea placeholder="Describe the event..." {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select event type" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {Object.entries(typeTranslations).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="day"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Day</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select event day" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Day 1">Day 1</SelectItem>
                                <SelectItem value="Day 2">Day 2</SelectItem>
                                <SelectItem value="Day 3">Day 3</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl><Input type="time" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl><Input type="time" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
              </div>
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Main Auditorium" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingEvent ? 'Save Changes' : 'Create Event'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
