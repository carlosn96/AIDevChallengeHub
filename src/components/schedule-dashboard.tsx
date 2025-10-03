'use client';

import { useState, useMemo, useEffect } from 'react';
import { schedule, type ScheduleEvent } from '@/lib/data';
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
} from 'lucide-react';

const eventTypeIcons = {
  conference: <Mic className="h-4 w-4" />,
  workshop: <FlaskConical className="h-4 w-4" />,
  challenge: <Trophy className="h-4 w-4" />,
  ceremony: <Award className="h-4 w-4" />,
};

const eventTypeColors: { [key: string]: string } = {
  conference: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  workshop: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  challenge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ceremony: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const EventCard = ({ event, isLive, isUpcoming }: { event: ScheduleEvent, isLive: boolean, isUpcoming: boolean }) => {
  return (
    <Card className={`transition-all hover:shadow-primary/20 hover:shadow-lg ${isLive ? 'border-primary shadow-primary/20' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <Badge className={`mb-2 ${eventTypeColors[event.type]}`}>
                {eventTypeIcons[event.type]}
                <span className="ml-2">{event.type}</span>
                </Badge>
                <CardTitle>{event.title}</CardTitle>
            </div>
            {isLive && <Badge className="bg-red-500 text-white animate-pulse">EN VIVO</Badge>}
            {isUpcoming && !isLive && <Badge variant="outline">Próximo</Badge>}
        </div>
        
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground pt-2">
            <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{`${format(event.startTime, 'HH:mm')} - ${format(event.endTime, 'HH:mm')}`}</span>
            </div>
            <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
            </div>
        </div>

      </CardHeader>
      <CardContent>
        <CardDescription>{event.description}</CardDescription>
      </CardContent>
    </Card>
  );
};


export default function ScheduleDashboard() {
  const [dayFilter, setDayFilter] = useState<'Day 1' | 'Day 2' | 'Day 3' | 'all'>('Day 1');
  const [typeFilter, setTypeFilter] = useState<'all' | ScheduleEvent['type']>(
    'all'
  );
  const [liveState, setLiveState] = useState<{ liveIds: Set<string>, upcomingIds: Set<string> }>({ liveIds: new Set(), upcomingIds: new Set() });

  useEffect(() => {
    const updateLiveStatus = () => {
        const now = new Date();
        const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
        const newLiveIds = new Set<string>();
        const newUpcomingIds = new Set<string>();

        schedule.forEach(event => {
            if (now >= event.startTime && now <= event.endTime) {
                newLiveIds.add(event.id);
            } else if (now < event.startTime && event.startTime <= fifteenMinutesFromNow) {
                newUpcomingIds.add(event.id);
            }
        });
        setLiveState({ liveIds: newLiveIds, upcomingIds: newUpcomingIds });
    };

    updateLiveStatus();
    const interval = setInterval(updateLiveStatus, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const filteredSchedule = useMemo(() => {
    return schedule.filter((event) => {
      const dayMatch = dayFilter === 'all' || event.day === dayFilter;
      const typeMatch = typeFilter === 'all' || event.type === typeFilter;
      return dayMatch && typeMatch;
    }).sort((a,b) => a.startTime.getTime() - b.startTime.getTime());
  }, [dayFilter, typeFilter]);

  const days: ('Day 1' | 'Day 2' | 'Day 3')[] = ['Day 1', 'Day 2', 'Day 3'];

  const dayTranslations = {
    'Day 1': 'Día 1',
    'Day 2': 'Día 2',
    'Day 3': 'Día 3',
  }

  const typeTranslations : {[key: string]: string} = {
    'all': 'Todos los tipos',
    'conference': 'Conferencia',
    'workshop': 'Taller',
    'challenge': 'Reto',
    'ceremony': 'Ceremonia',
   }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
             <div className="p-2 bg-muted rounded-md">
                <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <div>
                <CardTitle>Cronograma del Evento</CardTitle>
                <CardDescription>
                Filtra los eventos por día y tipo de actividad.
                </CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={dayFilter} onValueChange={(value) => setDayFilter(value as any)} className="w-full">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <TabsList>
              {days.map((day) => (
                <TabsTrigger key={day} value={day}>
                  {dayTranslations[day]}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="w-full sm:w-auto min-w-[180px]">
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
                <SelectTrigger>
                    <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{typeTranslations['all']}</SelectItem>
                    <SelectItem value="conference">{typeTranslations['conference']}</SelectItem>
                    <SelectItem value="workshop">{typeTranslations['workshop']}</SelectItem>
                    <SelectItem value="challenge">{typeTranslations['challenge']}</SelectItem>
                    <SelectItem value="ceremony">{typeTranslations['ceremony']}</SelectItem>
                </SelectContent>
                </Select>
            </div>
          </div>
          {days.map((day) => (
            <TabsContent key={day} value={day}>
              {filteredSchedule.length > 0 ? (
                <div className="space-y-4">
                  {filteredSchedule.map((event) => (
                    <EventCard 
                        key={event.id} 
                        event={{...event, type: typeTranslations[event.type] as any}}
                        isLive={liveState.liveIds.has(event.id)}
                        isUpcoming={liveState.upcomingIds.has(event.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <p>No hay eventos que coincidan con tus filtros para {dayTranslations[day]}.</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
