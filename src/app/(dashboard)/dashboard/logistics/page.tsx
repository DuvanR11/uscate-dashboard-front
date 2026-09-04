'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';
import {
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  QrCode,
  ScanLine,
  ShieldAlert,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

/**
 * `/dashboard/logistics` — gap post-M4 de la "Deuda Multi-Tenant" (ver
 * memoria `deuda-multitenant-crm`): generador de links de check-in por
 * evento. `(ciudadano)/eventos/checkin` ya redirigía acá cuando le faltaba
 * `slug`/`orgSlug` en la URL, pero la página no existía todavía.
 *
 * Solo lista eventos ACTIVOS (`GET /events/active-list`) — no tiene sentido
 * generar un link de check-in para un evento cerrado o futuro. El link se
 * arma en el navegador con `window.location.origin`, igual que
 * `/organization/links`.
 *
 * Al implementarla se encontró y cerró un gap real más serio: los 4
 * endpoints de lectura de `EventsController` que consume esta misma página
 * (`findAll`, `active-list`, `findOne`, `:id/attendance`, `:id/funnel`)
 * NO tenían ningún guard ni scope por organización — cualquier staff
 * logueado (o, en el caso de `attendance`/`funnel`, cualquiera sin sesión)
 * podía ver eventos y listados de asistentes con PII de OTRA organización
 * adivinando el ID. Se corrigió en el backend junto con esta página.
 */

interface ActiveEvent {
  id: number;
  name: string;
  startDate: string;
  slug: string;
  type: string;
}

export default function LogisticsPage() {
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [events, setEvents] = useState<ActiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [origin, setOrigin] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [qrOpenId, setQrOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [{ data: profile }, { data: activeEvents }] = await Promise.all([
        api.get('/organization/profile'),
        api.get<ActiveEvent[]>('/events/active-list'),
      ]);
      setOrgSlug(profile.slug);
      setEvents(activeEvents);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    setOrigin(window.location.origin);
  }, [load]);

  function buildLink(event: ActiveEvent) {
    return `${origin}/eventos/checkin?slug=${event.slug}&orgSlug=${orgSlug}`;
  }

  async function handleCopy(event: ActiveEvent) {
    try {
      await navigator.clipboard.writeText(buildLink(event));
      setCopiedId(event.id);
      toast.success('Link copiado', { description: event.name });
      setTimeout(() => setCopiedId((id) => (id === event.id ? null : id)), 2000);
    } catch {
      toast.error('No se pudo copiar el link. Cópialo manualmente.');
    }
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">No se pudo cargar la logística de eventos</h2>
        <Button onClick={load} variant="outline" className="mt-4">Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in animate-in">
      <div className="border-b border-slate-100 pb-6">
        <h1 className="text-3xl font-black text-primary tracking-tight flex items-center gap-3">
          <ScanLine className="h-7 w-7 text-slate-400" />
          Logística de eventos
        </h1>
        <p className="text-slate-500 mt-1">
          Genera el link (o el QR) de check-in para el punto de control de un evento activo.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Calendar className="h-10 w-10 mb-3 opacity-30" />
          <p>No hay eventos activos en este momento.</p>
          <Link href="/calendar" className="text-sm text-primary font-bold mt-2 hover:underline">
            Ir a la agenda para crear uno
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event) => {
            const link = buildLink(event);
            const copied = copiedId === event.id;
            const qrOpen = qrOpenId === event.id;
            return (
              <Card key={event.id} className="border-0 shadow-md ring-1 ring-slate-100 overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-bold text-slate-800">{event.name}</CardTitle>
                    <Badge variant="outline" className="text-xs shrink-0">{event.type}</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(event.startDate).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <code className="block text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 overflow-x-auto whitespace-nowrap">
                    {link}
                  </code>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => handleCopy(event)} disabled={!origin}>
                      {copied ? <Check className="h-4 w-4 mr-1.5 text-green-600" /> : <Copy className="h-4 w-4 mr-1.5" />}
                      {copied ? 'Copiado' : 'Copiar link'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQrOpenId(qrOpen ? null : event.id)}
                      disabled={!origin}
                    >
                      <QrCode className="h-4 w-4 mr-1.5" />
                      {qrOpen ? 'Ocultar QR' : 'Ver QR'}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" asChild disabled={!origin}>
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>

                  {qrOpen && (
                    <div className="flex justify-center pt-2 animate-in fade-in zoom-in-95">
                      <div className="p-3 bg-white border-2 border-slate-100 rounded-xl shadow-inner">
                        <QRCode value={link} size={160} fgColor="#1B2541" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
