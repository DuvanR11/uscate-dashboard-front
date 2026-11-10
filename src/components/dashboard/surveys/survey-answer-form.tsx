'use client';

// Plan hacia la versión estable, Fase 4 (2026-11-10): las preguntas de una
// encuesta, para responderlas. Lo usan la ficha, la visita, «Mis llamadas» y
// el enlace público. No guarda nada: entrega las respuestas al padre.
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import type { AnswerInput, SurveyQuestion } from '@/lib/api/surveys';

interface Props {
  questions: SurveyQuestion[];
  value: Record<string, AnswerInput>;
  onChange: (value: Record<string, AnswerInput>) => void;
  /** Prefijo de los `id` (hay pantallas con dos formularios). */
  idPrefix: string;
  disabled?: boolean;
}

function choiceClass(active: boolean) {
  return cn(
    'flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50',
    active
      ? 'border-primary bg-primary/10 font-medium text-primary'
      : 'border-slate-200 text-slate-700 hover:border-primary/50 dark:border-slate-700 dark:text-slate-200',
  );
}

export function SurveyAnswerForm({ questions, value, onChange, idPrefix, disabled }: Props) {
  const set = (questionId: string, patch: Partial<AnswerInput>) =>
    onChange({ ...value, [questionId]: { ...value[questionId], ...patch, questionId } });

  return (
    <div className="space-y-6">
      {questions.map((q, index) => {
        const answer = value[q.id];
        const legendId = `${idPrefix}-q${index}`;
        return (
          <fieldset key={q.id} className="space-y-2" aria-labelledby={legendId} disabled={disabled}>
            <legend id={legendId} className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {index + 1}. {q.prompt}
              {!q.required && <span className="ml-1 font-normal text-slate-500">(opcional)</span>}
            </legend>

            {q.type === 'SINGLE' && (
              <div className="grid gap-2" role="radiogroup" aria-labelledby={legendId}>
                {(q.options ?? []).map((option, i) => {
                  const active = answer?.optionIndex === i;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={choiceClass(active)}
                      onClick={() => set(q.id, { optionIndex: active && !q.required ? undefined : i })}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'h-4 w-4 shrink-0 rounded-full border',
                          active ? 'border-[5px] border-primary' : 'border-slate-400',
                        )}
                      />
                      {option}
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === 'MULTIPLE' && (
              <div className="grid gap-2">
                <p className="text-xs text-slate-500">Puedes elegir varias.</p>
                {(q.options ?? []).map((option, i) => {
                  const chosen = answer?.optionIndexes ?? [];
                  const active = chosen.includes(i);
                  return (
                    <button
                      key={option}
                      type="button"
                      role="checkbox"
                      aria-checked={active}
                      className={choiceClass(active)}
                      onClick={() =>
                        set(q.id, {
                          optionIndexes: active ? chosen.filter((c) => c !== i) : [...chosen, i].sort((a, b) => a - b),
                        })
                      }
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border text-[10px] leading-none',
                          active ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-400',
                        )}
                      >
                        {active ? '✓' : ''}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === 'SCALE' && (
              <div className="space-y-1">
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={legendId}>
                  {Array.from({ length: (q.scaleMax ?? 5) - (q.scaleMin ?? 1) + 1 }, (_, i) => (q.scaleMin ?? 1) + i).map(
                    (n) => {
                      const active = answer?.value === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          aria-label={String(n)}
                          className={cn(
                            'h-11 w-11 rounded-lg border text-sm font-semibold transition-colors',
                            active
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-slate-200 text-slate-700 hover:border-primary/50 dark:border-slate-700 dark:text-slate-200',
                          )}
                          onClick={() => set(q.id, { value: active && !q.required ? undefined : n })}
                        >
                          {n}
                        </button>
                      );
                    },
                  )}
                </div>
                {(q.minLabel || q.maxLabel) && (
                  <p className="flex justify-between gap-4 text-xs text-slate-500">
                    <span>
                      {q.scaleMin ?? 1}: {q.minLabel ?? ''}
                    </span>
                    <span>
                      {q.scaleMax ?? 5}: {q.maxLabel ?? ''}
                    </span>
                  </p>
                )}
              </div>
            )}

            {q.type === 'TEXT' && (
              <Textarea
                id={`${idPrefix}-text-${index}`}
                aria-labelledby={legendId}
                rows={3}
                maxLength={1000}
                value={answer?.text ?? ''}
                onChange={(e) => set(q.id, { text: e.target.value })}
              />
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
