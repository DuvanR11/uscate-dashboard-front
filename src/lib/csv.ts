// Fase 0 del análisis de punta a punta (2026-10-28, CRM-20): una celda que
// empieza por `=`, `+`, `-`, `@`, tabulador o retorno de carro la abre Excel
// (o Google Sheets, LibreOffice) como FÓRMULA. Un contacto registrado desde un
// formulario público con nombre `=HYPERLINK("https://…","Clic")` se ejecutaba
// en el computador de quien descargaba el archivo. Todo CSV que arma el
// navegador pasa sus celdas por aquí.
//
// Es la misma regla que el servidor (`api-uscate-back/src/common/utils/
// csv-cell.util.ts`): si cambia una, cambia la otra.

/** Primer carácter con el que una hoja de cálculo interpreta una fórmula. */
const FORMULA_START = /^\s*[=+\-@\t\r]/;

/**
 * Un número o un teléfono puro (`+573001234567`, `-12.5`, `300 123 4567`) no
 * es una fórmula: se deja tal cual para no dañar las listas de teléfonos.
 */
const PLAIN_NUMBER = /^[+-]?[\d ().,-]*\d[\d ().,-]*$/;

/** Hace falta encerrar la celda entre comillas. */
const NEEDS_QUOTES = /[",;\r\n]/;

/** Texto de la celda, sin comillas: le antepone `'` si parece una fórmula. */
export function neutralizeCsvFormula(text: string): string {
  if (!FORMULA_START.test(text) || PLAIN_NUMBER.test(text)) return text;
  return `'${text}`;
}

/**
 * Celda CSV segura: vacía para null/undefined, sin fórmulas y con comillas
 * donde hacen falta (coma, punto y coma, comilla o salto de línea).
 * `alwaysQuote` la encierra siempre (para los archivos que ya iban así).
 */
export function safeCsvCell(
  value: string | number | boolean | Date | null | undefined,
  { alwaysQuote = false }: { alwaysQuote?: boolean } = {},
): string {
  if (value === null || value === undefined) return alwaysQuote ? '""' : '';
  if (typeof value === 'number' || typeof value === 'boolean') {
    return alwaysQuote ? `"${value}"` : String(value);
  }
  const text = value instanceof Date ? value.toISOString() : neutralizeCsvFormula(value);
  return alwaysQuote || NEEDS_QUOTES.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Una fila CSV con celdas seguras, separadas por coma. */
export function safeCsvRow(
  values: ReadonlyArray<string | number | boolean | Date | null | undefined>,
  options?: { alwaysQuote?: boolean },
): string {
  return values.map((value) => safeCsvCell(value, options)).join(',');
}
