import Link from 'next/link';
import {
  FileText,
  Brain,
  AlertTriangle,
  CheckCircle,
  Activity,
  ShieldAlert,
  Scale,
  Clock3,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';

import { apiGet } from '@/lib/apis-server';
import { StatCard } from '@/components/dashboard/projects/StatCard';
import { ProjectCard } from '@/components/dashboard/projects/ProjectCard';
import SyncLegislativeButton from '@/components/dashboard/projects/SyncLegislativeButton';
import RadarAlerts from '@/components/dashboard/projects/RadarAlerts';
import type { IngestionRun, ProjectAlert, ProjectListResponse } from '@/types/project';

// Plan "Radar Legislativo multi-corporación" (2026-09-08) — la corporación
// real de ESTA organización (Cámara de Representantes, Concejo de
// Bogotá...), resuelta server-side desde `Organization.legislativeBodyId`
// — nunca vocabulario de Congreso hardcodeado para cualquier cliente.
interface LegislativeBody {
  code: string;
  name: string;
  personaTitle: string;
}

// Plural en español de la persona de la corporación: "representante" →
// "representantes", "concejal" → "concejales", "senador" → "senadores"
// (antes se agregaba solo una "s": "concejals").
const pluralize = (word: string) => (/[aeiouáéíóú]$/.test(word) ? `${word}s` : `${word}es`);

// Fase 5 del análisis de punta a punta (2026-10-28, INT-15): la lista se pide
// por páginas y la búsqueda la hace el servidor. Antes llegaban hasta 500
// proyectos con el texto completo de sus documentos y se pintaban todos.
const PAGE_SIZE = 24;
const MAX_QUERY_LENGTH = 120;

const firstParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

function projectsHref(page: number, q: string) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/projects?${query}` : '/projects';
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; q?: string | string[] }>;
}) {
  const params = await searchParams;
  const q = (firstParam(params.q) ?? '').trim().slice(0, MAX_QUERY_LENGTH);
  const requestedPage = Math.max(1, Number.parseInt(firstParam(params.page) ?? '1', 10) || 1);
  const listQuery = new URLSearchParams({ page: String(requestedPage), limit: String(PAGE_SIZE) });
  if (q) listQuery.set('q', q);

  const legislativeBodyPromise = apiGet<LegislativeBody | null>('/projects/legislative-body');

  const [list, lastRun, alerts, legislativeBody, coverage] = await Promise.all([
    apiGet<ProjectListResponse>(`/projects?${listQuery.toString()}`),
    // Fase 3 del análisis de punta a punta (2026-10-28, INT-10): la última
    // corrida de LA corporación de esta organización. Antes se tomaba la
    // primera de `/ingestion/runs`, que traía las de todas: «Última
    // sincronización» podía mostrar una del Senado a un despacho de la Cámara.
    legislativeBodyPromise.then((body) =>
      body
        ? apiGet<IngestionRun | null>(
            `/ingestion/runs/latest?code=${encodeURIComponent(body.code)}`,
          )
        : null,
    ),
    // Plan "Radar Legislativo", Fase 2 (cerrada 2026-09-03) — `userId` real
    // resuelto server-side desde el JWT (ver `alerts.controller.ts`),
    // nunca más un query param que el cliente podía mandar libremente.
    apiGet<ProjectAlert[]>('/alerts'),
    legislativeBodyPromise,
    // Fase C (2026-09-28): corporaciones que el Radar cubre hoy.
    apiGet<LegislativeBody[]>('/projects/coverage').catch(() => [] as LegislativeBody[]),
  ]);

  // Fase 3 del análisis de punta a punta (2026-10-28, INT-16): las cifras
  // cuentan el mismo voto calibrado que muestran las tarjetas. Antes solo
  // contaban los proyectos que la persona ya había abierto (los únicos con
  // recomendación guardada).
  // Fase 5 (INT-15): las cuenta el servidor sobre todo el alcance, no sobre la
  // página que se ve.
  const projects = list.data;
  const { meta, summary } = list;
  const { favor, contra, abstencion, modificar, withSheet } = summary;
  const scopeLabel = summary.fromYear
    ? `Desde la legislatura ${summary.fromYear}-${summary.fromYear + 1}`
    : 'En seguimiento';

  return (
    <div className="space-y-10 pb-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-center">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-ai/30 bg-ai/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-ai">
            <Brain className="h-3.5 w-3.5" />
            IA Legislativa Ejecutiva
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Centro de Mando Legislativo
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 md:text-base">
            Plataforma de análisis legislativo automatizado
            para {legislativeBody ? pluralize(legislativeBody.personaTitle.toLowerCase()) : 'corporados'} y equipos jurídicos. Procesa
            proyectos {legislativeBody?.code === 'CONCEJO_BOGOTA' ? 'de acuerdo' : 'de ley'}, documentos oficiales,
            debates, OCR y recomendaciones IA.
          </p>
        </div>

        {/* Sync — Plan "Radar Legislativo", Fase 3: ya no es un <form>
            server action de una sola vía — `SyncLegislativeButton` es un
            componente cliente real que dispara el sync (`userId` real
            resuelto server-side desde el JWT, igual que antes) y sondea
            `/ingestion/runs/latest` para mostrar progreso real en vivo.
            Plan "Radar Legislativo multi-corporación" (2026-09-08): sin
            corporación asignada a esta organización, no hay nada que
            sincronizar — se oculta en vez de disparar un sync sin sentido. */}
        {legislativeBody && (
          <SyncLegislativeButton
            code={legislativeBody.code}
            name={legislativeBody.name}
          />
        )}
      </div>

      {/* Sin corporación asignada no hay cifras, sincronización ni alertas
          propias que mostrar (las corridas son de otras corporaciones): solo
          el aviso de cobertura, más abajo. */}
      {legislativeBody && (
      <>
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard
          title="Proyectos"
          value={summary.total}
          subtitle={scopeLabel}
          icon={FileText}
          color="blue"
        />

        <StatCard
          title="A favor"
          value={favor}
          subtitle="Recomendación IA"
          icon={CheckCircle}
          color="green"
        />

        <StatCard
          title="En contra"
          value={contra}
          subtitle="Alto riesgo político"
          icon={AlertTriangle}
          color="red"
        />

        <StatCard
          title="Abstención"
          value={abstencion}
          subtitle="Requiere revisión"
          icon={Scale}
          color="amber"
        />

        <StatCard
          title="Modificar"
          value={modificar}
          subtitle="Necesita ajustes"
          icon={ShieldAlert}
          color="purple"
        />

        <StatCard
          title="Fichas IA"
          value={withSheet}
          subtitle="Fichas ejecutivas"
          icon={Brain}
          color="blue"
        />
      </div>

      {/* Panels */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Sync Panel */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Activity className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-base font-bold uppercase tracking-wide text-foreground">
                Última sincronización
              </h2>

              <p className="text-xs text-slate-500">
                Estado del último procesamiento legislativo
              </p>
            </div>
          </div>

          <div className="p-6">
            {lastRun ? (
              <div className="grid gap-4 md:grid-cols-2">
                <SyncItem
                  label="Estado"
                  value={lastRun.status}
                />

                <SyncItem
                  label="Fuente"
                  value={lastRun.source}
                />

                <SyncItem
                  label="Proyectos encontrados"
                  value={lastRun.projectsFound}
                />

                <SyncItem
                  label="Actualizados"
                  value={lastRun.projectsUpdated}
                />

                <SyncItem
                  label="Docs procesados"
                  value={lastRun.docsProcessed}
                />

                <SyncItem
                  label="Docs omitidos"
                  value={lastRun.docsSkipped}
                />

                <div className="md:col-span-2">
                  <SyncItem
                    label="Errores"
                    value={lastRun.errorsCount}
                    danger
                  />
                </div>
              </div>
            ) : (
              <EmptyState text="Sin sincronizaciones registradas." />
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <ShieldAlert className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-base font-bold uppercase tracking-wide text-foreground">
                Alertas recientes
              </h2>

              <p className="text-xs text-slate-500">
                Proyectos que cambiaron de etapa
              </p>
            </div>
          </div>

          <div className="p-6">
            <RadarAlerts initialAlerts={alerts} />
          </div>
        </div>
      </div>
      </>
      )}

      {/* Projects */}
      <div>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Proyectos recientes
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Fichas legislativas ejecutivas generadas por IA
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm md:flex">
            <Clock3 className="h-4 w-4" />
            Actualización automática
          </div>
        </div>

        {/* Fase 5 (INT-15): búsqueda en el servidor (formulario GET: funciona
            sin JavaScript y el enlace se puede compartir). */}
        {legislativeBody && (summary.total > 0 || q) && (
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <form action="/projects" method="get" role="search" className="flex w-full gap-2 md:max-w-xl">
              <div className="relative flex-1">
                <Search aria-hidden className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  maxLength={MAX_QUERY_LENGTH}
                  aria-label="Buscar proyectos"
                  placeholder="Buscar por título, número o estado"
                  className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
              <button
                type="submit"
                className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
              >
                Buscar
              </button>
            </form>

            <p className="text-sm text-slate-500">
              {q ? (
                <>
                  {meta.total.toLocaleString('es-CO')} {meta.total === 1 ? 'proyecto coincide' : 'proyectos coinciden'} con «{q}» ·{' '}
                  <Link href="/projects" className="font-semibold text-blue-700 hover:underline">
                    Quitar la búsqueda
                  </Link>
                </>
              ) : (
                <>
                  {meta.total.toLocaleString('es-CO')} {meta.total === 1 ? 'proyecto' : 'proyectos'}
                </>
              )}
            </p>
          </div>
        )}

        {!legislativeBody ? (
          // Fase C (2026-09-28): sin corporación asignada no es una falla —
          // se explica y se muestra la cobertura real del Radar hoy.
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <p className="font-bold">Tu organización todavía no sigue ninguna corporación en el Radar Legislativo</p>
            <p className="mt-2 text-sm leading-6">
              Hoy el Radar cubre: {coverage.length ? coverage.map((b) => b.name).join(', ') : 'ninguna corporación'}. Si
              tu corporación está en la lista, pide al equipo de soporte que la asigne; si no, la incorporamos a
              pedido.
            </p>
          </div>
        ) : projects.length ? (
          <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                />
              ))}
            </div>

            {meta.lastPage > 1 && (
              <nav aria-label="Páginas de proyectos" className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
                {meta.page > 1 ? (
                  <Link
                    href={projectsHref(meta.page - 1, q)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ChevronLeft aria-hidden className="h-4 w-4" />
                    Anterior
                  </Link>
                ) : (
                  <span aria-disabled className="inline-flex items-center gap-1 rounded-md border border-slate-100 px-3 py-1.5 text-slate-300">
                    <ChevronLeft aria-hidden className="h-4 w-4" />
                    Anterior
                  </span>
                )}

                <span className="text-slate-500">
                  Página {meta.page} de {meta.lastPage}
                </span>

                {meta.page < meta.lastPage ? (
                  <Link
                    href={projectsHref(meta.page + 1, q)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Siguiente
                    <ChevronRight aria-hidden className="h-4 w-4" />
                  </Link>
                ) : (
                  <span aria-disabled className="inline-flex items-center gap-1 rounded-md border border-slate-100 px-3 py-1.5 text-slate-300">
                    Siguiente
                    <ChevronRight aria-hidden className="h-4 w-4" />
                  </span>
                )}
              </nav>
            )}
          </>
        ) : q ? (
          <EmptyState text={`Ningún proyecto coincide con «${q}».`} />
        ) : (
          <EmptyState text="No hay proyectos disponibles." />
        )}
      </div>
    </div>
  );
}

function SyncItem({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-lg font-bold ${
          danger
            ? 'text-red-600'
            : 'text-primary'
        }`}
      >
        {value ?? 0}
      </p>
    </div>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
      <p className="font-medium text-slate-500">
        {text}
      </p>
    </div>
  );
}