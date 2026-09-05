'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  listDossierVersions,
  regenerateDossier,
  getDeepSearchRun,
  isDeepSearchRunActive,
  DEEP_SEARCH_PHASE_LABEL,
  extractErrorMessage,
  type CaseDossier,
} from '@/lib/api/osint';

const POLL_INTERVAL_MS = 3000;

export default function DossierTab({
  caseId,
  onJumpToEvidence,
}: {
  caseId: string;
  onJumpToEvidence: (evidenceId: string) => void;
}) {
  const [versions, setVersions] = useState<CaseDossier[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    try {
      const data = await listDossierVersions(caseId);
      setVersions(data);
      setSelectedVersion(data[0]?.version ?? null);
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo cargar el dossier');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const pollRegeneration = (runId: string) => {
    pollTimer.current = setTimeout(async () => {
      try {
        const summary = await getDeepSearchRun(caseId, runId);
        setPhase(summary.phase || summary.status);
        if (isDeepSearchRunActive(summary.status)) {
          pollRegeneration(runId);
          return;
        }
        setRegenerating(false);
        setPhase(null);
        if (summary.status === 'COMPLETED') {
          toast.success('Dossier regenerado');
          await load();
        } else {
          toast.error(`No se pudo regenerar el dossier: ${summary.error || 'error desconocido'}`);
        }
      } catch {
        pollRegeneration(runId);
      }
    }, POLL_INTERVAL_MS);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setPhase('SYNTHESIZING');
    try {
      const run = await regenerateDossier(caseId);
      pollRegeneration(run.id);
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo lanzar la regeneración del dossier');
      setRegenerating(false);
      setPhase(null);
    }
  };

  const current = versions.find((v) => v.version === selectedVersion) ?? null;

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3">
        <p className="text-sm text-slate-500 max-w-xl">
          Dossier narrativo generado por IA — cada afirmación cita la evidencia real que la
          respalda. Nunca reemplaza el criterio del analista, solo lo agiliza.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {versions.length > 1 && (
            <Select
              value={String(selectedVersion)}
              onValueChange={(v) => setSelectedVersion(Number(v))}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.version} value={String(v.version)}>
                    v{v.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={handleRegenerate} disabled={regenerating} variant="outline" className="gap-1.5">
            {regenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {versions.length === 0 ? 'Generar dossier' : 'Regenerar'}
          </Button>
        </div>
      </div>

      {regenerating && (
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-lg p-3">
          <Loader2 size={14} className="animate-spin" />
          {phase ? DEEP_SEARCH_PHASE_LABEL[phase] || phase : 'Escribiendo dossier...'}
        </div>
      )}

      {!current ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-10 text-center text-sm text-slate-500">
            Sin dossier generado todavía — usa &quot;Generar dossier&quot; sobre la evidencia ya
            reunida en este caso.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <FileText size={12} /> v{current.version} · {new Date(current.createdAt).toLocaleString('es-CO')} ·{' '}
            {current.model}
          </p>
          {current.content.sections.map((section, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5 space-y-3">
                <h3 className="text-sm font-bold text-primary">{section.heading}</h3>
                {section.paragraphs.map((p, j) => (
                  <div key={j} className="space-y-1.5">
                    <p className="text-sm text-slate-600 leading-relaxed">{p.text}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {p.evidenceIds.map((eid) => (
                        <button
                          key={eid}
                          type="button"
                          onClick={() => onJumpToEvidence(eid)}
                          className="text-[10px] font-mono bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
                        >
                          {eid.slice(0, 8)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">IA</Badge>
            Generado por {current.model} — cada afirmación cita evidencia real validada contra el
            caso; ninguna implica responsabilidad o culpabilidad por sí sola.
          </p>
        </div>
      )}
    </div>
  );
}
