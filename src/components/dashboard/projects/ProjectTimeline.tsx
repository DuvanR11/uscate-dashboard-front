import { CheckCircle2, Circle, Clock, Landmark } from 'lucide-react';

const stages = [
  {
    label: 'Radicado',
    keywords: [
      'radicado',
      'radicacion',
      'radicación',
      'presentado',
      'proyecto radicado',
    ],
  },
  {
    label: 'Primer debate',
    keywords: [
      'primer debate',
      '1er debate',
      'primer-debate',
      '1er-debate',
      'comision',
      'comisión',
      'pendiente primer debate',
      'aprobado primer debate',
    ],
  },
  {
    label: 'Segundo debate',
    keywords: [
      'segundo debate',
      '2do debate',
      'segundo-debate',
      '2do-debate',
      'plenaria',
      'pendiente segundo debate',
      'aprobado segundo debate',
    ],
  },
  {
    label: 'Conciliación',
    keywords: [
      'conciliacion',
      'conciliación',
      'informe de conciliacion',
      'informe de conciliación',
    ],
  },
  {
    label: 'Sanción presidencial',
    keywords: [
      'sancion',
      'sanción',
      'sancionada',
      'ley sancionada',
      'presidencial',
      'promulgada',
    ],
  },
];

function normalize(value?: string | null) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function getCurrentStageIndex(currentStage?: string | null) {
  const value = normalize(currentStage);

  if (!value) return -1;

  const exactIndex = stages.findIndex((stage) =>
    stage.keywords.some((keyword) => value.includes(normalize(keyword))),
  );

  if (exactIndex >= 0) return exactIndex;

  if (value.includes('archivado') || value.includes('retirado')) return 0;
  if (value.includes('transito') || value.includes('tramite')) return 0;
  if (value.includes('ley')) return 4;

  return -1;
}

export function ProjectTimeline({
  currentStage,
}: {
  currentStage?: string | null;
}) {
  const currentIndex = getCurrentStageIndex(currentStage);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Landmark className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-base font-bold uppercase tracking-wide text-primary">
            Trazabilidad legislativa
          </h2>
          <p className="text-xs text-slate-500">
            Estado inferido según el estado oficial del proyecto
          </p>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Estado actual
          </p>
          <p className="mt-1 text-sm font-semibold text-primary">
            {currentStage || 'Sin estado'}
          </p>
        </div>

        <div className="space-y-0">
          {stages.map((stage, index) => {
            const completed = currentIndex > index;
            const active = currentIndex === index;
            const pending = currentIndex < index;

            return (
              <div key={stage.label} className="relative flex gap-4 pb-6 last:pb-0">
                {index !== stages.length - 1 && (
                  <div
                    className={`absolute left-[11px] top-7 h-full w-0.5 ${
                      completed ? 'bg-emerald-300' : 'bg-slate-200'
                    }`}
                  />
                )}

                <div
                  className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border ${
                    active
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : completed
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-300 bg-white text-slate-400'
                  }`}
                >
                  {completed ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : active ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </div>

                <div>
                  <p
                    className={`text-sm font-bold ${
                      active
                        ? 'text-blue-800'
                        : completed
                          ? 'text-emerald-800'
                          : 'text-slate-500'
                    }`}
                  >
                    {stage.label}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {active
                      ? 'Etapa actual'
                      : completed
                        ? 'Etapa superada'
                        : pending
                          ? 'Pendiente'
                          : 'Sin información'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {currentIndex === -1 && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">
              No fue posible identificar automáticamente la etapa legislativa.
              Revisa el estado oficial del proyecto.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}