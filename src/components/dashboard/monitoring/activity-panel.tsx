'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  MapPin,
  Minus,
  Newspaper,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  monitoringAnalyticsApi,
  sourcesApi,
  KeywordActivityOverviewItem,
  KeywordActivitySummary,
  TerritoryActivity,
  MentionListItem,
  MonitoringActivitySnapshot,
  MonitoringSource,
  ActivityTrend,
} from '@/lib/api/monitoring';
import { useBrandColors } from '@/hooks/use-brand-colors';

const MENTIONS_PAGE_SIZE = 20;

const HOURS_OPTIONS = [
  { value: 6, label: '6 horas' },
  { value: 24, label: '24 horas' },
  { value: 72, label: '3 días' },
  { value: 168, label: '7 días' },
];

interface ActivityPanelProps {
  keywordId: string | null;
  hours: number;
  onSelectKeyword: (id: string | null) => void;
  onHoursChange: (hours: number) => void;
  onTerritoriesLoaded?: (territories: TerritoryActivity[]) => void;
  onKeywordNameChange?: (name: string | null) => void;
}

function TrendBadge({ trend }: { trend: ActivityTrend }) {
  if (trend === 'UP') {
    return (
      <Badge variant="outline" className="text-[10px] uppercase text-green-700 border-green-300 bg-green-50">
        <TrendingUp className="h-3 w-3 mr-1" /> Subiendo
      </Badge>
    );
  }
  if (trend === 'DOWN') {
    return (
      <Badge variant="outline" className="text-[10px] uppercase text-red-700 border-red-300 bg-red-50">
        <TrendingDown className="h-3 w-3 mr-1" /> Bajando
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] uppercase text-slate-500">
      <Minus className="h-3 w-3 mr-1" /> Estable
    </Badge>
  );
}

/**
 * Panel del analista (canRead — nivel más bajo, ver decisión #14 del
 * informe "Monitoreo Predictivo") — consume solo los 5 endpoints de solo
 * lectura de la Fase 9 (`monitoringAnalyticsApi`), nunca dispara
 * clasificación/IA/scraping. Sin keyword seleccionada muestra el ranking
 * general (`overview`); al seleccionar una, hace drill-down con actividad,
 * tendencia, territorios y noticias recientes.
 */
export function ActivityPanel({
  keywordId,
  hours,
  onSelectKeyword,
  onHoursChange,
  onTerritoriesLoaded,
  onKeywordNameChange,
}: ActivityPanelProps) {
  const COLORS = useBrandColors();
  const [overview, setOverview] = useState<KeywordActivityOverviewItem[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const [summary, setSummary] = useState<KeywordActivitySummary | null>(null);
  const [snapshots, setSnapshots] = useState<MonitoringActivitySnapshot[]>([]);
  const [territories, setTerritories] = useState<TerritoryActivity[]>([]);
  const [mentions, setMentions] = useState<MentionListItem[]>([]);
  const [mentionsTotal, setMentionsTotal] = useState(0);
  const [mentionsPage, setMentionsPage] = useState(1);
  const [loadingDrilldown, setLoadingDrilldown] = useState(false);

  const [sources, setSources] = useState<MonitoringSource[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const data = await monitoringAnalyticsApi.getOverview();
      setOverview(data);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar la actividad de las etiquetas');
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    sourcesApi.list().then(setSources).catch(() => {});
  }, [loadOverview]);

  const loadDrilldown = useCallback(
    async (id: string, page: number) => {
      setLoadingDrilldown(true);
      try {
        const [summaryRes, snapshotsRes, territoriesRes, mentionsRes] = await Promise.all([
          monitoringAnalyticsApi.getKeywordActivity(id, hours),
          monitoringAnalyticsApi.getSnapshots(id, hours),
          monitoringAnalyticsApi.getTopTerritories(id, hours, 15),
          monitoringAnalyticsApi.getRecentMentions(id, hours, page, MENTIONS_PAGE_SIZE),
        ]);
        setSummary(summaryRes);
        setSnapshots(snapshotsRes);
        setTerritories(territoriesRes);
        setMentions(mentionsRes.data);
        setMentionsTotal(mentionsRes.total);
        onTerritoriesLoaded?.(territoriesRes);
        onKeywordNameChange?.(summaryRes.keywordName);
      } catch (error) {
        console.error(error);
        toast.error('No se pudo cargar el detalle de la etiqueta');
      } finally {
        setLoadingDrilldown(false);
      }
    },
    [hours, onTerritoriesLoaded, onKeywordNameChange],
  );

  useEffect(() => {
    if (!keywordId) {
      setSummary(null);
      setSnapshots([]);
      setTerritories([]);
      setMentions([]);
      onTerritoriesLoaded?.([]);
      onKeywordNameChange?.(null);
      return;
    }
    setMentionsPage(1);
    loadDrilldown(keywordId, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywordId, hours]);

  useEffect(() => {
    if (keywordId && mentionsPage > 1) {
      loadDrilldown(keywordId, mentionsPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentionsPage]);

  const chartData = snapshots.map((s) => ({
    time: new Date(s.windowStart).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit' }),
    score: s.activityScore,
  }));

  const visibleMentions =
    sourceFilter === 'all' ? mentions : mentions.filter((m) => m.sourceId === sourceFilter);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Filtros: etiqueta + ventana de tiempo */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Select value={keywordId ?? 'all'} onValueChange={(v) => onSelectKeyword(v === 'all' ? null : v)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Todas las etiquetas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las etiquetas</SelectItem>
            {overview.map((k) => (
              <SelectItem key={k.keywordId} value={k.keywordId}>
                {k.keywordName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(hours)} onValueChange={(v) => onHoursChange(Number(v))}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOURS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3">
        {!keywordId ? (
          // --- OVERVIEW: ranking de todas las etiquetas activas ---
          loadingOverview ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando actividad...
            </div>
          ) : overview.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Sin etiquetas activas o sin actividad reciente todavía.
            </p>
          ) : (
            overview.map((item) => (
              <button
                key={item.keywordId}
                onClick={() => onSelectKeyword(item.keywordId)}
                className="w-full text-left rounded-lg border bg-white p-3 hover:border-secondary hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-primary">{item.keywordName}</span>
                  <TrendBadge trend={item.trend} />
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span>
                    <strong className="text-primary">{item.mentionCount}</strong> menciones (última hora)
                  </span>
                  <span>
                    <strong className="text-primary">{item.sourceCount}</strong> fuentes
                  </span>
                  <span className="ml-auto font-mono font-bold text-primary">
                    {item.activityScore.toFixed(1)}/10
                  </span>
                </div>
              </button>
            ))
          )
        ) : (
          // --- DRILL-DOWN de una etiqueta ---
          <div className="space-y-3">
            <Button variant="ghost" size="sm" className="-ml-2" onClick={() => onSelectKeyword(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver al ranking
            </Button>

            {loadingDrilldown && !summary ? (
              <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
              </div>
            ) : summary ? (
              <>
                <Card className="border-t-4 border-t-primary">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-primary">{summary.keywordName}</CardTitle>
                      {summary.latestSnapshot && <TrendBadge trend={summary.latestSnapshot.trend} />}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-2xl font-black text-primary">{summary.mentionCount}</p>
                        <p className="text-[11px] text-slate-500">
                          menciones ({HOURS_OPTIONS.find((o) => o.value === hours)?.label})
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-2xl font-black ${
                            summary.variationPct === null
                              ? 'text-slate-400'
                              : summary.variationPct > 0
                                ? 'text-green-600'
                                : summary.variationPct < 0
                                  ? 'text-red-600'
                                  : 'text-slate-400'
                          }`}
                        >
                          {summary.variationPct === null
                            ? '—'
                            : `${summary.variationPct > 0 ? '+' : ''}${summary.variationPct}%`}
                        </p>
                        <p className="text-[11px] text-slate-500">vs. período anterior</p>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-primary">
                          {summary.latestSnapshot?.activityScore.toFixed(1) ?? '—'}
                        </p>
                        <p className="text-[11px] text-slate-500">score de actividad</p>
                      </div>
                    </div>

                    {summary.latestSnapshot && summary.latestSnapshot.factors.length > 0 && (
                      <div className="border-t pt-2 space-y-1">
                        {summary.latestSnapshot.factors.map((f, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>{f.message}</span>
                            <span className="font-mono font-medium text-slate-700 shrink-0 ml-2">
                              +{f.score.toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {chartData.length > 1 && (
                  <Card>
                    <CardHeader className="pb-0">
                      <CardTitle className="text-sm text-primary">Tendencia del score</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[160px] pl-0 pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.6} />
                              <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                          <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} width={24} />
                          <Tooltip
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke={COLORS.primary}
                            strokeWidth={2}
                            fill="url(#scoreGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {territories.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-primary flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-secondary" /> Territorios con más actividad
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      {territories.map((t) => {
                        const max = territories[0].mentionCount || 1;
                        return (
                          <div key={t.locationName} className="flex items-center gap-2 text-xs">
                            <span className="w-28 truncate text-slate-600">{t.locationName}</span>
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.max(6, (t.mentionCount / max) * 100)}%` }}
                              />
                            </div>
                            <span className="font-mono font-medium text-slate-500 w-6 text-right">
                              {t.mentionCount}
                            </span>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-sm text-primary flex items-center gap-1.5">
                        <Newspaper className="h-4 w-4 text-secondary" /> Noticias ({mentionsTotal})
                      </CardTitle>
                      <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger className="h-7 w-[160px] text-xs">
                          <SelectValue placeholder="Todas las fuentes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las fuentes</SelectItem>
                          {sources.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {visibleMentions.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">Sin noticias en este filtro.</p>
                    ) : (
                      visibleMentions.map((m) => (
                        <a
                          key={m.id}
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-md border p-2.5 hover:border-secondary hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400">{m.sourceName}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(m.fetchedAt).toLocaleString('es-CO', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-primary leading-snug flex items-start gap-1">
                            {m.title}
                            <ExternalLink className="h-3 w-3 shrink-0 mt-1 text-slate-300" />
                          </p>
                          {m.locationNameRaw && (
                            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {m.locationNameRaw}
                            </p>
                          )}
                        </a>
                      ))
                    )}

                    {mentionsTotal > MENTIONS_PAGE_SIZE && (
                      <div className="flex items-center justify-between pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={mentionsPage <= 1 || loadingDrilldown}
                          onClick={() => setMentionsPage((p) => p - 1)}
                        >
                          Anterior
                        </Button>
                        <span className="text-xs text-slate-500">
                          Página {mentionsPage} de {Math.ceil(mentionsTotal / MENTIONS_PAGE_SIZE)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={mentionsPage >= Math.ceil(mentionsTotal / MENTIONS_PAGE_SIZE) || loadingDrilldown}
                          onClick={() => setMentionsPage((p) => p + 1)}
                        >
                          Siguiente
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}