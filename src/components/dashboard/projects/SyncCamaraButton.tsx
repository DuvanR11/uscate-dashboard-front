'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import api from '@/lib/api';

interface IngestionRun {
  id: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL';
  projectsFound: number;
  projectsUpdated: number;
  docsProcessed: number;
  docsSkipped: number;
  errorsCount: number;
}

const POLL_INTERVAL_MS = 2000;

/**
 * Plan "Radar Legislativo", Fase 3 (2026-09-03) — hallazgo P1 #11 del
 * diagnóstico original: "cero progreso visible durante una sincronización
 * — el job se encola bien pero el frontend no sondea nada después". Mismo
 * patrón real de "OSINT Profesional" Fase 6 (encolar + sondear un estado
 * en vivo en vez de una respuesta bloqueante) — adaptado: acá se sondea
 * `IngestionRun` (contadores reales que el propio processor incrementa),
 * no `job.progress()` de BullMQ (ese job se borra al terminar gracias al
 * candado de concurrencia — `removeOnComplete`/`removeOnFail` — así que
 * jamás sería la fuente correcta del resultado final).
 *
 * Al montar, si YA hay una corrida real activa (disparada por el `@Cron`
 * nuevo, o por otro usuario), se engancha el polling sin esperar un
 * click — el progreso real es visible para cualquiera que abra la página
 * mientras corre, no solo para quien la disparó.
 */
export default function SyncCamaraButton() {
  const router = useRouter();
  const [run, setRun] = useState<IngestionRun | null>(null);
  const [triggering, setTriggering] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNotifiedRunId = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkOnce = async () => {
      try {
        const res = await api.get<IngestionRun | null>('/ingestion/runs/latest');
        if (!mounted) return;

        if (res.data?.status === 'RUNNING') {
          setRun(res.data);
          schedulePoll();
        } else if (res.data) {
          lastNotifiedRunId.current = res.data.id;
        }
      } catch {
        // Sin corrida previa real, o error de red — no bloquea el botón.
      }
    };

    checkOnce();

    return () => {
      mounted = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const schedulePoll = () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);

    pollTimer.current = setTimeout(async () => {
      try {
        const res = await api.get<IngestionRun | null>('/ingestion/runs/latest');
        const latest = res.data;
        setRun(latest);

        if (latest?.status === 'RUNNING') {
          schedulePoll();
          return;
        }

        if (latest && lastNotifiedRunId.current !== latest.id) {
          lastNotifiedRunId.current = latest.id;
          notifyResult(latest);
          router.refresh();
        }
      } catch {
        // Error real de red durante el polling: reintenta en el próximo
        // tick en vez de dejar la UI congelada en "sincronizando...".
        schedulePoll();
      }
    }, POLL_INTERVAL_MS);
  };

  const notifyResult = (finished: IngestionRun) => {
    if (finished.status === 'SUCCESS') {
      toast.success(
        `Sincronización real completada: ${finished.projectsUpdated} proyecto(s) actualizados.`,
      );
    } else if (finished.status === 'PARTIAL') {
      toast.warning(
        `Sincronización completada con ${finished.errorsCount} error(es) real(es) — revisá el panel de corridas.`,
      );
    } else if (finished.status === 'FAILED') {
      toast.error('La sincronización real falló — revisá el panel de corridas.');
    }
  };

  const handleSync = async () => {
    setTriggering(true);
    try {
      await api.post('/ingestion/camara');
      toast.success('Sincronización real encolada.');
      schedulePoll();
    } catch {
      toast.error('No se pudo encolar la sincronización real.');
    } finally {
      setTriggering(false);
    }
  };

  const isRunning = run?.status === 'RUNNING';

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleSync}
        disabled={triggering || isRunning}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:bg-[#243252] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
      >
        <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
        {isRunning ? 'Sincronizando...' : 'Sincronizar Cámara'}
      </button>

      {isRunning && run && (
        <div className="w-72 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
          <p className="mb-1 font-bold uppercase tracking-wide text-blue-700">
            Progreso real en vivo
          </p>
          <p>
            {run.projectsFound} encontrados · {run.projectsUpdated} actualizados
          </p>
          <p>
            {run.docsProcessed} docs procesados · {run.docsSkipped} omitidos
          </p>
          {run.errorsCount > 0 && (
            <p className="font-semibold text-amber-700">
              {run.errorsCount} error(es) real(es)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
