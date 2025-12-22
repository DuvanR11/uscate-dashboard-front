'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // <--- 1. IMPORTAR ROUTER
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css'; 
import api from '@/lib/api';
import { CalendarEvent } from '@/types/calendar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, CalendarDays } from 'lucide-react';
import { CreateEventDialog } from './create-event-dialog';
// Ya no necesitas importar EventDetailsDialog si vas a redirigir siempre

const locales = { 'es': es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const messages = { /* ... tus mensajes ... */ };

export default function CalendarView() {
  const router = useRouter(); // <--- 2. INICIALIZAR ROUTER
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  // Eliminamos estados de selectedEvent y isDetailsOpen si ya no usas el modal

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events');
      const rawEvents = res.data.data || [];

      const parsedEvents = rawEvents.map((evt: any) => ({
        ...evt,
        // Asegúrate de mapear el ID para usarlo en la redirección
        id: evt.id, 
        title: evt.name, 
        start: new Date(evt.startDate), 
        end: new Date(evt.endDate),
      }));
      setEvents(parsedEvents);
    } catch (error) {
      console.error("Error fetching events", error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // --- 3. CAMBIAR LA LÓGICA DEL CLICK ---
  const handleSelectEvent = (event: CalendarEvent) => {
      // En lugar de abrir modal, navegamos a la pantalla del evento
      router.push(`/events/${event.id}`);
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: '#1B2541',
        color: '#ffffff',
        borderRadius: '4px',
        border: 'none',
        borderLeft: '4px solid #FFC400',
        fontSize: '0.80rem',
        fontWeight: '500',
        padding: '2px 5px',
        cursor: 'pointer'
      }
    };
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
             <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary">Agenda de Campaña</h2>
            <p className="text-muted-foreground">Cronograma de eventos, recorridos y reuniones.</p>
          </div>
        </div>
        
        <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-white font-bold shadow-md">
           <Plus className="mr-2 h-4 w-4" /> Nuevo Evento
        </Button>
      </div>

      <Card className="p-0 border shadow-sm flex-1 min-h-[600px] overflow-hidden">
        <div className="h-full p-4 bg-white rounded-lg">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                titleAccessor="title"
                style={{ height: '100%', minHeight: '550px' }}
                culture="es"
                messages={messages}
                views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                eventPropGetter={eventStyleGetter}
                className="font-sans text-slate-600"
                
                // ESTO DISPARA LA REDIRECCIÓN
                onSelectEvent={handleSelectEvent}
            />
        </div>
      </Card>

      <CreateEventDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
        onSuccess={fetchEvents} 
      />
    </div>
  );
}