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
import { type ScheduleEvent, type Day } from '@/lib/db-types';
import { createDay, updateDay, deleteDay, createOrUpdateEvent, deleteEvent } from '@/lib/user-actions';
import { format, parse } from 'date-fns';
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
  MoreVertical
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarPicker } from './ui/calendar';
import { Timestamp } from 'firebase/firestore';

type ScheduleManagementProps = {
  schedule: ScheduleEvent[];
  days: Day[];
};

const daySchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters."),
    date: z.date({ required_error: "A date is required." }),
});

const eventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  type: z.enum(['conference', 'workshop', 'challenge', 'ceremony']),
  location: z.string().min(2, 'Location is required.'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
}).refine(data => data.endTime > data.startTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
});

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

// --- Sub-components ---

function DayDialog({ open, onOpenChange, onSubmit, isSubmitting, editingDay }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: z.infer<typeof daySchema>) => void;
    isSubmitting: boolean;
    editingDay: Day | null;
}) {
    const form = useForm<z.infer<typeof daySchema>>({
        resolver: zodResolver(daySchema),
        defaultValues: { title: '', date: new Date() }
    });

    React.useEffect(() => {
        if (editingDay) {
            form.reset({ title: editingDay.title, date: editingDay.date.toDate() });
        } else {
            form.reset({ title: '', date: new Date() });
        }
    }, [editingDay, open, form]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingDay ? 'Edit Day' : 'Create New Day'}</DialogTitle>
                    <DialogDescription>{editingDay ? 'Update the details for this day.' : 'Add a new day to the schedule.'}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Day Title</FormLabel><FormControl><Input placeholder="e.g., Day 1: Kickoff" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="date" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover>
                                <PopoverTrigger asChild>
                                    <FormControl><Button variant={"outline"} className="pl-3 text-left font-normal">{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button></FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><CalendarPicker mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date("1900-01-01")} initialFocus /></PopoverContent>
                            </Popover><FormMessage /></FormItem>
                        )} />
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingDay ? 'Save Changes' : 'Create Day'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function EventDialog({ open, onOpenChange, onSubmit, isSubmitting, editingEvent, day }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: z.infer<typeof eventSchema>) => void;
    isSubmitting: boolean;
    editingEvent: ScheduleEvent | null;
    day: Day;
}) {
    const form = useForm<z.infer<typeof eventSchema>>({
        resolver: zodResolver(eventSchema),
    });

    React.useEffect(() => {
        if (editingEvent) {
            form.reset({
                ...editingEvent,
                startTime: format(editingEvent.startTime.toDate(), 'HH:mm'),
                endTime: format(editingEvent.endTime.toDate(), 'HH:mm'),
            });
        } else {
            form.reset({
                title: '', description: '', type: 'conference', location: '', startTime: '09:00', endTime: '10:00',
            });
        }
    }, [editingEvent, open, form]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{editingEvent ? 'Edit Event' : `New Event for ${day.title}`}</DialogTitle>
                    <DialogDescription>{editingEvent ? `Update details for "${editingEvent.title}"` : 'Fill in the details for the new event.'}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Event Title</FormLabel><FormControl><Input placeholder="e.g., Opening Keynote" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe the event..." {...field} rows={4} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select event type" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {Object.entries(typeTranslations).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="location" render={({ field }) => (
                                <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="e.g., Main Auditorium" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="startTime" render={({ field }) => (
                                <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="endTime" render={({ field }) => (
                                <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingEvent ? 'Save Changes' : 'Create Event'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}


// --- Main Component ---

export default function ScheduleManagement({ schedule, days }: ScheduleManagementProps) {
  const { toast } = useToast();
  const [isDaySubmitting, setIsDaySubmitting] = useState(false);
  const [isEventSubmitting, setIsEventSubmitting] = useState(false);
  
  const [isDayDialogOpen, setIsDayDialogOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<Day | null>(null);

  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [currentDay, setCurrentDay] = useState<Day | null>(null);

  const eventsByDay = useMemo(() => {
    const grouped: { [dayId: string]: ScheduleEvent[] } = {};
    for (const event of schedule) {
      if (!grouped[event.dayId]) {
        grouped[event.dayId] = [];
      }
      grouped[event.dayId].push(event);
    }
    for (const dayId in grouped) {
        grouped[dayId].sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime());
    }
    return grouped;
  }, [schedule]);

  const handleDaySubmit = async (values: z.infer<typeof daySchema>) => {
    setIsDaySubmitting(true);
    try {
        if (editingDay) {
            await updateDay(editingDay.id, { ...values, date: Timestamp.fromDate(values.date) });
            toast({ title: "Day Updated", description: `"${values.title}" has been successfully updated.` });
        } else {
            await createDay({ ...values, date: Timestamp.fromDate(values.date) });
            toast({ title: "Day Created", description: `"${values.title}" has been successfully created.` });
        }
        setIsDayDialogOpen(false);
    } catch (error) {
        console.error('Failed to save day:', error);
        toast({ variant: "destructive", title: "Error Saving Day", description: "An unexpected error occurred." });
    } finally {
        setIsDaySubmitting(false);
    }
  };

  const handleEventSubmit = async (values: z.infer<typeof eventSchema>) => {
    if (!currentDay) return;
    setIsEventSubmitting(true);

    const dayDate = currentDay.date.toDate();
    const startTime = parse(values.startTime, 'HH:mm', dayDate);
    const endTime = parse(values.endTime, 'HH:mm', dayDate);

    try {
      await createOrUpdateEvent({
          ...values,
          id: editingEvent?.id,
          dayId: currentDay.id,
          startTime,
          endTime,
      });
      toast({ title: editingEvent ? 'Event Updated' : 'Event Created', description: `"${values.title}" has been saved.` });
      setIsEventDialogOpen(false);
    } catch (error) {
      console.error('Failed to save event:', error);
      toast({ variant: 'destructive', title: 'Error Saving Event', description: 'An unexpected error occurred.' });
    } finally {
      setIsEventSubmitting(false);
    }
  };

  const handleDayDelete = async (dayId: string) => {
    try {
        await deleteDay(dayId);
        toast({ title: "Day Deleted", description: "The day and all its events have been removed."});
    } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "Could not delete the day."});
    }
  }

  const handleEventDelete = async (eventId: string) => {
    try {
        await deleteEvent(eventId);
        toast({ title: "Event Deleted", description: "The event has been removed." });
    } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "Could not delete the event."});
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Schedule Management</h2>
            <p className="text-muted-foreground text-sm mt-1">
                Manage days and their associated events.
            </p>
        </div>
        <Button onClick={() => { setEditingDay(null); setIsDayDialogOpen(true); }} className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
          <PlusCircle className="mr-2" />
          Create Day
        </Button>
      </div>

      {days.length === 0 ? (
        <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-1">No Days Scheduled</h3>
                <p className="text-sm text-muted-foreground mb-6">Create the first day to start adding events.</p>
                <Button variant="outline" onClick={() => { setEditingDay(null); setIsDayDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create First Day
                </Button>
            </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
            {days.map(day => (
                <Card key={day.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/30">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>{day.title}</CardTitle>
                                <CardDescription>{format(day.date.toDate(), 'EEEE, MMMM d, yyyy')}</CardDescription>
                            </div>
                            <div className='flex items-center gap-2'>
                                <Button size="sm" variant="outline" onClick={() => { setCurrentDay(day); setEditingEvent(null); setIsEventDialogOpen(true); }}>
                                    <PlusCircle className="h-4 w-4 mr-2" /> Add Event
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => { setEditingDay(day); setIsDayDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Delete "{day.title}"?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this day and all events scheduled for it. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDayDelete(day.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {eventsByDay[day.id] && eventsByDay[day.id].length > 0 ? (
                            <div className="divide-y divide-border">
                                {eventsByDay[day.id].map(event => (
                                    <div key={event.id} className="p-4 group hover:bg-muted/50 transition-colors">
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex-1">
                                                <Badge className={`${eventTypeColors[event.type]} mb-2`}>{eventTypeIcons[event.type]}<span className="ml-2 capitalize">{typeTranslations[event.type]}</span></Badge>
                                                <h3 className="font-semibold text-lg">{event.title}</h3>
                                                <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mt-3">
                                                    <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><span>{`${format(event.startTime.toDate(), 'HH:mm')} - ${format(event.endTime.toDate(), 'HH:mm')}`}</span></div>
                                                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span>{event.location}</span></div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-4 sm:mt-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => { setCurrentDay(day); setEditingEvent(event); setIsEventDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Delete "{event.title}"?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleEventDelete(event.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-muted-foreground">No events scheduled for this day yet.</div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
      )}

      <DayDialog 
        open={isDayDialogOpen}
        onOpenChange={setIsDayDialogOpen}
        onSubmit={handleDaySubmit}
        isSubmitting={isDaySubmitting}
        editingDay={editingDay}
      />

      {currentDay && (
        <EventDialog
            open={isEventDialogOpen}
            onOpenChange={setIsEventDialogOpen}
            onSubmit={handleEventSubmit}
            isSubmitting={isEventSubmitting}
            editingEvent={editingEvent}
            day={currentDay}
        />
      )}
    </div>
  );
}
