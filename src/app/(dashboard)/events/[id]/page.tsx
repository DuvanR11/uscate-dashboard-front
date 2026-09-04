'use client';

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link"; 
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EventFunnelStats } from "@/components/dashboard/events/event-funnel-stats";
import { EventDetailsDialog } from "@/components/dashboard/calendar/event-details-dialog"; 
import { Copy, Loader2, Pencil, ScanLine, Download, FileSpreadsheet, User, CheckCircle2 } from "lucide-react"; 
import { toast } from "sonner";
import { CalendarEvent } from "@/types/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/* Interfaces */
interface FunnelStats {
  convoked: number;
  registered: number;
  attended: number;
  responseRate: string;
  attendanceRate: string;
}

interface Attendee {
    id: number;
    fullName: string;
    documentNumber: string;
    phone: string;
    email: string;
    status: 'INVITED' | 'REGISTERED' | 'ATTENDED';
    registeredAt: string;
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
  const [attendees, setAttendees] = useState<Attendee[]>([]); // <--- LISTA ASISTENCIA
  const [loading, setLoading] = useState(true);
  // Gap post-M4 (ver memoria `deuda-multitenant-crm`): el botón de
  // "Logística / Check-in" de abajo apuntaba a `/eventos/checkin?slug=...`
  // SIN `orgSlug` — desde la Fase M4 esa página exige ambos, así que el
  // botón redirigía siempre de vuelta a `/dashboard/logistics` (real bug
  // encontrado al construir esa página, arreglado acá también).
  const [orgSlug, setOrgSlug] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    
    // Solo mostramos loading global si es la primera carga
    if (!event) setLoading(true);

    try {
      const [eventRes, funnelRes, attendanceRes, profileRes] = await Promise.all([
        api.get(`/events/${id}`),
        api.get(`/events/${id}/funnel`),
        api.get(`/events/${id}/attendance`), // <--- NUEVO ENDPOINT
        api.get('/organization/profile'),
      ]);
      setOrgSlug(profileRes.data.slug);

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
      setAttendees(attendanceRes.data); // Guardamos asistentes
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

  // --- FUNCIÓN PARA DESCARGAR CSV ---
  const downloadCSV = () => {
    if (!attendees.length) return toast.info("No hay datos para exportar");

    // 1. Definir cabeceras
    const headers = ["Nombre Completo", "Documento", "Celular", "Email", "Estado", "Fecha Registro"];
    
    // 2. Mapear filas
    const rows = attendees.map(a => [
        `"${a.fullName}"`, // Comillas para evitar problemas con espacios
        `"${a.documentNumber}"`, 
        a.phone,
        a.email,
        getStatusLabel(a.status),
        new Date(a.registeredAt).toLocaleString('es-CO')
    ]);

    // 3. Unir todo
    const csvContent = [
        headers.join(","), 
        ...rows.map(row => row.join(","))
    ].join("\n");

    // 4. Crear Blob y descargar
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `asistencia_${event?.slug}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusLabel = (status: string) => {
      switch(status) {
          case 'ATTENDED': return 'Asistió ✅';
          case 'REGISTERED': return 'Registrado 📩';
          case 'INVITED': return 'Invitado 📨';
          default: return status;
      }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'ATTENDED': return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Asistió</Badge>;
        case 'REGISTERED': return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Registrado</Badge>;
        default: return <Badge variant="secondary">Invitado</Badge>;
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
    <div className="space-y-6 fade-in animate-in pb-10">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">
            {event.name}
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Gestiona la asistencia y métricas de este evento.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            
            {/* BOTÓN CHECK-IN */}
            <Link href={`/eventos/checkin?slug=${event.slug}&orgSlug=${orgSlug}`} target="_blank" className="w-full sm:w-auto">
                <Button 
                    variant="outline"
                    className="w-full gap-2 border-slate-300 text-slate-700 hover:text-primary hover:border-secondary hover:bg-yellow-50"
                >
                    <ScanLine className="h-4 w-4" />
                    Logística / Check-in
                </Button>
            </Link>

            {/* BOTÓN EDITAR */}
            <Button
                variant="outline"
                onClick={() => setIsEditOpen(true)}
                className="gap-2 w-full sm:w-auto border-slate-300 text-slate-700 hover:text-primary"
            >
                <Pencil className="h-4 w-4" />
                Editar
            </Button>

            {/* BOTÓN COPIAR */}
            <Button
                onClick={copyLink}
                className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-lg shadow-blue-900/10 w-full sm:w-auto"
            >
                <Copy className="h-4 w-4" />
                Copiar Enlace
            </Button>
        </div>
      </div>

      <div className="h-[1px] bg-slate-200 w-full" />

      {/* FUNNEL STATS */}
      {funnel && <EventFunnelStats data={funnel} />}

      {/* --- TABLA DE ASISTENCIA --- */}
      <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between py-4 bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-center gap-2">
                  <CardTitle className="text-lg text-primary">Listado de Asistencia</CardTitle>
                  <Badge variant="secondary" className="font-mono">{attendees.length}</Badge>
              </div>
              
              <Button 
                onClick={downloadCSV} 
                variant="outline" 
                size="sm" 
                className="gap-2 text-green-700 border-green-200 hover:bg-green-50"
                disabled={attendees.length === 0}
              >
                  <FileSpreadsheet className="h-4 w-4" /> Exportar CSV
              </Button>
          </CardHeader>
          <CardContent className="p-0">
              {attendees.length > 0 ? (
                  <div className="max-h-[500px] overflow-y-auto">
                      <Table>
                          <TableHeader className="bg-slate-50 sticky top-0 z-10">
                              <TableRow>
                                  <TableHead>Asistente</TableHead>
                                  <TableHead>Documento</TableHead>
                                  <TableHead>Contacto</TableHead>
                                  <TableHead>Estado</TableHead>
                                  <TableHead className="text-right">Registro</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {attendees.map((person) => (
                                  <TableRow key={person.id} className="hover:bg-slate-50/50">
                                      <TableCell className="font-bold text-primary">
                                          <div className="flex items-center gap-2">
                                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                  <User className="h-4 w-4"/>
                                              </div>
                                              {person.fullName}
                                          </div>
                                      </TableCell>
                                      <TableCell className="font-mono text-xs">{person.documentNumber}</TableCell>
                                      <TableCell>
                                          <div className="text-xs text-slate-500">
                                              <p>{person.phone}</p>
                                              <p className="text-[10px] opacity-70">{person.email}</p>
                                          </div>
                                      </TableCell>
                                      <TableCell>
                                          {getStatusBadge(person.status)}
                                      </TableCell>
                                      <TableCell className="text-right text-xs text-slate-400">
                                          {new Date(person.registeredAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <div className="bg-slate-50 p-4 rounded-full mb-3">
                          <User className="h-8 w-8 opacity-20" />
                      </div>
                      <p>Aún no hay registros en este evento.</p>
                  </div>
              )}
          </CardContent>
      </Card>

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