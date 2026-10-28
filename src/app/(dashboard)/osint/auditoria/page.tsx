'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { History, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listAuditLogs, extractErrorMessage, type OsintAuditLogEntry } from '@/lib/api/osint';
import {
  OSINT_ACTION_LABEL,
  describeOsintAuditMetadata,
  osintActionLabel,
  osintEntityLabel,
} from '@/components/dashboard/osint/audit-labels';

export default function OsintAuditLogPage() {
  const [entries, setEntries] = useState<OsintAuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('__all__');
  const [loading, setLoading] = useState(true);

  const load = async (opts?: { page?: number; action?: string }) => {
    setLoading(true);
    try {
      const p = opts?.page ?? page;
      const a = opts?.action ?? action;
      const result = await listAuditLogs({ page: p, action: a === '__all__' ? undefined : a });
      setEntries(result.data);
      setTotal(result.total);
      setPage(result.page);
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo cargar el feed de auditoría');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
            <History className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Auditoría OSINT</h1>
            <p className="text-slate-500 text-sm">
              {total} acción{total !== 1 ? 'es' : ''} registrada{total !== 1 ? 's' : ''} en tu organización.
            </p>
          </div>
        </div>

        <Select value={action} onValueChange={(v) => { setAction(v); load({ page: 1, action: v }); }}>
          <SelectTrigger className="w-full sm:w-[280px] bg-slate-50" aria-label="Filtrar por acción"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas las acciones</SelectItem>
            {Object.entries(OSINT_ACTION_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-0 shadow-md ring-1 ring-slate-100">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
          ) : entries.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">Sin actividad registrada todavía.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Acción</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Badge variant="outline">{osintActionLabel(e.action)}</Badge>
                      {e.entityType && (
                        <p className="text-[10px] text-slate-400 mt-1">{osintEntityLabel(e.entityType)}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{describeOsintAuditMetadata(e)}</TableCell>
                    <TableCell className="text-xs text-slate-500">{e.user?.fullName ?? e.user?.email ?? '—'}</TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {new Date(e.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {total > entries.length && !loading && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load({ page: page - 1 })}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => load({ page: page + 1 })}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
