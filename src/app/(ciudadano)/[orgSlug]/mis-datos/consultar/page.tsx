'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, ShieldCheck, UserCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://usca.jurytechsolution.com';

const REQUEST_TYPE_LABEL: Record<string, string> = {
  ACCESO: 'Acceso',
  RECTIFICACION: 'Rectificación',
  CANCELACION: 'Cancelación',
  OPOSICION: 'Oposición',
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  PENDIENTE: { label: 'Pendiente', className: 'bg-slate-100 text-slate-600 border-slate-300', icon: Clock },
  EN_REVISION: { label: 'En revisión', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
  RESUELTA: { label: 'Resuelta', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  RECHAZADA: { label: 'Rechazada', className: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
};

interface TrackResult {
  publicCode: string;
  requestType: string;
  status: string;
  submittedAt: string;
  dueAt: string;
  extendedDueAt: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
}

function TrackDataSubjectRequestContent() {
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
        `${API_URL}/public/organizations/${orgSlug}/habeas-data/requests/track/${codeToSearch}`,
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
      <div className="text-center mb-10 space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1B2541] text-[#FFC400] shadow-lg mb-2">
          <ShieldCheck size={32} />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#1B2541] tracking-tight">Consulta tu Solicitud</h1>
        <p className="text-slate-500 max-w-lg mx-auto text-lg leading-relaxed">
          Ingresa tu código <span className="font-mono bg-slate-200 px-1 rounded text-sm font-bold">HD...</span>{' '}
          y tu número de cédula.
        </p>
      </div>

      <Card className="w-full max-w-lg shadow-xl border-t-4 border-t-[#FFC400] overflow-hidden">
        <CardContent className="p-6">
          <form onSubmit={handleManualSearch} className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
              <Input
                placeholder="Ej: HD0002"
                className="pl-10 text-lg h-12 uppercase"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="relative">
              <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
              <Input
                placeholder="Tu número de cédula"
                type="number"
                className="pl-10 text-lg h-12"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" className="h-12 bg-[#1B2541] hover:bg-[#1B2541]/90 text-white font-bold" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Consultar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <div className="w-full max-w-lg mt-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <ResultCard result={result} />
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: TrackResult }) {
  const status = STATUS_CONFIG[result.status] ?? STATUS_CONFIG.PENDIENTE;
  const StatusIcon = status.icon;
  const effectiveDueAt = result.extendedDueAt ?? result.dueAt;

  return (
    <Card className="overflow-hidden shadow-2xl border-0 ring-1 ring-slate-200">
      <CardHeader className="bg-slate-50 border-b border-slate-100">
        <div className="flex justify-between items-center gap-4">
          <div>
            <Badge variant="outline" className="bg-white text-slate-500 border-slate-300 mb-2">
              {REQUEST_TYPE_LABEL[result.requestType] ?? result.requestType}
            </Badge>
            <CardDescription className="font-mono text-slate-500">
              Ref: <span className="font-bold text-slate-700">{result.publicCode}</span>
            </CardDescription>
          </div>
          <Badge className={`${status.className} px-3 py-1.5 border flex items-center gap-1.5`}>
            <StatusIcon className="h-3.5 w-3.5" /> {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="text-sm text-slate-500">
          Enviada el {new Date(result.submittedAt).toLocaleDateString('es-CO', { dateStyle: 'long' })}
        </div>
        {result.status !== 'RESUELTA' && result.status !== 'RECHAZADA' && (
          <div className="text-sm text-slate-600">
            Plazo legal de respuesta: <strong>{new Date(effectiveDueAt).toLocaleDateString('es-CO', { dateStyle: 'long' })}</strong>
          </div>
        )}
        {result.resolutionNotes && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700">
            {result.resolutionNotes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TrackDataSubjectRequestPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-slate-500">Cargando...</div>}>
      <TrackDataSubjectRequestContent />
    </Suspense>
  );
}
