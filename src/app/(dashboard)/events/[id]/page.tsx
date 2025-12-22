'use client';

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link"; // <--- 1. IMPORTAR LINK
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EventFunnelStats } from "@/components/dashboard/events/event-funnel-stats";
import { EventDetailsDialog } from "@/components/dashboard/calendar/event-details-dialog"; 
import { Copy, Loader2, Pencil, ScanLine } from "lucide-react"; // <--- 2. IMPORTAR ICONO
import { toast } from "sonner";
import { CalendarEvent } from "@/types/calendar";

/* Interfaces */
interface FunnelStats {
  convoked: number;
  registered: number;
  attended: number;
  responseRate: string;
  attendanceRate: string;
}

interface ExtendedEvent extends CalendarEvent {
  slug: string;
  name: string; 
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [event, setEvent] = useState<ExtendedEvent | null>(null);
  const [funnel, setFunnel] = useState<FunnelStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isEditOpen, setIsEditOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    
    if (!event) setLoading(true);

    try {
      const [eventRes, funnelRes] = await Promise.all([
        api.get(`/events/${id}`),
        api.get(`/events/${id}/funnel`)
      ]);

      const raw = eventRes.data;

      const mappedEvent: ExtendedEvent = {
        ...raw,
        id: raw.id,
        title: raw.name,
        start: new Date(raw.startDate),
        end: new Date(raw.endDate),
        description: raw.description,
        location: raw.location,
        type: raw.type,
        imageUrl: raw.imageUrl,
        slug: raw.slug 
      };

      setEvent(mappedEvent);
      setFunnel(funnelRes.data);
    } catch (error) {
      console.error("Error cargando evento", error);
      toast.error("No se pudo cargar la información del evento");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const copyLink = async () => {
    if (!event?.slug) return;
    try {
        const url = `${window.location.origin}/eventos/${event.slug}`;
        await navigator.clipboard.writeText(url);
        toast.success("Enlace copiado al portapapeles");
    } catch {
        toast.error("No se pudo copiar el enlace");
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (!event) {
    return <div className="text-slate-500">No se encontró el evento.</div>;
  }

  return (
    <div className="space-y-6 fade-in animate-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1B2541] tracking-tight">
            {event.name}
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Gestiona la asistencia y métricas de este evento.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            
            {/* --- NUEVO BOTÓN: LOGÍSTICA --- */}
            {/* Abre en pestaña nueva para no perder las métricas */}
            <Link href={`/eventos/checkin?slug=${event.slug}`} target="_blank" className="w-full sm:w-auto">
                <Button 
                    variant="outline"
                    className="w-full gap-2 border-slate-300 text-slate-700 hover:text-[#1B2541] hover:border-[#FFC400] hover:bg-yellow-50"
                >
                    <ScanLine className="h-4 w-4" />
                    Logística / Check-in
                </Button>
            </Link>

            {/* BOTÓN EDITAR */}
            <Button
                variant="outline"
                onClick={() => setIsEditOpen(true)}
                className="gap-2 w-full sm:w-auto border-slate-300 text-slate-700 hover:text-[#1B2541]"
            >
                <Pencil className="h-4 w-4" />
                Editar
            </Button>

            {/* BOTÓN COPIAR */}
            <Button
                onClick={copyLink}
                className="bg-[#1B2541] hover:bg-[#1B2541]/90 text-white gap-2 shadow-lg shadow-blue-900/10 w-full sm:w-auto"
            >
                <Copy className="h-4 w-4" />
                Copiar Enlace
            </Button>
        </div>
      </div>

      <div className="h-[1px] bg-slate-200 w-full" />

      {/* FUNNEL */}
      {funnel && <EventFunnelStats data={funnel} />}

      {/* TABLA (placeholder) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[200px] flex items-center justify-center text-slate-400 border-dashed">
        Tabla de Asistencia (Próximamente)
      </div>

      {/* MODAL DE EDICIÓN */}
      <EventDetailsDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        event={event} 
        onSuccess={fetchData} 
      />
    </div>
  );
}