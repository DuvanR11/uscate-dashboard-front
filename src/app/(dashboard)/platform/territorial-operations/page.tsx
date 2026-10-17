'use client';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { usePlatformAccess, usePlatformCapability } from '@/components/platform/access-context';
import { QuerySection } from '@/components/platform/query-section';
import { Button } from '@/components/ui/button';
import { getTerritorialOperations } from '@/lib/api/territorial-operations';

const states: Record<string, string> = { ACTIVE: 'Activo', ARCHIVED: 'Archivado', DRAFT: 'Borrador',
  PENDING_ORIGINAL: 'Original pendiente', DOCUMENT_PENDING: 'Revisión pendiente', DOCUMENT_REVIEWED: 'Documento revisado',
  REJECTED: 'Rechazado', WITHDRAWN: 'Retirado', PENDING_REVIEW: 'Revisión pendiente', DOCUMENTS_READY: 'Preparación registrada',
  OBSERVED: 'Con observaciones', REVIEWED: 'Revisado', PUBLISHED: 'Publicado', PENDING: 'En espera', GENERATING: 'Generando',
  FAILED: 'Fallido', COMPLETED: 'Completado', QUEUED: 'En cola', RUNNING: 'En ejecución' };
const at = (value: string | null) => value ? new Date(value).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : 'Sin registro';
function Counts({ values }: { values: Record<string, number> }) {
  return Object.keys(values).length ? <ul className="space-y-1">{Object.entries(values).map(([s,n]) => <li key={s}>{states[s] || s}: <strong>{n}</strong></li>)}</ul> : <p>Sin registros</p>;
}
export default function TerritorialOperationsPage() {
  const access = usePlatformAccess(), capable = usePlatformCapability('CATALOG_MANAGE');
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [refresh, setRefresh] = useState(0);
  const cursor = cursors[cursors.length - 1];
  const load = useCallback(() => { void refresh; return getTerritorialOperations(cursor); }, [cursor, refresh]);
  if (!capable || !access?.enabled || !access.allOrganizations)
    return <p className="p-6">Se requiere gestión del catálogo con alcance global para consultar esta operación.</p>;
  return <main className="min-w-0 space-y-5 p-4 md:p-6 break-words">
    <h1 className="text-2xl font-bold">Operación territorial</h1>
    <p>Consulta fuentes, preparación documental y publicaciones de varios territorios. Las advertencias ayudan a priorizar revisiones internas.</p>
    <Link className="text-primary underline" href="/platform/territorial-data">Administrar fuentes y revisiones territoriales</Link>
    <Button className="block" variant="outline" onClick={() => setRefresh(n => n + 1)}>Actualizar estado</Button>
    <QuerySection key={access.enabled + ':' + access.allOrganizations} title="Estado de la operación territorial" load={load}>{data => <>
      <p className="text-sm text-muted-foreground">Estado calculado: {at(data.checkedAt)}. Puede reutilizarse durante {data.cacheSeconds} segundos. Página {cursors.length}; hasta 20 conjuntos.</p>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-lg border p-4 space-y-2" aria-label="Cola global de informes">
          <h3 className="font-semibold">Cola global de informes</h3>
          <p>Trabajador: {data.reports.workerEnabled ? 'Habilitado' : 'Deshabilitado'}</p>
          {data.reports.states.length ? data.reports.states.map(row => <div key={row.state}>
            <p>{states[row.state] || row.state}: <strong>{row.count}</strong></p>
            {row.oldestAt && <p>Más antiguo: {at(row.oldestAt)}</p>}
            {row.expiredLeases > 0 && <p className="text-amber-700">Revisar: {row.expiredLeases} trabajos con concesión vencida.</p>}
          </div>) : <p>Sin informes pendientes, en generación o fallidos.</p>}
        </section>
        <section className="min-w-0 rounded-lg border p-4 space-y-2" aria-label="Comprobaciones remotas de Neiva">
          <h3 className="font-semibold">Comprobaciones remotas: solo Neiva</h3>
          <p>Última ejecución: {data.remoteMonitoring.lastRun ? states[data.remoteMonitoring.lastRun.status] || data.remoteMonitoring.lastRun.status : 'Sin registro'}</p>
          <p>Última completada: {at(data.remoteMonitoring.lastCompletedAt)}</p>
          <p>Trabajador: {data.remoteMonitoring.workerEnabled ? 'Habilitado' : 'Deshabilitado'}</p>
          <p>Programación: {data.remoteMonitoring.schedule?.enabled ? 'Activa' : 'Inactiva'}. Próxima: {at(data.remoteMonitoring.schedule?.nextRunAt ?? null)}</p>
          {data.remoteMonitoring.stale && <p className="text-amber-700">Revisar: no hay comprobación completa vigente.</p>}
          {data.remoteMonitoring.interrupted && <p className="text-amber-700">Revisar: ejecución con concesión vencida.</p>}
          {data.remoteMonitoring.schedule?.blockedReason && <p>Programación bloqueada: {data.remoteMonitoring.schedule.blockedReason}</p>}
          <p className="text-sm">Los demás conjuntos aún no tienen comprobaciones remotas configuradas.</p>
        </section>
      </div>
      {!data.items.length && <p>No hay conjuntos en esta página del catálogo.</p>}
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">{data.items.map(item => <article key={item.code} aria-label={'Operación ' + item.code} className="min-w-0 rounded-lg border p-4 space-y-3">
        <h3 className="text-lg font-semibold">{item.name}</h3>
        <Link className="text-primary underline" href={'/platform/territorial-monitoring?dataset='+encodeURIComponent(item.code)}>Configurar monitoreo de este conjunto</Link>
        <p className="text-sm">{item.election.name} · {item.corporation.name} · {item.territory.name} ({item.territory.code})</p>
        <p className="text-xs text-muted-foreground break-all">{item.code} · {states[item.state] || item.state} · Revisión {item.revision}</p>
        <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
          <div><dt className="font-medium">Fuentes regionales</dt><dd><Counts values={item.sources} /></dd></div>
          <div><dt className="font-medium">Preparación documental</dt><dd><Counts values={item.documentary} /><p>Con cambios en sus antecedentes: {item.changedDocumentaryCases}</p></dd></div>
          <div><dt className="font-medium">Versiones registradas</dt><dd><Counts values={item.versions} /></dd></div>
          <div><dt className="font-medium">Ejercicios sintéticos</dt><dd><Counts values={item.syntheticExercises} /><p className="text-xs">No son resultados oficiales.</p></dd></div>
        </dl>
        <p>Lector regional implementado: {item.readerImplemented ? 'Sí' : 'Pendiente'}. La consulta por organizaciones depende de su acceso y publicación vigente.</p>
        {item.warnings.length ? <ul aria-label="Advertencias internas" className="list-disc pl-5 space-y-1 text-sm">{item.warnings.map(w => <li key={w.code}>{w.message}</li>)}</ul> : <p>Sin advertencias del catálogo y flujo documental.</p>}
      </article>)}</div>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" disabled={cursors.length === 1} onClick={() => setCursors(previous => previous.slice(0,-1))}>Página anterior</Button>
        <Button variant="outline" disabled={!data.next} onClick={() => { if (data.next) setCursors(previous => [...previous, data.next!]); }}>Página siguiente</Button>
      </div>
      <aside className="rounded-lg bg-muted p-4"><h3 className="font-semibold">Alcance de los indicadores</h3><ul className="list-disc pl-5 space-y-1 text-sm">{data.limitations.map(s => <li key={s}>{s}</li>)}</ul></aside>
    </>}</QuerySection>
  </main>;
}
