'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Calendar, Loader2, MapPin, ArrowRight, CalendarX, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';

/**
 * `/[orgSlug]/eventos` — gap post-M4 de la "Deuda Multi-Tenant" (ver
 * memoria `deuda-multitenant-crm`): landing pública de eventos, último de
 * los 3 gaps anotados al cerrar la Fase M4. El backend ya exponía
 * `GET /public/organizations/:orgSlug/events` desde esa fase, pero ninguna
 * página lo consumía todavía.
 *
 * Solo lista eventos con inscripciones ABIERTAS (`status=ACTIVE` — el
 * mismo estado que `PublicEventsController#register` exige para aceptar un
 * registro): un evento cerrado o agotado no tiene nada que un ciudadano
 * pueda hacer acá. Cada tarjeta enlaza al flujo real de inscripción, que
 * vive en `/eventos/[slug]` (Nivel 1 del informe — resuelto por el slug
 * GLOBAL del evento, no por organización, sin cambios de esta fase).
 *
 * Mismo criterio visual que `/eventos/[slug]` y `/eventos/checkin`: fondo
 * oscuro + acento ámbar, la identidad ya establecida para todo el flujo
 * público de eventos. No muestra el nombre de la organización (ninguna
 * otra página pública por slug lo hace hoy — ver `[orgSlug]/register` — no
 * existe un endpoint público para ese dato, y agregarlo es un cambio
 * aparte, no pedido en este gap).
 */

interface PublicEvent {
  id: number;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  location: string | null;
  imageUrl: string | null;
  description: string | null;
}

export default function PublicEventsListPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!orgSlug) return;

    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const { data } = await api.get(
          `/public/organizations/${orgSlug}/events`,
          { params: { status: 'ACTIVE', limit: 100 } },
        );
        setEvents(data.data || []);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orgSlug]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* HEADER */}
      <div className="border-b border-white/5 bg-[#1B2541] py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 text-[#FFC400] text-xs font-bold uppercase tracking-widest bg-white/5 border border-[#FFC400]/20 rounded-full px-4 py-1.5 mb-4">
            <Calendar className="h-3.5 w-3.5" />
            Agenda pública
          </span>
          <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight">
            Eventos con inscripción abierta
          </h1>
          <p className="text-slate-400 mt-2 max-w-lg mx-auto">
            Regístrate a los próximos eventos y actividades disponibles.
          </p>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            Cargando eventos...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <ShieldAlert className="h-10 w-10 mb-3 text-red-500/80" />
            <p>No se pudieron cargar los eventos.</p>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <CalendarX className="h-10 w-10 mb-3 opacity-30" />
            <p>No hay eventos con inscripción abierta en este momento.</p>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {events.map((event) => (
              <Link key={event.id} href={`/eventos/${event.slug}`} className="group">
                <Card className="h-full bg-white/5 border-white/10 overflow-hidden hover:border-[#FFC400]/40 transition-all">
                  <div className="relative h-40 bg-slate-900">
                    {event.imageUrl ? (
                      // <img> plano, no next/image — mismo criterio que
                      // `components/dashboard/events/pu/page.tsx`: las
                      // imágenes vienen de DigitalOcean Spaces y el proyecto
                      // no tiene `images.remotePatterns` configurado en
                      // `next.config.ts`.
                      <img
                        src={event.imageUrl}
                        alt={event.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Calendar className="h-10 w-10 text-slate-700" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-[#FFC400] text-xs font-bold uppercase tracking-widest mb-1">
                      {new Date(event.startDate).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <h2 className="text-white font-bold text-lg leading-tight mb-2 group-hover:text-[#FFC400] transition-colors">
                      {event.name}
                    </h2>
                    {event.location && (
                      <p className="text-slate-400 text-sm flex items-center gap-1.5 mb-3">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {event.location}
                      </p>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white group-hover:gap-2.5 transition-all">
                      Inscribirme <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
