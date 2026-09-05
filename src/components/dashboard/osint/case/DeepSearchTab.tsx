'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Loader2,
  Play,
  Search,
  Waypoints,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import EntityPickerInline, { type PickedEntity } from '@/components/dashboard/osint/EntityPickerInline';
import {
  startDeepSearch,
  listDeepSearchRuns,
  getDeepSearchRun,
  cancelDeepSearchRun,
  isDeepSearchRunActive,
  DEEP_SEARCH_PHASE_LABEL,
  extractErrorMessage,
  type DeepSearchRun,
  type DeepSearchRunSummary,
} from '@/lib/api/osint';

const POLL_INTERVAL_MS = 3000;

const PHASE_ORDER = ['DECOMPOSING', 'SEARCHING', 'EXPANDING', 'INGESTING', 'SYNTHESIZING', 'COMPLETED'] as const;

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'outline',
  DECOMPOSING: 'secondary',
  SEARCHING: 'secondary',
  EXPANDING: 'secondary',
  INGESTING: 'secondary',
  SYNTHESIZING: 'secondary',
  COMPLETED: 'default',
  FAILED: 'destructive',
  CANCELLED: 'outline',
};

export default function DeepSearchTab({
  caseId,
  knownEntities,
  onViewGraph,
}: {
  caseId: string;
  knownEntities: PickedEntity[];
  onViewGraph: (entityId: string) => void;
}) {
  const [runs, setRuns] = useState<DeepSearchRun[]>([]);
  const [activeRun, setActiveRun] = useState<DeepSearchRunSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [objective, setObjective] = useState('');
  const [anchor, setAnchor] = useState<PickedEntity | null>(null);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pollRun = (runId: string) => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = setTimeout(async () => {
      try {
        const summary = await getDeepSearchRun(caseId, runId);
        setActiveRun(summary);
        if (isDeepSearchRunActive(summary.status)) {
          pollRun(runId);
        } else {
          setRuns((prev) => prev.map((r) => (r.id === runId ? { ...r, status: summary.status } : r)));
          if (summary.status === 'COMPLETED') toast.success('Deep Search completado — revisa el Dossier.');
          if (summary.status === 'FAILED') toast.error(`Deep Search falló: ${summary.error || 'error desconocido'}`);
        }
      } catch {
        // Error de red puntual — reintenta en vez de congelar la UI.
        pollRun(runId);
      }
    }, POLL_INTERVAL_MS);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await listDeepSearchRuns(caseId);
        if (!mounted) return;
        setRuns(data);
        const active = data.find((r) => isDeepSearchRunActive(r.status));
        if (active) {
          const summary = await getDeepSearchRun(caseId, active.id);
          if (!mounted) return;
          setActiveRun(summary);
          pollRun(active.id);
        }
      } catch (err) {
        toast.error(extractErrorMessage(err) || 'No se pudieron cargar las corridas de Deep Search');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const handleStart = async () => {
    if (objective.trim().length < 5) {
      toast.error('Describe el objetivo de la investigación (mínimo 5 caracteres)');
      return;
    }
    setStarting(true);
    try {
      const run = await startDeepSearch(caseId, {
        objective: objective.trim(),
        anchorEntityId: anchor?.id,
      });
      toast.success('Deep Search lanzado — el agente empezó a trabajar.');
      setRuns((prev) => [run, ...prev]);
      setDialogOpen(false);
      setObjective('');
      setAnchor(null);
      const summary = await getDeepSearchRun(caseId, run.id);
      setActiveRun(summary);
      pollRun(run.id);
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo lanzar el Deep Search');
    } finally {
      setStarting(false);
    }
  };

  const handleCancel = async (runId: string) => {
    if (!window.confirm('¿Cancelar esta corrida? El progreso ya reunido no se pierde.')) return;
    setCancelling(true);
    try {
      await cancelDeepSearchRun(caseId, runId);
      const summary = await getDeepSearchRun(caseId, runId);
      setActiveRun(summary);
      setRuns((prev) => prev.map((r) => (r.id === runId ? { ...r, status: summary.status } : r)));
      toast.success('Corrida cancelada');
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo cancelar la corrida');
    } finally {
      setCancelling(false);
    }
  };

  const viewRun = async (runId: string) => {
    try {
      const summary = await getDeepSearchRun(caseId, runId);
      setActiveRun(summary);
      if (isDeepSearchRunActive(summary.status)) pollRun(runId);
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo cargar la corrida');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start gap-4">
        <p className="text-sm text-slate-500 max-w-xl">
          El agente descompone el objetivo en sub-preguntas, busca en las 12 fuentes, expande
          entidades relacionadas varios saltos, ingiere documentos que encuentra, y al final
          escribe un dossier narrativo — todo con topes de costo/iteración y sin fusionar
          identidades por su cuenta.
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 gap-1.5">
              <Search size={14} /> Iniciar Deep Search
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva investigación profunda</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Objetivo</label>
                <Textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Ej: investigar posibles vínculos de contratación irregular de esta persona con entidades públicas"
                  rows={4}
                />
              </div>
              <EntityPickerInline
                label="Sujeto ancla (opcional)"
                value={anchor}
                onChange={setAnchor}
                knownEntities={knownEntities}
                caseId={caseId}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleStart} disabled={starting} className="gap-1.5">
                {starting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Lanzar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {activeRun && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">{activeRun.objective}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {DEEP_SEARCH_PHASE_LABEL[activeRun.phase || activeRun.status] || activeRun.status}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[activeRun.status]}>{activeRun.status}</Badge>
                {isDeepSearchRunActive(activeRun.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={cancelling}
                    onClick={() => handleCancel(activeRun.id)}
                  >
                    {cancelling ? <Loader2 size={14} className="animate-spin" /> : 'Cancelar'}
                  </Button>
                )}
              </div>
            </div>

            {isDeepSearchRunActive(activeRun.status) && (
              <div className="flex flex-wrap gap-2">
                {PHASE_ORDER.map((phase) => {
                  const isCurrent = activeRun.phase === phase || activeRun.status === phase;
                  const isPast = PHASE_ORDER.indexOf(phase) < PHASE_ORDER.indexOf(
                    (activeRun.phase || activeRun.status) as (typeof PHASE_ORDER)[number],
                  );
                  return (
                    <Badge
                      key={phase}
                      variant={isCurrent ? 'default' : isPast ? 'secondary' : 'outline'}
                      className="text-[10px] gap-1"
                    >
                      {isPast && <CheckCircle2 size={10} />}
                      {DEEP_SEARCH_PHASE_LABEL[phase]}
                    </Badge>
                  );
                })}
              </div>
            )}

            {activeRun.status === 'FAILED' && activeRun.error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                <XCircle size={16} className="shrink-0 mt-0.5" /> {activeRun.error}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <Stat label="Sub-preguntas" used={activeRun.used.subQuestionsUsed} max={activeRun.budget.maxSubQuestions} />
              {/* Sin denominador real: el presupuesto de expansiones es global
                  (`MAX_TOTAL_EXPANSIONS`, no snapshoteado por run) — mostrar
                  solo el conteo real es más honesto que inventar un tope. */}
              <Stat label="Expansiones" used={activeRun.used.expansionsUsed} />
              <Stat label="Documentos" used={activeRun.used.documentsIngestedUsed} max={activeRun.budget.maxDocuments} />
              <Stat label="Llamadas IA" used={activeRun.used.openAiCallsUsed} max={activeRun.budget.maxOpenAiCalls} />
            </div>

            {activeRun.subQuestions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500">Sub-preguntas</p>
                <div className="flex flex-wrap gap-1.5">
                  {activeRun.subQuestions.map((sq) => (
                    <Badge key={sq.id} variant={sq.status === 'FAILED' ? 'destructive' : sq.status === 'DONE' ? 'secondary' : 'outline'} className="text-[10px]">
                      {sq.query} {sq.status === 'DONE' && `(${sq.evidenceCreated})`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {activeRun.status === 'COMPLETED' && activeRun.anchorEntityId && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onViewGraph(activeRun.anchorEntityId!)}>
                <Waypoints size={14} /> Ver en el Grafo
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {runs.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-10 text-center text-sm text-slate-500">
            Sin corridas de Deep Search todavía — usa &quot;Iniciar Deep Search&quot;.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-500">Corridas anteriores</p>
          {runs.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => viewRun(run.id)}
              className="w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-slate-100 hover:bg-slate-50 text-sm"
            >
              <span className="truncate text-slate-600">{run.objective}</span>
              <span className="flex items-center gap-2 shrink-0">
                <Badge variant={STATUS_VARIANT[run.status]} className="text-[10px]">
                  {run.status}
                </Badge>
                <span className="text-[10px] text-slate-400">{new Date(run.createdAt).toLocaleString('es-CO')}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, used, max }: { label: string; used: number; max?: number }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2.5 text-center">
      <p className="text-slate-400">{label}</p>
      <p className="font-mono font-semibold text-primary">
        {used}
        {typeof max === 'number' ? `/${max}` : ''}
      </p>
    </div>
  );
}
