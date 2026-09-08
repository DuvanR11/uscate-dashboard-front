'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Can } from '@/components/shared/can';
import { useBrandColors } from '@/hooks/use-brand-colors';
import { Flag, MapPin, Trophy, Zap, Loader2, Info } from 'lucide-react';

// Plan "Modo Día D en vivo" (2026-09-08) — última línea del roadmap de esta
// sesión para potenciar el CRM político. A diferencia del resto del
// dashboard (caché de 5 min, TTL puro — aceptable la mayoría de los días),
// esta vista pide siempre datos en vivo: `GET
// /reports/political/election-day-live` NUNCA pasa por el caché Redis del
// backend. No existe infraestructura de WebSocket/SSE en todo el backend
// (verificado real), así que "en vivo" acá es polling real cada 30s — mismo
// criterio, aunque no realtime, ya usado en `monitoring/analytics`.
const POLL_INTERVAL_MS = 30_000;

interface StationLive {
  name: string;
  total: number;
  confirmed: number;
}

interface LeaderLive {
  id: string;
  name: string;
  confirmedToday: number;
}

interface ElectionDayLive {
  progress: { confirmed: number; total: number };
  byStation: StationLive[];
  lastHour: number;
  leaderboard: LeaderLive[];
  electionDate: string | null;
  isElectionDay: boolean;
  serverTime: string;
}

export default function ElectionDayLivePage() {
  return (
    <Can
      module="DASHBOARD"
      action="canRead"
      fallback={
        <div className="p-12 text-center text-slate-500">
          No tienes permisos para ver el panel de Día D.
        </div>
      }
    >
      <ElectionDayLiveContent />
    </Can>
  );
}

function ElectionDayLiveContent() {
  const colors = useBrandColors();
  const [data, setData] = useState<ElectionDayLive | null>(null);
  const [loading, setLoading] = useState(true);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const serverTimeRef = useRef<number | null>(null);

  const fetchLive = useCallback(async (silent: boolean) => {
    try {
      const res = await api.get<ElectionDayLive>('/reports/political/election-day-live');
      setData(res.data);
      serverTimeRef.current = new Date(res.data.serverTime).getTime();
      setSecondsAgo(0);
    } catch (error) {
      console.error('Error cargando panel de Día D en vivo', error);
      if (!silent) toast.error('No se pudo cargar el panel en vivo');
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling real — se limpia siempre al desmontar, nunca queda un
  // intervalo huérfano refrescando una pantalla que ya no existe.
  useEffect(() => {
    fetchLive(false);
    const interval = setInterval(() => fetchLive(true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchLive]);

  // Reloj de "hace Xs" — independiente del polling, para que el contador
  // no salte de golpe cada 30s sino que avance segundo a segundo.
  useEffect(() => {
    const tick = setInterval(() => {
      if (serverTimeRef.current !== null) {
        setSecondsAgo(Math.floor((Date.now() - serverTimeRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Flag className="h-6 w-6 text-secondary" />
          </div>
        </div>
        <p className="text-primary font-medium animate-pulse">Cargando panel en vivo...</p>
      </div>
    );
  }

  if (!data) return null;

  const { progress, byStation, lastHour, leaderboard, isElectionDay, electionDate } = data;
  const percent = progress.total > 0 ? Math.round((progress.confirmed / progress.total) * 100) : 0;
  const daysToElection = electionDate
    ? Math.ceil((new Date(electionDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000)
    : null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary rounded-xl shadow-lg shadow-blue-900/20 hidden sm:block">
            <Flag className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">
              Día D en vivo
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium">
              Progreso real de la jornada, sin esperar recarga.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5 bg-white text-slate-500 font-medium">
          <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
          Actualizado hace {secondsAgo}s
        </Badge>
      </div>

      {!isElectionDay && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="h-4 w-4 shrink-0" />
          {electionDate
            ? daysToElection !== null && daysToElection > 0
              ? `El Día D es en ${daysToElection} día${daysToElection === 1 ? '' : 's'} — esta vista ya funciona hoy para ensayar la operación.`
              : 'El Día D ya pasó — este panel sigue mostrando el progreso registrado.'
            : 'Esta organización todavía no tiene una fecha de elección configurada (Automatización de Campaña → Cuenta regresiva).'}
        </div>
      )}

      {/* PROGRESO GLOBAL */}
      <Card className="border-t-4 border-t-primary shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl text-primary flex items-center gap-2">
            <Zap className="h-5 w-5 text-secondary" />
            Progreso de confirmación de voto
          </CardTitle>
          <CardDescription>Toda la organización, en tiempo real.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-primary tabular-nums">
                {progress.confirmed.toLocaleString('es-CO')}
              </span>
              <span className="text-lg text-slate-400 font-semibold">
                / {progress.total.toLocaleString('es-CO')}
              </span>
            </div>
            <span className="text-2xl font-black text-secondary tabular-nums">{percent}%</span>
          </div>
          <Progress value={percent} indicatorClassName="bg-primary" />
          <p className="text-xs text-slate-500">
            <span className="font-bold text-emerald-600 tabular-nums">+{lastHour}</span> confirmados
            en la última hora.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-7">
        {/* PUESTOS MÁS ATRASADOS */}
        <Card className="col-span-4 border-t-4 border-t-primary shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center gap-2">
              <MapPin className="h-5 w-5 text-secondary" />
              Puestos de votación por atender
            </CardTitle>
            <CardDescription>Ordenados por menos confirmados primero.</CardDescription>
          </CardHeader>
          <CardContent>
            {byStation.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-6 text-center">
                Ningún prospecto tiene puesto de votación asignado todavía.
              </p>
            ) : (
              <ul className="space-y-3">
                {byStation.slice(0, 10).map((station) => {
                  const stationPercent =
                    station.total > 0 ? Math.round((station.confirmed / station.total) * 100) : 0;
                  return (
                    <li key={station.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-700 truncate pr-2">
                          {station.name}
                        </span>
                        <span className="text-slate-500 tabular-nums shrink-0">
                          {station.confirmed}/{station.total}
                        </span>
                      </div>
                      <Progress
                        value={stationPercent}
                        className="h-2"
                        indicatorClassName="bg-secondary"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* RANKING DE LÍDERES DE HOY */}
        <Card className="col-span-3 border-t-4 border-t-primary shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center gap-2">
              <Trophy className="h-5 w-5 text-secondary" />
              Líderes de hoy
            </CardTitle>
            <CardDescription>Votos confirmados hoy, por padrino.</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-6 text-center">
                Todavía ningún líder ha confirmado un voto hoy.
              </p>
            ) : (
              <ol className="space-y-2">
                {leaderboard.map((leader, i) => (
                  <li
                    key={leader.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: i === 0 ? colors.secondary : colors.primary }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {leader.name}
                      </span>
                    </div>
                    <span className="text-sm font-black text-primary tabular-nums shrink-0">
                      {leader.confirmedToday}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
