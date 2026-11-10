'use client';

// Plan hacia la versión estable, Fase 5 (2026-11-10): «Jornada electoral —
// Incidentes». Lo que reportan los testigos desde el puesto (compra de votos,
// presión, material faltante…), con foto si la tomaron. Se marcan atendidos o
// resueltos; los abiertos también aparecen en la Sala de Guerra.
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { promptDialog } from '@/components/ui/prompt-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContestPicker, ElectionDayOff, useSelectedContest } from '@/components/dashboard/election-day/contest-picker';
import { useVisibleInterval } from '@/hooks/use-visible-interval';
import { apiErrorMessage } from '@/lib/api-error';
import {
  electionDayApi,
  INCIDENT_STATUS_TONE,
  timeOf,
  type Incident,
  type IncidentStatus,
} from '@/lib/api/election-day';

export default function IncidentsPage() {
  const { enabled, contests, contest, select, error } = useSelectedContest();
  const [status, setStatus] = useState<IncidentStatus | 'ALL'>('OPEN');
  // La lista queda ligada a su contienda y filtro: al cambiarlos se ve
  // «cargando» y no la lista anterior.
  const key = `${contest?.id ?? ''}:${status}`;
  const [loaded, setLoaded] = useState<{ key: string; list: Incident[] } | null>(null);
  const incidents = loaded?.key === key ? loaded.list : null;

  const load = useCallback(async () => {
    if (!contest) return;
    const forKey = `${contest.id}:${status}`;
    await electionDayApi
      .incidents(contest.id, status === 'ALL' ? undefined : status)
      .then((list) => setLoaded({ key: forKey, list }))
      .catch((e: unknown) => {
        toast.error('No se pudieron cargar los incidentes', { description: apiErrorMessage(e) });
        setLoaded({ key: forKey, list: [] });
      });
  }, [contest, status]);

  useEffect(() => {
    void load();
  }, [load]);
  useVisibleInterval(load, contest?.status === 'OPEN' ? 30_000 : null);

  const handle = async (incident: Incident, next: IncidentStatus) => {
    let note: string | undefined;
    if (next === 'RESOLVED') {
      const answer = await promptDialog({
        title: '¿Cómo se resolvió?',
        description: 'Queda en el incidente para el equipo.',
        label: 'Resolución',
        minLength: 0,
        maxLength: 500,
        confirmLabel: 'Marcar resuelto',
        multiline: true,
      });
      if (answer === null) return;
      note = answer;
    }
    try {
      await electionDayApi.handleIncident(incident.id, { status: next, ...(note !== undefined ? { note } : {}) });
      await load();
    } catch (e) {
      toast.error('No se pudo actualizar', { description: apiErrorMessage(e) });
    }
  };

  const openPhoto = async (incident: Incident) => {
    try {
      const { url } = await electionDayApi.incidentPhoto(incident.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error('No se pudo abrir la foto', { description: apiErrorMessage(e) });
    }
  };

  if (enabled === false)
    return (
      <div className="p-4 md:p-6">
        <ElectionDayOff />
      </div>
    );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Incidentes</h1>
        <p className="text-sm text-muted-foreground">Lo que reportan tus testigos desde los puestos.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <ContestPicker contests={contests} contest={contest} onSelect={select} />
        <div className="grid gap-1.5">
          <Label htmlFor="incident-filter">Mostrar</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as IncidentStatus | 'ALL')}>
            <SelectTrigger id="incident-filter" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Abiertos</SelectItem>
              <SelectItem value="ACKNOWLEDGED">Atendidos</SelectItem>
              <SelectItem value="RESOLVED">Resueltos</SelectItem>
              <SelectItem value="ALL">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {contest &&
        (incidents === null ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay incidentes con este filtro.</p>
        ) : (
          <div className="grid gap-3">
            {incidents.map((incident) => (
              <Card key={incident.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{incident.kindLabel}</p>
                      <p className="text-sm text-muted-foreground">
                        {incident.pollingStation.name}
                        {incident.table ? ` · mesa ${incident.table.number}` : ''} · {timeOf(incident.occurredAt)}
                      </p>
                    </div>
                    <Badge className={INCIDENT_STATUS_TONE[incident.status]}>{incident.statusLabel}</Badge>
                  </div>
                  {incident.description && <p className="whitespace-pre-line text-sm">{incident.description}</p>}
                  {incident.reporter && (
                    <p className="text-xs text-muted-foreground">
                      Reportó {incident.reporter.fullName}
                      {incident.reporter.phone ? ` · ${incident.reporter.phone}` : ''}
                    </p>
                  )}
                  {incident.resolutionNote && (
                    <p className="text-xs text-muted-foreground">Resolución: {incident.resolutionNote}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {incident.hasPhoto && (
                      <Button variant="outline" size="sm" onClick={() => openPhoto(incident)}>
                        <ExternalLink className="mr-1 h-4 w-4" /> Ver foto
                      </Button>
                    )}
                    {incident.status === 'OPEN' && (
                      <Button variant="outline" size="sm" onClick={() => handle(incident, 'ACKNOWLEDGED')}>
                        Marcar atendido
                      </Button>
                    )}
                    {incident.status !== 'RESOLVED' && (
                      <Button size="sm" onClick={() => handle(incident, 'RESOLVED')}>
                        Marcar resuelto
                      </Button>
                    )}
                    {incident.status === 'RESOLVED' && (
                      <Button variant="ghost" size="sm" onClick={() => handle(incident, 'OPEN')}>
                        Reabrir
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
    </div>
  );
}
