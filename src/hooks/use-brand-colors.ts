'use client';

import { useBrandingStore } from '@/store/branding-store';
import { DEFAULT_BRANDING } from '@/lib/api/branding';

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

/**
 * Colores de marca como VALORES reales (no clases Tailwind) — para
 * consumidores que necesitan un string de color de verdad y no pueden usar
 * `bg-primary`/`text-secondary`: `recharts` (`fill`/`stroke`/`stopColor`),
 * Leaflet (`pathOptions`), códigos QR, gradientes SVG, estilos inline.
 *
 * Lee directo de `useBrandingStore` (Fase 5) — no vuelve a pedir nada por
 * su cuenta, y es reactivo: si el branding efectivo cambia (ej. recién
 * resolvió el fetch inicial), cualquier componente que use este hook se
 * re-renderiza con los colores correctos. Mientras el branding todavía no
 * cargó, cae al mismo default de plataforma que ya vive en `globals.css`
 * (nunca queda con un color vacío/inventado — ver §7 del informe
 * "Personalización de Marca").
 */
export function useBrandColors(): BrandColors {
  const branding = useBrandingStore((s) => s.branding);
  return {
    primary: branding?.primaryColor ?? DEFAULT_BRANDING.primaryColor,
    secondary: branding?.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
    accent: branding?.accentColor ?? DEFAULT_BRANDING.accentColor,
  };
}
