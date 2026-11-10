'use client';

// Plan hacia la versión estable, Fase 4 (2026-11-10): «Mis llamadas». Los
// contactos que me asignaron en una lista de llamadas, para el celular: llamar
// (o escribir por WhatsApp), marcar cómo me fue y, si contestó y la lista
// tiene encuesta, aplicarla ahí mismo. Solo veo el celular de los contactos
// que me asignaron.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, MessageCircle, Phone, PhoneCall } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/lib/api-error';
import { visitTime } from '@/lib/api/field-visits';
import {
  ANSWERED_OUTCOMES,
  CALL_OUTCOME_LABEL,
  CALL_OUTCOME_ORDER,
  CALL_OUTCOME_TONE,
  answersToSend,
  callListsApi,
  missingRequired,
  useSurveysEnabled,
  whatsappNumber,
  type AnswerInput,
  type CallEntry,
  type CallOutcome,
  type MyCalls,
} from '@/lib/api/surveys';
import { SurveyAnswerForm } from '@/components/dashboard/surveys/survey-answer-form';

const number = (value: number) => new Intl.NumberFormat('es-CO').format(value);

function RecordCallDialog({
  entry,
  onClose,
  onSaved,
}: {
  entry: CallEntry | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [note, setNote] = useState('');
  const [withSurvey, setWithSurvey] = useState(false);
  const [answers, setAnswers] = useState<Record<string, AnswerInput>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOutcome(null);
    setNote('');
    setWithSurvey(false);
    setAnswers({});
  }, [entry?.id]);

  if (!entry) return null;
  const survey = entry.survey;
  const answered = !!outcome && ANSWERED_OUTCOMES.includes(outcome);
  const surveyOn = answered && withSurvey && !!survey;
  const ready = !!outcome && (!surveyOn || (!missingRequired(survey.questions, answers) && answersToSend(answers).length > 0));

  const save = async () => {
    if (!outcome || !ready) return;
    setSaving(true);
    try {
      const result = await callListsApi.record(entry.id, {
        outcome,
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(surveyOn ? { answers: answersToSend(answers) } : {}),
      });
      toast.success(
        result.entryStatus === 'PENDING'
          ? 'Llamada registrada. Queda pendiente para volver a intentar.'
          : 'Llamada registrada.',
      );
      onSaved();
      onClose();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? 'No se pudo registrar la llamada.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-primary" /> ¿Cómo te fue?
          </DialogTitle>
          <DialogDescription>Llamada a {entry.prospect.fullName}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <fieldset className="space-y-2">
            <legend className="sr-only">Resultado de la llamada</legend>
            <div className="grid grid-cols-2 gap-2">
              {CALL_OUTCOME_ORDER.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={outcome === value ? 'default' : 'outline'}
                  aria-pressed={outcome === value}
                  className="h-12"
                  onClick={() => setOutcome(value)}
                >
                  {CALL_OUTCOME_LABEL[value]}
                </Button>
              ))}
            </div>
            {outcome === 'DO_NOT_CALL' && (
              <p className="text-xs text-muted-foreground">No volverá a entrar en una lista de llamadas.</p>
            )}
          </fieldset>

          {answered && survey && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              {!withSurvey ? (
                <Button type="button" variant="outline" className="w-full" onClick={() => setWithSurvey(true)}>
                  Aplicar la encuesta «{survey.title}»
                </Button>
              ) : (
                <>
                  <p className="text-sm font-semibold">{survey.title}</p>
                  <p className="text-xs text-muted-foreground">Pregúntale si quiere responder: es voluntario.</p>
                  <SurveyAnswerForm
                    idPrefix="call-survey"
                    questions={survey.questions}
                    value={answers}
                    onChange={setAnswers}
                    disabled={saving}
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setWithSurvey(false)}>
                    No quiso responder
                  </Button>
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="call-note">Nota (opcional)</Label>
            <Textarea
              id="call-note"
              rows={3}
              maxLength={1000}
              placeholder="A qué hora llamar, qué le preocupa…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!ready || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MyCallsPage() {
  const enabled = useSurveysEnabled();
  const [data, setData] = useState<MyCalls | null>(null);
  const [failed, setFailed] = useState(false);
  const [current, setCurrent] = useState<CallEntry | null>(null);

  const load = useCallback(() => {
    callListsApi
      .mine()
      .then((value) => {
        setData(value);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  if (enabled === null) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="Cargando" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border bg-white p-6 text-sm text-slate-600">
        Las listas de llamadas todavía no están activas en Zyron.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="border-b border-border/40 pb-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          <PhoneCall className="h-7 w-7 text-primary" /> Mis llamadas
        </h1>
        <p className="text-muted-foreground">
          Los contactos que te asignaron. Llama, marca cómo te fue y sigue con el siguiente.
        </p>
      </div>

      {failed && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          No se pudieron cargar tus llamadas.{' '}
          <button className="font-semibold underline" onClick={load}>
            Reintentar
          </button>
        </p>
      )}

      {!data && !failed && <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-label="Cargando tus llamadas" />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500">Pendientes</p>
                <p className="text-3xl font-black tabular-nums text-slate-800">{number(data.pending)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500">Llamadas en las últimas 24 horas</p>
                <p className="text-3xl font-black tabular-nums text-slate-800">{number(data.callsLast24h)}</p>
              </CardContent>
            </Card>
          </div>

          {data.entries.length === 0 ? (
            <p className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
              No tienes llamadas pendientes. Cuando te asignen una lista, aparece aquí.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.entries.map((entry) => {
                const wa = whatsappNumber(entry.prospect.phone);
                return (
                  <li key={entry.id}>
                    <Card>
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={`/prospects/${entry.prospect.id}`}
                              className="block truncate font-semibold text-slate-800 hover:underline"
                            >
                              {entry.prospect.fullName}
                            </Link>
                            <p className="text-xs text-slate-500">
                              {entry.list.name}
                              {entry.prospect.locality ? ` · ${entry.prospect.locality}` : ''}
                            </p>
                          </div>
                          {entry.lastOutcome && (
                            <Badge
                              variant="outline"
                              className={`shrink-0 border-transparent ${CALL_OUTCOME_TONE[entry.lastOutcome]}`}
                            >
                              {CALL_OUTCOME_LABEL[entry.lastOutcome]}
                              {entry.attempts > 1 ? ` · ${entry.attempts} intentos` : ''}
                            </Badge>
                          )}
                        </div>
                        {entry.lastCalledAt && (
                          <p className="text-xs text-slate-500">Último intento: {visitTime(entry.lastCalledAt)}</p>
                        )}
                        <div className="grid grid-cols-3 gap-2">
                          {entry.prospect.phone ? (
                            <Button asChild variant="outline" className="h-11">
                              <a href={`tel:${entry.prospect.phone.replace(/[^\d+]/g, '')}`}>
                                <Phone className="mr-1.5 h-4 w-4" /> Llamar
                              </a>
                            </Button>
                          ) : (
                            <Button variant="outline" className="h-11" disabled>
                              Sin celular
                            </Button>
                          )}
                          {wa ? (
                            <Button asChild variant="outline" className="h-11">
                              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
                              </a>
                            </Button>
                          ) : (
                            <span />
                          )}
                          <Button className="h-11" onClick={() => setCurrent(entry)}>
                            Registrar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <RecordCallDialog entry={current} onClose={() => setCurrent(null)} onSaved={load} />
    </div>
  );
}
