// Plan "Puntaje de Prioridad de Prospectos" (2026-09-08) — NO es ML: mismos
// umbrales reales que `PRIORITY_TIER` en el backend
// (`prospect-scoring.service.ts`), duplicados a propósito solo para
// decidir el badge — el puntaje guardado en `Prospect.priorityScore` es
// la única fuente de verdad, calculada por el cron nocturno
// (`ProspectScoreScheduler`).
export const PRIORITY_TIER_THRESHOLDS = {
  ALTA_MIN: 60,
  MEDIA_MIN: 30,
} as const;

export type PriorityTier = 'ALTA' | 'MEDIA' | 'BAJA';

export function scoreToPriorityTier(score: number): PriorityTier {
  if (score >= PRIORITY_TIER_THRESHOLDS.ALTA_MIN) return 'ALTA';
  if (score >= PRIORITY_TIER_THRESHOLDS.MEDIA_MIN) return 'MEDIA';
  return 'BAJA';
}

export const PRIORITY_TIER_LABEL: Record<PriorityTier, string> = {
  ALTA: 'Alta',
  MEDIA: 'Media',
  BAJA: 'Baja',
};

export const PRIORITY_TIER_BADGE_CLASS: Record<PriorityTier, string> = {
  ALTA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MEDIA: 'bg-amber-50 text-amber-700 border-amber-200',
  BAJA: 'bg-slate-50 text-slate-500 border-slate-200',
};
