import { DocumentsList } from '@/components/dashboard/projects/DocumentsList';
import RegisterActualVoteCard from '@/components/dashboard/projects/RegisterActualVoteCard';
import { LegislativeSheet } from '@/components/dashboard/projects/LegislativeSheet';
import { MlExplanation } from '@/components/dashboard/projects/MlExplanation';
import { ProjectTimeline } from '@/components/dashboard/projects/ProjectTimeline';
import { RecommendationBadge } from '@/components/dashboard/projects/RecommendationBadge';
import { apiGet } from '@/lib/apis-server';
import {
  AlertTriangle,
  BrainCircuit,
  Download,
  FileText,
  Scale,
  Users,
} from 'lucide-react';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;

  const project = await apiGet<any>(`/projects/${resolvedParams.id}`);

  const recommendation = project.recommendation;
  const sheet = project.legislativeSheet;

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <RecommendationBadge
            value={
              sheet?.recommendedVote ||
              recommendation?.recommendation ||
              'REVISAR'
            }
          />

          <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[#26365f]">
            <Download className="h-4 w-4" />
            Descargar ficha
          </button>
        </div>

        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
          Ficha Legislativa Ejecutiva
        </p>

        <h1 className="text-3xl font-bold leading-tight text-primary">
          {project.title}
        </h1>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <InfoPill label="No. Cámara" value={project.projectNumber || 'N/A'} />
          <InfoPill label="Año" value={project.projectYear || project.year} />
          <InfoPill label="Cámara" value={project.chamber || 'CAMARA'} />
          <InfoPill
            label="Estado"
            value={project.currentStage || 'Sin estado'}
          />
        </div>

        {sheet?.congressmanSummary && (
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-bold text-blue-900">
              Resumen para congresista
            </p>
            <p className="mt-2 text-sm leading-6 text-blue-900">
              {sheet.congressmanSummary}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <ExecutiveDecisionCard
            recommendedVote={
              sheet?.recommendedVote || recommendation?.recommendation
            }
            confidence={sheet?.confidence}
            decisionReason={sheet?.decisionReason || recommendation?.reasoning}
            redFlags={sheet?.redFlags}
          />

          <LegislativeSheet sheet={sheet} />

          <div className="grid gap-4 md:grid-cols-3">
            <MiniImpactCard
              icon={Scale}
              title="Impacto jurídico"
              value={sheet?.legalImpact || 'No identificado'}
            />
            <MiniImpactCard
              icon={FileText}
              title="Impacto fiscal"
              value={sheet?.fiscalImpact || 'No identificado'}
            />
            <MiniImpactCard
              icon={Users}
              title="Impacto social"
              value={sheet?.socialImpact || 'No identificado'}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-indigo-100 bg-indigo-50/50 px-6 py-4">
              <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold uppercase tracking-wide text-indigo-900">
                Análisis IA Base
              </h2>
            </div>

            <div className="p-6">
              <p className="text-sm leading-6 text-slate-700 md:text-base">
                {project.analysis?.summary || 'Sin análisis disponible'}
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <InfoBox
                  label="Impacto"
                  value={project.analysis?.impact || 'N/A'}
                />
                <InfoBox
                  label="Riesgo"
                  value={project.analysis?.risk || 'N/A'}
                />
                <InfoBox
                  label="Temas"
                  value={formatTopics(project.analysis?.topics)}
                />
              </div>
            </div>
          </div>

          <MlExplanation reasoning={recommendation?.reasoning} />

          <RegisterActualVoteCard
            projectInternalId={project.id}
            actualVote={recommendation?.actualVote}
          />
        </div>

        <div className="space-y-6">
          <ProjectTimeline currentStage={project.currentStage} />
          <DocumentsList documents={project.documents} />

          <SidePanel title="Fuentes usadas">
            {sheet?.sourceDocuments?.length ? (
              <div className="space-y-3">
                {sheet.sourceDocuments.map((doc: any, index: number) => (
                  <a
                    key={`${doc.url}-${index}`}
                    href={doc.url}
                    target="_blank"
                    className="block rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm hover:bg-slate-100"
                  >
                    <p className="font-semibold text-slate-800">
                      {doc.name || 'Documento fuente'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {doc.docType || 'Documento'} · Score {doc.score || 0}
                    </p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No hay fuentes registradas.
              </p>
            )}
          </SidePanel>
        </div>
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-primary">{value}</p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-primary">{value}</p>
    </div>
  );
}

function ExecutiveDecisionCard({
  recommendedVote,
  confidence,
  decisionReason,
  redFlags,
}: {
  recommendedVote?: string;
  confidence?: number;
  decisionReason?: string;
  redFlags?: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Recomendación ejecutiva
          </p>
          <h2 className="mt-1 text-2xl font-bold text-primary">
            {recommendedVote || 'REVISAR'}
          </h2>
        </div>

        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-right">
          <p className="text-xs font-bold uppercase text-emerald-700">
            Confianza
          </p>
          <p className="text-xl font-bold text-emerald-800">
            {typeof confidence === 'number'
              ? `${Math.round(confidence * 100)}%`
              : 'N/A'}
          </p>
        </div>
      </div>

      <p className="text-sm leading-6 text-slate-700">
        {decisionReason || 'No se ha generado una razón ejecutiva.'}
      </p>

      {Array.isArray(redFlags) && redFlags.length > 0 && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-bold">Alertas para revisión jurídica</p>
          </div>

          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
            {redFlags.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MiniImpactCard({
  icon: Icon,
  title,
  value,
}: {
  icon: any;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-primary">
        <Icon className="h-5 w-5" />
        <h3 className="font-bold">{title}</h3>
      </div>

      <p className="line-clamp-5 text-sm leading-6 text-slate-600">{value}</p>
    </div>
  );
}

function SidePanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-primary">{title}</h2>
      {children}
    </div>
  );
}

function formatTopics(topics: any) {
  if (!topics) return '[]';

  try {
    if (Array.isArray(topics)) return topics.join(', ');

    const parsed = JSON.parse(topics);
    if (Array.isArray(parsed)) return parsed.join(', ');

    return String(topics);
  } catch {
    return String(topics);
  }
}