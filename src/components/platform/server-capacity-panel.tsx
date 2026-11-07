'use client';
// Fase 7 del plan de finanzas (2026-11-08): capacidad del servidor contra los
// umbrales del plan (procesador p95 > 70 %, memoria libre < 20 %, latencia
// p95 > 800 ms, colas > 5 min, disco > 50 %). Lo mide y lo decide el servidor
// (`server-capacity.ts`); aquí solo se muestra.
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QuerySection } from './query-section';
import { getServerCapacity, type CapacityEvaluation } from '@/lib/api/operational-alerts';

const resources: Record<string, string> = { cpu: 'Procesador (p95, última hora)', memory: 'Memoria libre (mediana, 15 min)', latency: 'Latencia de la API (p95, última hora)', disk: 'Disco usado' };
export const serverResourceLabel = (resource: string) => resources[resource] ?? (resource.startsWith('queue:') ? `Cola ${resource.slice(6)} (espera del trabajo listo más antiguo)` : resource);
const decimal = (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 1 });
export function serverValue(resource: string, value: number | null) {
  if (value === null || value === undefined) return 'Sin dato';
  if (resource === 'latency') return value > 5000 ? 'más de 5.000 ms' : `${decimal(value)} ms`;
  if (resource.startsWith('queue:')) return `${decimal(value)} min`;
  return `${decimal(value)} %`;
}
const statuses: Record<CapacityEvaluation['status'], string> = { OK: 'Dentro del umbral', OVER: 'Pasa el umbral', INSUFFICIENT: 'Sin muestras suficientes' };

function Evaluation({ e }: { e: CapacityEvaluation }) {
  const excluded = Number(e.detail.nightlySamplesExcluded ?? 0);
  return <li className={`rounded border p-3 text-sm ${e.status === 'OVER' ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}`}>
    <p className="font-medium">{serverResourceLabel(e.resource)}</p>
    <p>{serverValue(e.resource, e.value)} · umbral {serverValue(e.resource, e.threshold)} · <span className={e.status === 'OVER' ? 'font-semibold' : ''}>{statuses[e.status]}</span></p>
    <p className="text-xs text-muted-foreground">{e.resource === 'latency' ? `${e.samples.toLocaleString('es-CO')} solicitudes` : `${e.samples.toLocaleString('es-CO')} muestras`}{excluded > 0 ? ` · ${excluded} muestras de la ventana nocturna sin contar` : ''}</p>
  </li>;
}

export function ServerCapacityPanel() {
  const [revision, setRevision] = useState(0);
  return <QuerySection key={revision} title="Capacidad del servidor" load={getServerCapacity}>{report => <div className="space-y-3">
    {!report.sampling && <p role="status" className="rounded border border-amber-300 p-3 text-sm">El muestreo está apagado: se activa con la observación automática de alertas.</p>}
    <ul className="grid gap-2 sm:grid-cols-2">{report.evaluations.map(e => <Evaluation key={e.resource} e={e} />)}</ul>
    <p className="text-xs text-muted-foreground">Una muestra por minuto del equipo completo (2 núcleos, 4 GB). Procesador y latencia no cuentan la ventana nocturna de 22:00 a 5:30 de Colombia, cuando corren a propósito la ingesta y el OCR. Una cola se da por atrasada solo si dos muestras seguidas pasan de 5 minutos. Cada recurso da como máximo una alerta por día. {report.lastSampleAt ? `Última muestra: ${new Date(report.lastSampleAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}.` : 'Todavía no hay muestras.'}</p>
    <details className="text-xs"><summary className="cursor-pointer">Colas que no se vigilan</summary><ul className="mt-2 space-y-1">{Object.entries(report.unwatchedQueues).map(([name, reason]) => <li key={name}><span className="font-medium">{name}</span>: {reason}</li>)}</ul></details>
    <Button variant="outline" onClick={() => setRevision(n => n + 1)}>Volver a consultar</Button>
  </div>}</QuerySection>;
}
