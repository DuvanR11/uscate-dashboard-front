'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCheck, ChevronLeft, ChevronRight, HelpCircle, Loader2, Newspaper, Plus, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/shared/can';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NewsCard, type NewsCardPermissions } from '@/components/dashboard/monitoring/news-card';
import { MyAlertsDialog } from '@/components/dashboard/monitoring/my-alerts-dialog';
import { usePermission } from '@/hooks/use-permission';
import { useAuthStore } from '@/store/auth-store';
import { keywordsApi } from '@/lib/api/monitoring';
import {
  newsInboxApi,
  type InboxNews,
  type InboxPeriod,
  type InboxResponse,
  type InboxSentiment,
  type InboxView,
  type ReviewChange,
} from '@/lib/api/news-inbox';

/**
 * `/inteligencia/hoy` — bandeja de Monitoreo de medios (Fase 1 del plan del
 * 2026-11-08): una lista de noticias para todas las etiquetas, la más
 * importante primero, con lo que el equipo hizo con cada una. Entrada del
 * módulo (D3). Gateada por `MONITOREO_PREDICTIVO` canRead: revisar, destacar,
 * asignar o descartar no cambia lo que se busca, así que también lo hace
 * quien solo lee; excluir un término sí exige canWrite.
 */
export default function NewsInboxPage() {
  return (
    <Can
      module="MONITOREO_PREDICTIVO"
      action="canRead"
      fallback={<div className="p-12 text-center text-slate-500">No tienes permisos para ver el monitoreo de medios.</div>}
    >
      <Suspense fallback={<Spinner />}>
        <NewsInbox />
      </Suspense>
    </Can>
  );
}

const ALL = '__all__';

const PERIODS: { key: InboxPeriod; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
];

const VIEWS: { key: InboxView; label: string; count: keyof InboxResponse['counts'] }[] = [
  { key: 'open', label: 'Por revisar', count: 'unseen' },
  { key: 'starred', label: 'Destacadas', count: 'starred' },
  { key: 'mine', label: 'Asignadas a mí', count: 'mine' },
  { key: 'dismissed', label: 'Descartadas', count: 'dismissed' },
];

const SENTIMENTS: { key: InboxSentiment; label: string }[] = [
  { key: 'NEGATIVO', label: 'Negativo' },
  { key: 'NEUTRAL', label: 'Neutral' },
  { key: 'POSITIVO', label: 'Positivo' },
  { key: 'NONE', label: 'Sin clasificar' },
];

const PAGE_SIZE = 20;

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );
}

function NewsInbox() {
  const searchParams = useSearchParams();
  const press = useAuthStore((s) => s.user?.organizationUsage === 'PRESS');
  const canWrite = usePermission('MONITOREO_PREDICTIVO', 'canWrite');
  const can: NewsCardPermissions = {
    request: usePermission('SOLICITUDES_INTERNAS', 'canWrite'),
    osintCase: usePermission('OSINT_CASOS', 'canWrite'),
    petition: usePermission('PETICIONES', 'canWrite'),
  };

  const initialView = VIEWS.some((v) => v.key === searchParams.get('vista'))
    ? (searchParams.get('vista') as InboxView)
    : 'open';
  // El correo de pico enlaza con `?periodo=today&etiqueta=<id>`.
  const initialPeriod = PERIODS.some((p) => p.key === searchParams.get('periodo'))
    ? (searchParams.get('periodo') as InboxPeriod)
    : 'today';
  const [view, setView] = useState<InboxView>(initialView);
  const [period, setPeriod] = useState<InboxPeriod>(initialPeriod);
  const [keywordId, setKeywordId] = useState<string>(searchParams.get('etiqueta') || ALL);
  const [sentiment, setSentiment] = useState<string>(ALL);
  const [outlet, setOutlet] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<InboxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [assignees, setAssignees] = useState<{ id: string; fullName: string }[]>([]);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const data = await newsInboxApi.list({
          period,
          view,
          page,
          limit: PAGE_SIZE,
          keywordId: keywordId === ALL ? undefined : keywordId,
          sentiment: sentiment === ALL ? undefined : (sentiment as InboxSentiment),
          outlet: outlet === ALL ? undefined : outlet,
        });
        setResult(data);
        setFailed(false);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [period, view, page, keywordId, sentiment, outlet],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    newsInboxApi
      .assignees()
      .then(setAssignees)
      .catch(() => setAssignees([]));
  }, []);

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const applyChange = async (item: InboxNews, change: ReviewChange) => {
    try {
      const { review, suggestion } = await newsInboxApi.review(item.newsKey, change);
      setResult((prev) =>
        prev ? { ...prev, data: prev.data.map((n) => (n.newsKey === item.newsKey ? { ...n, review } : n)) } : prev,
      );
      if (change.dismissed === true) {
        toast('Noticia descartada', {
          action: { label: 'Deshacer', onClick: () => void applyChange({ ...item, review }, { dismissed: false }) },
        });
      }
      if (suggestion && canWrite) {
        toast(`Descartaste ${suggestion.count} noticias de «${suggestion.keywordName}» que dicen «${suggestion.term}».`, {
          description: `¿Dejar de traer las que lo mencionen?`,
          duration: 12000,
          action: {
            label: `Excluir «${suggestion.term}»`,
            onClick: async () => {
              try {
                await keywordsApi.addAlias(suggestion.keywordId, { term: suggestion.term, kind: 'EXCLUDE' });
                toast.success(`Listo: «${suggestion.keywordName}» ya no traerá noticias con «${suggestion.term}».`);
              } catch {
                toast.error('No se pudo agregar la exclusión. Hazlo desde Configuración.');
              }
            },
          },
        });
      }
      if (change.dismissed !== undefined || change.starred !== undefined || change.assignedToId !== undefined) {
        void load(true);
      }
    } catch {
      toast.error('No se pudo guardar el cambio. Intenta de nuevo.');
    }
  };

  const markAllSeen = async () => {
    const keys = (result?.data ?? []).filter((n) => !n.review.seen).map((n) => n.newsKey);
    if (keys.length === 0) return;
    try {
      await newsInboxApi.markSeen(keys);
      await load(true);
    } catch {
      toast.error('No se pudieron marcar como vistas.');
    }
  };

  const unseenOnPage = useMemo(() => (result?.data ?? []).filter((n) => !n.review.seen).length, [result]);
  const filtered = keywordId !== ALL || sentiment !== ALL || outlet !== ALL;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-4 md:px-6 md:py-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-foreground md:text-3xl">
            <Newspaper className="text-secondary" /> Monitoreo de medios
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Lo que los medios publican sobre tus etiquetas, una noticia por nota, la más importante primero.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MyAlertsDialog press={press} />
          {canWrite && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/inteligencia/ingesta">
                  <Plus className="mr-1 h-4 w-4" /> Agregar noticia
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/inteligencia/monitoreo/configuracion">
                  <Settings2 className="mr-1 h-4 w-4" /> Configurar
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Vistas */}
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" role="tablist">
        {VIEWS.map((v) => {
          const count = result?.counts[v.count] ?? 0;
          const active = view === v.key;
          return (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => resetPage(setView)(v.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                active ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {v.label}
              {count > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 text-xs ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-700'}`}>
                  {count}
                  {v.key === 'open' && <span className="sr-only"> sin ver</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="mt-3 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
        <div className="col-span-2 flex rounded-lg border border-slate-200 bg-white p-0.5 md:col-span-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => resetPage(setPeriod)(p.key)}
              aria-pressed={period === p.key}
              className={`flex-1 rounded-md px-3 py-1 text-sm md:flex-none ${
                period === p.key ? 'bg-slate-900 font-semibold text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Select value={keywordId} onValueChange={resetPage(setKeywordId)}>
          <SelectTrigger className="h-9 bg-white md:w-44" aria-label="Etiqueta">
            <SelectValue placeholder="Etiqueta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las etiquetas</SelectItem>
            {result?.facets.keywords.map((k) => (
              <SelectItem key={k.id} value={k.id}>
                {k.name} ({k.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sentiment} onValueChange={resetPage(setSentiment)}>
          <SelectTrigger className="h-9 bg-white md:w-40" aria-label="Sentimiento">
            <SelectValue placeholder="Sentimiento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todo sentimiento</SelectItem>
            {SENTIMENTS.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label} ({result?.facets.sentiments[s.key] ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={outlet} onValueChange={resetPage(setOutlet)}>
          <SelectTrigger className="col-span-2 h-9 bg-white md:col-span-1 md:w-48" aria-label="Medio">
            <SelectValue placeholder="Medio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los medios</SelectItem>
            {result?.facets.outlets.map((o) => (
              <SelectItem key={o.name} value={o.name}>
                {o.name} ({o.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="col-span-2 flex items-center gap-1 md:ml-auto">
          {filtered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setKeywordId(ALL);
                setSentiment(ALL);
                setOutlet(ALL);
                setPage(1);
              }}
            >
              Quitar filtros
            </Button>
          )}
          <UrgencyScale press={press} />
        </div>
      </div>

      {/* Lista */}
      <div className="mt-4 space-y-3">
        {loading && !result && <Spinner />}
        {failed && !loading && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            No se pudieron cargar las noticias.{' '}
            <button type="button" className="font-semibold underline" onClick={() => void load()}>
              Reintentar
            </button>
          </div>
        )}
        {result && !result.hasKeywords && <FirstMonitoring canWrite={canWrite} />}
        {result && result.hasKeywords && result.data.length === 0 && (
          <EmptyList
            view={view}
            period={period}
            filtered={filtered}
            onWiden={() => resetPage(setPeriod)(period === 'today' ? '7d' : '30d')}
          />
        )}
        {result && result.data.length > 0 && (
          <>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {result.total === 1 ? '1 noticia' : `${result.total} noticias`}
                {loading && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
              </span>
              {unseenOnPage > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllSeen} className="h-7 text-slate-600">
                  <CheckCheck className="mr-1 h-4 w-4" /> Marcar todas como vistas
                </Button>
              )}
            </div>
            {result.data.map((item) => (
              <NewsCard
                key={item.newsKey}
                item={item}
                press={press}
                assignees={assignees}
                can={can}
                onChange={applyChange}
              />
            ))}
            {result.truncated && (
              <p className="text-center text-xs text-slate-500">
                Hay más noticias de las que caben en este periodo: elige uno más corto o filtra por etiqueta.
              </p>
            )}
            {result.pageCount > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <span className="text-sm text-slate-600">
                  Página {result.page} de {result.pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= result.pageCount}
                  onClick={() => setPage(page + 1)}
                >
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UrgencyScale({ press }: { press: boolean }) {
  const name = press ? 'relevancia noticiosa' : 'urgencia';
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-slate-600">
          <HelpCircle className="mr-1 h-4 w-4" /> ¿Cómo se ordena?
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 text-sm">
        <p className="font-semibold text-slate-800">La {name}, de 0 a 10</p>
        <p className="mt-1 text-slate-600">
          {press
            ? 'La estima la IA al leer cada nota: qué tanto es noticia para tu medio (hechos nuevos, cifras, fuentes oficiales, alcance).'
            : 'La estima la IA al leer cada nota: qué tanto puede afectar a tu campaña o a tu despacho y qué tan rápido conviene responder.'}
        </p>
        <ul className="mt-2 space-y-1 text-slate-700">
          <li>
            <span className="font-semibold">0 a 3 · Informativa:</span> para estar al tanto.
          </li>
          <li>
            <span className="font-semibold">4 a 7 · Atención:</span> conviene leerla hoy.
          </li>
          <li>
            <span className="font-semibold text-red-700">8 a 10 · Crítica:</span>{' '}
            {press ? 'merece cobertura ya.' : 'requiere respuesta.'}
          </li>
        </ul>
        <p className="mt-2 text-slate-600">
          <span className="font-semibold">Correo de alerta:</span> depende de la prioridad de la etiqueta. Alta avisa
          desde 6, Media desde 8 y Baja solo con 9 o más. Cada persona puede cambiarlo en «Mis avisos».
        </p>
        <p className="mt-2 text-xs text-slate-500">
          La lista pone primero lo más alto en {name} y, entre parecidas, lo más reciente. Después de 3 días una
          noticia pasa al archivo.
        </p>
      </PopoverContent>
    </Popover>
  );
}

function FirstMonitoring({ canWrite }: { canWrite: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <Newspaper className="mx-auto h-10 w-10 text-slate-300" />
      <h2 className="mt-3 text-lg font-semibold text-slate-800">Configura tu primer monitoreo</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        Escribe los nombres, temas o lugares que quieres seguir (por ejemplo, tu nombre y el de tus rivales). Zyron
        revisa los medios cada hora y te muestra aquí lo que encuentre.
      </p>
      {canWrite ? (
        <Button asChild className="mt-4">
          <Link href="/inteligencia/monitoreo/configuracion">Crear la primera etiqueta</Link>
        </Button>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Pídele a quien administra tu equipo que cree las etiquetas.</p>
      )}
    </div>
  );
}

function EmptyList({
  view,
  period,
  filtered,
  onWiden,
}: {
  view: InboxView;
  period: InboxPeriod;
  filtered: boolean;
  onWiden: () => void;
}) {
  const message =
    view === 'open'
      ? period === 'today'
        ? 'Hoy no han llegado noticias nuevas, o ya las revisaste todas.'
        : 'No hay noticias por revisar en este periodo.'
      : view === 'starred'
        ? 'No hay noticias destacadas en este periodo.'
        : view === 'mine'
          ? 'No tienes noticias asignadas en este periodo.'
          : view === 'dismissed'
            ? 'No has descartado noticias en este periodo.'
            : 'No hay noticias en este periodo.';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
      <p>{message}</p>
      {filtered && <p className="mt-1">Prueba quitando los filtros.</p>}
      {period !== '30d' && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onWiden}>
          Ver {period === 'today' ? 'los últimos 7 días' : 'los últimos 30 días'}
        </Button>
      )}
    </div>
  );
}
