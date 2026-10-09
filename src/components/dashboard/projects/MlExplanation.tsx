import {
  BrainCircuit,
  Cpu,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

type MlExplanationProps = {
  reasoning?: string;
};

// Deuda técnica menor (2026-09-17) — forma real del JSON que
// `MlExplainerService` serializa en `VoteRecommendation.reasoning`,
// verificada contra el uso ya existente en este mismo archivo.
interface MlFactor {
  feature?: string;
  weight?: number | string;
  contribution?: number | string;
}

interface ParsedReasoning {
  text?: string;
  /**
   * De qué sale la recomendación: `RULES` = solo reglas técnicas (la persona
   * todavía no ha registrado votos reales); `RULES_AND_MODEL` = reglas más lo
   * aprendido de sus votos. Ausente en recomendaciones anteriores al 2026-10-08.
   */
  basis?: 'RULES' | 'RULES_AND_MODEL';
  mlExplanation?: {
    topPositive?: MlFactor[];
    topNegative?: MlFactor[];
  };
}

export function MlExplanation({
  reasoning,
}: MlExplanationProps) {
  if (!reasoning) return null;

  let parsed: ParsedReasoning | null = null;

  try {
    parsed = JSON.parse(reasoning);
  } catch {
    // Fallback texto plano
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="rounded-lg bg-ai/10 p-2 text-ai">
            <Cpu className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-base font-bold uppercase tracking-wide text-foreground">
              Explicación del modelo IA
            </h2>

            <p className="text-xs text-slate-500">
              Interpretación automática del análisis legislativo
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-sm leading-7 text-slate-700 md:text-base">
              {reasoning}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const explanation = parsed?.mlExplanation || {};
  const personalized = parsed?.basis === 'RULES_AND_MODEL';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
        <div className="rounded-lg bg-ai/10 p-2 text-ai">
          <BrainCircuit className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-base font-bold uppercase tracking-wide text-foreground">
            Explicación del modelo IA
          </h2>

          <p className="text-xs text-slate-500">
            Factores que influyeron en la recomendación legislativa
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-8 p-6">
        {/* De qué sale la recomendación: no presentar reglas generales como
            si fueran la postura de la persona. */}
        <div
          className={
            personalized
              ? 'rounded-xl border border-ai/20 bg-ai/5 p-4 text-sm text-slate-700'
              : 'rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900'
          }
        >
          {personalized ? (
            <p>
              <strong>Recomendación personalizada.</strong> Combina las reglas técnicas con lo aprendido de los votos
              reales que has registrado.
            </p>
          ) : (
            <p>
              <strong>Lectura técnica preliminar.</strong> Sale de reglas generales (impacto, riesgos y señales de la
              ficha), no de tu postura: todavía no hay votos tuyos registrados. Registra tu voto real en los proyectos
              para que la recomendación aprenda de ti.
            </p>
          )}
        </div>

        {/* Explicación general */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />

            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Interpretación ejecutiva
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-sm leading-7 text-slate-700 md:text-base">
              {parsed?.text || (
                <span className="italic text-slate-400">
                  Sin explicación generada
                </span>
              )}
            </p>
          </div>
        </section>

        {/* Factores: son los pesos del modelo personal, así que solo tienen
            sentido cuando ese modelo ya aprendió de algún voto. */}
        {personalized && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Positivos */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
            <div className="mb-5 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-700" />

              <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-800">
                Factores a favor
              </h3>
            </div>

            {Array.isArray(explanation?.topPositive) &&
            explanation.topPositive.length ? (
              <div className="space-y-4">
                {explanation.topPositive.map(
                  (item: MlFactor, index: number) => (
                    <div
                      key={`${item.feature}-${index}`}
                      className="rounded-xl border border-emerald-100 bg-white p-4"
                    >
                      <p className="text-sm font-bold text-emerald-900">
                        {item.feature}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <MetricBadge
                          label="Peso"
                          value={safeNumber(item.weight)}
                          color="green"
                        />

                        <MetricBadge
                          label="Contribución"
                          value={safeNumber(item.contribution)}
                          color="green"
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <EmptyMessage text="No se registraron factores positivos relevantes." />
            )}
          </div>

          {/* Negativos */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5">
            <div className="mb-5 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-rose-700" />

              <h3 className="text-sm font-bold uppercase tracking-wide text-rose-800">
                Factores en contra
              </h3>
            </div>

            {Array.isArray(explanation?.topNegative) &&
            explanation.topNegative.length ? (
              <div className="space-y-4">
                {explanation.topNegative.map(
                  (item: MlFactor, index: number) => (
                    <div
                      key={`${item.feature}-${index}`}
                      className="rounded-xl border border-rose-100 bg-white p-4"
                    >
                      <p className="text-sm font-bold text-rose-900">
                        {item.feature}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <MetricBadge
                          label="Peso"
                          value={safeNumber(item.weight)}
                          color="red"
                        />

                        <MetricBadge
                          label="Contribución"
                          value={safeNumber(item.contribution)}
                          color="red"
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <EmptyMessage text="No se registraron factores negativos relevantes." />
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function MetricBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: 'green' | 'red';
}) {
  const styles = {
    green:
      'border border-emerald-200 bg-emerald-100 text-emerald-800',
    red:
      'border border-rose-200 bg-rose-100 text-rose-800',
  };

  return (
    <span
      className={`rounded-lg px-3 py-1 text-xs font-semibold ${styles[color]}`}
    >
      {label}: {value}
    </span>
  );
}

function EmptyMessage({
  text,
}: {
  text: string;
}) {
  return (
    <p className="text-sm italic text-slate-500">
      {text}
    </p>
  );
}

function safeNumber(value: unknown) {
  const number = Number(value);

  if (Number.isNaN(number)) return '0.00';

  return number.toFixed(2);
}