'use client';

// Plan hacia la versión estable, Fase 4 (2026-11-10): las encuestas de la
// campaña. Las crea y cambia un administrador; el Coordinador ve la lista y
// los resultados de su equipo.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { BarChart3, ClipboardList, Copy, Link2, Loader2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useAuthStore } from '@/store/auth-store';
import { usePermission } from '@/hooks/use-permission';
import { apiErrorMessage } from '@/lib/api-error';
import {
  SURVEY_STATUS_LABEL,
  SURVEY_STATUS_TONE,
  publicSurveyUrl,
  surveysApi,
  useSurveysEnabled,
  type SurveyStatus,
  type SurveySummary,
} from '@/lib/api/surveys';

const number = (value: number) => new Intl.NumberFormat('es-CO').format(value);

function channels(survey: SurveySummary) {
  return [survey.onVisit && 'En visita', survey.onCall && 'Por llamada', survey.onPublic && 'Por enlace']
    .filter(Boolean)
    .join(' · ');
}

export default function SurveysPage() {
  const enabled = useSurveysEnabled();
  const role = useAuthStore((s) => s.user?.role?.code);
  const canWrite = usePermission('ENCUESTAS_ADMIN', 'canWrite') && role !== 'COORDINATOR';
  const canDelete = usePermission('ENCUESTAS_ADMIN', 'canDelete');
  const [surveys, setSurveys] = useState<SurveySummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    surveysApi
      .list()
      .then((value) => {
        setSurveys(value);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  const run = async (id: string, action: () => Promise<unknown>, ok: string) => {
    setBusy(id);
    try {
      await action();
      toast.success(ok);
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? 'No se pudo hacer el cambio.');
    } finally {
      setBusy(null);
    }
  };

  const setStatus = (survey: SurveySummary, status: SurveyStatus) =>
    run(
      survey.id,
      () => surveysApi.setStatus(survey.id, status),
      status === 'ACTIVE' ? 'Encuesta activa.' : status === 'CLOSED' ? 'Encuesta cerrada.' : 'Encuesta en borrador.',
    );

  const remove = async (survey: SurveySummary) => {
    const confirmed = await confirmDialog({
      title: `¿Eliminar «${survey.title}»?`,
      description: 'Deja de aplicarse y su enlace deja de funcionar. Las respuestas se conservan para los resultados.',
      confirmLabel: 'Eliminar encuesta',
    });
    if (confirmed) void run(survey.id, () => surveysApi.remove(survey.id), 'Encuesta eliminada.');
  };

  const copyLink = async (survey: SurveySummary) => {
    if (!survey.publicPath) return;
    try {
      await navigator.clipboard.writeText(publicSurveyUrl(survey.publicPath));
      toast.success('Enlace copiado.');
    } catch {
      toast.error('No se pudo copiar el enlace.');
    }
  };

  const rotate = async (survey: SurveySummary) => {
    const confirmed = await confirmDialog({
      title: '¿Cambiar el enlace?',
      description: 'El enlace anterior deja de funcionar para quien ya lo tenga.',
      confirmLabel: 'Cambiar enlace',
    });
    if (confirmed) void run(survey.id, () => surveysApi.rotateLink(survey.id), 'Enlace nuevo listo.');
  };

  if (enabled === false) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border bg-white p-6 text-sm text-slate-600">
        Las encuestas todavía no están activas en Zyron.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-border/40 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            <ClipboardList className="h-7 w-7 text-primary" /> Encuestas
          </h1>
          <p className="text-muted-foreground">
            Se aplican en una visita, al llamar, desde la ficha del contacto o por un enlace público.
          </p>
        </div>
        {canWrite && (
          <Button asChild className="h-11">
            <Link href="/encuestas/nueva">
              <Plus className="mr-2 h-4 w-4" /> Nueva encuesta
            </Link>
          </Button>
        )}
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Lo que alguien opina de un candidato o un partido es un dato sensible: responder siempre es voluntario, y los
        resultados se muestran sumados, sin nombres.
      </p>

      {failed && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          No se pudieron cargar las encuestas.{' '}
          <button className="font-semibold underline" onClick={load}>
            Reintentar
          </button>
        </p>
      )}

      {!surveys && !failed && <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-label="Cargando" />}

      {surveys && surveys.length === 0 && (
        <p className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
          Todavía no hay encuestas.{canWrite ? ' Crea la primera con «Nueva encuesta».' : ''}
        </p>
      )}

      {surveys && surveys.length > 0 && (
        <ul className="space-y-3">
          {surveys.map((survey) => (
            <li key={survey.id}>
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">{survey.title}</p>
                      <p className="text-xs text-slate-500">
                        {survey.questionCount} {survey.questionCount === 1 ? 'pregunta' : 'preguntas'} ·{' '}
                        {number(survey.responses)} {survey.responses === 1 ? 'respuesta' : 'respuestas'}
                        {channels(survey) ? ` · ${channels(survey)}` : ''}
                      </p>
                    </div>
                    <Badge variant="outline" className={`border-transparent ${SURVEY_STATUS_TONE[survey.status]}`}>
                      {SURVEY_STATUS_LABEL[survey.status]}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/encuestas/${survey.id}/resultados`}>
                        <BarChart3 className="mr-1.5 h-4 w-4" /> Resultados
                      </Link>
                    </Button>
                    {canWrite && (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/encuestas/${survey.id}`}>Editar</Link>
                      </Button>
                    )}
                    {canWrite && survey.status !== 'ACTIVE' && (
                      <Button size="sm" disabled={busy === survey.id} onClick={() => setStatus(survey, 'ACTIVE')}>
                        Activar
                      </Button>
                    )}
                    {canWrite && survey.status === 'ACTIVE' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === survey.id}
                        onClick={() => setStatus(survey, 'CLOSED')}
                      >
                        Cerrar
                      </Button>
                    )}
                    {survey.publicPath && survey.status === 'ACTIVE' && (
                      <Button size="sm" variant="outline" onClick={() => copyLink(survey)}>
                        <Copy className="mr-1.5 h-4 w-4" /> Copiar enlace
                      </Button>
                    )}
                    {canWrite && survey.publicPath && (
                      <Button size="sm" variant="ghost" disabled={busy === survey.id} onClick={() => rotate(survey)}>
                        <Link2 className="mr-1.5 h-4 w-4" /> Cambiar enlace
                      </Button>
                    )}
                    {canWrite && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === survey.id}
                        onClick={() => run(survey.id, () => surveysApi.duplicate(survey.id), 'Copia creada.')}
                      >
                        Duplicar
                      </Button>
                    )}
                    {canWrite && canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-700"
                        disabled={busy === survey.id}
                        onClick={() => remove(survey)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
