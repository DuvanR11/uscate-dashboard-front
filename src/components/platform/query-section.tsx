'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { extractErrorMessage } from '@/lib/api/platform';

export function QuerySection<T>({ title, load, children }: {
  title: string;
  load: () => Promise<T>;
  children: (data: T) => React.ReactNode;
}) {
  const [result, setResult] = useState<{ data?: T; error?: string; source?: () => Promise<T>; updatedAt?: string }>({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    load().then((data) => { if (current) setResult({ data, source: load, updatedAt: new Date().toISOString() }); })
      .catch((error) => { if (current) setResult({ source: load, error: extractErrorMessage(error) || 'No se pudo cargar esta sección' }); });
    return () => { current = false; };
  }, [load, attempt]);
  return <section className="rounded-xl border bg-card p-5 space-y-3" aria-label={title}>
    <h2 className="text-lg font-semibold">{title}</h2>
    {result.source !== load ? <p role="status" className="text-muted-foreground">Cargando…</p> : result.error ? <div role="alert"><p>{result.error}</p><Button type="button" variant="outline" onClick={() => { setResult({}); setAttempt((n) => n + 1); }}>Reintentar</Button></div>
      : result.data !== undefined ? children(result.data) : <p role="status" className="text-muted-foreground">Cargando…</p>}
    {result.source === load && result.updatedAt && <p className="text-xs text-muted-foreground">Consultado: {new Date(result.updatedAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>}
  </section>;
}
