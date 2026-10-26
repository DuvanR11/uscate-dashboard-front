'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useHelpGuides } from '@/hooks/use-help-guides';

/** Botón «?» del encabezado: las guías de la pantalla abierta y el centro de ayuda. */
export function HelpButton() {
  const pathname = usePathname() ?? '';
  const { forPath } = useHelpGuides();
  const [open, setOpen] = useState(false);
  const here = pathname.startsWith('/ayuda') ? [] : forPath(pathname).slice(0, 5);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ayuda" className="text-slate-500 hover:text-foreground">
          <CircleHelp className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">
            {here.length ? 'Guías de esta pantalla' : 'Ayuda'}
          </p>
          {!here.length && (
            <p className="text-xs text-slate-500">Esta pantalla no tiene una guía propia todavía.</p>
          )}
        </div>
        {here.length > 0 && (
          <ul className="py-1">
            {here.map((guide) => (
              <li key={guide.slug}>
                <Link
                  href={`/ayuda/${guide.slug}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-sm hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                >
                  <span className="block font-medium text-foreground">{guide.title}</span>
                  <span className="block text-xs text-slate-500">{guide.minutes} min</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-slate-100 p-2">
          <Link
            href="/ayuda"
            onClick={() => setOpen(false)}
            className="block rounded-md px-2 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:outline-none"
          >
            Ver todas las guías
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
