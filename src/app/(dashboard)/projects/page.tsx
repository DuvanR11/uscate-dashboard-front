import {
  FileText,
  Brain,
  AlertTriangle,
  CheckCircle,
  Bell,
  RefreshCw,
  Activity,
  ShieldAlert,
  Scale,
  Clock3,
} from 'lucide-react';

import { apiGet, apiPost } from '@/lib/apis';
import { StatCard } from '@/components/dashboard/projects/StatCard';
import { ProjectCard } from '@/components/dashboard/projects/ProjectCard';

export default async function DashboardPage() {
  const projects = await apiGet<any[]>('/projects');
  const runs = await apiGet<any[]>('/ingestion/runs');
  const alerts = await apiGet<any[]>('/alerts?userId=default');

  const favor = projects.filter(
    (p: any) =>
      p.recommendations?.[0]?.recommendation === 'FAVOR',
  ).length;

  const contra = projects.filter(
    (p: any) =>
      p.recommendations?.[0]?.recommendation === 'CONTRA',
  ).length;

  const abstencion = projects.filter(
    (p: any) =>
      p.recommendations?.[0]?.recommendation ===
      'ABSTENCION',
  ).length;

  const modificar = projects.filter(
    (p: any) =>
      p.recommendations?.[0]?.recommendation ===
      'MODIFICAR',
  ).length;

  const withSheet = projects.filter(
    (p: any) => p.legislativeSheet,
  ).length;

  const lastRun = runs?.[0];

  return (
    <div className="space-y-10 pb-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-center">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
            <Brain className="h-3.5 w-3.5" />
            IA Legislativa Ejecutiva
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-[#1B2541] md:text-4xl">
            Centro de Mando Legislativo
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 md:text-base">
            Plataforma de análisis legislativo automatizado
            para congresistas y equipos jurídicos. Procesa
            proyectos de ley, documentos oficiales,
            debates, OCR y recomendaciones IA.
          </p>
        </div>

        {/* Sync */}
        <form
          action={async () => {
            'use server';

            await apiPost('/ingestion/camara', {
              userId: 'default',
            });
          }}
        >
          <button className="inline-flex items-center gap-2 rounded-xl bg-[#1B2541] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:bg-[#243252] hover:shadow-lg">
            <RefreshCw className="h-4 w-4" />
            Sincronizar Cámara
          </button>
        </form>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard
          title="Proyectos"
          value={projects.length}
          subtitle="Proyectos cargados"
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
            <div className="rounded-lg bg-[#1B2541]/10 p-2 text-[#1B2541]">
              <Activity className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-base font-bold uppercase tracking-wide text-[#1B2541]">
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
              <h2 className="text-base font-bold uppercase tracking-wide text-[#1B2541]">
                Alertas recientes
              </h2>

              <p className="text-xs text-slate-500">
                Riesgos jurídicos y cambios detectados
              </p>
            </div>
          </div>

          <div className="p-6">
            {alerts.length ? (
              <div className="space-y-3">
                {alerts
                  .slice(0, 5)
                  .map((alert: any) => (
                    <div
                      key={alert.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-amber-200 hover:bg-amber-50"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <Bell className="h-4 w-4 text-amber-600" />

                        <p className="text-sm font-bold text-[#1B2541]">
                          {alert.type}
                        </p>
                      </div>

                      <p className="text-sm leading-6 text-slate-600">
                        {alert.message}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <EmptyState text="No hay alertas pendientes." />
            )}
          </div>
        </div>
      </div>

      {/* Projects */}
      <div>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#1B2541]">
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

        {projects.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project: any) => (
              <ProjectCard
                key={project.id}
                project={project}
              />
            ))}
          </div>
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
  value: any;
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
            : 'text-[#1B2541]'
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