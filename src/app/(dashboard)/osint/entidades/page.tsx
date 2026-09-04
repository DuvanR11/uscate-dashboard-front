'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, UserSearch, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  listMatchCandidates,
  reviewMatchCandidate,
  getMatchMetrics,
  extractErrorMessage,
  type EntityMatchCandidate,
  type EntityMatchStatus,
  type MatchMethod,
  type MatchMetric,
} from '@/lib/api/osint';

const METHOD_LABEL: Record<MatchMethod, string> = {
  DOCUMENT_NUMBER: 'Documento exacto',
  NAME_AND_CONTEXT: 'Nombre + contexto',
  NAME_ONLY: 'Solo nombre',
  EMBEDDING_SIMILARITY: 'Similitud semántica (IA)',
};

function maskDocumentNumber(doc: string | null | undefined): string {
  if (!doc) return '—';
  const last4 = doc.slice(-4);
  return `${'•'.repeat(Math.max(0, doc.length - 4))}${last4}`;
}

export default function EntityResolutionPage() {
  const [candidates, setCandidates] = useState<EntityMatchCandidate[]>([]);
  const [metrics, setMetrics] = useState<Record<MatchMethod, MatchMetric> | null>(null);
  const [status, setStatus] = useState<EntityMatchStatus>('PENDING');
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = async (s: EntityMatchStatus = status) => {
    setLoading(true);
    try {
      const [c, m] = await Promise.all([listMatchCandidates(s), getMatchMetrics()]);
      setCandidates(c);
      setMetrics(m);
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo cargar la cola de revisión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReview = async (candidate: EntityMatchCandidate, decision: 'APPROVE' | 'REJECT') => {
    const verb = decision === 'APPROVE' ? 'aprobar' : 'rechazar';
    if (!window.confirm(`¿Confirmas que quieres ${verb} este candidato de coincidencia?`)) return;

    setReviewingId(candidate.id);
    try {
      await reviewMatchCandidate(candidate.id, decision);
      setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
      toast.success(decision === 'APPROVE' ? 'Candidato aprobado' : 'Candidato rechazado');
      getMatchMetrics().then(setMetrics).catch(() => undefined);
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo registrar la revisión');
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
        <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
          <UserSearch className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Resolución de entidades</h1>
          <p className="text-slate-500 text-sm">
            Cola de revisión humana — aprobar o rechazar que 2 registros son la misma persona/empresa nunca
            se decide solo, ni siquiera por similitud semántica de IA.
          </p>
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(metrics) as MatchMethod[]).map((method) => {
            const m = metrics[method];
            return (
              <Card key={method} className="border-0 shadow-md ring-1 ring-slate-100">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{METHOD_LABEL[method]}</p>
                  <p className="text-2xl font-black text-primary">
                    {m.approvalRate === null ? '—' : `${Math.round(m.approvalRate * 100)}%`}
                  </p>
                  <p className="text-[11px] text-slate-400">tasa de aprobación real</p>
                  <div className="flex gap-2 text-[10px]">
                    <Badge variant="secondary">{m.CONFIRMED} aprobados</Badge>
                    <Badge variant="outline">{m.PENDING} pendientes</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Select value={status} onValueChange={(v) => { setStatus(v as EntityMatchStatus); load(v as EntityMatchStatus); }}>
          <SelectTrigger className="w-[180px] bg-slate-50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pendientes</SelectItem>
            <SelectItem value="CONFIRMED">Aprobados</SelectItem>
            <SelectItem value="PROBABLE">Probables</SelectItem>
            <SelectItem value="POSSIBLE">Posibles</SelectItem>
            <SelectItem value="REJECTED">Rechazados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-0 shadow-md ring-1 ring-slate-100">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
          ) : candidates.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">Sin candidatos en este estado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sujeto entrante</TableHead>
                  <TableHead>Entidad candidata</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Razón</TableHead>
                  {status === 'PENDING' && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-medium">{c.subjectName}</p>
                      <p className="text-xs text-slate-400">
                        {c.subjectType} · {maskDocumentNumber(c.subjectDocumentNumber)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{c.entity.canonicalName}</p>
                      <p className="text-xs text-slate-400">
                        {c.entity.type} · {maskDocumentNumber(c.entity.documentNumber)}
                      </p>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{METHOD_LABEL[c.matchMethod]}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{(c.matchScore * 100).toFixed(0)}%</TableCell>
                    <TableCell className="max-w-xs">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-slate-500">{c.matchReason.slice(0, 40)}...</summary>
                        <p className="mt-1 text-slate-600">{c.matchReason}</p>
                        <pre className="mt-2 bg-slate-950 text-slate-100 p-2 rounded overflow-auto max-h-32 text-[10px]">
                          {JSON.stringify({ matchingAttributes: c.matchingAttributes, conflictingAttributes: c.conflictingAttributes }, null, 2)}
                        </pre>
                      </details>
                    </TableCell>
                    {status === 'PENDING' && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reviewingId === c.id}
                            onClick={() => handleReview(c, 'APPROVE')}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            {reviewingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reviewingId === c.id}
                            onClick={() => handleReview(c, 'REJECT')}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
