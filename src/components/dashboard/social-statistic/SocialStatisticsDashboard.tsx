'use client';

import { FormEvent } from 'react';
import { useSocialExtractor } from '@/hooks/useSocialExtractor';

function formatMetricName(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizePercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), 100);
}

function getProgressColor(category: string): string {
  const normalizedCategory = category.toLowerCase();

  if (
    normalizedCategory.includes('positiv') ||
    normalizedCategory.includes('favorable')
  ) {
    return 'bg-emerald-600';
  }

  if (
    normalizedCategory.includes('negativ') ||
    normalizedCategory.includes('desfavorable')
  ) {
    return 'bg-red-600';
  }

  return 'bg-[#0091BE]';
}

export function SocialStatisticsDashboard() {
  const {
    publicationUrl,
    setPublicationUrl,
    loading,
    error,
    result,
    hasReport,
    executeExtraction,
    exportExcel,
    clearState,
  } = useSocialExtractor();

  const categorizationMetrics = result?.porcentajes_categorizacion
    ? Object.entries(result.porcentajes_categorizacion)
    : [];

  const hasMetrics = categorizationMetrics.length > 0;

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    await executeExtraction();
  };

  return (
    <section className="min-h-full bg-[#F5F7FA] p-4 text-[#3C4147] md:p-6">
      {/* Encabezado */}
      <header className="mb-6 flex items-start justify-between gap-6">
        <div>
          <span className="text-xs font-extrabold tracking-[1.2px] text-[#0091BE]">
            INTELIGENCIA DIGITAL
          </span>

          <h1 className="mt-2 text-2xl font-bold leading-tight text-[#021442] md:text-3xl">
            Estadísticas de publicaciones
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 md:text-[15px]">
            Extrae comentarios, analiza la percepción ciudadana y genera
            reportes de publicaciones en redes sociales.
          </p>
        </div>

        <div className="hidden h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#021442] text-white shadow-[0_8px_20px_rgba(2,20,66,0.18)] md:grid">
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 19V10M10 19V5M16 19V13M22 19H2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </header>

      {/* Formulario */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_18px_rgba(2,20,66,0.06)] md:p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#021442]">
            Analizar publicación
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Ingresa el enlace público de una publicación de Facebook o
            Instagram.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="publication-url"
            className="mb-2 block text-sm font-bold text-[#021442]"
          >
            Enlace de la publicación
          </label>

          <div className="relative">
            <span
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            >
              🔗
            </span>

            <input
              id="publication-url"
              type="url"
              placeholder="https://www.facebook.com/... o https://www.instagram.com/..."
              value={publicationUrl}
              onChange={(event) => setPublicationUrl(event.target.value)}
              disabled={loading}
              required
              className="h-12 w-full rounded-lg border border-[#ADBCC6] bg-white py-3 pl-12 pr-4 text-[15px] text-[#3C4147] outline-none transition placeholder:text-slate-400 focus:border-[#0091BE] focus:ring-4 focus:ring-[#0091BE]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0091BE] px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#007A9F] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-56"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  Procesando publicación...
                </>
              ) : (
                <>
                  <span aria-hidden="true">📊</span>
                  Iniciar análisis
                </>
              )}
            </button>

            {(result || error) && (
              <button
                type="button"
                onClick={clearState}
                disabled={loading}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-6 text-sm font-bold text-[#021442] transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                Limpiar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Carga */}
      {loading && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border-l-4 border-[#0091BE] bg-[#EAF7FB] p-5 text-[#021442]">
          <span className="mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#0091BE] border-r-transparent" />

          <div>
            <strong className="block text-sm font-bold">
              Extracción en proceso
            </strong>

            <p className="mt-1 text-sm leading-6">
              Estamos consultando la publicación, recorriendo sus comentarios
              y ejecutando el análisis semántico.
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-xl border-l-4 border-red-600 bg-red-50 p-5 text-red-800"
        >
          <span aria-hidden="true">⚠️</span>

          <div>
            <strong className="block text-sm font-bold">
              No fue posible completar el análisis
            </strong>

            <p className="mt-1 text-sm leading-6">{error}</p>
          </div>
        </div>
      )}

      {/* Resultados */}
      {result && (
        <div className="mt-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row">
            <div className="flex flex-1 items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-sm font-extrabold text-white">
                ✓
              </span>

              <div>
                <strong className="block text-sm font-bold">
                  Análisis completado
                </strong>

                <p className="mt-1 text-sm">
                  La publicación fue procesada correctamente.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={exportExcel}
              disabled={!hasReport}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#021442] px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#061D54] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span aria-hidden="true">↓</span>
              Descargar Excel
            </button>
          </div>

          {/* Resumen general */}
         <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <SummaryCard
                label="Total de registros analizados"
                value={result.total_registros?.toLocaleString('es-CO') ?? '0'}
            />

            <SummaryCard
                label="Categorías identificadas"
                value={categorizationMetrics.length.toLocaleString('es-CO')}
            />
        </div>

          {/* Análisis semántico */}
          {hasMetrics && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_18px_rgba(2,20,66,0.06)] md:p-6">
              <div className="mb-5">
                <span className="text-xs font-extrabold tracking-[1.2px] text-[#0091BE]">
                  ANÁLISIS SEMÁNTICO
                </span>

                <h2 className="mt-2 text-xl font-bold text-[#021442]">
                  Percepción de los comentarios
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {categorizationMetrics.map(
                  ([category, rawPercentage]) => {
                    const percentage = normalizePercentage(
                      Number(rawPercentage),
                    );

                    return (
                      <article
                        key={category}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <span className="text-sm font-bold text-slate-500">
                            {formatMetricName(category)}
                          </span>

                          <strong className="text-2xl font-extrabold text-[#021442]">
                            {percentage.toFixed(1)}%
                          </strong>
                        </div>

                        <div
                          role="progressbar"
                          aria-label={formatMetricName(category)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={percentage}
                          className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
                        >
                          <div
                            className={`h-full rounded-full transition-[width] duration-500 ${getProgressColor(
                              category,
                            )}`}
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </section>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_12px_rgba(2,20,66,0.05)]">
      <span className="mb-2 block text-sm font-semibold text-slate-500">
        {label}
      </span>

      <strong className="break-words text-2xl font-extrabold text-[#021442]">
        {value}
      </strong>
    </article>
  );
}