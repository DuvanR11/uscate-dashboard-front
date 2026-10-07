'use client';

import { useCallback, useState } from 'react';
import { apiGet } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { usageDecimal, usageLabel } from '@/lib/provider-usage';
import { QuerySection } from './query-section';

interface StorageGroup { scope: string; organizationId: string | null; category: string; bytes: string; objects: number; }
type StorageReport = { available: false; reason: string } | {
  available: true; environment: string; startedAt: string; completedAt: string; stale: boolean;
  bytes: string; objects: number; scopeTotals: { scope: string; bytes: string; objects: number }[];
  items: StorageGroup[]; total: number; page: number; pageSize: number;
};
const categories: Record<string, string> = { DOCUMENTS: 'Documentos y versiones de la aplicación', OSINT: 'Documentos OSINT', BRANDING: 'Marca y logos', MEDIA: 'Multimedia y evidencias', BACKUPS: 'Respaldos de plataforma', OUTSIDE_ENVIRONMENT: 'Fuera del ambiente actual', MEDIA_OR_OTHER: 'Multimedia y otros' };

export function StorageUsagePanel({ organizationId }: { organizationId: string }) {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const load = useCallback(() => {
    const query = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (organizationId.trim()) query.set('organizationId', organizationId.trim());
    return apiGet<StorageReport>(`/platform/storage-usage?${query}`);
  }, [organizationId, page]);
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Almacenamiento observado</h2><Button type="button" variant="outline" onClick={() => setRevision(n => n + 1)}>Actualizar muestra visible</Button></div>
    <p className="text-sm text-muted-foreground">Última muestra disponible, independiente de las fechas y filtros de envíos. Aplica únicamente el filtro de organización. Actualizar consulta la muestra guardada; no recorre el bucket.</p>
    <QuerySection key={revision} title="Inventario de almacenamiento" load={load}>{report => {
      if (!report.available) return <p role="status" className="text-muted-foreground">{report.reason === 'NOT_CONFIGURED' ? 'Recolección de almacenamiento sin configurar.' : 'Todavía no hay una muestra de almacenamiento. Pendiente de la primera recolección.'} No equivale a uso cero.</p>;
      const pages = Math.max(1, Math.ceil(report.total / report.pageSize));
      return <div className="space-y-4">
        <p className="text-xs text-muted-foreground">Ambiente de atribución: {report.environment}. Observado desde {report.startedAt} hasta {report.completedAt} (UTC).</p>
        {report.stale && <p role="status" className="rounded-md border border-amber-300 p-3 text-sm">La muestra tiene más de 36 horas. Puede haber altas o eliminaciones posteriores.</p>}
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Bytes observados en el ámbito autorizado</p><p className="text-2xl font-semibold break-all">{usageDecimal(report.bytes)} bytes</p></div><div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Objetos actuales observados</p><p className="text-2xl font-semibold">{report.objects.toLocaleString('es-CO')}</p></div></div>
        <p className="text-xs text-muted-foreground">Calidad: tamaños reportados por el proveedor. Incluye objetos actuales, cada clave una vez. No incluye versiones históricas de S3, cargas multipart incompletas, disco del servidor, transferencia ni GB-mes facturados. El listado se observa durante un intervalo y puede cambiar mientras se recorre. Atribución parcial: multimedia sin organización verificable permanece sin atribuir; no prueba ausencia de archivos de una organización.</p>
        <div className="flex flex-wrap gap-3 text-sm">{report.scopeTotals.map(s => <p key={s.scope} className="rounded-lg bg-muted p-3">{usageLabel(s.scope)}: {usageDecimal(s.bytes)} bytes · {s.objects} objetos</p>)}</div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Ámbito / organización', 'Categoría', 'Objetos', 'Bytes'].map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead><tbody>{report.items.map((g, i) => <tr key={i} className="border-t"><td className="px-3 py-3 break-all">{usageLabel(g.scope)}<p className="text-xs text-muted-foreground">{g.organizationId ?? 'Sin organización atribuida'}</p></td><td className="px-3 py-3">{categories[g.category] ?? g.category}</td><td className="px-3 py-3">{g.objects}</td><td className="px-3 py-3">{usageDecimal(g.bytes)}</td></tr>)}</tbody></table></div>
        {!report.items.length && <p className="text-sm text-muted-foreground">La muestra no contiene objetos atribuidos a este ámbito.</p>}
        <p className="text-xs text-muted-foreground">En el ámbito global, los respaldos se cuentan una sola vez y los objetos fuera del ambiente actual se separan. No hay valoración monetaria: tarifa, moneda y factura siguen pendientes. Los bytes de muestras distintas no se suman.</p>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm">Página {report.page} de {pages} · {report.total} grupos</p><div className="flex gap-2"><Button variant="outline" disabled={report.page <= 1} onClick={() => setPage(n => n - 1)}>Grupos anteriores</Button><Button variant="outline" disabled={report.page >= pages} onClick={() => setPage(n => n + 1)}>Grupos siguientes</Button></div></div>
      </div>;
    }}</QuerySection>
  </div>;
}
