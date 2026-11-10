'use client';

// Plan hacia la versión estable, Fase 4 (2026-11-10): aplicar una encuesta a
// un contacto, desde su ficha o justo después de registrar una visita. Ofrece
// solo las encuestas activas de ese canal.
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList, Loader2 } from 'lucide-react';
import { apiErrorMessage } from '@/lib/api-error';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  answersToSend,
  missingRequired,
  surveysApi,
  type AnswerInput,
  type AvailableSurvey,
} from '@/lib/api/surveys';
import { SurveyAnswerForm } from './survey-answer-form';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: { id: string; fullName: string };
  /** Con la visita recién registrada, la respuesta queda «En visita». */
  fieldVisitId?: string | null;
  onSaved?: () => void;
}

export function SurveyResponseDialog({ open, onOpenChange, prospect, fieldVisitId, onSaved }: Props) {
  const [surveys, setSurveys] = useState<AvailableSurvey[] | null>(null);
  const [surveyId, setSurveyId] = useState('');
  const [answers, setAnswers] = useState<Record<string, AnswerInput>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSurveys(null);
    setAnswers({});
    surveysApi
      .available(fieldVisitId ? 'VISIT' : 'STAFF')
      .then((list) => {
        setSurveys(list);
        setSurveyId(list.length === 1 ? list[0].id : '');
      })
      .catch(() => setSurveys([]));
  }, [open, fieldVisitId]);

  const survey = surveys?.find((s) => s.id === surveyId) ?? null;
  const ready = !!survey && !missingRequired(survey.questions, answers) && answersToSend(answers).length > 0;

  const save = async () => {
    if (!survey || !ready) return;
    setSaving(true);
    try {
      await surveysApi.record(survey.id, {
        prospectId: prospect.id,
        ...(fieldVisitId ? { fieldVisitId } : {}),
        answers: answersToSend(answers),
      });
      toast.success('Respuestas guardadas.');
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? 'No se pudieron guardar las respuestas.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Aplicar encuesta
          </DialogTitle>
          <DialogDescription>
            A {prospect.fullName}. Pregúntale si quiere responder: es voluntario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {!surveys ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-label="Cargando encuestas" />
          ) : surveys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay encuestas activas para aplicar {fieldVisitId ? 'en visitas' : 'desde la ficha'}.
            </p>
          ) : (
            <>
              {surveys.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="survey-pick">Encuesta</Label>
                  <select
                    id="survey-pick"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={surveyId}
                    onChange={(e) => {
                      setSurveyId(e.target.value);
                      setAnswers({});
                    }}
                  >
                    <option value="">Elige la encuesta</option>
                    {surveys.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {survey && (
                <>
                  {surveys.length === 1 && <p className="text-sm font-semibold">{survey.title}</p>}
                  {survey.description && (
                    <p className="whitespace-pre-line text-sm text-muted-foreground">{survey.description}</p>
                  )}
                  <SurveyAnswerForm
                    idPrefix="staff-survey"
                    questions={survey.questions}
                    value={answers}
                    onChange={setAnswers}
                    disabled={saving}
                  />
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {surveys?.length ? 'Ahora no' : 'Cerrar'}
          </Button>
          {!!surveys?.length && (
            <Button onClick={save} disabled={!ready || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar respuestas
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
