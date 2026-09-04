'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldAlert,
  FileText,
  UserCheck,
  Paperclip,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { COMPLAINT_STATUS_CONFIG, COMPLAINT_TYPE_LABELS } from '@/components/dashboard/complaints/complaint-status.constants';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://usca.jurytechsolution.com';

interface TrackAttachment {
  url: string;
  fileName: string;
  mimeType: string;
  source: 'CITIZEN' | 'STAFF';
  createdAt: string;
}

interface TrackTimelineEvent {
  status: string;
  note: string | null;
  createdAt: string;
}

interface TrackResult {
  publicCode: string;
  type: string;
  status: string;
  subject: string;
  description: string;
  responseText: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  respondedAt: string | null;
  closedAt: string | null;
  attachments: TrackAttachment[];
  timeline: TrackTimelineEvent[];
}

function TrackComplaintContent() {
  // Deuda multi-tenant (Fase M4, ver memoria `deuda-multitenant-crm`): el
  // código público ya es único GLOBAL (no hace falta el slug para
  // desambiguar), pero se mantiene en la URL por consistencia con el resto
  // de rutas de esta organización — un slug inválido igual da 404 real.
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const searchParams = useSearchParams();

  const [code, setCode] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);

  const performSearch = useCallback(async (codeToSearch: string, docToSearch: string) => {
    if (!codeToSearch || !docToSearch) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await axios.get(
        `${API_URL}/public/organizations/${orgSlug}/complaints/track/${codeToSearch}`,
        { params: { documentNumber: docToSearch } },
      );
      setResult(response.data);
    } catch {
      toast.error('No encontrado', {
        description: 'Verifica que el código y el número de documento sean correctos.',
      });
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    const queryCode = searchParams.get('code');
    if (queryCode) setCode(queryCode);
  }, [searchParams]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(code, documentNumber);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* HEADER */}
      <div className="text-center mb-10 space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1B2541] text-[#FFC400] shadow-lg mb-2">
          <ShieldAlert size={32} />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#1B2541] tracking-tight">Consulta tu Caso</h1>
        <p className="text-slate-500 max-w-lg mx-auto text-lg leading-relaxed">
          Ingresa tu código de seguimiento <span className="font-mono bg-slate-200 px-1 rounded text-sm font-bold">DEN...</span>{' '}
          y tu número de cédula.
        </p>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <Card className="w-full max-w-lg shadow-xl border-t-4 border-t-[#FFC400] overflow-hidden">
        <CardContent className="p-6">
          <form onSubmit={handleManualSearch} className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
              <Input
                placeholder="Ej: DEN0002"
                className="pl-10 text-lg h-12 border-slate-300 focus:border-[#1B2541] focus:ring-[#1B2541]/20 placeholder:text-slate-300 uppercase"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="relative">
              <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
              <Input
                placeholder="Tu número de cédula"
                type="number"
                className="pl-10 text-lg h-12 border-slate-300 focus:border-[#1B2541] focus:ring-[#1B2541]/20"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-12 bg-[#1B2541] hover:bg-[#1B2541]/90 text-white font-bold"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Consultar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* RESULTADO */}
      {result && (
        <div className="w-full max-w-2xl mt-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <StatusCard result={result} />
        </div>
      )}

      <footer className="mt-16 text-sm text-slate-400 flex flex-col items-center gap-1">
        <p>&copy; 2026 Plataforma de Gestión Pública</p>
        <div className="w-10 h-1 bg-[#FFC400] rounded-full mt-2 opacity-50"></div>
      </footer>
    </div>
  );
}

export default function TrackComplaintPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-slate-500">Cargando...</div>}>
      <TrackComplaintContent />
    </Suspense>
  );
}

function StatusCard({ result }: { result: TrackResult }) {
  const statusConfig = COMPLAINT_STATUS_CONFIG[result.status] || COMPLAINT_STATUS_CONFIG.RECEIVED;
  const StatusIcon = result.status === 'CLOSED' ? CheckCircle2 : result.status === 'RESPONDED' ? CheckCircle2 : Clock;

  return (
    <Card className="overflow-hidden shadow-2xl border-0 ring-1 ring-slate-200">
      <CardHeader className="bg-slate-50 border-b border-slate-100 pb-6 pt-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex gap-2 mb-2">
              <Badge variant="outline" className="bg-white text-slate-500 border-slate-300">
                {COMPLAINT_TYPE_LABELS[result.type] || result.type}
              </Badge>
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold text-[#1B2541] capitalize">{result.subject}</CardTitle>
            <CardDescription className="font-mono mt-1 text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FFC400]"></span>
              Ref: <span className="font-bold text-slate-700">{result.publicCode}</span>
            </CardDescription>
          </div>
          <Badge className={`${statusConfig.badgeClass} px-4 py-1.5 text-sm font-medium shadow-sm border`}>
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="p-6 md:p-8 bg-white space-y-8">
          {/* ESTADO ACTUAL */}
          <div className="flex items-start gap-5 p-5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="p-3 rounded-full shrink-0 bg-slate-200">
              <StatusIcon className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <h4 className="font-bold text-[#1B2541] text-lg">Estado Actual</h4>
              <p className="text-slate-600 mt-1 text-sm">
                {result.status === 'RECEIVED' && 'Tu caso está en fila de espera y será asignado pronto.'}
                {result.status === 'ASSIGNED' && 'Un funcionario ha tomado tu caso y está trabajando en él.'}
                {result.status === 'IN_PROGRESS' && 'Tu caso está en trámite activo.'}
                {result.status === 'RESPONDED' && 'El funcionario asignado ya respondió tu caso.'}
                {result.status === 'CLOSED' && 'El caso ha finalizado y fue archivado.'}
              </p>
              <p className="text-xs text-slate-400 mt-3 flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3" />
                {new Date(result.createdAt).toLocaleDateString('es-CO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* DESCRIPCIÓN ORIGINAL */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4" /> Detalle de tu caso
            </h4>
            <div className="text-slate-700 leading-relaxed text-sm bg-slate-50/50 p-4 rounded-lg border border-slate-100 italic">
              &ldquo;{result.description}&rdquo;
            </div>
          </div>

          {/* ADJUNTOS PROPIOS */}
          {result.attachments.filter((a) => a.source === 'CITIZEN').length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Paperclip className="w-4 h-4" /> Tu evidencia adjunta
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.attachments
                  .filter((a) => a.source === 'CITIZEN')
                  .map((a) => (
                    <a
                      key={a.url}
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-2 py-1 flex items-center gap-1"
                    >
                      {a.fileName} <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
              </div>
            </div>
          )}

          {/* RESPUESTA OFICIAL */}
          {(result.responseText || result.status === 'RESPONDED' || result.status === 'CLOSED') && (
            <div className="relative mt-4">
              <div className="absolute -left-3 top-0 bottom-0 w-1 bg-[#1B2541] rounded-full opacity-20"></div>
              <div className="pl-6 space-y-2">
                <h4 className="text-sm font-bold text-[#1B2541] uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#FFC400]" /> Respuesta Oficial
                </h4>
                <div className="p-5 bg-blue-50/50 rounded-r-lg border-l-4 border-l-[#1B2541] text-slate-800 leading-relaxed text-sm shadow-sm">
                  {result.responseText || (
                    <span className="text-slate-500 italic">El caso ha sido cerrado sin notas públicas adicionales.</span>
                  )}
                </div>

                {result.attachments.filter((a) => a.source === 'STAFF').length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {result.attachments
                      .filter((a) => a.source === 'STAFF')
                      .map((a) => (
                        <a
                          key={a.url}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-2 py-1 flex items-center gap-1 text-blue-700"
                        >
                          {a.fileName} <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {result.status === 'CLOSED' && result.resolutionNotes && (
            <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800">{result.resolutionNotes}</p>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="bg-slate-50 flex justify-between py-4 border-t border-slate-100 px-8">
        <span className="text-[10px] text-slate-300 font-mono">Ref: {result.publicCode}</span>
        <Button variant="ghost" className="text-slate-500 hover:text-[#1B2541] h-8 text-xs" onClick={() => window.print()}>
          <FileText className="w-3 h-3 mr-2" /> Imprimir Comprobante
        </Button>
      </CardFooter>
    </Card>
  );
}
