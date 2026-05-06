import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  FileText,
  Scale,
} from 'lucide-react';

import { RecommendationBadge } from './RecommendationBadge';

export function ProjectCard({
  project,
}: {
  project: any;
}) {
  const recommendation =
    project.recommendations?.[0];

  const sheet = project.legislativeSheet;

  const recommendationValue =
    sheet?.recommendedVote ||
    recommendation?.recommendation;

  const confidence =
    typeof sheet?.confidence === 'number'
      ? Math.round(sheet.confidence * 100)
      : null;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block h-full"
    >
      <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <RecommendationBadge
            value={recommendationValue}
          />

          <div className="flex flex-col items-end gap-2">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              {project.chamber || 'CAMARA'}
            </span>

            {confidence !== null && (
              <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                IA {confidence}%
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="mb-4 line-clamp-3 text-base font-bold leading-tight text-[#1B2541] transition-colors group-hover:text-blue-700">
          {project.title}
        </h3>

        {/* Executive summary */}
        <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-[#1B2541]" />

            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Resumen ejecutivo
            </p>
          </div>

          <p className="line-clamp-4 text-sm leading-6 text-slate-700">
            {sheet?.executiveSummary ||
              project.analysis?.summary ||
              'Proyecto pendiente de procesamiento IA.'}
          </p>
        </div>

        {/* Key alerts */}
        {Array.isArray(sheet?.redFlags) &&
          sheet.redFlags.length > 0 && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-700" />

                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">
                  Alertas críticas
                </p>
              </div>

              <ul className="space-y-2">
                {sheet.redFlags
                  .slice(0, 2)
                  .map(
                    (
                      item: string,
                      index: number,
                    ) => (
                      <li
                        key={index}
                        className="line-clamp-2 text-xs leading-5 text-amber-900"
                      >
                        • {item}
                      </li>
                    ),
                  )}
              </ul>
            </div>
          )}

        {/* Metrics */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <MetricCard
            icon={Scale}
            label="Impacto"
            value={
              project.analysis?.impact ||
              'N/A'
            }
          />

          <MetricCard
            icon={FileText}
            label="Estado"
            value={
              project.currentStage ||
              'Sin estado'
            }
          />
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-slate-100 pt-4">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>
              Proyecto:{' '}
              <strong className="text-slate-700">
                {project.projectNumber ||
                  'N/A'}
              </strong>
            </span>

            <span>&middot;</span>

            <span>
              Año:{' '}
              <strong className="text-slate-700">
                {project.projectYear ||
                  project.year}
              </strong>
            </span>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-blue-700 transition-colors group-hover:text-blue-800">
              Ver ficha legislativa
            </span>

            <ArrowRight className="h-4 w-4 text-blue-700 transition-transform duration-200 group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#1B2541]" />

        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {label}
        </p>
      </div>

      <p className="line-clamp-2 text-sm font-semibold text-[#1B2541]">
        {value}
      </p>
    </div>
  );
}