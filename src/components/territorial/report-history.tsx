'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import api from '@/lib/api';
import { assertTerritorialReaderBinding, territorialReaderRoot } from '@/lib/api/territorial-reader';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import type { MunicipalResults } from '@/lib/api/territorial-results';

type Format = 'csv' | 'xlsx' | 'pdf';
type Report = {
  id: string; versionId: string; versionNumber: number; format: Format; contentHash: string; filename: string;
  requestedByEmail: string; state: 'PENDING' | 'GENERATING' | 'AVAILABLE' | 'FAILED' | 'EXPIRED';
  createdAt: string; expiresAt: string; bytes: number | null;
  fileHash: string | null; errorCode: string | null; downloadable: boolean;
};
type History = { items: Report[]; next: string | null };
const labels = { PENDING: 'Pendiente', GENERATING: 'Generando', AVAILABLE: 'Disponible', FAILED: 'Fallido', EXPIRED: 'Caducado' };
const date = (value: string) => new Date(value).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' });

export function ReportHistory({ datasetCode,version, onInvalidation }: { datasetCode:string;version: MunicipalResults['version']; onInvalidation: () => void }) {
  const token = useAuthStore(s => s.sessionId), userId = useAuthStore(s => s.user?.id), orgId = useAuthStore(s => s.user?.organizationId), impersonation = useAuthStore(s => s.impersonation);
  const owner = `${datasetCode}:${token}:${userId}:${orgId}:${Boolean(impersonation)}`,root=territorialReaderRoot(datasetCode)+'/reports';
  const [data, setData] = useState<History & { owner: string }>({ items: [], next: null, owner: '' });
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false), [revision, setRevision] = useState(0);
  const [historyError, setHistoryError] = useState('');
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const actions = useRef<AbortController | null>(null), keys = useRef(new Map<string, string>()), invalidate = useRef(onInvalidation);
  useEffect(() => { invalidate.current = onInvalidation; }, [onInvalidation]);
  useEffect(() => {
    setCursors([undefined]); setError(''); setHistoryError(''); setBusy(false); setBlocked(false); keys.current.clear();
    return () => { actions.current?.abort(); actions.current = null; };
  }, [owner, version.id, version.contentHash]);
  const cursor = cursors.at(-1);
  useEffect(() => {
    if (blocked || !token || impersonation) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    const identity = useAuthStore.getState();
    const current = () => live(controller, identity);
    async function load() {
      try {
        const response = await api.get<History>(root, { params: cursor ? { before: cursor } : {}, signal: controller.signal });
        assertTerritorialReaderBinding(response.data,datasetCode);
        if (current()) { setData({ ...response.data, owner }); setHistoryError(''); }
      } catch (failure) {
        if (!current()) return;
        const status = axios.isAxiosError(failure) ? failure.response?.status : undefined;
        if (status === 401 || status === 403) { setData({ items: [], next: null, owner }); setBlocked(true); invalidate.current(); }
        setHistoryError('No pudimos consultar el historial. Comprueba tu acceso e inténtalo de nuevo.');
      } finally { if (current()) timer = setTimeout(() => void load(), 5000); }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [owner, token, impersonation, cursor, revision, blocked,root,datasetCode]);
  function live(controller: AbortController, identity: ReturnType<typeof useAuthStore.getState>) {
    const current = useAuthStore.getState();
    return !controller.signal.aborted && current.sessionId === identity.sessionId && current.user?.id === identity.user?.id && current.user?.organizationId === identity.user?.organizationId && !current.impersonation;
  }
  async function action(format?: Format, row?: Report) {
    if (actions.current) return;
    const controller = new AbortController(), identity = useAuthStore.getState(); actions.current = controller;
    setBusy(true); setError('');
    try {
      if (format) {
        const scope = `${datasetCode}:${version.id}:${version.contentHash}:${format}`, key = keys.current.get(scope) ?? crypto.randomUUID(); keys.current.set(scope, key);
        const response=await api.post(root, { requestKey: key, versionId: version.id, contentHash: version.contentHash, format }, { signal: controller.signal });
        assertTerritorialReaderBinding(response.data,datasetCode);
        if (!live(controller, identity)) return;
        keys.current.delete(scope); setCursors([undefined]); setRevision(n => n + 1);
      } else if (row) {
        const response = await api.get<Blob>(`${root}/${row.id}/download`, { responseType: 'blob', signal: controller.signal });
        if (!live(controller, identity)) return;
        const mime = row.format === 'pdf' ? 'application/pdf' : row.format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (!String(response.headers['content-type']).startsWith(mime) || response.data.size !== row.bytes) throw new Error('INVALID_FILE');
        const digest = await crypto.subtle.digest('SHA-256', await response.data.arrayBuffer());
        const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
        if (hash !== row.fileHash) throw new Error('INVALID_HASH');
        if (!live(controller, identity)) return;
        const url = URL.createObjectURL(response.data), anchor = document.createElement('a');
        anchor.href = url; anchor.download = row.filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (failure) {
      if (!live(controller, identity)) return;
      const status = axios.isAxiosError(failure) ? failure.response?.status : undefined;
      setError(status === 410 ? 'El archivo caducó. Solicita otro informe.' : status === 429 ? 'Ya hay informes en proceso o se alcanzó el límite de solicitudes. Inténtalo más tarde.' : status === 403 || status === 409 ? 'El acceso o la publicación cambiaron. Actualiza la consulta.' : 'No pudimos completar la operación. Vuelve a intentarlo.');
      if (status === 403 || status === 409) { setBlocked(true); invalidate.current(); }
      setRevision(n => n + 1);
    } finally { if (actions.current === controller) { actions.current = null; if (!controller.signal.aborted) setBusy(false); } }
  }
  const items = data.owner === owner ? data.items : [], next = data.owner === owner ? data.next : null;
  return <section aria-label="Historial de informes municipales" className="space-y-4 rounded-lg border p-4">
    <h2 className="font-semibold">Informes del municipio completo</h2>
    <p className="text-sm">Incluyen las 17 agrupaciones, totales, fuentes y limitaciones de la versión {version.number}. La búsqueda visual no modifica el informe. Excel conserva los ceros iniciales. Los archivos son privados y caducan 24 horas después de solicitarlos; el historial se conserva.</p>
    <div className="flex flex-wrap gap-2">{(['csv', 'xlsx', 'pdf'] as const).map(format => <Button key={format} variant="outline" disabled={busy || blocked} onClick={() => void action(format)}>Solicitar {format === 'xlsx' ? 'Excel' : format.toUpperCase()}</Button>)}</div>
    {busy && <p role="status" className="text-sm">Comprobando acceso y procesando la solicitud…</p>}
    {(error || historyError) && <p role="alert" className="text-sm text-destructive">{error || historyError}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">Historial de informes</h3><Button variant="ghost" disabled={busy} onClick={() => { setBlocked(false); setRevision(n => n + 1); }}>Actualizar historial</Button></div>
    {data.owner !== owner ? <p role="status">Cargando historial…</p> : !items.length ? <p className="text-sm text-muted-foreground">Todavía no hay informes solicitados.</p> : <ul className="space-y-3">{items.map(row => {
      const expired = new Date(row.expiresAt).getTime() <= Date.now(), state = expired ? 'EXPIRED' : row.state;
      return <li key={row.id} className="space-y-2 rounded-md border p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><strong>{row.format === 'xlsx' ? 'Excel' : row.format.toUpperCase()} · {labels[state]}</strong><Button variant="outline" disabled={busy || blocked || expired || !row.downloadable} onClick={() => void action(undefined, row)}>Descargar archivo</Button></div>
        <p className="break-all">Solicitado por {row.requestedByEmail} · {date(row.createdAt)} (Colombia)</p>
        <p>Caduca: {date(row.expiresAt)} (Colombia){row.bytes ? ` · ${row.bytes.toLocaleString('es-CO')} bytes` : ''}</p>
        <p>Versión {row.versionNumber}</p>
        {state === 'FAILED' && <p role="status">{row.errorCode === 'GENERATION_INTERRUPTED' ? 'La generación se interrumpió. Solicita otro informe.' : 'No se completó la generación. Comprueba la publicación y solicita otro informe.'}</p>}
        {state === 'AVAILABLE' && !row.downloadable && <p>La publicación cambió. Solicita un informe de la versión vigente.</p>}
      </li>;
    })}</ul>}
    <div className="flex flex-wrap gap-2"><Button variant="ghost" disabled={busy || cursors.length === 1} onClick={() => setCursors(c => c.slice(0, -1))}>Más recientes</Button><Button variant="ghost" disabled={busy || !next} onClick={() => next && setCursors(c => [...c, next])}>Más antiguos</Button></div>
  </section>;
}
