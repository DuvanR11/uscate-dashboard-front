'use client';

import { useEffect } from 'react';
import { useBrandingStore } from '@/store/branding-store';

/**
 * Empuja el branding EFECTIVO (ya resuelto con fallback, `GET /branding`)
 * como variables CSS inline sobre `<html>` — gana por especificidad sobre
 * los valores por defecto de `globals.css` sin tocar el archivo en cada
 * carga. No dispara el fetch (eso lo hace quien monta este componente,
 * típicamente `(dashboard)/layout.tsx`, para poder gatear el primer
 * render y evitar el "flash" del tema por defecto — ver §7 del informe);
 * este componente solo REACCIONA a los datos ya cargados en el store.
 *
 * `--primary`/`--secondary` son los tokens de shadcn/ui que ya usan los
 * 24 componentes `ui/*` (botones, cards, badges, inputs, tablas...) — se
 * sobrescriben directo. `--brand-accent` es NUEVA a propósito: el
 * `--accent` de shadcn ya significa otra cosa (gris sutil de hover en
 * decenas de componentes), mapear el acento de marca ahí rompería esos
 * hovers — ver hallazgo de colisión en §1/§6 del informe.
 *
 * No toca `--primary-foreground`/`--secondary-foreground` (el color de
 * texto que va ENCIMA) — decisión de Fase 1 (#7): la validación de
 * contraste es una advertencia en el preview de la Fase 6, no un cálculo
 * automático acá.
 */
export function ApplyTheme() {
  const branding = useBrandingStore((s) => s.branding);

  useEffect(() => {
    if (!branding) return;

    const root = document.documentElement;
    root.style.setProperty('--primary', branding.primaryColor);
    root.style.setProperty('--secondary', branding.secondaryColor);
    root.style.setProperty('--brand-accent', branding.accentColor);
  }, [branding]);

  return null;
}
