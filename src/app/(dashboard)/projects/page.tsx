import { FileText, Brain, AlertTriangle, CheckCircle, Bell, RefreshCw, Activity, ShieldAlert } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/apis';
import { StatCard } from '@/components/dashboard/projects/StatCard';
import { ProjectCard } from '@/components/dashboard/projects/ProjectCard';

export default async function DashboardPage() {
  const projects = await apiGet<any[]>('/projects');
  const runs = await apiGet<any[]>('/ingestion/runs');
  const alerts = await apiGet<any[]>('/alerts?userId=default');

  const favor = projects.filter(
    (p: any) => p.recommendations?.[0]?.recommendation === 'FAVOR',
  ).length;

  const contra = projects.filter(
    (p: any) => p.recommendations?.[0]?.recommendation === 'CONTRA',
  ).length;

  const lastRun = runs?.[0];

  return (
    <div className="space-y-8 pb-10">
      {/* Header del Centro de Mando */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1B2541]">
            Centro de Mando Legislativo
          </h1>
          <p className="mt-2 text-slate-500">
            Seguimiento, ficha legislativa, OCR, IA y recomendación automática.
          </p>
        </div>

        <form
          action={async () => {
            'use server';
            await apiPost('/ingestion/camara', { userId: 'default' });
          }}
        >
          <button className="flex items-center gap-2 rounded-lg bg-[#1B2541] px-6 py-3 font-semibold text-white shadow-md transition-all hover:bg-[#1B2541]/90 focus:ring-2 focus:ring-[#1B2541]/50 focus:ring-offset-2">
            <RefreshCw className="h-4 w-4" />
            Sincronizar Cámara
          </button>
        </form>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Proyectos" value={projects.length} icon={FileText} />
        <StatCard title="A favor" value={favor} icon={CheckCircle} />
        <StatCard title="En contra" value={contra} icon={AlertTriangle} />
        <StatCard title="Alertas" value={alerts.length} icon={Bell} />
        <StatCard title="IA activa" value="OCR + ML" icon={Brain} />
      </div>

      {/* Paneles de Información */}
      <div className="grid gap-6 xl:grid-cols-2">
        
        {/* Panel: Última Sincronización */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
             <div className="bg-[#1B2541]/10 p-2 rounded-lg text-[#1B2541]">
               <Activity className="w-5 h-5" />
             </div>
             <h2 className="text-base font-bold text-[#1B2541] uppercase tracking-wide">
               Última Sincronización
             </h2>
          </div>
          <div className="p-6">
            {lastRun ? (
              <div className="grid gap-4 text-sm text-slate-600 md:grid-cols-2">
                <p className="flex flex-col"><span className="text-slate-400 text-xs uppercase tracking-wider">Estado</span> <b className="text-slate-800 text-base">{lastRun.status}</b></p>
                <p className="flex flex-col"><span className="text-slate-400 text-xs uppercase tracking-wider">Fuente</span> <b className="text-slate-800 text-base">{lastRun.source}</b></p>
                <p className="flex flex-col"><span className="text-slate-400 text-xs uppercase tracking-wider">Proyectos encontrados</span> <b className="text-slate-800 text-base">{lastRun.projectsFound}</b></p>
                <p className="flex flex-col"><span className="text-slate-400 text-xs uppercase tracking-wider">Proyectos actualizados</span> <b className="text-slate-800 text-base">{lastRun.projectsUpdated}</b></p>
                <p className="flex flex-col"><span className="text-slate-400 text-xs uppercase tracking-wider">Docs procesados</span> <b className="text-slate-800 text-base">{lastRun.docsProcessed}</b></p>
                <p className="flex flex-col"><span className="text-slate-400 text-xs uppercase tracking-wider">Docs omitidos</span> <b className="text-slate-800 text-base">{lastRun.docsSkipped}</b></p>
                <p className="flex flex-col md:col-span-2"><span className="text-slate-400 text-xs uppercase tracking-wider">Errores</span> <b className="text-red-600 text-base">{lastRun.errorsCount}</b></p>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
                <p className="text-slate-500 font-medium">Sin ejecuciones registradas.</p>
              </div>
            )}
          </div>
        </div>

        {/* Panel: Alertas Recientes */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
             <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
               <ShieldAlert className="w-5 h-5" />
             </div>
             <h2 className="text-base font-bold text-[#1B2541] uppercase tracking-wide">
               Alertas Recientes
             </h2>
          </div>
          <div className="p-6">
            {alerts.length ? (
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert: any) => (
                  <div key={alert.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4 transition-colors hover:bg-slate-100">
                    <p className="text-sm font-bold text-[#1B2541]">{alert.type}</p>
                    <p className="mt-1 text-sm text-slate-600">{alert.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
                <p className="text-slate-500 font-medium">No hay alertas pendientes.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Grid de Proyectos */}
      <div>
        <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1B2541]">
          Proyectos Recientes
        </h2>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project: any) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}