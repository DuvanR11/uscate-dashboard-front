'use client';

// Fase 4 "Líderes y celular" (2026-10-06): el ranking mide lo que importa en
// campaña —votantes captados y votos confirmados por líder— y su avance
// contra la meta. Antes era una lista por puntos, y los puntos venían sobre
// todo de solicitudes atendidas.
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Target, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { extractErrorMessage } from '@/lib/api/catalogs';
import {
  productivityApi,
  type LeaderRankingRow,
  type LeadersRanking,
  type LeadersRankingSort,
} from '@/lib/api/leaders';
import { usePermission } from '@/hooks/use-permission';
import { useAuthStore } from '@/store/auth-store';

type Period = 'all' | 'month' | 'week';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'all', label: 'Toda la campaña' },
  { value: 'month', label: 'Este mes' },
  { value: 'week', label: 'Últimos 7 días' },
];
const SORTS: { value: LeadersRankingSort; label: string }[] = [
  { value: 'captured', label: 'Captados' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'points', label: 'Puntos' },
];

const number = (value: number) => new Intl.NumberFormat('es-CO').format(value);

/** Inicio del periodo, fijado al abrir la pantalla. */
function periodStart(period: Period, now: number): string | undefined {
  if (period === 'all') return undefined;
  const start = new Date(now);
  if (period === 'week') start.setDate(start.getDate() - 7);
  else start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

const relativeDays = (iso: string | null, now: number) => {
  if (!iso) return 'Nunca ha captado';
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Captó hoy';
  if (days === 1) return 'Captó ayer';
  return `Última captación hace ${days} días`;
};

interface GoalTarget {
  /** Sin líder: la meta es para todos. */
  leader: LeaderRankingRow | null;
}

export default function LeadersRankingPage() {
  const canWrite = usePermission('PRODUCTIVIDAD', 'canWrite');
  const myId = useAuthStore((s) => s.user?.id);
  const [now] = useState(() => Date.now());
  const [period, setPeriod] = useState<Period>('all');
  const [sort, setSort] = useState<LeadersRankingSort>('captured');
  const [everyone, setEveryone] = useState(false);
  const [result, setResult] = useState<LeadersRanking | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [goalTarget, setGoalTarget] = useState<GoalTarget | null>(null);
  const [goalValue, setGoalValue] = useState('');
  const [saving, setSaving] = useState(false);

  const from = useMemo(() => periodStart(period, now), [period, now]);

  useEffect(() => {
    let cancelled = false;
    productivityApi
      .leaders({ from, sort, role: everyone ? 'ALL' : undefined, limit: 200 })
      .then((data) => {
        if (cancelled) return;
        setResult(data);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [from, sort, everyone, reloadKey]);

  const openGoal = (leader: LeaderRankingRow | null) => {
    setGoalTarget({ leader });
    setGoalValue(leader && leader.goal > 0 ? String(leader.goal) : '');
  };

  const saveGoal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!goalTarget) return;
    const goal = goalValue.trim() === '' ? 0 : Number(goalValue.replace(/[.\s]/g, ''));
    if (!Number.isInteger(goal) || goal < 0) {
      toast.error('La meta debe ser un número entero, por ejemplo 100.');
      return;
    }
    setSaving(true);
    try {
      const response = await productivityApi.setGoals(
        goal,
        goalTarget.leader ? [goalTarget.leader.id] : undefined,
      );
      toast.success(
        goalTarget.leader
          ? `Meta de ${goalTarget.leader.fullName} actualizada`
          : `Meta de ${number(goal)} aplicada a ${response.updated} líder(es)`,
      );
      setGoalTarget(null);
      setReloadKey((key) => key + 1);
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo guardar la meta.');
    } finally {
      setSaving(false);
    }
  };

  const rows = result?.data ?? [];
  const summary = result?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
            <Trophy className="h-7 w-7 text-secondary" /> Ranking de líderes
          </h1>
          <p className="mt-1 text-muted-foreground">
            Votantes captados y votos confirmados por cada líder, y su avance contra la meta.
          </p>
        </div>
        {canWrite && (
          <Button variant="outline" onClick={() => openGoal(null)}>
            <Target className="mr-2 h-4 w-4" /> Meta para todos
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Periodo">
          {PERIODS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={period === option.value ? 'default' : 'outline'}
              aria-pressed={period === option.value}
              onClick={() => setPeriod(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">Ordenar por</span>
          <div className="flex gap-1" role="group" aria-label="Ordenar por">
            {SORTS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={sort === option.value ? 'secondary' : 'ghost'}
                aria-pressed={sort === option.value}
                onClick={() => setSort(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant={everyone ? 'secondary' : 'ghost'}
            aria-pressed={everyone}
            onClick={() => setEveryone((value) => !value)}
          >
            Incluir a todo el equipo
          </Button>
        </div>
      </div>

      {summary && (
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: everyone ? 'Personas' : 'Líderes', value: summary.leaders },
            { label: period === 'all' ? 'Captados' : 'Captados en el periodo', value: summary.captured },
            { label: period === 'all' ? 'Confirmados' : 'Confirmados en el periodo', value: summary.confirmed },
            { label: 'Sin ningún captado', value: summary.withoutCaptures },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border bg-white p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt>
              <dd className="mt-1 text-2xl font-black tabular-nums text-slate-800">{number(item.value)}</dd>
            </div>
          ))}
        </dl>
      )}

      {failed ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          No se pudo cargar el ranking.{' '}
          <button className="font-semibold underline" onClick={() => setReloadKey((key) => key + 1)}>
            Reintentar
          </button>
        </div>
      ) : result === null ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="Cargando el ranking" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          Todavía no hay líderes. Créalos en Configuración → Usuarios y permisos, con el rol Líder.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="w-12 px-4 py-2 font-semibold">#</th>
                <th scope="col" className="px-4 py-2 font-semibold">Líder</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Captados</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Confirmados</th>
                <th scope="col" className="px-4 py-2 font-semibold">Meta</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Puntos</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => {
                const rate = row.captured > 0 ? Math.round((row.confirmed / row.captured) * 100) : null;
                const isMe = row.id === myId;
                return (
                  <tr key={row.id} className={isMe ? 'bg-secondary/10' : undefined}>
                    <td className="px-4 py-3 font-bold tabular-nums text-slate-500">{row.position}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">
                        {row.fullName}
                        {isMe && <span className="ml-2 text-xs font-medium text-primary">(tú)</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        {[row.zone, relativeDays(row.lastCaptureAt, now)].filter(Boolean).join(' · ')}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-base font-bold tabular-nums text-slate-800">{number(row.captured)}</span>
                      {period !== 'all' && (
                        <span className="block text-xs text-slate-500">de {number(row.capturedTotal)} en total</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-base font-bold tabular-nums text-slate-800">{number(row.confirmed)}</span>
                      {period === 'all' && rate !== null && (
                        <span className="block text-xs text-slate-500">{rate}% de sus captados</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.goal > 0 ? (
                        <div className="min-w-[140px]">
                          <div className="mb-1 flex justify-between text-xs text-slate-600">
                            <span className="tabular-nums">
                              {number(row.capturedTotal)} / {number(row.goal)}
                            </span>
                            <span className="tabular-nums">{row.goalProgress}%</span>
                          </div>
                          <Progress value={Math.min(100, row.goalProgress ?? 0)} className="h-2" />
                        </div>
                      ) : (
                        <span className="block text-xs text-slate-400">Sin meta</span>
                      )}
                      {canWrite && (
                        <button
                          className="mt-1 text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                          onClick={() => openGoal(row)}
                        >
                          {row.goal > 0 ? 'Cambiar meta' : 'Asignar meta'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{number(row.points)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={goalTarget !== null} onOpenChange={(open) => !open && setGoalTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {goalTarget?.leader ? `Meta de ${goalTarget.leader.fullName}` : 'Meta para todos los líderes'}
            </DialogTitle>
            <DialogDescription>
              {goalTarget?.leader
                ? 'Cuántos votantes debe captar en total. Déjala vacía para quitarla.'
                : 'Reemplaza la meta de todos los líderes activos. Después puedes ajustar la de cada uno.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveGoal} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="goal-value">Votantes captados</Label>
              <Input
                id="goal-value"
                autoFocus
                inputMode="numeric"
                placeholder="Ej: 100"
                value={goalValue}
                onChange={(e) => setGoalValue(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGoalTarget(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar meta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
