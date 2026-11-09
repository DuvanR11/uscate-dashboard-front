import { Radio, Tv } from 'lucide-react';
import type { InboxReach, OutletReach } from '@/lib/api/news-inbox';

/**
 * Monitoreo de medios, Fase 5 punto 2 (2026-11-09): el alcance del medio
 * según el catálogo de Zyron. Un medio de tu departamento pesa como uno
 * nacional en el orden de Hoy.
 */
export const REACH_OPTIONS: { key: InboxReach; label: string }[] = [
  { key: 'NACIONAL', label: 'Nacional' },
  { key: 'HOME', label: 'De tu departamento' },
  { key: 'REGIONAL', label: 'Regional' },
  { key: 'LOCAL', label: 'Local' },
  { key: 'NONE', label: 'Sin clasificar' },
];

export function reachLabel(reach: OutletReach): string {
  if (reach.level === 'NACIONAL') return 'Nacional';
  const level = reach.level === 'REGIONAL' ? 'Regional' : 'Local';
  return reach.home ? `${level} · tu departamento` : level;
}

export function ReachBadge({ reach }: { reach: OutletReach | null | undefined }) {
  if (!reach) return null;
  const strong = reach.level === 'NACIONAL' || reach.home;
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
        strong ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
      }`}
      title="Alcance del medio según el catálogo de Zyron"
    >
      {reachLabel(reach)}
    </span>
  );
}

/**
 * Fase 5 punto 3 (2026-11-09): una nota de radio o televisión que el equipo
 * cargó a mano. Lleva su etiqueta para no confundirla con una nota escrita.
 */
export function MediumBadge({ medium }: { medium: string | null | undefined }) {
  if (medium !== 'RADIO' && medium !== 'TV') return null;
  const Icon = medium === 'RADIO' ? Radio : Tv;
  return (
    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
      <Icon className="h-3 w-3" aria-hidden />
      {medium === 'RADIO' ? 'Radio' : 'TV'}
    </span>
  );
}

/** El texto del enlace de una nota de radio o TV: lleva al clip. */
export function clipLabel(medium: string | null | undefined): string | null {
  if (medium === 'RADIO') return 'Escuchar el clip';
  if (medium === 'TV') return 'Ver el clip';
  return null;
}
