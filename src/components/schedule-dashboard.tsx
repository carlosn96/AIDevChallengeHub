'use client';

import { useState, useMemo, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { type ScheduleEvent, type Day } from '@/lib/db-types';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Award,
  FlaskConical,
  Mic,
  Trophy,
  Clock,
  MapPin,
  CalendarDays,
  Radio,
  Sparkles,
  Loader2
} from 'lucide-react';

const eventTypeIcons = {
  conference: <Mic className="h-4 w-4" />,
  workshop: <FlaskConical className="h-4 w-4" />,
  challenge: <Trophy className="h-4 w-4" />,
  ceremony: <Award className="h-4 w-4" />,
};

const eventTypeColors: { [key: string]: string } = {
  conference: 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20',
  workshop: 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20',
  challenge: 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20',
  ceremony: 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20',
};

const typeTranslations: { [key: string]: string } = {
  'all': 'All Types',
  'conference': 'Conference',
  'workshop': 'Workshop',
  'challenge': 'Challenge',
  'ceremony': 'Ceremony',
};

const EventCard = ({
  event,
  isLive,
  isUpcoming
}: {
  event: ScheduleEvent;
  isLive: boolean;
  isUpcoming: boolean;
}) => {
  const startTime = event.startTime.toDate();
  const endTime = event.endTime.toDate();

  return (
    <Card
      className={`
        group relative overflow-hidden transition-all duration-300 
        hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50
        ${isLive ? 'border-red-500/50 shadow-lg shadow-red-500/20 bg-red-500/5' : ''}
        ${isUpcoming ? 'border-amber-500/50 bg-amber-500/5' : ''}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <CardHeader className="relative pb-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <Badge className={`${eventTypeColors[event.type]} transition-colors`}>
                {eventTypeIcons[event.type]}
                <span className="ml-2 capitalize font-medium">{typeTranslations[event.type]}</span>
              </Badge>

              {isLive && (
                <Badge className="bg-red-500 text-white border-red-500/50 animate-pulse">
                  <Radio className="h-3 w-3 mr-1" />
                  LIVE
                </Badge>
              )}

              {isUpcoming && !isLive && (
                <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Coming Soon
                </Badge>
              )}
            </div>

            <CardTitle className="text-lg group-hover:text-primary transition-colors">
              {event.title}
            </CardTitle>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground pt-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-primary/10">
              <Clock className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-medium">
              {`${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-accent/10">
              <MapPin className="h-3.5 w-3.5 text-accent" />
            </div>
            <span>{event.location}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative pt-0">
        <CardDescription className="leading-relaxed">
          {event.description}
        </CardDescription>
      </CardContent>
    </Card>
  );
};

export default function ScheduleDashboard() {
  const [days, setDays] = useState<Day[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | ScheduleEvent['type']>('all');
  const [liveState, setLiveState] = useState<{
    liveIds: Set<string>;
    upcomingIds: Set<string>;
  }>({ liveIds: new Set(), upcomingIds: new Set() });

  useEffect(() => {
    if (!db) {
        setIsLoading(false);
        return;
    }

    const unsubDays = onSnapshot(query(collection(db, 'days'), orderBy('date', 'asc')), (snapshot) => {
        const fetchedDays = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Day));
        setDays(fetchedDays);
        if (!activeDayId && fetchedDays.length > 0) {
            setActiveDayId(fetchedDays[0].id);
        }
        setIsLoading(false);
    });

    const unsubSchedule = onSnapshot(query(collection(db, 'schedule'), orderBy('startTime', 'asc')), (snapshot) => {
        const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleEvent));
        setSchedule(fetchedEvents);
    });

    return () => {
        unsubDays();
        unsubSchedule();
    };
  }, [activeDayId]);

  useEffect(() => {
    const updateLiveStatus = () => {
      const now = new Date();
      const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
      const newLiveIds = new Set<string>();
      const newUpcomingIds = new Set<string>();

      schedule.forEach(event => {
        const startTime = event.startTime.toDate();
        const endTime = event.endTime.toDate();
        if (now >= startTime && now <= endTime) {
          newLiveIds.add(event.id);
        } else if (now < startTime && startTime <= fifteenMinutesFromNow) {
          newUpcomingIds.add(event.id);
        }
      });

      setLiveState({ liveIds: newLiveIds, upcomingIds: newUpcomingIds });
    };

    updateLiveStatus();
    const interval = setInterval(updateLiveStatus, 60000);

    return () => clearInterval(interval);
  }, [schedule]);

  const filteredSchedule = useMemo(() => {
    return schedule
      .filter((event) => {
        const dayMatch = event.dayId === activeDayId;
        const typeMatch = typeFilter === 'all' || event.type === typeFilter;
        return dayMatch && typeMatch;
      })
      .sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime());
  }, [activeDayId, typeFilter, schedule]);

  const eventStats = useMemo(() => {
    const dayEvents = schedule.filter(e => e.dayId === activeDayId);
    return {
      total: dayEvents.length,
      live: Array.from(liveState.liveIds).filter(id =>
        dayEvents.some(e => e.id === id)
      ).length,
      upcoming: Array.from(liveState.upcomingIds).filter(id =>
        dayEvents.some(e => e.id === id)
      ).length,
    };
  }, [activeDayId, liveState, schedule]);

  if (isLoading) {
    return (
        <Card className="border-border/50 shadow-lg">
            <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 via-background to-accent/5">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl border border-primary/30">
                        <CalendarDays className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Event Schedule</CardTitle>
                        <CardDescription className="mt-1">Loading schedule...</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            </CardContent>
        </Card>
    );
  }

  if (days.length === 0) {
      return (
          <Card className="border-border/50 shadow-lg">
              <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 via-background to-accent/5">
                  <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl border border-primary/30">
                          <CalendarDays className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                          <CardTitle className="text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Event Schedule</CardTitle>
                          <CardDescription className="mt-1">No events scheduled yet.</CardDescription>
                      </div>
                  </div>
              </CardHeader>
              <CardContent className="pt-6 text-center text-muted-foreground">
                  The event schedule has not been published yet. Please check back later.
              </CardContent>
          </Card>
      );
  }

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 via-background to-accent/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl border border-primary/30">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Event Schedule
              </CardTitle>
              <CardDescription className="mt-1">
                Filter events by day and type
              </CardDescription>
            </div>
          </div>

          <div className="hidden sm:flex gap-2">
            {eventStats.live > 0 && (
              <Badge className="bg-red-500/10 text-red-500 border-red-500/30">
                <Radio className="h-3 w-3 mr-1 animate-pulse" />
                {eventStats.live} live
              </Badge>
            )}
            {eventStats.upcoming > 0 && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10">
                {eventStats.upcoming} upcoming
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
      <Tabs value={activeDayId || ''} onValueChange={setActiveDayId} className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <TabsList className="w-full sm:w-auto grid grid-cols-1 sm:grid-cols-3 h-auto sm:h-11">
              {days.map((day) => (
                <TabsTrigger
                  key={day.id}
                  value={day.id}
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white"
                >
                  {day.title}
                </TabsTrigger>
              ))}
            </TabsList>

            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
              <SelectTrigger className="w-full sm:w-[200px] h-11 border-border/50">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-accent" />
                    {typeTranslations['all']}
                  </div>
                </SelectItem>
                {Object.keys(eventTypeIcons).map((type) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      {eventTypeIcons[type as keyof typeof eventTypeIcons]}
                      {typeTranslations[type]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {days.map((day) => (
            <TabsContent key={day.id} value={day.id} className="mt-0">
              {filteredSchedule.length > 0 ? (
                <div className="space-y-4">
                  {filteredSchedule.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isLive={liveState.liveIds.has(event.id)}
                      isUpcoming={liveState.upcomingIds.has(event.id)}
                    />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-2 border-muted-foreground/25">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="p-4 rounded-full bg-muted/50 mb-4">
                      <CalendarDays className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-center">
                      No events match your filters for <strong>{day.title}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground/60 mt-2">
                      Try changing the filters
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
