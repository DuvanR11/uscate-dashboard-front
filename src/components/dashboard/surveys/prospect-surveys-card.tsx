'use client';

// Plan hacia la versión estable, Fase 4 (2026-11-10): en la ficha del
// contacto, sus respuestas a encuestas y las llamadas que le hicieron desde
// una lista. No aparece mientras el servidor tenga las encuestas apagadas ni
// para quien no tiene «Encuestas y llamadas».
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList, Loader2, PhoneCall, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/hooks/use-permission';
import { apiErrorMessage } from '@/lib/api-error';
import { visitTime } from '@/lib/api/field-visits';
import {
  CALL_OUTCOME_TONE,
  surveysApi,
  useSurveysEnabled,
  type ProspectCall,
  type ProspectSurveyResponse,
} from '@/lib/api/surveys';
import { SurveyResponseDialog } from './survey-response-dialog';

interface Props {
  prospect: { id: string; fullName: string };
}

export function ProspectSurveysCard({ prospect }: Props) {
  const enabled = useSurveysEnabled();
  const canRead = usePermission('ENCUESTAS', 'canRead');
  const canWrite = usePermission('ENCUESTAS', 'canWrite');
  const [data, setData] = useState<{ responses: ProspectSurveyResponse[]; calls: ProspectCall[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(() => {
    surveysApi
      .forProspect(prospect.id)
      .then((value) => {
        setData(value);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [prospect.id]);

  useEffect(() => {
    if (enabled && canRead) load();
  }, [enabled, canRead, load]);

  if (!enabled || !canRead) return null;

  const remove = async (id: string) => {
    const confirmed = await confirmDialog({
      title: '¿Quitar estas respuestas?',
      description: 'Dejan de contar en los resultados de la encuesta.',
      confirmLabel: 'Quitar respuestas',
    });
    if (!confirmed) return;
    setRemoving(id);
    try {
      await surveysApi.removeResponse(id);
      toast.success('Respuestas quitadas.');
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? 'No se pudieron quitar las respuestas.');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <ClipboardList className="h-5 w-5 text-primary" /> Encuestas y llamadas
        </CardTitle>
        {canWrite && (
          <Button size="sm" onClick={() => setOpen(true)}>
            Aplicar encuesta
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {failed && <p className="text-sm text-red-700">No se pudieron cargar las encuestas de este contacto.</p>}
        {!data && !failed && <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-label="Cargando" />}
        {data && data.responses.length === 0 && data.calls.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no ha respondido encuestas ni recibido llamadas de una lista.</p>
        )}

        {data && data.responses.length > 0 && (
          <ul className="divide-y">
            {data.responses.map((response) => (
              <li key={response.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{response.survey.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {response.channelLabel} · {visitTime(response.createdAt)}
                    {response.recordedBy ? ` · ${response.recordedBy.fullName}` : ''}
                  </p>
                  <dl className="space-y-1 pt-1">
                    {response.answers.map((answer) => (
                      <div key={answer.questionId}>
                        <dt className="text-xs text-slate-500">{answer.prompt}</dt>
                        <dd className="whitespace-pre-line text-slate-800">{answer.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                {response.canDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-slate-500"
                    aria-label="Quitar estas respuestas"
                    disabled={removing === response.id}
                    onClick={() => remove(response.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {data && data.calls.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <PhoneCall className="h-4 w-4 text-primary" /> Llamadas
            </p>
            <ul className="divide-y rounded-lg border">
              {data.calls.map((call) => (
                <li key={call.id} className="space-y-1 px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`border-transparent ${CALL_OUTCOME_TONE[call.outcome]}`}>
                      {call.outcomeLabel}
                    </Badge>
                    <span className="text-muted-foreground">
                      {visitTime(call.calledAt)}
                      {call.caller ? ` · ${call.caller.fullName}` : ''} · {call.list.name}
                    </span>
                  </div>
                  {call.note && <p className="whitespace-pre-line text-slate-700">{call.note}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      <SurveyResponseDialog open={open} onOpenChange={setOpen} prospect={prospect} onSaved={load} />
    </Card>
  );
}
