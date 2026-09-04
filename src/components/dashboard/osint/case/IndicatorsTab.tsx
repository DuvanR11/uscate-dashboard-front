'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listIndicators, recomputeIndicators, extractErrorMessage, type Indicator, type IndicatorSeverity } from '@/lib/api/osint';

const SEVERITY_VARIANT: Record<IndicatorSeverity, 'destructive' | 'secondary' | 'outline'> = {
  HIGH: 'destructive',
  MEDIUM: 'secondary',
  LOW: 'outline',
};

const SEVERITY_LABEL: Record<IndicatorSeverity, string> = { HIGH: 'Alta', MEDIUM: 'Media', LOW: 'Baja' };

export default function IndicatorsTab({
  caseId,
  onJumpToEvidence,
}: {
  caseId: string;
  onJumpToEvidence: (evidenceId: string) => void;
}) {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  useEffect(() => {
    listIndicators(caseId)
      .then(setIndicators)
      .catch((err) => toast.error(extractErrorMessage(err) || 'No se pudieron cargar los indicadores'))
      .finally(() => setLoading(false));
  }, [caseId]);

  const handleRecompute = async () => {
    if (!window.confirm('¿Recalcular los indicadores de este caso? Reemplaza el set anterior.')) return;
    setRecomputing(true);
    try {
      setIndicators(await recomputeIndicators(caseId));
      toast.success('Indicadores recalculados');
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudieron recalcular los indicadores');
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          Indicadores explicables — cada uno cita las Evidence IDs reales que lo sustentan, nunca un
          score único. Ninguno implica responsabilidad o culpabilidad por sí solo.
        </p>
        <Button onClick={handleRecompute} disabled={recomputing} variant="outline" className="shrink-0 gap-1.5">
          {recomputing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Recalcular
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : indicators.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-10 text-center text-sm text-slate-500">
            Sin indicadores calculados todavía — usa &quot;Recalcular&quot;.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {indicators.map((ind) => (
            <Card key={ind.id} className="border-0 shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-sm text-primary flex items-center gap-1.5">
                  <AlertTriangle size={16} className="text-slate-400" /> {ind.code}
                </CardTitle>
                <Badge variant={SEVERITY_VARIANT[ind.severity]}>{SEVERITY_LABEL[ind.severity]}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">{ind.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Confianza</span>
                  <Badge variant="outline" className="text-[10px]">{ind.confidence}</Badge>
                </div>
                {ind.evidenceIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {ind.evidenceIds.map((eid) => (
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
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
