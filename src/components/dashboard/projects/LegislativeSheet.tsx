import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileWarning,
  Scale,
  ShieldAlert,
  Users,
} from 'lucide-react';

type LegislativeSheetProps = {
  sheet?: any;
};

export function LegislativeSheet({
  sheet,
}: LegislativeSheetProps) {
  if (!sheet) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>

          <h2 className="text-base font-bold uppercase tracking-wide text-primary">
            Ficha Legislativa Ejecutiva
          </h2>
        </div>

        {/* Empty */}
        <div className="p-6">
          <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
            <FileWarning className="mb-3 h-8 w-8 text-slate-400" />

            <p className="font-medium text-slate-600">
              No hay ficha legislativa generada
            </p>

            <p className="mt-1 text-sm text-slate-500">
              El proyecto aún no ha sido procesado por IA
            </p>
          </div>
        </div>
      </div>
    );
  }

  const confidence =
    typeof sheet.confidence === 'number'
      ? Math.round(sheet.confidence * 100)
      : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-base font-bold uppercase tracking-wide text-primary">
              Ficha Legislativa Ejecutiva
            </h2>

            <p className="text-xs text-slate-500">
              Resumen estratégico para toma de decisión legislativa
            </p>
          </div>
        </div>

        {confidence !== null && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
              Confianza IA
            </p>

            <p className="text-lg font-bold text-emerald-800">
              {confidence}%
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-8 p-6">
        {/* Resumen ejecutivo */}
        <Section
          title="Resumen ejecutivo"
          icon={BookOpen}
          content={sheet.executiveSummary}
        />

        {/* Objetivo */}
        <div className="grid gap-5 md:grid-cols-2">
          <CardSection
            title="Objeto del proyecto"
            content={sheet.projectPurpose}
          />

          <CardSection
            title="Problema identificado"
            content={sheet.mainProblem}
          />
        </div>

        {/* Solución */}
        <Section
          title="Solución propuesta"
          icon={CheckCircle2}
          content={sheet.proposedSolution}
        />

        {/* Impactos */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ImpactCard
            icon={Scale}
            title="Impacto jurídico"
            value={sheet.legalImpact}
          />

          <ImpactCard
            icon={FileWarning}
            title="Impacto fiscal"
            value={sheet.fiscalImpact}
          />

          <ImpactCard
            icon={Users}
            title="Impacto social"
            value={sheet.socialImpact}
          />

          <ImpactCard
            icon={ShieldAlert}
            title="Impacto político"
            value={sheet.politicalImpact}
          />
        </div>

        {/* Artículos clave */}
        <KeyArticles articles={sheet.keyArticles} />

        {/* Beneficios / riesgos */}
        <div className="grid gap-6 md:grid-cols-2">
          <ListSection
            title="Beneficios identificados"
            items={sheet.benefits}
            color="green"
          />

          <ListSection
            title="Riesgos identificados"
            items={sheet.risks}
            color="red"
          />
        </div>

        {/* Alertas */}
        <AlertSection alerts={sheet.redFlags} />

        {/* Argumentos */}
        <div className="grid gap-6 md:grid-cols-2">
          <ListSection
            title="Argumentos a favor"
            items={sheet.argumentsFor}
            color="blue"
          />

          <ListSection
            title="Argumentos en contra"
            items={sheet.argumentsAgainst}
            color="amber"
          />
        </div>

        {/* Actores afectados */}
        <ListSection
          title="Actores afectados"
          items={sheet.affectedActors}
          color="slate"
        />

        {/* Notas jurídicas */}
        <ListSection
          title="Notas jurídicas"
          items={sheet.lawyerNotes}
          color="purple"
        />

        {/* Nota congresista */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-blue-900">
            Nota estratégica para congresista
          </p>

          <p className="text-sm leading-7 text-blue-900">
            {sheet.congressmanSummary || 'No disponible'}
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  content,
  icon: Icon,
}: {
  title: string;
  content?: string;
  icon?: any;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-primary" />}

        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          {title}
        </h3>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
        <p className="text-sm leading-7 text-slate-700 md:text-base">
          {content || (
            <span className="italic text-slate-400">
              No identificado
            </span>
          )}
        </p>
      </div>
    </section>
  );
}

function CardSection({
  title,
  content,
}: {
  title: string;
  content?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
        {title}
      </h3>

      <p className="text-sm leading-7 text-slate-700">
        {content || (
          <span className="italic text-slate-400">
            No identificado
          </span>
        )}
      </p>
    </div>
  );
}

function ImpactCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value?: string;
  icon?: any;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-primary" />}

        <h3 className="text-sm font-bold text-primary">
          {title}
        </h3>
      </div>

      <p className="text-sm leading-6 text-slate-700">
        {value || (
          <span className="italic text-slate-400">
            No identificado
          </span>
        )}
      </p>
    </div>
  );
}

function ListSection({
  title,
  items,
  color = 'slate',
}: {
  title: string;
  items?: string[];
  color?: string;
}) {
  const parsedItems = Array.isArray(items)
    ? items
    : [];

  const colorClasses = {
    green: 'bg-emerald-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    slate: 'bg-slate-500',
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
        {title}
      </h3>

      {parsedItems.length ? (
        <ul className="space-y-3">
          {parsedItems.map((item, index) => (
            <li
              key={index}
              className="flex items-start gap-3 text-sm leading-6 text-slate-700"
            >
              <div
                className={`mt-2 h-2 w-2 rounded-full ${
                  colorClasses[color as keyof typeof colorClasses]
                }`}
              />

              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="italic text-slate-400">
          No identificado
        </p>
      )}
    </div>
  );
}

function AlertSection({
  alerts,
}: {
  alerts?: string[];
}) {
  const parsedAlerts = Array.isArray(alerts)
    ? alerts
    : [];

  if (!parsedAlerts.length) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-700" />

        <h3 className="text-sm font-bold uppercase tracking-wide text-amber-800">
          Alertas jurídicas y políticas
        </h3>
      </div>

      <ul className="space-y-3">
        {parsedAlerts.map((alert, index) => (
          <li
            key={index}
            className="flex items-start gap-3 text-sm leading-6 text-amber-900"
          >
            <div className="mt-2 h-2 w-2 rounded-full bg-amber-500" />

            <span>{alert}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function KeyArticles({
  articles,
}: {
  articles?: any[];
}) {
  const parsedArticles = Array.isArray(articles)
    ? articles
    : [];

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
        Artículos clave
      </h3>

      {parsedArticles.length ? (
        <div className="space-y-4">
          {parsedArticles.map((article, index) => (
            <div
              key={index}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-bold text-primary">
                  {article.article || `Artículo ${index + 1}`}
                </p>

                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                    article.importance === 'alta'
                      ? 'bg-red-100 text-red-700'
                      : article.importance === 'media'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {article.importance || 'media'}
                </span>
              </div>

              <p className="text-sm leading-6 text-slate-700">
                {article.summary || 'Sin resumen'}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="italic text-slate-400">
          No se identificaron artículos clave
        </p>
      )}
    </div>
  );
}