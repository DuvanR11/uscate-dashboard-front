'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Los términos de «Incluir» o «Excluir» de una etiqueta, como chips (hasta
 * 6). Lo usan el asistente de monitoreo y «Seguir en medios» de un proyecto
 * del Radar (Fase 5, 2026-11-09).
 */
export function TermList({
  id,
  label,
  tone,
  terms,
  onChange,
}: {
  id: string;
  label: string;
  tone: 'include' | 'exclude';
  terms: string[];
  onChange: (terms: string[]) => void;
}) {
  const [value, setValue] = useState('');
  const full = terms.length >= 6;

  function add() {
    const term = value.trim().replace(/\s+/g, ' ');
    if (term.length < 2) return;
    if (!terms.some((t) => t.toLowerCase() === term.toLowerCase())) onChange([...terms, term.slice(0, 60)]);
    setValue('');
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex min-h-7 flex-wrap gap-1.5">
        {terms.length === 0 && <span className="text-xs text-slate-400">Ninguno</span>}
        {terms.map((term) => (
          <span
            key={term}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs',
              tone === 'include'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-red-300 bg-red-50 text-red-800',
            )}
          >
            {term}
            <button
              type="button"
              onClick={() => onChange(terms.filter((t) => t !== term))}
              aria-label={`Quitar ${term} de ${label}`}
              className="rounded-full p-0.5 hover:bg-black/5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          maxLength={60}
          disabled={full}
          placeholder={full ? 'Máximo 6' : tone === 'include' ? 'Otra forma de decirlo' : 'Palabra que descarta'}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          className="h-8 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          disabled={full || value.trim().length < 2}
          aria-label={`Agregar a ${label}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
