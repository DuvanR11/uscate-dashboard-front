'use client';

import { useEffect, useState } from 'react';
import { Loader2, Gauge } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PRIORITY_TIER_LABEL,
  PRIORITY_TIER_BADGE_CLASS,
  type PriorityTier,
} from '@/lib/priority-score';

// Plan "Puntaje de Prioridad de Prospectos" (2026-09-08) — NO es ML
// (verificado real: 0 casos positivos en `voteConfirmed`, ver memoria).
// Desglose real, nunca una caja negra: cada factor viene directo de
// `GET /prospects/:id/score-breakdown` (backend), la MISMA fórmula que
// calculó el puntaje guardado.
interface ScoreBreakdown {
  score: number;
  tier: PriorityTier;
  factors: { label: string; points: number }[];
  storedScore: number;
  isStale: boolean;
}

export function PriorityScoreCard({ prospectId }: { prospectId: string }) {
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<ScoreBreakdown>(`/prospects/${prospectId}/score-breakdown`);
        if (!cancelled) setBreakdown(res.data);
      } catch {
        // Card secundaria — un fallo acá no debe bloquear la edición del prospecto.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [prospectId]);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (!breakdown) return null;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base text-primary flex items-center gap-2">
          <Gauge className="h-4 w-4 text-secondary" />
          Puntaje de Prioridad
        </CardTitle>
        <Badge variant="outline" className={`font-bold ${PRIORITY_TIER_BADGE_CLASS[breakdown.tier]}`}>
          {PRIORITY_TIER_LABEL[breakdown.tier]} · {breakdown.score}/100
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-500">
          No es un modelo predictivo — es una fórmula real y transparente sobre señales de
          compromiso (asistencia, segmento, referidos, contacto verificado, recencia).
        </p>

        {breakdown.factors.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Todavía ninguna señal real registrada.</p>
        ) : (
          <ul className="space-y-1.5">
            {breakdown.factors.map((factor, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{factor.label}</span>
                <span className="font-semibold text-emerald-600">+{factor.points}</span>
              </li>
            ))}
          </ul>
        )}

        {breakdown.isStale && (
          <p className="text-[11px] text-amber-600 bg-amber-50 rounded-md px-2 py-1.5">
            Este desglose ya refleja los datos actuales ({breakdown.score} pts) — el puntaje
            guardado ({breakdown.storedScore} pts) se actualiza con el recálculo nocturno.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
