'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Radio,
  AlertTriangle,
  Search,
  Flag,
  Loader2,
  ShieldAlert,
  ExternalLink,
  Trophy,
  DoorOpen,
  Vote,
} from 'lucide-react';
import { getWarRoomOverview, type WarRoomOverview } from '@/lib/api/war-room';
import { useVisibleInterval } from '@/hooks/use-visible-interval';
import { VISIT_RESULT_LABEL, VISIT_RESULT_ORDER, VISIT_RESULT_TONE } from '@/lib/api/field-visits';

/**
 * Sala de Guerra unificada — Track B ("Diferenciación de mercado") de Ruta
 * 2027. Monitoreo Predictivo (menciones urgentes), OSINT (alertas de
 * casos) y Día D en vivo YA EXISTÍAN por separado, cada uno con su propia
 * pantalla — esta vista los fusiona en un solo lugar para el círculo
 * cercano del candidato. Sin estado propio: solo lee `GET
 * /war-room/overview`, que a su vez solo lee lo que cada módulo ya
 * calculaba. Poll cada 30s, mismo criterio que Día D en vivo (uno de los
 * 3 datos que fusiona ya es real-time por diseño).
 */
const POLL_INTERVAL_MS = 30_000;

const SENTIMENT_LABEL: Record<string, string> = {
  NEGATIVO: 'Negativo',
  NEUTRAL: 'Neutral',
  POSITIVO: 'Positivo',
};

// Fase 3 del análisis de punta a punta (2026-10-28, INT-22): cada mención
// muestra su fecha (la de la noticia o, si la fuente no la da, la de
// captura), en hora de Colombia.
const MENTION_DATE = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

function mentionDateLabel(mention: WarRoomOverview['urgentMentions'][number]): string {
  const date = new Date(mention.publishedAt ?? mention.createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return `${mention.publishedAt ? 'Publicada' : 'Detectada'} el ${MENTION_DATE.format(date)}`;
}

export default function SalaDeGuerraPage() {
  const [data, setData] = useState<WarRoomOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const overview = await getWarRoomOverview();
      setData(overview);
      setError(false);
    } catch (err) {
      console.error(err);
      if (!silent) setError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  // Fase 5 del análisis de punta a punta (2026-10-28, INT-20): con la
  // pestaña oculta se detiene; al volver refresca enseguida.
  useVisibleInterval(() => load(true), POLL_INTERVAL_MS);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-10 text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">No se pudo cargar la Sala de Guerra</h2>
        <p className="text-slate-500">
          Verifica que tu cuenta tenga permisos de lectura en Dashboard, Monitoreo Predictivo y
          OSINT — la vista exige los tres a la vez.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
        <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
          <Radio className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Sala de Guerra</h1>
          <p className="text-slate-500 text-sm">
            Monitoreo, OSINT y Día D en una sola vista — actualiza cada 30s.
          </p>
        </div>
      </div>

      <ElectionDayStrip electionDay={data.electionDay} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UrgentMentionsPanel mentions={data.urgentMentions} />
        <CaseAlertsPanel alerts={data.caseAlerts} />
      </div>

      {data.fieldCoverage && <FieldCoveragePanel coverage={data.fieldCoverage} />}
      {data.electionCount && data.electionCount.contests.length > 0 && (
        <ElectionCountPanel count={data.electionCount} />
      )}
    </div>
  );
}

// Fase 5 de la versión estable (2026-11-10): las jornadas abiertas (mesas
// reportadas y votos por renglón) y los incidentes abiertos recientes.
function ElectionCountPanel({ count }: { count: NonNullable<WarRoomOverview['electionCount']> }) {
  const fmt = (value: number) => new Intl.NumberFormat('es-CO').format(value);
  const time = (value: string) =>
    new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' }).format(
      new Date(value),
    );
  return (
    <Card className="border-0 shadow-md ring-1 ring-slate-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Vote className="h-4 w-4 text-primary" /> Jornada electoral: testigos
        </CardTitle>
        <CardDescription>
          Lo que reportan los testigos desde las mesas.{' '}
          <Link href="/jornada" className="font-medium text-primary hover:underline">
            Ver el conteo
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {count.contests.map((contest) => {
          const progress = contest.totals.tables > 0 ? Math.round((contest.totals.reported / contest.totals.tables) * 100) : 0;
          return (
            <div key={contest.id} className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold text-slate-700">{contest.name}</span>
                <span className="tabular-nums text-slate-500">
                  {fmt(contest.totals.reported)} / {fmt(contest.totals.tables)} mesas ({progress} %) · {fmt(contest.totals.toReview)} por
                  revisar · {fmt(contest.totals.openIncidents)} incidentes abiertos
                </span>
              </div>
              <Progress value={progress} className="h-2" aria-label={`Mesas reportadas de ${contest.name}`} />
              <ul className="grid gap-1 text-sm sm:grid-cols-2">
                {contest.lines
                  .filter((line) => line.kind === 'CANDIDATE' || line.kind === 'LIST')
                  .map((line) => (
                    <li key={line.id} className="flex justify-between gap-2">
                      <span className={line.isOwn ? 'font-semibold text-slate-700' : 'text-slate-600'}>{line.label}</span>
                      <span className="tabular-nums text-slate-600">
                        {fmt(line.votes)}
                        {line.share !== null ? ` · ${String(line.share).replace('.', ',')} %` : ''}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          );
        })}
        {count.recentIncidents.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-bold uppercase text-slate-500">Incidentes abiertos recientes</p>
            <ul className="divide-y divide-slate-100">
              {count.recentIncidents.map((incident) => (
                <li key={incident.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                  <span className="font-medium text-slate-700">{incident.kindLabel}</span>
                  <span className="text-slate-500">
                    {incident.stationName}
                    {incident.tableNumber !== null ? ` · mesa ${incident.tableNumber}` : ''} · {time(incident.occurredAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Fase 3c (2026-11-10): cobertura puerta a puerta de los últimos 7 días, de
// toda la organización. Solo conteos por zona: ni nombres ni ubicaciones.
function FieldCoveragePanel({ coverage }: { coverage: NonNullable<WarRoomOverview['fieldCoverage']> }) {
  const fmt = (value: number) => new Intl.NumberFormat('es-CO').format(value);
  return (
    <Card className="border-0 shadow-md ring-1 ring-slate-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <DoorOpen className="h-4 w-4 text-primary" /> Terreno: puerta a puerta
        </CardTitle>
        <CardDescription>
          {fmt(coverage.total)} {coverage.total === 1 ? 'visita' : 'visitas'} en los últimos {coverage.days} días.{' '}
          <Link href="/visitas" className="font-medium text-primary hover:underline">
            Ver cobertura
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {coverage.total === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Nadie ha registrado visitas esta semana.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {VISIT_RESULT_ORDER.filter((r) => coverage.byResult[r] > 0).map((r) => (
                <Badge key={r} variant="outline" className={`border-transparent ${VISIT_RESULT_TONE[r]}`}>
                  {VISIT_RESULT_LABEL[r]}: {fmt(coverage.byResult[r])}
                </Badge>
              ))}
            </div>
            <ul className="divide-y divide-slate-100">
              {coverage.zones.map((zone) => (
                <li key={zone.localityId ?? 'none'} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-slate-700">{zone.name}</span>
                  <span className="tabular-nums text-slate-500">
                    {fmt(zone.total)} · apoya {fmt(zone.byResult.SUPPORTS)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ElectionDayStrip({ electionDay }: { electionDay: WarRoomOverview['electionDay'] }) {
  if (!electionDay.isElectionDay) {
    return (
      <Card className="border-0 shadow-sm ring-1 ring-slate-100">
        <CardContent className="p-4 flex items-center gap-3">
          <Flag className="h-4 w-4 text-slate-300" />
          <p className="text-sm text-slate-400">
            Hoy no es el día de la elección — el panel de Día D en vivo se activa acá
            automáticamente ese día.
          </p>
        </CardContent>
      </Card>
    );
  }

  const percentage =
    electionDay.progress.total > 0
      ? Math.round((electionDay.progress.confirmed / electionDay.progress.total) * 100)
      : 0;
  const topLeaders = electionDay.leaderboard.slice(0, 3);

  return (
    <Card className="border-0 shadow-md ring-1 ring-secondary/30 bg-secondary/5">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5" /> Día D en vivo
          </p>
          <Badge variant="secondary">+{electionDay.lastHour} en la última hora</Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Progress value={percentage} className="h-2.5" />
            <p className="text-xs text-slate-500 mt-1.5">
              {electionDay.progress.confirmed} / {electionDay.progress.total} votos confirmados (
              {percentage}%)
            </p>
          </div>
          {topLeaders.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <Trophy className="h-3.5 w-3.5 text-secondary" />
              <div className="flex gap-1.5">
                {topLeaders.map((l) => (
                  <Badge key={l.id} variant="outline" className="text-[11px]">
                    {l.name.split(' ')[0]} · {l.confirmedToday}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function UrgentMentionsPanel({ mentions }: { mentions: WarRoomOverview['urgentMentions'] }) {
  return (
    <Card className="border-0 shadow-md ring-1 ring-slate-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" /> Menciones urgentes
        </CardTitle>
        <CardDescription>
          Monitoreo Predictivo — urgencia ≥8 de las últimas 72 horas, más recientes primero.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[520px] overflow-y-auto">
        {mentions.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            Sin menciones urgentes en las últimas 72 horas.
          </p>
        ) : (
          mentions.map((m) => <UrgentMentionItem key={m.id} mention={m} />)
        )}
      </CardContent>
    </Card>
  );
}

// INT-22: una mención sin dirección web (carga manual) se muestra sin
// enlace, en vez de un enlace que no abre nada.
function UrgentMentionItem({ mention: m }: { mention: WarRoomOverview['urgentMentions'][number] }) {
  const className =
    'block rounded-lg border border-slate-100 p-3 transition-colors' +
    (m.url ? ' hover:border-slate-200 hover:bg-slate-50/50' : '');
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-800 leading-snug">{m.title}</p>
        {m.url && <ExternalLink className="h-3 w-3 text-slate-300 shrink-0 mt-1" />}
      </div>
      <p className="text-[11px] text-slate-400 mt-1">{mentionDateLabel(m)}</p>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <Badge variant="destructive" className="text-[10px]">
          Urgencia {m.urgencyScore ?? '—'}
        </Badge>
        <Badge variant="outline" className="text-[10px]">{m.keywordName}</Badge>
        {m.sentiment && (
          <span className="text-[11px] text-slate-400">
            {SENTIMENT_LABEL[m.sentiment] ?? m.sentiment}
          </span>
        )}
        {m.locationNameRaw && (
          <span className="text-[11px] text-slate-400">· {m.locationNameRaw}</span>
        )}
      </div>
    </>
  );

  return m.url ? (
    <a href={m.url} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}

function CaseAlertsPanel({ alerts }: { alerts: WarRoomOverview['caseAlerts'] }) {
  return (
    <Card className="border-0 shadow-md ring-1 ring-slate-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" /> Alertas OSINT
        </CardTitle>
        <CardDescription>Monitores de casos sin leer, de todos los casos activos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[520px] overflow-y-auto">
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            Sin alertas nuevas en tus casos de investigación.
          </p>
        ) : (
          alerts.map((a) => (
            <a
              key={a.id}
              href={`/osint/casos/${a.caseId}`}
              className="block rounded-lg border border-slate-100 p-3 hover:border-slate-200 hover:bg-slate-50/50 transition-colors"
            >
              <p className="text-sm font-medium text-slate-800 leading-snug">{a.message}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{a.caseTitle}</Badge>
                <span className="text-[11px] text-slate-400">monitor: {a.monitorQuery}</span>
              </div>
            </a>
          ))
        )}
      </CardContent>
    </Card>
  );
}
