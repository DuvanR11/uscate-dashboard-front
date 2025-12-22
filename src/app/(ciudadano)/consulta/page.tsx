'use client';

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation"; 
import axios from "axios"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, CheckCircle2, Clock, AlertCircle, ShieldCheck, FileText } from "lucide-react";
import { toast } from "sonner";

// 1. Interfaz actualizada según tu JSON
interface TrackResult {
  publicCode: string;
  accessKey: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  subject: string;
  description: string; // <--- Agregado para mostrar "pruebapruebaprueba"
  createdAt: string;
  responseComments?: string | null;
  type: string;
  externalCode?: string | null;
}

function TrackPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);

  const performSearch = useCallback(async (codeToSearch: string) => {
    if (!codeToSearch) return;
    
    setLoading(true);
    setResult(null);
    setCode(codeToSearch);

    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100'}/requests/track/${codeToSearch}`;
      const response = await axios.get(url);
      setResult(response.data.data || response.data); // Ajuste por si el backend devuelve directo o anidado
    } catch (error) {
      toast.error("No encontrado", {
        description: "El código ingresado no existe o es incorrecto."
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Detección automática de URL
  useEffect(() => {
    const dynamicKey = params?.key as string; // /consulta/[key]
    const queryKey = searchParams.get('key') || searchParams.get('code'); // /consulta?key=...

    const autoCode = dynamicKey || queryKey;

    if (autoCode) {
        performSearch(autoCode);
    }
  }, [params, searchParams, performSearch]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(code);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      
      {/* HEADER */}
      <div className="text-center mb-10 space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1B2541] text-[#FFC400] shadow-lg mb-2">
          <ShieldCheck size={32} />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#1B2541] tracking-tight">
            Consulta tu Trámite
        </h1>
        <p className="text-slate-500 max-w-lg mx-auto text-lg leading-relaxed">
          Ingresa el código de seguimiento <span className="font-mono bg-slate-200 px-1 rounded text-sm font-bold">USCA...</span> o usa tu enlace personal.
        </p>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <Card className="w-full max-w-lg shadow-xl border-t-4 border-t-[#FFC400] overflow-hidden">
        <CardContent className="p-6">
          <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <Input 
                  placeholder="Ej: USCA0002" 
                  className="pl-10 text-lg h-12 border-slate-300 focus:border-[#1B2541] focus:ring-[#1B2541]/20 placeholder:text-slate-300 uppercase"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
            </div>
            <Button 
                type="submit" 
                size="lg" 
                className="h-12 bg-[#1B2541] hover:bg-[#1B2541]/90 text-white font-bold min-w-[120px]" 
                disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : "Rastrear"}
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

      {/* FOOTER */}
      <footer className="mt-16 text-sm text-slate-400 flex flex-col items-center gap-1">
        <p>&copy; 2025 Plataforma de Gestión Pública</p>
        <div className="w-10 h-1 bg-[#FFC400] rounded-full mt-2 opacity-50"></div>
      </footer>
    </div>
  );
}

// 2. Export default con Suspense
export default function TrackPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-slate-500">Cargando...</div>}>
      <TrackPageContent />
    </Suspense>
  );
}

// --- COMPONENTE VISUAL DEL RESULTADO ---
function StatusCard({ result }: { result: TrackResult }) {
  
  const statusConfig = {
    PENDING:     { color: "bg-amber-500", text: "text-amber-600", label: "Recibido", icon: Clock, description: "Tu solicitud está en fila de espera y será asignada pronto." },
    IN_PROGRESS: { color: "bg-blue-600",  text: "text-blue-600",  label: "En Gestión", icon: Loader2, description: "Un funcionario ha tomado tu caso y está trabajando en él." },
    RESOLVED:    { color: "bg-emerald-600", text: "text-emerald-600", label: "Resuelto", icon: CheckCircle2, description: "El trámite ha finalizado exitosamente." },
    CLOSED:      { color: "bg-slate-600",   text: "text-slate-600",   label: "Cerrado", icon: AlertCircle, description: "El caso ha sido cerrado o archivado." },
  };

  const currentStatus = statusConfig[result.status] || statusConfig.PENDING;
  const StatusIcon = currentStatus.icon;

  return (
    <Card className="overflow-hidden shadow-2xl border-0 ring-1 ring-slate-200">
      
      {/* HEADER */}
      <CardHeader className="bg-slate-50 border-b border-slate-100 pb-6 pt-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex gap-2 mb-2">
                <Badge variant="outline" className="bg-white text-slate-500 border-slate-300">
                    {result.type}
                </Badge>
                {result.externalCode && (
                    <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                        Rad: {result.externalCode}
                    </Badge>
                )}
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold text-[#1B2541] capitalize">
                {result.subject}
            </CardTitle>
            <CardDescription className="font-mono mt-1 text-slate-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FFC400]"></span>
                Ref: <span className="font-bold text-slate-700">{result.publicCode}</span>
            </CardDescription>
          </div>
          <Badge className={`${currentStatus.color} text-white px-4 py-1.5 text-sm font-medium shadow-sm`}>
            {currentStatus.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="p-6 md:p-8 bg-white space-y-8">
            
            {/* ESTADO ACTUAL */}
            <div className="flex items-start gap-5 p-5 rounded-xl bg-slate-50 border border-slate-100">
                <div className={`p-3 rounded-full shrink-0 ${currentStatus.color} bg-opacity-10`}>
                    <StatusIcon className={`h-6 w-6 ${currentStatus.text}`} />
                </div>
                <div>
                    <h4 className="font-bold text-[#1B2541] text-lg">Estado Actual</h4>
                    <p className="text-slate-600 mt-1 text-sm">{currentStatus.description}</p>
                    <p className="text-xs text-slate-400 mt-3 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(result.createdAt).toLocaleDateString('es-CO', { 
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                    </p>
                </div>
            </div>

            {/* DESCRIPCIÓN ORIGINAL DEL USUARIO */}
            <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Detalle de tu solicitud
                </h4>
                <div className="text-slate-700 leading-relaxed text-sm bg-slate-50/50 p-4 rounded-lg border border-slate-100 italic">
                    "{result.description}"
                </div>
            </div>

            {/* RESPUESTA OFICIAL (Solo si existe o está resuelto) */}
            {(result.responseComments || result.status === 'RESOLVED' || result.status === 'CLOSED') && (
                <div className="relative mt-4">
                    <div className="absolute -left-3 top-0 bottom-0 w-1 bg-[#1B2541] rounded-full opacity-20"></div>
                    <div className="pl-6 space-y-2">
                        <h4 className="text-sm font-bold text-[#1B2541] uppercase tracking-wider flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-[#FFC400]" />
                            Respuesta Oficial
                        </h4>
                        <div className="p-5 bg-blue-50/50 rounded-r-lg border-l-4 border-l-[#1B2541] text-slate-800 leading-relaxed text-sm shadow-sm">
                            {result.responseComments 
                                ? result.responseComments 
                                : <span className="text-slate-500 italic">El caso ha sido cerrado sin notas públicas adicionales.</span>
                            }
                        </div>
                    </div>
                </div>
            )}
        </div>
      </CardContent>
      
      <CardFooter className="bg-slate-50 flex justify-between py-4 border-t border-slate-100 px-8">
        <span className="text-[10px] text-slate-300 font-mono">ID: {result.accessKey?.slice(0, 8)}...</span>
        <Button variant="ghost" className="text-slate-500 hover:text-[#1B2541] h-8 text-xs" onClick={() => window.print()}>
          <FileText className="w-3 h-3 mr-2" /> Imprimir Comprobante
        </Button>
      </CardFooter>
    </Card>
  );
}