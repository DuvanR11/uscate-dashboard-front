import { DocumentsList } from '@/components/dashboard/projects/DocumentsList';
import { LegislativeSheet } from '@/components/dashboard/projects/LegislativeSheet';
import { MlExplanation } from '@/components/dashboard/projects/MlExplanation';
import { ProjectTimeline } from '@/components/dashboard/projects/ProjectTimeline';
import { RecommendationBadge } from '@/components/dashboard/projects/RecommendationBadge';
import { apiGet } from '@/lib/apis';
import { BrainCircuit } from 'lucide-react';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>; // Tipamos params como Promesa
}) {
  // 1. Resolvemos los params antes de usarlos
  const resolvedParams = await params;

  // 2. Ahora sí usamos el ID de forma segura
  const project = await apiGet<any>(
    `/projects/${resolvedParams.id}`
  );

  const recommendation = project.recommendation;

  return (
    <div className="space-y-6 pb-10">
      
      {/* Cabecera del Proyecto */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <RecommendationBadge value={recommendation?.recommendation} />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            Score IA: {recommendation?.score?.toFixed?.(2) || 'N/A'}
          </span>
        </div>

        <h1 className="text-3xl font-bold text-[#1B2541] leading-tight">
          {project.title}
        </h1>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
          <p>
            <strong className="text-slate-700">Cámara:</strong> {project.chamber}
          </p>
          <p>
            <strong className="text-slate-700">Proyecto:</strong> {project.projectNumber || 'N/A'}
          </p>
          <p>
            <strong className="text-slate-700">Año:</strong> {project.projectYear || project.year}
          </p>
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-800 border border-blue-100">
          <span className="font-semibold">Estado actual:</span> 
          <span>{project.currentStage || 'Sin estado'}</span>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="grid gap-6 xl:grid-cols-3">
        
        {/* Columna Izquierda (Info Principal y Análisis) */}
        <div className="space-y-6 xl:col-span-2">
          
          <LegislativeSheet sheet={project.legislativeSheet} />

          {/* Tarjeta de Análisis de IA */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
             <div className="bg-indigo-50/50 px-6 py-4 border-b border-indigo-100 flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-indigo-900 uppercase tracking-wide">
                  Análisis IA Base
                </h2>
             </div>
             
            <div className="p-6">
              <p className="text-slate-700 leading-relaxed text-sm md:text-base">
                {project.analysis?.summary || 'Sin análisis disponible'}
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Impacto</p>
                  <p className="mt-1 font-semibold text-[#1B2541]">
                    {project.analysis?.impact || 'N/A'}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Riesgo</p>
                  <p className="mt-1 font-semibold text-[#1B2541]">
                    {project.analysis?.risk || 'N/A'}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Temas</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {project.analysis?.topics || '[]'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <MlExplanation reasoning={recommendation?.reasoning} />
        </div>

        {/* Columna Derecha (Línea de Tiempo y Documentos) */}
        <div className="space-y-6">
          <ProjectTimeline currentStage={project.currentStage} />
          <DocumentsList documents={project.documents} />
        </div>
      </div>
      
    </div>
  );
}