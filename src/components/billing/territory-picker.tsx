'use client';

import { useEffect, useState } from 'react';
import { Loader2, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Catálogo territorial (2026-09-29): la tarifa de cada plan sale de la
// categoría de la Contaduría (CGN) del municipio o departamento. Este
// selector busca por nombre o código DIVIPOLA y muestra de una vez la
// categoría y si se puede cotizar automáticamente (en conflicto o sin
// registro, no). La búsqueda viene por parámetro: el panel de plataforma usa
// la ruta con sesión y la página pública /planes la ruta pública.

export type TerritoryScope = 'NONE' | 'MUNICIPAL' | 'DEPARTMENT' | 'CHAMBER' | 'NATIONAL';

export interface TerritoryChoice {
  code: string;
  name: string;
  level: 'MUNICIPAL' | 'DEPARTMENT';
  departmentName?: string | null;
  category: string | null;
  quotable?: boolean;
  issue?: string | null;
}

const BOGOTA_CODE = '11001';

export const CATEGORY_LABEL = (category: string | null | undefined) =>
  category === 'E'
    ? 'Especial'
    : category === 'U'
      ? 'Única'
      : category === 'N'
        ? 'Nacional'
        : category
          ? `Categoría ${category}`
          : 'Sin categoría';

const titleCase = (value: string) =>
  value.toLowerCase().replace(/(^|[\s(.-])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());

export const territoryName = (t: Pick<TerritoryChoice, 'name' | 'departmentName'>) =>
  `${titleCase(t.name)}${t.departmentName ? `, ${titleCase(t.departmentName)}` : ''}`;

export const SCOPE_PLACEHOLDER: Record<TerritoryScope, string> = {
  NONE: '',
  NATIONAL: '',
  MUNICIPAL: 'Busca el municipio o distrito',
  DEPARTMENT: 'Busca el departamento',
  CHAMBER: 'Busca el departamento (o Bogotá)',
};

export function TerritoryPicker({
  scope,
  value,
  onChange,
  search,
  disabled,
}: {
  scope: TerritoryScope;
  value: TerritoryChoice | null;
  onChange: (value: TerritoryChoice | null) => void;
  search: (level: 'MUNICIPAL' | 'DEPARTMENT' | undefined, q: string) => Promise<TerritoryChoice[]>;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TerritoryChoice[]>([]);
  const [loading, setLoading] = useState(false);

  const level = scope === 'MUNICIPAL' ? 'MUNICIPAL' : scope === 'DEPARTMENT' ? 'DEPARTMENT' : undefined;

  const q = query.trim();
  // Con menos de 2 letras no se busca ni se muestra nada (sin reiniciar estado).
  const visibleResults = q.length >= 2 ? results : [];

  useEffect(() => {
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      search(level, q)
        .then((rows) => {
          if (cancelled) return;
          // Cámara: departamentos y Bogotá D.C. (distrito, sin departamento).
          setResults(
            scope === 'CHAMBER'
              ? rows.filter((r) => r.level === 'DEPARTMENT' || r.code === BOGOTA_CODE)
              : rows,
          );
        })
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, level, scope, search]);

  if (scope === 'NONE' || scope === 'NATIONAL') {
    return (
      <p className="rounded-md border border-dashed px-3 py-2 text-xs text-slate-500">
        {scope === 'NONE' ? 'Tarifa única en cualquier ubicación.' : 'Tarifa única nacional.'}
      </p>
    );
  }

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border bg-slate-50 px-3 py-2 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{territoryName(value)}</span>
          <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
            {CATEGORY_LABEL(value.category)}
          </span>
        </span>
        {!disabled && (
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => onChange(null)}>
            <X className="mr-1 h-3.5 w-3.5" /> Cambiar
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={SCOPE_PLACEHOLDER[scope]}
          aria-label={SCOPE_PLACEHOLDER[scope]}
        />
        {loading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
      </div>
      {visibleResults.length > 0 && (
        <ul className="max-h-56 overflow-y-auto rounded-md border bg-white text-sm shadow-sm">
          {visibleResults.map((t) => (
            <li key={t.code}>
              <button
                type="button"
                disabled={t.quotable === false}
                onClick={() => {
                  onChange(t);
                  setQuery('');
                  setResults([]);
                }}
                className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="min-w-0">
                  <span className="block truncate">{territoryName(t)}</span>
                  {t.issue && <span className="block text-[11px] text-amber-700">{t.issue}</span>}
                </span>
                <span className="shrink-0 text-[11px] font-semibold text-slate-500">
                  {CATEGORY_LABEL(t.category)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.length >= 2 && !loading && visibleResults.length === 0 && (
        <p className="text-xs text-slate-400">Sin resultados.</p>
      )}
    </div>
  );
}
