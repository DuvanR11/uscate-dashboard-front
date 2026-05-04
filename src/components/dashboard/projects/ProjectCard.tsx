import Link from 'next/link';
import { RecommendationBadge } from './RecommendationBadge';

export function ProjectCard({ project }: { project: any }) {
  const recommendation = project.recommendations?.[0];

  return (
    <Link 
      href={`/projects/${project.id}`} 
      className="group block h-full"
    >
      <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
        
        {/* Cabecera de la Tarjeta */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <RecommendationBadge value={recommendation?.recommendation} />
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {project.chamber}
          </span>
        </div>

        {/* Título */}
        <h3 className="mb-4 line-clamp-3 text-base font-bold leading-tight text-[#1B2541] transition-colors group-hover:text-blue-700">
          {project.title}
        </h3>

        {/* Metadatos (Empujados hacia abajo con mt-auto para alinear tarjetas en grilla) */}
        <div className="mt-auto space-y-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            {/* Pequeño indicador de estado */}
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
            <span className="truncate">{project.currentStage || 'Sin estado'}</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span>
              Proyecto: <strong className="text-slate-600">{project.projectNumber || 'N/A'}</strong>
            </span>
            <span>&middot;</span>
            <span>
              Año: <strong className="text-slate-600">{project.projectYear || project.year}</strong>
            </span>
          </div>
        </div>
        
      </div>
    </Link>
  );
}