'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { extractErrorMessage } from '@/lib/api/platform';
import {
  getTrainingTeam,
  reviewTrainingPractice,
  type TrainingTeam,
} from '@/lib/api/training';
import { practiceLabel } from './training-course';

function PracticeReview({
  item,
  onReviewed,
}: {
  item: TrainingTeam['items'][number];
  onReviewed: () => void;
}) {
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function review(decision: 'APPROVED' | 'CHANGES_REQUESTED') {
    if (!item.progress?.practiceSubmittedAt) return;
    setBusy(true);
    setError('');
    try {
      await reviewTrainingPractice(
        item.id,
        decision,
        feedback,
        item.progress.practiceSubmittedAt,
      );
      onReviewed();
    } catch (e) {
      setError(extractErrorMessage(e) || 'No se pudo guardar la revisión.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded-xl border bg-card p-5">
      <summary className="cursor-pointer space-y-1 break-words">
        <span className="block font-semibold">
          {item.learner} · {item.courseTitle}
        </span>
        <span className="block text-sm text-muted-foreground">
          {item.email} · Lecciones {item.progress?.percent ?? 0}% · Evaluación{' '}
          {item.progress?.bestScore ?? 0}/100 · Práctica{' '}
          {item.progress
            ? practiceLabel[item.progress.practiceStatus]
            : 'Sin datos'}
        </span>
      </summary>
      <div className="mt-5 space-y-4">
        <p className="text-sm text-muted-foreground">{item.practice}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {item.rubric.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
        <div className="whitespace-pre-wrap break-words rounded-lg bg-muted/50 p-4 text-sm">
          {item.progress?.practiceEvidence || 'Todavía no entregó la práctica.'}
        </div>
        {item.progress?.practiceFeedback && (
          <p className="whitespace-pre-wrap break-words text-sm">
            <strong>Última devolución:</strong> {item.progress.practiceFeedback}
          </p>
        )}
        {item.canReview && (
          <div className="space-y-3">
            <label
              htmlFor={`feedback-${item.id}`}
              className="block text-sm font-medium"
            >
              Tu devolución (mínimo 10 caracteres)
            </label>
            <textarea
              id={`feedback-${item.id}`}
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              maxLength={1500}
              rows={3}
              disabled={busy}
              className="w-full rounded-xl border bg-background p-3"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy || feedback.trim().length < 10}
                onClick={() => void review('APPROVED')}
              >
                Aprobar práctica
              </Button>
              <Button
                variant="outline"
                disabled={busy || feedback.trim().length < 10}
                onClick={() => void review('CHANGES_REQUESTED')}
              >
                Solicitar ajustes
              </Button>
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}

export function TrainingTeamPanel() {
  const [data, setData] = useState<TrainingTeam | null>(null);
  const [page, setPage] = useState(1);
  const [generation, setGeneration] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    getTrainingTeam(page)
      .then((value) => {
        if (active) {
          setData(value);
          setError('');
        }
      })
      .catch((e) => {
        if (active) {
          setData(null);
          setError(extractErrorMessage(e) || 'No se pudo consultar el equipo.');
        }
      });
    return () => {
      active = false;
    };
  }, [page, generation]);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Seguimiento y revisión</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Personas que iniciaron un curso. Revisa cada práctica con sus
            criterios; tu propia entrega debe validarla otra persona autorizada.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setData(null);
            setGeneration((g) => g + 1);
          }}
        >
          Actualizar
        </Button>
      </div>
      {error && (
        <p role="alert" className="rounded-xl border p-4 text-red-700">
          {error}
        </p>
      )}
      {!data && !error && <p role="status">Cargando seguimiento…</p>}
      {data && (
        <>
          <p className="text-sm text-muted-foreground">
            {data.total} inscripciones · página {data.page}
          </p>
          {data.items.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              Todavía no hay cursos iniciados en este ámbito.
            </p>
          ) : (
            data.items.map((item) => (
              <PracticeReview
                key={`${item.id}-${item.progress?.practiceStatus}-${item.progress?.practiceSubmittedAt}`}
                item={item}
                onReviewed={() => setGeneration((g) => g + 1)}
              />
            ))
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => {
                setData(null);
                setPage((p) => p - 1);
              }}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={page * data.pageSize >= data.total}
              onClick={() => {
                setData(null);
                setPage((p) => p + 1);
              }}
            >
              Siguiente
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
