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

const ACTION_LABEL: Record<string, string> = {
  CASE_CREATED: 'Caso creado',
  CASE_UPDATED: 'Caso actualizado',
  CASE_DELETED: 'Caso eliminado',
  SUBJECT_ADDED: 'Sujeto agregado',
  SUBJECT_REMOVED: 'Sujeto eliminado',
  EVIDENCE_CREATED: 'Evidencia registrada',
  RELATIONSHIP_CREATED: 'Relación registrada',
  MATCH_CANDIDATE_REVIEWED: 'Candidato de identidad revisado',
  MONITOR_CREATED: 'Monitor creado',
  MONITOR_DELETED: 'Monitor eliminado',
  MONITOR_PAUSED: 'Monitor pausado',
  MONITOR_RESUMED: 'Monitor reanudado',
  SEARCH_EXECUTED: 'Búsqueda ejecutada',
};

const ENTITY_LABEL: Record<string, string> = {
  InvestigationCase: 'Caso',
  Evidence: 'Evidencia',
  EntityRelationship: 'Relación',
  EntityMatchCandidate: 'Candidato de identidad',
  CaseMonitor: 'Monitor',
  Investigation: 'Búsqueda ad-hoc',
};

function describeMetadata(entry: OsintAuditLogEntry): string {
  const m = entry.metadata ?? {};
  switch (entry.action) {
    case 'CASE_CREATED':
    case 'CASE_UPDATED':
      return (m.title as string) || '';
    case 'EVIDENCE_CREATED':
      return `${m.sourceKey ?? ''} · ${m.evidenceType ?? ''}`;
    case 'RELATIONSHIP_CREATED':
      return `${m.relationshipType ?? ''}`;
    case 'MATCH_CANDIDATE_REVIEWED':
      return `${m.decision ?? ''} (${m.matchMethod ?? ''})`;
    case 'MONITOR_CREATED':
    case 'SEARCH_EXECUTED':
      return `${m.query ?? ''}`;
    default:
      return '';
  }
}

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
            <h1 className="text-2xl font-black text-primary tracking-tight">Auditoría OSINT</h1>
            <p className="text-slate-500 text-sm">
              {total} acción{total !== 1 ? 'es' : ''} registrada{total !== 1 ? 's' : ''} en tu organización.
            </p>
          </div>
        </div>

        <Select value={action} onValueChange={(v) => { setAction(v); load({ page: 1, action: v }); }}>
          <SelectTrigger className="w-[220px] bg-slate-50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas las acciones</SelectItem>
            {Object.entries(ACTION_LABEL).map(([value, label]) => (
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
                      <Badge variant="outline">{ACTION_LABEL[e.action] ?? e.action}</Badge>
                      {e.entityType && (
                        <p className="text-[10px] text-slate-400 mt-1">{ENTITY_LABEL[e.entityType] ?? e.entityType}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{describeMetadata(e)}</TableCell>
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
