'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { extractErrorMessage } from '@/lib/api/platform';
import {
  assessTraining,
  completeTrainingLesson,
  downloadTrainingCertificate,
  getTrainingCourse,
  startTraining,
  submitTrainingPractice,
  type TrainingCourse,
  type TrainingResult,
} from '@/lib/api/training';

export const practiceLabel = {
  PENDING: 'Por entregar',
  SUBMITTED: 'En revisión',
  APPROVED: 'Aprobada',
  CHANGES_REQUESTED: 'Requiere ajustes',
};

export function CoursePlayer({
  initial,
  commercial,
  onBack,
  onProgress,
}: {
  initial: TrainingCourse;
  commercial: boolean;
  onBack: () => void;
  onProgress: () => void;
}) {
  const [course, setCourse] = useState(initial);
  const [lessonId, setLessonId] = useState(
    initial.lessons.find(
      (l) => !initial.progress.completedLessons.includes(l.id),
    )?.id ?? initial.lessons[0].id,
  );
  const [tab, setTab] = useState<'lessons' | 'assessment' | 'practice'>(
    'lessons',
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<TrainingResult | null>(null);
  const [evidence, setEvidence] = useState(
    initial.progress.practiceEvidence ?? '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [videoError, setVideoError] = useState(false);
  const mediaUrl = (path: string) =>
    `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100').replace(/\/$/, '')}${path}`;
  const lesson = course.lessons.find((l) => l.id === lessonId)!;
  const allLessons = course.lessons.every((l) =>
    course.progress.completedLessons.includes(l.id),
  );
  const started = Boolean(course.progress.enrollmentId);

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError(
        extractErrorMessage(e) || 'No se pudo guardar. Inténtalo de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} disabled={busy}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a mis cursos
      </Button>
      <header className="space-y-3">
        <p className="text-sm font-medium text-primary">
          {course.category} · Versión {course.version}
        </p>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {course.title}
        </h2>
        <p className="max-w-3xl text-muted-foreground">{course.description}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <span>
            {course.progress.completedLessons.length}/{course.lessons.length}{' '}
            lecciones
          </span>
          <span>
            Evaluación:{' '}
            {course.progress.quizPassed
              ? `aprobada (${course.progress.bestScore}/100)`
              : 'pendiente'}
          </span>
          <span>Práctica: {practiceLabel[course.progress.practiceStatus]}</span>
        </div>
        <div
          role="progressbar"
          aria-label="Lecciones completadas"
          aria-valuenow={course.progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${course.progress.percent}%` }}
          />
        </div>
      </header>
      {course.video && (
        <section
          aria-label="Video del curso"
          className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5"
        >
          <h3 className="font-semibold">Mira el recorrido del curso</h3>
          <video
            className="aspect-video w-full rounded-xl bg-slate-950"
            controls
            playsInline
            preload="metadata"
            crossOrigin="use-credentials"
            poster={mediaUrl(course.video.poster)}
            onError={() => setVideoError(true)}
          >
            <source src={mediaUrl(course.video.src)} type="video/mp4" />
            <track
              kind="subtitles"
              src={mediaUrl(course.video.captions)}
              srcLang="es"
              label="Español"
            />
            Tu navegador no permite reproducir este video.
          </video>
          <p className="text-xs text-muted-foreground">
            {course.video.narration} Puedes seguir las lecciones y su práctica a
            continuación.
          </p>
          {videoError && (
            <p role="status" className="text-sm text-muted-foreground">
              No se pudo cargar el video. Puedes continuar con el texto y volver
              a intentarlo al abrir el curso.
            </p>
          )}
        </section>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
        >
          {notice}
        </p>
      )}
      {!started && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-muted/30 p-5">
          <p>Inicia el curso para guardar tu avance en tu cuenta.</p>
          <Button
            disabled={busy}
            onClick={() =>
              void act(async () => {
                setCourse(await startTraining(course.id));
                onProgress();
                setNotice(
                  'Curso iniciado. Tu avance se guardará en tu cuenta.',
                );
              })
            }
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Iniciar
            curso
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2" aria-label="Secciones del curso">
        {(
          [
            ['lessons', '1. Lecciones'],
            ['assessment', '2. Evaluación'],
            ['practice', '3. Práctica y constancia'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? 'default' : 'outline'}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>
      {tab === 'lessons' && (
        <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
          <nav aria-label="Lecciones del curso" className="space-y-2">
            {course.lessons.map((l, index) => (
              <button
                key={l.id}
                aria-current={l.id === lessonId ? 'step' : undefined}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm transition-colors ${l.id === lessonId ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                onClick={() => setLessonId(l.id)}
              >
                <span className="mt-0.5 shrink-0">
                  {course.progress.completedLessons.includes(l.id) ? (
                    <CheckCircle2
                      className="h-4 w-4 text-primary"
                      aria-label="Completada"
                    />
                  ) : (
                    `${index + 1}.`
                  )}
                </span>
                <span>
                  {l.title}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {l.minutes} minutos
                  </span>
                </span>
              </button>
            ))}
          </nav>
          <article className="min-w-0 space-y-5 rounded-2xl border bg-card p-5 sm:p-8">
            <h3 className="text-xl font-semibold">{lesson.title}</h3>
            {lesson.paragraphs.map((p, i) => (
              <p key={i} className="leading-7 text-muted-foreground">
                {p}
              </p>
            ))}
            <div className="rounded-xl bg-muted/50 p-5">
              <h4 className="mb-3 font-semibold">Llévalo a la práctica</h4>
              <ol className="list-decimal space-y-3 pl-5">
                {lesson.steps.map((s, i) => (
                  <li key={i} className="pl-1 leading-6">
                    {s}
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={
                  !started ||
                  busy ||
                  course.progress.completedLessons.includes(lesson.id)
                }
                onClick={() =>
                  void act(async () => {
                    const updated = await completeTrainingLesson(
                      course.id,
                      lesson.id,
                    );
                    setCourse(updated);
                    onProgress();
                    const next = course.lessons.find(
                      (l) =>
                        l.id !== lesson.id &&
                        !updated.progress.completedLessons.includes(l.id),
                    );
                    if (next) setLessonId(next.id);
                    else setTab('assessment');
                    setNotice('Lección completada.');
                  })
                }
              >
                {course.progress.completedLessons.includes(lesson.id) ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Completada
                  </>
                ) : (
                  'Marcar como completada'
                )}
              </Button>
              {lesson.guide && !commercial && (
                <Button asChild variant="outline">
                  <Link href={`/ayuda/${lesson.guide}`}>
                    Consultar guía paso a paso
                  </Link>
                </Button>
              )}
            </div>
          </article>
        </div>
      )}
      {tab === 'assessment' && (
        <section className="space-y-5 rounded-2xl border bg-card p-5 sm:p-8">
          <h3 className="text-xl font-semibold">Comprueba lo que aprendiste</h3>
          <p className="text-muted-foreground">
            Apruebas con 80/100. Si necesitas repetir, revisa las explicaciones
            y espera un minuto.
          </p>
          {!allLessons && (
            <p role="status" className="rounded-lg bg-muted p-4">
              Completa todas las lecciones para habilitar la evaluación.
            </p>
          )}
          {course.progress.quizPassed ? (
            <div className="space-y-3 rounded-xl bg-emerald-50 p-5 text-emerald-900">
              <p className="font-semibold">
                Evaluación aprobada · {course.progress.bestScore}/100
              </p>
              <Button onClick={() => setTab('practice')}>
                Continuar con la práctica
              </Button>
            </div>
          ) : (
            <form
              className="space-y-6"
              onSubmit={(event) => {
                event.preventDefault();
                void act(async () => {
                  const value = await assessTraining(course.id, answers);
                  setResult(value);
                  setCourse(value.course);
                  onProgress();
                  if (value.passed)
                    setNotice(
                      'Evaluación aprobada. Ya puedes entregar tu práctica.',
                    );
                });
              }}
            >
              <fieldset
                disabled={!started || !allLessons || busy}
                className="space-y-6"
              >
                {course.questions.map((q, index) => (
                  <fieldset key={q.id} className="space-y-3">
                    <legend className="mb-3 font-medium">
                      {index + 1}. {q.prompt}
                    </legend>
                    {q.options.map((option, i) => (
                      <label
                        key={i}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/50"
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={i}
                          required
                          checked={answers[q.id] === i}
                          onChange={() =>
                            setAnswers((previous) => ({
                              ...previous,
                              [q.id]: i,
                            }))
                          }
                          className="mt-1 accent-primary"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </fieldset>
                ))}
                <Button
                  type="submit"
                  disabled={
                    Object.keys(answers).length !== course.questions.length
                  }
                >
                  {busy ? 'Revisando…' : 'Enviar evaluación'}
                </Button>
              </fieldset>
            </form>
          )}
          {result && (
            <div role="status" className="space-y-3 rounded-xl border p-5">
              <p className="text-lg font-semibold">
                Resultado: {result.score}/100 ·{' '}
                {result.passed ? 'Aprobaste' : 'Repasa y vuelve a intentarlo'}
              </p>
              {result.feedback.map((f, i) => (
                <p key={f.id} className="text-sm">
                  <strong>
                    {i + 1}. {f.correct ? 'Correcta' : 'Por repasar'}:
                  </strong>{' '}
                  {f.explanation}
                </p>
              ))}
            </div>
          )}
        </section>
      )}
      {tab === 'practice' && (
        <section className="space-y-5 rounded-2xl border bg-card p-5 sm:p-8">
          {started && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  setCourse(await getTrainingCourse(course.id));
                  onProgress();
                  setNotice('Estado actualizado.');
                })
              }
            >
              Actualizar estado de mi práctica
            </Button>
          )}
          <h3 className="text-xl font-semibold">Demuestra cómo lo harías</h3>
          <p className="leading-7 text-muted-foreground">{course.practice}</p>
          <div className="rounded-xl bg-muted/50 p-5">
            <h4 className="mb-3 font-semibold">Tu responsable revisará</h4>
            <ul className="list-disc space-y-2 pl-5">
              {course.rubric.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">
            Usa datos ficticios. Escribe lo que hiciste y cómo comprobaste el
            resultado; evita datos personales, contraseñas y enlaces privados.
          </p>
          {course.progress.practiceFeedback && (
            <div role="status" className="rounded-xl border p-5">
              <h4 className="font-semibold">Devolución de tu responsable</h4>
              <p className="mt-2 whitespace-pre-wrap break-words">
                {course.progress.practiceFeedback}
              </p>
            </div>
          )}
          {['SUBMITTED', 'APPROVED'].includes(
            course.progress.practiceStatus,
          ) ? (
            <div className="space-y-3">
              <p role="status" className="font-medium">
                {course.progress.practiceStatus === 'SUBMITTED'
                  ? 'Tu práctica está en revisión. Un administrador de tu organización o el operador puede validarla.'
                  : 'Práctica aprobada. Completaste este curso.'}
              </p>
              <p className="whitespace-pre-wrap break-words rounded-xl bg-muted/50 p-4 text-sm">
                {course.progress.practiceEvidence}
              </p>
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void act(async () => {
                  setCourse(await submitTrainingPractice(course.id, evidence));
                  onProgress();
                  setNotice(
                    'Práctica entregada. Tu responsable ya puede revisarla.',
                  );
                });
              }}
            >
              <label htmlFor="training-practice" className="block font-medium">
                Tu entrega
              </label>
              <textarea
                id="training-practice"
                rows={7}
                minLength={30}
                maxLength={3000}
                required
                value={evidence}
                onChange={(event) => setEvidence(event.target.value)}
                disabled={!course.progress.quizPassed || busy}
                placeholder="Describe tu caso de práctica, los pasos que seguiste y lo que comprobaste…"
                className="w-full rounded-xl border bg-background p-4 text-base"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {evidence.length}/3000 caracteres
                </span>
                <Button
                  type="submit"
                  disabled={
                    !course.progress.quizPassed ||
                    busy ||
                    evidence.trim().length < 30
                  }
                >
                  {busy ? 'Entregando…' : 'Entregar práctica'}
                </Button>
              </div>
              {!course.progress.quizPassed && (
                <p className="text-sm text-muted-foreground">
                  Primero aprueba la evaluación.
                </p>
              )}
            </form>
          )}
          {course.progress.certificateId && (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <h4 className="font-semibold text-emerald-900">
                Tu constancia está lista
              </h4>
              <p className="text-sm text-emerald-900">
                Acredita esta versión del curso, su evaluación y la práctica
                validada.
              </p>
              <Button
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await downloadTrainingCertificate(
                      course.progress.certificateId!,
                    );
                  })
                }
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar constancia PDF
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
