'use client';

// Recorrido de alta (Fase 3, 2026-10-17): las páginas públicas de una campaña
// (registro, denuncia, mis datos, eventos, consulta, invitaciones) salían con
// "Bienvenido" y los colores de Zyron: el ciudadano no sabía de quién era el
// formulario. El servidor manda la marca pública (`PublicBrand`) y aquí se
// pinta: barra con logo y nombre, y los colores de la campaña en los botones.
import * as React from 'react';
import { DEFAULT_BRANDING } from '@/lib/api/branding';

export interface PublicBrand {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Variables de color de la campaña para envolver una página pública. */
export function brandStyle(brand: PublicBrand | null | undefined): React.CSSProperties | undefined {
  if (!brand) return undefined;
  const style: Record<string, string> = {};
  if (HEX.test(brand.primaryColor)) {
    style['--primary'] = brand.primaryColor;
    style['--ring'] = brand.primaryColor;
    // Igual que en el panel (ApplyTheme): los bloques oscuros toman el color
    // principal solo si la campaña tiene colores propios.
    if (brand.primaryColor.toLowerCase() !== DEFAULT_BRANDING.primaryColor.toLowerCase()) {
      style['--ink'] = brand.primaryColor;
    }
  }
  if (HEX.test(brand.secondaryColor)) {
    style['--secondary'] = brand.secondaryColor;
    style['--brand-accent'] = brand.secondaryColor;
  }
  return style as React.CSSProperties;
}

function initials(name: string) {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return (words[0]?.[0] ?? '') + (words[1]?.[0] ?? '');
}

/** Logo (o iniciales) y nombre de la campaña. */
export function CampaignMark({
  brand,
  size = 'md',
  onDark = false,
}: {
  brand: PublicBrand;
  size?: 'md' | 'lg';
  /** Sobre un fondo oscuro (cabecera de la página de un evento). */
  onDark?: boolean;
}) {
  const box = size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-sm';
  return (
    <div className="flex min-w-0 items-center gap-3">
      {brand.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo subido por la campaña (URL externa): next/image no aplica
        <img
          src={brand.logoUrl}
          alt=""
          className={`${box} shrink-0 rounded-lg bg-white object-contain`}
        />
      ) : (
        <span
          aria-hidden="true"
          className={`${box} flex shrink-0 items-center justify-center rounded-lg font-bold uppercase ${onDark ? 'bg-white text-primary' : 'bg-primary text-primary-foreground'}`}
        >
          {initials(brand.name)}
        </span>
      )}
      <span
        className={`truncate font-semibold ${onDark ? 'text-white' : 'text-slate-900'} ${size === 'lg' ? 'text-lg' : 'text-base'}`}
      >
        {brand.name}
      </span>
    </div>
  );
}

/** Barra superior de las páginas públicas de una campaña. */
export function CampaignBar({ brand }: { brand: PublicBrand }) {
  return (
    <header className="border-b-2 border-primary bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
        <CampaignMark brand={brand} />
      </div>
    </header>
  );
}

const PublicBrandContext = React.createContext<PublicBrand | null>(null);

export const PublicBrandProvider = PublicBrandContext.Provider;

/** Marca de la campaña de la página pública actual (null si no se pudo leer). */
export function usePublicBrand() {
  return React.useContext(PublicBrandContext);
}
