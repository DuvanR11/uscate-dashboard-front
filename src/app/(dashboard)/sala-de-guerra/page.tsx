'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import { getWarRoomOverview, type WarRoomOverview } from '@/lib/api/war-room';

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

export default function SalaDeGuerraPage() {
  const [data, setData] = useState<WarRoomOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    pollRef.current = setInterval(() => load(true), POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

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
          <h1 className="text-2xl font-black text-primary tracking-tight">Sala de Guerra</h1>
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
    </div>
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
        <CardDescription>Monitoreo Predictivo — urgencia ≥8, más recientes primero.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[520px] overflow-y-auto">
        {mentions.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            Sin menciones urgentes en este momento.
          </p>
        ) : (
          mentions.map((m) => (
            <a
              key={m.id}
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-slate-100 p-3 hover:border-slate-200 hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-800 leading-snug">{m.title}</p>
                <ExternalLink className="h-3 w-3 text-slate-300 shrink-0 mt-1" />
              </div>
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
            </a>
          ))
        )}
      </CardContent>
    </Card>
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
