'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowRight, Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import type { ProjectAlert } from '@/types/project';

const ALERT_TITLES: Record<string, string> = {
  STAGE_CHANGED: 'Cambió de etapa',
};

function when(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

/**
 * Avisos del Radar para quien tiene la sesión abierta: los proyectos de su
 * corporación que cambiaron de etapa en la última sincronización. Cada aviso
 * lleva al proyecto y se quita al marcarlo como leído.
 */
export default function RadarAlerts({ initialAlerts }: { initialAlerts: ProjectAlert[] }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const markAsRead = async (id: string) => {
    setBusyId(id);
    try {
      await api.patch(`/alerts/${id}/read`);
      setAlerts((current) => current.filter((alert) => alert.id !== id));
    } catch {
      toast.error('No se pudo marcar la alerta como leída.');
    } finally {
      setBusyId(null);
    }
  };

  const markAllAsRead = async () => {
    setClearing(true);
    try {
      await api.patch('/alerts/read-all');
      setAlerts([]);
    } catch {
      toast.error('No se pudieron marcar las alertas como leídas.');
    } finally {
      setClearing(false);
    }
  };

  if (!alerts.length) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
        <p className="font-medium text-slate-500">No hay alertas pendientes.</p>
        <p className="mt-1 text-xs text-slate-400">
          Aquí verás los proyectos que cambien de etapa en cada sincronización.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-500">
          {alerts.length === 1 ? '1 sin leer' : `${alerts.length} sin leer`}
        </p>
        {alerts.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={markAllAsRead}
            disabled={clearing}
          >
            {clearing ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
            )}
            Marcar todas como leídas
          </Button>
        )}
      </div>

      <ul className="max-h-[26rem] space-y-3 overflow-y-auto pr-1">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:border-amber-200 hover:bg-amber-50"
          >
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-sm font-bold text-foreground">
                  {ALERT_TITLES[alert.type] ?? 'Novedad en el proyecto'}
                </p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">{when(alert.createdAt)}</span>
            </div>

            {alert.project && (
              <p className="line-clamp-2 text-sm font-medium leading-5 text-slate-700">
                {alert.project.projectNumber && (
                  <span className="mr-1.5 font-mono text-xs text-slate-500">
                    {alert.project.projectNumber}
                  </span>
                )}
                {alert.project.title}
              </p>
            )}

            <p className="mt-1 text-sm leading-6 text-slate-600">{alert.message}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {alert.project && (
                <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                  <Link href={`/projects/${alert.project.id}`}>
                    Ver proyecto
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => markAsRead(alert.id)}
                disabled={busyId === alert.id || clearing}
              >
                {busyId === alert.id ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                )}
                Marcar como leída
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
