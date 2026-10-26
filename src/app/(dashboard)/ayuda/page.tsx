'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useHelpGuides } from '@/hooks/use-help-guides';
import { GUIDE_GROUPS, GUIDES_VERSION, groupName, searchKey } from '@/lib/help-guides';

// Centro de ayuda (Fase 5 del plan de formación, 2026-10-26): las guías paso a
// paso que puede usar cada persona, con buscador. El contenido sale de las
// mismas fuentes que los PDF.
export default function HelpCenterPage() {
  const { guides, operator } = useHelpGuides();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const words = searchKey(query).split(/\s+/).filter(Boolean);
    if (!words.length) return guides;
    return guides.filter((guide) => {
      const haystack = searchKey(`${guide.title} ${guide.lead} ${guide.audience}`);
      return words.every((word) => haystack.includes(word));
    });
  }, [guides, query]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" /> Centro de ayuda
        </h1>
        <p className="text-slate-600">
          Guías paso a paso para las tareas que puedes hacer en Zyron. En cada pantalla, el botón{' '}
          <strong>?</strong> de arriba te muestra las guías de esa pantalla.
        </p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input
          type="search"
          aria-label="Buscar una guía"
          placeholder="Busca por tarea: contactos, evento, difusión, contraseña…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
          No hay guías con «{query}». Prueba con otra palabra o pide ayuda a soporte.
        </p>
      ) : (
        GUIDE_GROUPS.map((group) => {
          const items = filtered.filter((guide) => guide.group === group.id);
          if (!items.length) return null;
          return (
            <section key={group.id} className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">{groupName(group.id, operator)}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {items.map((guide) => (
                  <li key={guide.slug}>
                    <Link
                      href={`/ayuda/${guide.slug}`}
                      className="flex h-full flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span className="font-semibold text-foreground">{guide.title}</span>
                      <span className="text-sm text-slate-600">{guide.lead}</span>
                      <span className="mt-auto pt-1 text-xs text-slate-400">
                        Guía {guide.n} · {guide.minutes} min
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      <p className="text-xs text-slate-400">Guías {GUIDES_VERSION}. Las capturas son de una campaña de práctica.</p>
    </div>
  );
}
