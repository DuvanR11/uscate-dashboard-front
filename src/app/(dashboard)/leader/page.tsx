'use client';

// Fase 4 "Líderes y celular" (2026-10-06): el panel del líder, pensado para
// usarse en el celular. Antes era una versión reducida del tablero de
// escritorio, con una meta fija de 100 para todos y sin forma de registrar a
// nadie desde aquí. Ahora, de arriba abajo: cómo voy frente a mi meta y a los
// demás líderes, el botón para registrar un votante, mi enlace para que la
// gente se inscriba sola, y a quién me falta confirmarle el voto.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  MessageCircle,
  Network,
  Phone,
  Share2,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { QuickCaptureSheet } from '@/components/dashboard/leader/quick-capture-sheet';
import { InstallAppButton } from '@/components/shared/install-app-button';
import { extractErrorMessage } from '@/lib/api/catalogs';
import {
  leaderApi,
  type LeaderNetwork,
  type LeaderRecentProspect,
  type LeaderStats,
} from '@/lib/api/leaders';
import { usePermission } from '@/hooks/use-permission';

const number = (value: number) => new Intl.NumberFormat('es-CO').format(value);
const firstWord = (value: string | null | undefined) => (value ?? '').trim().split(/\s+/)[0] ?? '';

export default function LeaderPanelPage() {
  const canWrite = usePermission('PROSPECTOS', 'canWrite');
  const [stats, setStats] = useState<LeaderStats | null>(null);
  const [network, setNetwork] = useState<LeaderNetwork | null>(null);
  const [failed, setFailed] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    leaderApi
      .stats()
      .then((data) => {
        if (cancelled) return;
        setStats(data);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    // Sección secundaria: si falla, el resto del panel sigue funcionando.
    leaderApi
      .network()
      .then((data) => {
        if (!cancelled) setNetwork(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const shareLink = async () => {
    if (!stats?.leaderId) return;
    const url = `${window.location.origin}/referido?ref=${stats.leaderId}`;
    const text = 'Súmate a nuestro equipo. Inscríbete aquí:';
    // En el celular abre el menú de compartir (WhatsApp, SMS...); en
    // escritorio, o si la persona lo cierra, se copia el enlace.
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Inscripción', text, url });
        return;
      } catch {
        /* cancelado: se cae a copiar */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado. Pégalo en WhatsApp o donde quieras compartirlo.');
    } catch {
      toast.error('No se pudo copiar el enlace.');
    }
  };

  const confirmVote = async (prospect: LeaderRecentProspect) => {
    const name = `${prospect.firstName ?? ''} ${prospect.lastName ?? ''}`.trim();
    const confirmed = await confirmDialog({
      title: `¿Confirmar el voto de ${name}?`,
      description: 'Queda marcado como voto confirmado y suma a tus resultados.',
      confirmLabel: 'Confirmar voto',
    });
    if (!confirmed) return;
    setConfirmingId(prospect.id);
    try {
      await api.patch(`/prospects/${prospect.id}`, { voteConfirmed: true });
      toast.success(`Voto de ${name} confirmado`);
      reload();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo confirmar el voto.');
    } finally {
      setConfirmingId(null);
    }
  };

  if (failed && !stats) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        No se pudo cargar tu panel.{' '}
        <button className="font-semibold underline" onClick={reload}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="Cargando tu panel" />
      </div>
    );
  }

  const { kpi, standing, recent } = stats;
  const hasGoal = standing.goal > 0;
  const name = firstWord(standing.fullName);

  return (
    // Espacio abajo para la barra fija de "Registrar votante" en el celular.
    <div className="mx-auto max-w-3xl space-y-5 pb-24 md:pb-0">
      {/* 1. Cómo voy */}
      <section className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-lg md:p-7">
        <p className="text-sm text-primary-foreground/70">Hola{name ? `, ${name}` : ''}</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
          {number(kpi.total)} {kpi.total === 1 ? 'votante captado' : 'votantes captados'}
        </h1>

        {hasGoal ? (
          <div className="mt-4">
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="font-semibold">Meta: {number(standing.goal)}</span>
              <span className="text-primary-foreground/70">
                {standing.remaining === 0 ? '¡Meta cumplida!' : `Te faltan ${number(standing.remaining ?? 0)}`}
              </span>
            </div>
            <Progress
              value={Math.min(100, standing.goalProgress ?? 0)}
              className="h-3 bg-white/15"
              indicatorClassName="bg-secondary"
              aria-label={`Avance de la meta: ${standing.goalProgress ?? 0}%`}
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-primary-foreground/70">
            Todavía no tienes una meta asignada. Pídesela a tu coordinador.
          </p>
        )}

        <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-white/10 p-3">
            <dt className="text-[11px] uppercase tracking-wide text-primary-foreground/70">Tu puesto</dt>
            <dd className="mt-1 text-xl font-black tabular-nums">
              {standing.position}
              <span className="text-sm font-medium text-primary-foreground/70"> de {standing.leaders}</span>
            </dd>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <dt className="text-[11px] uppercase tracking-wide text-primary-foreground/70">Esta semana</dt>
            <dd className="mt-1 text-xl font-black tabular-nums">+{number(standing.capturedThisWeek)}</dd>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <dt className="text-[11px] uppercase tracking-wide text-primary-foreground/70">Puntos</dt>
            <dd className="mt-1 text-xl font-black tabular-nums">{number(standing.points)}</dd>
          </div>
        </dl>
      </section>

      {/* 2. Acciones (en escritorio; en el celular el registro va en la barra fija de abajo) */}
      <div className="grid gap-3 sm:grid-cols-2">
        {canWrite && (
          <Button className="hidden h-14 text-base md:inline-flex" onClick={() => setCaptureOpen(true)}>
            <UserPlus className="mr-2 h-5 w-5" /> Registrar votante
          </Button>
        )}
        <Button variant="outline" className="h-14 bg-white text-base" onClick={shareLink}>
          <Share2 className="mr-2 h-5 w-5" /> Compartir mi enlace
        </Button>
        <InstallAppButton className="h-14 bg-white text-base sm:col-span-2 md:col-span-1" />
      </div>

      {/* 3. Votos */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-green-600" /> Votos confirmados
            </p>
            <p className="mt-2 text-3xl font-black tabular-nums text-slate-800">{number(kpi.confirmed)}</p>
            <p className="text-xs text-slate-500">{kpi.completionRate}% de tus captados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Users className="h-4 w-4 text-amber-600" /> Por confirmar
            </p>
            <p className="mt-2 text-3xl font-black tabular-nums text-slate-800">
              {number(standing.pendingConfirmation)}
            </p>
            <p className="text-xs text-slate-500">Llámalos o escríbeles</p>
          </CardContent>
        </Card>
      </div>

      {/* 4. Últimos registrados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base text-primary">Últimos registrados</CardTitle>
          <Link
            href="/prospects"
            className="flex items-center text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            Ver todos <ChevronRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <p className="px-4 pb-6 text-sm text-slate-500">
              Aún no has registrado a nadie. Usa &ldquo;Registrar votante&rdquo; o comparte tu enlace para que se
              inscriban solos.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((prospect) => {
                const fullName = `${prospect.firstName ?? ''} ${prospect.lastName ?? ''}`.trim();
                return (
                  <li key={prospect.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{fullName}</p>
                      {prospect.voteConfirmed ? (
                        <Badge className="mt-1 bg-green-100 text-green-800 hover:bg-green-100">Voto confirmado</Badge>
                      ) : (
                        <span className="text-xs text-slate-500">Por confirmar</span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {prospect.phone && (
                        <>
                          <Button asChild size="icon" variant="outline" className="h-10 w-10">
                            <a href={`tel:${prospect.phone}`} aria-label={`Llamar a ${fullName}`}>
                              <Phone className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button asChild size="icon" variant="outline" className="h-10 w-10 text-green-700">
                            <a
                              href={`https://wa.me/57${prospect.phone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Escribir por WhatsApp a ${fullName}`}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          </Button>
                        </>
                      )}
                      {canWrite && !prospect.voteConfirmed && (
                        <Button
                          size="sm"
                          className="h-10"
                          disabled={confirmingId === prospect.id}
                          onClick={() => confirmVote(prospect)}
                        >
                          {confirmingId === prospect.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Confirmar'
                          )}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 5. Tu red: gente que trajiste y que ya trae gente */}
      {network && network.totalReferrals > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <Network className="h-5 w-5 text-secondary" /> Tu red
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              <strong className="text-slate-800">{number(network.totalReferrals)}</strong> personas llegaron invitadas
              por gente que tú registraste.
            </p>
            {network.topReferrers.length > 0 && (
              <ul className="space-y-2">
                {network.topReferrers.map((referrer) => (
                  <li
                    key={referrer.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-700">{referrer.name}</span>
                    <Badge variant="secondary">
                      {referrer.referralsCount} {referrer.referralsCount === 1 ? 'invitado' : 'invitados'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Link
        href="/users/productivity/ranking"
        className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 p-3 text-sm font-medium text-slate-600 hover:bg-white focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Trophy className="h-4 w-4 text-secondary" /> Ver el ranking de líderes
      </Link>

      {/* Barra fija del celular: la acción principal siempre a un toque. */}
      {canWrite && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          <Button className="h-14 w-full text-base" onClick={() => setCaptureOpen(true)}>
            <UserPlus className="mr-2 h-5 w-5" /> Registrar votante
          </Button>
        </div>
      )}

      <QuickCaptureSheet open={captureOpen} onOpenChange={setCaptureOpen} onCreated={reload} />
    </div>
  );
}
