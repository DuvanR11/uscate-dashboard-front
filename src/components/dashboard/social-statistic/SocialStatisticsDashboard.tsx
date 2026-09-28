'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { extractErrorMessage } from '@/lib/api/platform';
import {
  analyzePublication,
  getSocialHistory,
  getSocialRecentPosts,
  getSocialSources,
} from '@/lib/api/social-stats';
import type {
  CommentCategory,
  SocialAnalysisHistoryItem,
  SocialAnalysisResult,
  SocialRecentPost,
  SocialSources,
} from '@/types/social-statistics.types';
import { CATEGORY_LABEL, PLATFORM_LABEL, downloadAnalysisExcel } from './social-stats-excel';

const CATEGORY_ORDER: CommentCategory[] = ['positivo', 'negativo', 'neutral', 'pregunta_o_solicitud'];

const CATEGORY_BAR: Record<CommentCategory, string> = {
  positivo: 'bg-emerald-600',
  negativo: 'bg-red-600',
  neutral: 'bg-slate-400',
  pregunta_o_solicitud: 'bg-[#0091BE]',
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

// Estadísticas de redes (2026-09-28): analiza los comentarios de una
// publicación con APIs oficiales — YouTube (cualquier video público) y
// Facebook/Instagram de las cuentas propias de la organización — y los
// clasifica con IA. Antes llamaba a un servicio externo que no existía.
export function SocialStatisticsDashboard() {
  const [sources, setSources] = useState<SocialSources | null>(null);
  const [recentPosts, setRecentPosts] = useState<SocialRecentPost[]>([]);
  const [history, setHistory] = useState<SocialAnalysisHistoryItem[]>([]);
  const [publicationUrl, setPublicationUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SocialAnalysisResult | null>(null);
  const [downloading, setDownloading] = useState(false);

  const loadHistory = useCallback(() => {
    getSocialHistory().then(setHistory).catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    getSocialSources()
      .then((data) => {
        setSources(data);
        if (data.meta.configured) {
          getSocialRecentPosts().then(setRecentPosts).catch(() => setRecentPosts([]));
        }
      })
      .catch(() => setSources(null));
    loadHistory();
  }, [loadHistory]);

  const runAnalysis = async (url: string) => {
    const normalized = url.trim();
    if (!normalized) {
      setError('Pega el enlace de la publicación.');
      return;
    }
    setPublicationUrl(normalized);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await analyzePublication(normalized));
      loadHistory();
    } catch (err) {
      setError(extractErrorMessage(err) ?? 'No fue posible analizar la publicación. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAnalysis(publicationUrl);
  };

  const handleDownload = async () => {
    if (!result) return;
    setDownloading(true);
    try {
      await downloadAnalysisExcel(result);
    } finally {
      setDownloading(false);
    }
  };

  const clearState = () => {
    setPublicationUrl('');
    setError(null);
    setResult(null);
  };

  return (
    <section className="min-h-full bg-[#F5F7FA] p-4 text-[#3C4147] md:p-6">
      <header className="mb-6">
        <span className="text-xs font-extrabold tracking-[1.2px] text-[#0091BE]">INTELIGENCIA DIGITAL</span>
        <h1 className="mt-2 text-2xl font-bold leading-tight text-[#021442] md:text-3xl">Estadísticas de publicaciones</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 md:text-[15px]">
          Analiza qué opina la gente en los comentarios de un video de YouTube o de las publicaciones de tu página de
          Facebook e Instagram.
        </p>
      </header>

      {/* Fuentes disponibles */}
      {sources && (
        <div className="mb-5 flex flex-wrap gap-2 text-xs font-semibold">
          <SourceChip
            ok={sources.youtube.available}
            label={sources.youtube.available ? 'YouTube: cualquier video público' : 'YouTube: no activado en la plataforma'}
          />
          <SourceChip
            ok={sources.meta.configured}
            label={
              sources.meta.configured
                ? `Facebook: ${sources.meta.pageName ?? 'página conectada'}`
                : 'Facebook: página no conectada (pídela a soporte)'
            }
          />
          {sources.meta.configured && (
            <SourceChip
              ok={Boolean(sources.meta.instagramUsername)}
              label={
                sources.meta.instagramUsername
                  ? `Instagram: @${sources.meta.instagramUsername}`
                  : 'Instagram: sin cuenta vinculada a la página'
              }
            />
          )}
        </div>
      )}

      {/* Formulario */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_18px_rgba(2,20,66,0.06)] md:p-6">
        <form onSubmit={handleSubmit}>
          <label htmlFor="publication-url" className="mb-2 block text-sm font-bold text-[#021442]">
            Enlace de la publicación
          </label>
          <input
            id="publication-url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=... o una publicación de tu página"
            value={publicationUrl}
            onChange={(event) => setPublicationUrl(event.target.value)}
            disabled={loading}
            required
            className="h-12 w-full rounded-lg border border-[#ADBCC6] bg-white px-4 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-[#0091BE] focus:ring-4 focus:ring-[#0091BE]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          <p className="mt-2 text-xs text-slate-500">
            De Facebook e Instagram solo se pueden analizar publicaciones de tus propias cuentas (así lo exige Meta). Se
            analizan hasta los 400 comentarios más relevantes.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#0091BE] px-6 text-sm font-bold text-white transition hover:bg-[#007A9F] disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-56"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  Analizando comentarios...
                </>
              ) : (
                'Analizar publicación'
              )}
            </button>
            {(result || error) && (
              <button
                type="button"
                onClick={clearState}
                disabled={loading}
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-6 text-sm font-bold text-[#021442] hover:bg-slate-50 disabled:opacity-60"
              >
                Limpiar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Publicaciones recientes de la página conectada */}
      {recentPosts.length > 0 && !result && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
          <h2 className="text-base font-bold text-[#021442]">Tus publicaciones recientes</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {recentPosts.slice(0, 10).map((post) => (
              <li key={post.url} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-[#021442]">{post.caption || 'Publicación sin texto'}</p>
                  <p className="text-xs text-slate-500">
                    {PLATFORM_LABEL[post.platform]} · {formatDate(post.publishedAt)} · {post.comments.toLocaleString('es-CO')} comentarios
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading || post.comments === 0}
                  onClick={() => runAnalysis(post.url)}
                  className="shrink-0 rounded-lg border border-[#0091BE] px-3 py-1.5 text-xs font-bold text-[#0091BE] hover:bg-[#EAF7FB] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Analizar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border-l-4 border-[#0091BE] bg-[#EAF7FB] p-5 text-[#021442]">
          <span className="mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#0091BE] border-r-transparent" />
          <p className="text-sm leading-6">
            Leyendo los comentarios y clasificándolos con inteligencia artificial. Puede tardar hasta un minuto.
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="mt-5 rounded-xl border-l-4 border-red-600 bg-red-50 p-5 text-red-800">
          <strong className="block text-sm font-bold">No fue posible completar el análisis</strong>
          <p className="mt-1 text-sm leading-6">{error}</p>
        </div>
      )}

      {result && <AnalysisResult result={result} downloading={downloading} onDownload={handleDownload} />}

      {/* Historial */}
      {history.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
          <h2 className="text-base font-bold text-[#021442]">Análisis anteriores</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="py-2 font-semibold">Fecha</th>
                  <th className="py-2 font-semibold">Publicación</th>
                  <th className="py-2 text-right font-semibold">Analizados</th>
                  <th className="py-2 text-right font-semibold">Positivo</th>
                  <th className="py-2 text-right font-semibold">Negativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 text-slate-500">{formatDate(item.createdAt)}</td>
                    <td className="max-w-[320px] truncate py-2">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[#021442] hover:underline">
                        {PLATFORM_LABEL[item.platform]} · {item.title || 'Publicación'}
                      </a>
                    </td>
                    <td className="py-2 text-right">{item.analyzedComments.toLocaleString('es-CO')}</td>
                    <td className="py-2 text-right text-emerald-700">{item.categories.positivo ?? 0}%</td>
                    <td className="py-2 text-right text-red-700">{item.categories.negativo ?? 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function AnalysisResult({
  result,
  downloading,
  onDownload,
}: {
  result: SocialAnalysisResult;
  downloading: boolean;
  onDownload: () => void;
}) {
  const { publication } = result;
  const empty = result.analyzedComments === 0;

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="min-w-0">
          <span className="text-xs font-extrabold tracking-[1.2px] text-[#0091BE]">
            {PLATFORM_LABEL[publication.platform].toUpperCase()}
          </span>
          <a
            href={publication.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block truncate text-lg font-bold text-[#021442] hover:underline"
          >
            {publication.title || 'Publicación'}
          </a>
          <p className="text-xs text-slate-500">
            {[publication.author, formatDate(publication.publishedAt)].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading || empty}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#021442] px-5 text-sm font-bold text-white hover:bg-[#061D54] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ? 'Preparando...' : 'Descargar Excel'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Comentarios en la publicación" value={result.totalComments.toLocaleString('es-CO')} />
        <SummaryCard label="Comentarios analizados" value={result.analyzedComments.toLocaleString('es-CO')} />
        <SummaryCard label="Clasificados por la IA" value={result.classifiedComments.toLocaleString('es-CO')} />
      </div>

      {empty ? (
        <p className="rounded-xl bg-white p-5 text-sm text-slate-500 ring-1 ring-slate-200">
          Esta publicación todavía no tiene comentarios para analizar.
        </p>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
            <span className="text-xs font-extrabold tracking-[1.2px] text-[#0091BE]">PERCEPCIÓN</span>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {CATEGORY_ORDER.map((category) => (
                <article key={category} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-slate-500">{CATEGORY_LABEL[category]}</span>
                    <strong className="text-2xl font-extrabold tabular-nums text-[#021442]">
                      {result.categories[category].toFixed(1)}%
                    </strong>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={CATEGORY_LABEL[category]}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={result.categories[category]}
                    className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
                  >
                    <div className={`h-full rounded-full ${CATEGORY_BAR[category]}`} style={{ width: `${result.categories[category]}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{result.counts[category].toLocaleString('es-CO')} comentarios</p>
                </article>
              ))}
            </div>
          </section>

          {(result.summary || result.themes.length > 0) && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
              <span className="text-xs font-extrabold tracking-[1.2px] text-[#0091BE]">DE QUÉ HABLA LA GENTE</span>
              {result.summary && <p className="mt-3 max-w-3xl text-sm leading-6 text-[#021442]">{result.summary}</p>}
              {result.themes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.themes.map((theme) => (
                    <span key={theme} className="rounded-full bg-[#EAF7FB] px-3 py-1 text-xs font-semibold text-[#021442]">
                      {theme}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {(['negativo', 'pregunta_o_solicitud', 'positivo'] as CommentCategory[]).map((category) => (
              <div key={category} className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-bold text-[#021442]">
                  {category === 'negativo'
                    ? 'Críticas con más “me gusta”'
                    : category === 'positivo'
                      ? 'Mensajes de apoyo con más “me gusta”'
                      : 'Preguntas y solicitudes'}
                </h3>
                {result.highlights[category].length === 0 ? (
                  <p className="mt-2 text-xs text-slate-400">Sin comentarios en esta categoría.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {result.highlights[category].map((comment, i) => (
                      <li key={i} className="text-sm leading-5">
                        <p className="text-[#3C4147]">“{comment.text.length > 220 ? `${comment.text.slice(0, 220)}…` : comment.text}”</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {comment.author ?? 'Anónimo'} · {comment.likes.toLocaleString('es-CO')} me gusta
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function SourceChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 ring-1 ${
        ok ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-slate-200'
      }`}
    >
      {label}
    </span>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <span className="mb-2 block text-sm font-semibold text-slate-500">{label}</span>
      <strong className="text-2xl font-extrabold tabular-nums text-[#021442]">{value}</strong>
    </article>
  );
}
