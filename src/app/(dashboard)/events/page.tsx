'use client';

// Fase 2 "Menú y nombres" (2026-10-06): hasta hoy los eventos solo se veían
// en el calendario. Esta es la lista: se ordena por fecha, deja ver de un
// vistazo cuáles vienen y cuáles ya pasaron, y lleva al detalle de cada uno
// (embudo, convocatoria y asistencia).
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Loader2, MapPin, Plus, Video } from 'lucide-react';
import api from '@/lib/api';
import { Can } from '@/components/shared/can';
import { usePermission } from '@/hooks/use-permission';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreateEventDialog } from '@/components/dashboard/calendar/create-event-dialog';

interface EventRow {
  id: number;
  name: string;
  startDate: string;
  type: 'PRESENTIAL' | 'VIRTUAL' | 'HYBRID';
  status: 'ACTIVE' | 'CLOSED' | string;
  location: string | null;
  _count?: { prospectsOrigin: number; attendance: number };
}

type Filter = 'upcoming' | 'past' | 'all';

const TYPE_LABEL: Record<EventRow['type'], string> = {
  PRESENTIAL: 'Presencial',
  VIRTUAL: 'Virtual',
  HYBRID: 'Híbrido',
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(value));

export default function EventsPage() {
  return (
    <Can
      module="AGENDA"
      action="canRead"
      fallback={
        <div className="p-12 text-center text-slate-500">No tienes permisos para ver los eventos.</div>
      }
    >
      <EventsList />
    </Can>
  );
}

function EventsList() {
  const canWrite = usePermission('AGENDA', 'canWrite');
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [createOpen, setCreateOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/events', { params: { limit: 500 } })
      .then(({ data }) => {
        if (cancelled) return;
        setEvents(Array.isArray(data) ? data : (data?.data ?? []));
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // "Ahora" se fija al abrir la pantalla: decide qué eventos son próximos.
  const [now] = useState(() => Date.now());

  const visible = useMemo(() => {
    if (!events) return [];
    const isUpcoming = (event: EventRow) =>
      event.status !== 'CLOSED' && new Date(event.startDate).getTime() >= now - 12 * 3_600_000;
    if (filter === 'all') return events;
    const list = events.filter((event) => (filter === 'upcoming' ? isUpcoming(event) : !isUpcoming(event)));
    // Próximos: el más cercano primero. Pasados: el más reciente primero.
    return filter === 'upcoming'
      ? [...list].sort((a, b) => a.startDate.localeCompare(b.startDate))
      : list;
  }, [events, filter, now]);

  const filters: { value: Filter; label: string }[] = [
    { value: 'upcoming', label: 'Próximos' },
    { value: 'past', label: 'Realizados' },
    { value: 'all', label: 'Todos' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-border/40 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-secondary/20 p-2">
            <CalendarDays className="h-6 w-6 text-secondary-foreground" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary">Eventos</h2>
            <p className="text-muted-foreground">
              Entra a un evento para convocar, ver el embudo y registrar la asistencia.
            </p>
          </div>
        </div>
        {canWrite && (
          <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Nuevo evento
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar eventos">
        {filters.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={filter === option.value ? 'default' : 'outline'}
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {failed ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          No se pudieron cargar los eventos.{' '}
          <button className="font-semibold underline" onClick={() => setReloadKey((k) => k + 1)}>
            Reintentar
          </button>
        </div>
      ) : events === null ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500">
          {filter === 'upcoming'
            ? 'No hay eventos próximos.'
            : filter === 'past'
              ? 'Todavía no hay eventos realizados.'
              : 'Aún no has creado eventos.'}
          {canWrite && filter !== 'past' && ' Crea el primero con "Nuevo evento".'}
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {visible.map((event) => (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="flex flex-col gap-2 p-4 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-semibold text-slate-800">{event.name}</p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                    <span>{formatDate(event.startDate)}</span>
                    <span className="flex items-center gap-1">
                      {event.type === 'VIRTUAL' ? (
                        <Video className="h-3.5 w-3.5" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5" />
                      )}
                      {event.location || TYPE_LABEL[event.type] || 'Sin lugar'}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <span className="tabular-nums text-slate-600">
                    {event._count?.attendance ?? 0} convocados
                  </span>
                  <Badge variant={event.status === 'CLOSED' ? 'secondary' : 'default'}>
                    {event.status === 'CLOSED' ? 'Cerrado' : 'Abierto'}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
