/**
 * Contraste WCAG entre un color y blanco/negro — usado solo para ADVERTIR
 * en el preview de Personalización de Marca (decisión #7 de Fase 1: no
 * bloquea el guardado, solo informa). Fórmula estándar de luminancia
 * relativa (WCAG 2.1), sin dependencia nueva.
 */

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return null;
  const value = match[1];
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Ratio de contraste entre dos colores hex (1:1 a 21:1). `null` si algún hex es inválido. */
export function contrastRatio(hexA: string, hexB: string): number | null {
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);
  if (!rgbA || !rgbB) return null;

  const lumA = relativeLuminance(rgbA);
  const lumB = relativeLuminance(rgbB);
  const [lighter, darker] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * ¿Este color, usado como fondo con texto blanco encima (el caso real más
 * común acá: sidebar, botones), tiene contraste suficiente? Umbral 4.5:1
 * (WCAG AA para texto normal) — el más exigente de los dos que aplicarían,
 * a propósito: mejor advertir de más que de menos.
 */
export function hasLowContrastWithWhite(hex: string): boolean {
  const ratio = contrastRatio(hex, '#FFFFFF');
  return ratio !== null && ratio < 4.5;
}
