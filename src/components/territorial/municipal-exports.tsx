'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { usePermission } from '@/hooks/use-permission';
import { Button } from '@/components/ui/button';
import type { MunicipalResults } from '@/lib/api/territorial-results';

export function MunicipalExports({ version, onInvalidation }: { version: MunicipalResults['version']; onInvalidation: () => void }) {
  const role = useAuthStore(s => s.user?.role?.code);
  const impersonation = useAuthStore(s => s.impersonation);
  const read = usePermission('DASHBOARD');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  if (!read || impersonation || !['ADMIN', 'SUPER_ADMIN'].includes(role ?? '')) return null;
  async function download(format: 'csv' | 'xlsx' | 'pdf') {
    if (request.current) return;
    const controller = new AbortController(); request.current = controller;
    const identity = useAuthStore.getState();
    setBusy(true); setError('');
    try {
      const response = await api.get<Blob>('/organization/territorial-data/results/export', {
        params: { format, versionId: version.id, contentHash: version.contentHash }, responseType: 'blob', signal: controller.signal,
      });
      const current = useAuthStore.getState();
      if (controller.signal.aborted || current.token !== identity.token || current.user?.id !== identity.user?.id || current.user?.organizationId !== identity.user?.organizationId || current.impersonation) return;
      const expectedType = format === 'pdf' ? 'application/pdf' : format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      if (!String(response.headers['content-type']).startsWith(expectedType) || !response.data.size) throw new Error('INVALID_FILE');
      const url = URL.createObjectURL(response.data), anchor = document.createElement('a');
      anchor.href = url; anchor.download = `neiva-concejo-2023-v${version.number}-${version.contentHash.slice(0, 12)}.${format}`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      if (controller.signal.aborted) return;
      const status = axios.isAxiosError(failure) ? failure.response?.status : undefined;
      if (status === 403 || status === 404 || status === 409) {
        setError('El acceso o la publicación cambiaron. Actualiza la consulta antes de descargar.'); onInvalidation();
      } else setError(status === 503 ? 'Ya se está generando un informe. Vuelve a intentarlo en unos segundos.' : 'No pudimos descargar el informe. Vuelve a intentarlo.');
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return <section aria-label="Descargar informe municipal" className="space-y-3 rounded-lg border p-4">
    <h2 className="font-semibold">Informe del municipio completo</h2>
    <p className="text-sm">Incluye las 17 agrupaciones, totales, fuentes y limitaciones de la versión {version.number}. El filtro de búsqueda y el orden visual no modifican la descarga. Excel conserva los ceros iniciales de los códigos.</p>
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => void download('csv')}>Descargar CSV</Button><Button variant="outline" disabled={busy} onClick={() => void download('xlsx')}>Descargar Excel</Button><Button variant="outline" disabled={busy} onClick={() => void download('pdf')}>Descargar PDF</Button></div>
    {busy && <p role="status" className="text-sm">Preparando informe y comprobando acceso vigente…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}
