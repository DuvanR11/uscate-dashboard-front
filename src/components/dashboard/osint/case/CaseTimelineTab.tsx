'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getCaseTimeline, extractErrorMessage, type CaseTimeline } from '@/lib/api/osint';

// Plan "OSINT Profesional" (2026-09-02), Fase 4 — línea de tiempo real de
// la Evidencia ya persistida de este Caso. A diferencia del timeline del
// buscador ad-hoc (`InvestigationGraph.tsx`, por búsqueda de texto libre),
// este agrupa TODA la evidencia real del caso — de cualquiera de las 12
// fuentes o notas manuales — por año, ordenada de más reciente a más
// antigua.
export default function CaseTimelineTab({ caseId }: { caseId: string }) {
  const [timeline, setTimeline] = useState<CaseTimeline | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCaseTimeline(caseId)
      .then(setTimeline)
      .catch((err) => toast.error(extractErrorMessage(err) || 'No se pudo cargar la línea de tiempo'))
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  }

  if (!timeline || timeline.total === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-10 text-center text-sm text-slate-500">
          Sin evidencia con fecha real todavía — la línea de tiempo se arma a partir de
          <code className="mx-1 text-xs bg-slate-100 px-1 rounded">publishedAt</code> (cuando la fuente
          la trae) o <code className="mx-1 text-xs bg-slate-100 px-1 rounded">retrievedAt</code>.
        </CardContent>
      </Card>
    );
  }

  const years = Object.keys(timeline.groupedByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="space-y-6">
      {years.map((year) => (
        <div key={year}>
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">{year}</p>
          <div className="space-y-2">
            {timeline.groupedByYear[year].map((event) => (
              <Card key={event.id} className="border-0 shadow-sm">
                <CardContent className="p-3 flex items-start gap-3">
                  <Clock size={14} className="text-slate-300 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-primary">{event.title}</strong>
                      <Badge variant="outline" className="text-[10px]">{event.source}</Badge>
                      {event.properties?.confidence != null && (
                        <Badge variant="outline" className="text-[10px]">
                          {String(event.properties.confidence)}
                        </Badge>
                      )}
                    </div>
                    {event.description && <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>}
                    <p className="text-[11px] text-slate-400 mt-1">
                      {new Date(event.date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
