'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  BookOpen,
  Clock3,
  GraduationCap,
  Loader2,
  Search,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { extractErrorMessage } from '@/lib/api/platform';
import {
  getTraining,
  getTrainingCourse,
  type TrainingCatalog,
  type TrainingCourse,
} from '@/lib/api/training';
import { CoursePlayer, practiceLabel } from './training-course';
import { TrainingTeamPanel } from './training-team';

export function TrainingWorkspace({
  commercial = false,
}: {
  commercial?: boolean;
}) {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.isHydrated);
  if (!hydrated) return <p role="status">Cargando tu cuenta…</p>;
  if (!user)
    return (
      <div className="rounded-xl border p-8">
        <p>Inicia sesión para consultar tu capacitación.</p>
        <Link
          className="mt-3 inline-block text-primary underline"
          href="/login"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  if ((user.role?.code === 'COMMERCIAL_REP') !== commercial)
    return (
      <p role="alert">
        Abre la capacitación desde tu espacio de trabajo:{' '}
        <Link
          className="text-primary underline"
          href={
            user.role?.code === 'COMMERCIAL_REP'
              ? '/commercial/capacitacion'
              : '/capacitacion'
          }
        >
          Ir a mi capacitación
        </Link>
        .
      </p>
    );
  return (
    <WorkspaceSession
      key={`${user.id}-${user.organizationId}-${user.role?.code}`}
      commercial={commercial}
    />
  );
}

function WorkspaceSession({ commercial }: { commercial: boolean }) {
  const [catalog, setCatalog] = useState<TrainingCatalog | null>(null);
  const [course, setCourse] = useState<TrainingCourse | null>(null);
  const [view, setView] = useState<'courses' | 'team'>('courses');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'progress' | 'completed'>('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let active = true;
    getTraining()
      .then((value) => {
        if (active) {
          setCatalog(value);
          setError('');
        }
      })
      .catch((e) => {
        if (active)
          setError(
            extractErrorMessage(e) || 'No se pudo cargar la capacitación.',
          );
      });
    return () => {
      active = false;
    };
  }, [generation]);
  async function open(id: string) {
    setLoading(true);
    setError('');
    try {
      setCourse(await getTrainingCourse(id));
    } catch (e) {
      setError(extractErrorMessage(e) || 'No se pudo abrir el curso.');
    } finally {
      setLoading(false);
    }
  }
  const normalize = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const courses =
    catalog?.courses.filter(
      (c) =>
        normalize(`${c.title} ${c.description} ${c.category}`).includes(
          normalize(query),
        ) &&
        (filter === 'all' ||
          (filter === 'completed'
            ? Boolean(c.progress.completedAt)
            : Boolean(c.progress.enrollmentId) && !c.progress.completedAt)),
    ) ?? [];
  const finished =
    catalog?.courses.filter((c) => c.progress.completedAt).length ?? 0;
  const started =
    catalog?.courses.filter(
      (c) => c.progress.enrollmentId && !c.progress.completedAt,
    ).length ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="relative overflow-hidden rounded-2xl border bg-card p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-12 h-52 w-52 rounded-full bg-primary/5" />
        <div className="relative max-w-3xl space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <GraduationCap className="h-5 w-5" aria-hidden="true" /> Aprende con
            Zyron
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tu siguiente paso empieza aquí
          </h1>
          <p className="leading-7 text-muted-foreground">
            {commercial
              ? 'Prepárate para descubrir necesidades, dar una demo y acompañar una venta.'
              : 'Conoce tu espacio, practica las tareas de tu rol y gana confianza para trabajar.'}{' '}
            Aprende a tu ritmo; tu avance se guarda en tu cuenta.
          </p>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
            {catalog?.courses.length ?? '—'} cursos para ti
          </span>
          <span>{started} en curso</span>
          <span className="flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" aria-hidden="true" />
            {finished} aprobados
          </span>
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
        >
          <p>{error}</p>
          <Button variant="outline" onClick={() => setGeneration((g) => g + 1)}>
            Reintentar
          </Button>
        </div>
      )}
      {!catalog && !error && (
        <p role="status" className="flex items-center gap-2 py-12">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando tus cursos…
        </p>
      )}
      {course ? (
        <CoursePlayer
          key={course.id}
          initial={course}
          commercial={commercial}
          onBack={() => {
            setCourse(null);
            setGeneration((g) => g + 1);
          }}
          onProgress={() => setGeneration((g) => g + 1)}
        />
      ) : (
        catalog && (
          <>
            <nav
              className="flex flex-wrap gap-2"
              aria-label="Secciones de capacitación"
            >
              <Button
                variant={view === 'courses' ? 'default' : 'outline'}
                aria-pressed={view === 'courses'}
                onClick={() => setView('courses')}
              >
                Mis cursos
              </Button>
              {catalog.canReview && (
                <Button
                  variant={view === 'team' ? 'default' : 'outline'}
                  aria-pressed={view === 'team'}
                  onClick={() => setView('team')}
                >
                  Seguimiento del equipo
                </Button>
              )}
              {!commercial && (
                <Button variant="ghost" asChild>
                  <Link href="/ayuda">Consultar una guía</Link>
                </Button>
              )}
            </nav>
            {view === 'team' ? (
              <TrainingTeamPanel />
            ) : (
              <>
                <section className="rounded-xl border bg-muted/30 p-5">
                  <h2 className="font-semibold">
                    Así completas tu capacitación
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Lee las lecciones → aprueba la evaluación con 80/100 →
                    entrega tu práctica → recibe la validación de tu responsable
                    y descarga tu constancia. Empieza con «Conoce Zyron» para
                    habilitar los demás cursos.
                  </p>
                </section>
                <div className="flex flex-wrap gap-3">
                  <div className="relative min-w-0 flex-1">
                    <Search
                      className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      aria-label="Buscar curso"
                      placeholder="Busca por tarea o tema…"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <select
                    aria-label="Filtrar cursos por avance"
                    value={filter}
                    onChange={(event) =>
                      setFilter(event.target.value as typeof filter)
                    }
                    className="max-w-full rounded-md border bg-background p-2 text-sm"
                  >
                    <option value="all">Todos los cursos</option>
                    <option value="progress">En curso</option>
                    <option value="completed">Aprobados</option>
                  </select>
                </div>
                {loading && <p role="status">Abriendo curso…</p>}
                {courses.length === 0 && (
                  <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                    No hay cursos con este filtro. Prueba otra búsqueda.
                  </p>
                )}
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {courses.map((c) => {
                    const locked = Boolean(
                      c.prerequisite &&
                      !catalog.courses.find((p) => p.id === c.prerequisite)
                        ?.progress.quizPassed,
                    );
                    return (
                      <article
                        key={c.id}
                        className="flex min-w-0 flex-col rounded-2xl border bg-card p-6 shadow-sm"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                          {c.category}
                        </p>
                        <h2 className="mt-3 text-xl font-semibold">
                          {c.title}
                        </h2>
                        <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                          {c.description}
                        </p>
                        <p className="mt-4 text-xs text-muted-foreground">
                          {c.audience}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>{c.lessonCount} lecciones</span>
                          <span className="flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {c.minutes} min de lectura
                          </span>
                        </div>
                        <div className="my-4 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${c.progress.percent}%` }}
                          />
                        </div>
                        <p className="mb-4 text-xs text-muted-foreground">
                          {c.progress.completedAt
                            ? 'Curso aprobado · constancia disponible'
                            : c.progress.quizPassed
                              ? `Práctica: ${practiceLabel[c.progress.practiceStatus]}`
                              : `${c.progress.completedLessons.length}/${c.lessonCount} lecciones completadas`}
                        </p>
                        <Button
                          variant={
                            c.progress.completedAt ? 'outline' : 'default'
                          }
                          disabled={loading}
                          onClick={() => void open(c.id)}
                        >
                          {c.progress.completedAt
                            ? 'Ver mi constancia'
                            : c.progress.enrollmentId
                              ? 'Continuar curso'
                              : locked
                                ? 'Explorar el curso'
                                : 'Ver curso'}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        {locked && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Para iniciarlo, aprueba «Conoce Zyron».
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )
      )}
    </div>
  );
}
