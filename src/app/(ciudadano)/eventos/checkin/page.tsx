'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams, useRouter } from 'next/navigation'; // IMPORTANTE
import { Suspense } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Scanner } from '@yudiel/react-qr-scanner'; 
import { 
  Search, CheckCircle2, XCircle, Loader2, 
  Shield, ScanLine, RotateCcw, Camera, AlertTriangle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

// --- SONIDOS ---
const playSound = (type: 'success' | 'error') => {
    // const audio = new Audio(type === 'success' ? '/sounds/success.mp3' : '/sounds/error.mp3');
    // audio.play().catch(e => console.log(e));
};

function CheckInLogic() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 1. OBTENEMOS EL SLUG DE LA URL (OBLIGATORIO)
  const urlSlug = searchParams.get('slug');

  // Si no hay slug, devolvemos al selector (Seguridad)
  useEffect(() => {
      if (!urlSlug) {
          toast.error("Seleccione un evento primero");
          // Asegúrate de tener esta ruta creada o cámbiala a donde deban ir
          router.push('/dashboard/logistics');
      }
  }, [urlSlug, router]);

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [scanOpen, setScanOpen] = useState(false);

  const { register, handleSubmit, reset, setFocus, setValue } = useForm();
  
  useEffect(() => {
      if (!scanOpen) { 
          setFocus('documentNumber');
      }
  }, [result, setFocus, scanOpen]);

  // Lógica principal de validación (API)
  const onSearch = async (data: any) => {
    if(!data.documentNumber) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      // 2. Prioridad: Slug del QR (si es JSON) > Slug de la URL > Default
      const eventToUse = data.eventSlug || urlSlug;

      if (!eventToUse) {
          toast.error("Error: No se identificó el evento.");
          return;
      }

      const res = await api.post('/events/check-in', { 
        documentNumber: data.documentNumber,
        eventSlug: eventToUse 
      });
      
      const successData = {
        status: 'SUCCESS',
        person: res.data.prospect,
        timestamp: new Date().toLocaleTimeString()
      };

      setResult(successData);
      setHistory(prev => [successData, ...prev].slice(0, 5));
      playSound('success');
      toast.success("Ingreso Autorizado");
      
      reset(); 

    } catch (error: any) {
      const isAlreadyCheckedIn = error.response?.data?.status === 'ALREADY_CHECKED_IN';
      
      const errorData = {
        status: isAlreadyCheckedIn ? 'WARNING' : 'ERROR',
        message: error.response?.data?.message || 'No encontrado en lista',
        person: error.response?.data?.prospect 
      };
      setResult(errorData);
      playSound('error');
    } finally {
      setLoading(false);
    }
  };

  // 3. Lógica de Escaneo (Soporta JSON inteligente y texto plano)
  const handleScan = (detectedCodes: any[]) => {
      if (detectedCodes && detectedCodes.length > 0) {
          const rawValue = detectedCodes[0].rawValue; 
          
          if (rawValue) {
              setScanOpen(false);
              
              // Intentar leer JSON del nuevo QR inteligente
              try {
                  const jsonData = JSON.parse(rawValue);
                  if (jsonData.id) {
                      setValue('documentNumber', jsonData.id);
                      // Si el QR trae evento (s), lo usamos. Si no, usamos el de la URL.
                      onSearch({ documentNumber: jsonData.id, eventSlug: jsonData.s || urlSlug });
                      return;
                  }
              } catch (e) {
                  // No es JSON, es cédula plana
              }

              // Fallback manual (QR viejo o solo cédula)
              setValue('documentNumber', rawValue);
              onSearch({ documentNumber: rawValue, eventSlug: urlSlug }); 
          }
      }
  };

  if (!urlSlug) return null; // Evita renderizar si no hay evento seleccionado

  return (
    <div className="min-h-screen bg-slate-950 p-4 flex flex-col md:flex-row gap-6 relative">
      
      {/* HEADER FLOTANTE DEL EVENTO */}
      <div className="fixed top-4 left-4 z-50">
           <span className="bg-[#1B2541] text-[#FFC400] border border-[#FFC400]/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               Evento: {urlSlug.replace(/-/g, ' ')}
           </span>
      </div>

      {/* SECCIÓN IZQUIERDA */}
      <div className="w-full md:w-2/3 flex flex-col items-center justify-center pt-12 md:pt-0">
        
        <div className="mb-8 text-center">
             <h1 className="text-white text-3xl font-black tracking-wider flex items-center justify-center gap-3">
                <Shield className="h-8 w-8 text-[#FFC400]" />
                LOGÍSTICA
             </h1>
             <p className="text-slate-400 text-sm">Punto de Control de Acceso</p>
        </div>

        {/* INPUT GIGANTE */}
        <Card className="w-full max-w-lg p-2 bg-white/5 border-white/10 backdrop-blur-md shadow-2xl mb-8">
            <form onSubmit={handleSubmit((data) => onSearch({ ...data, eventSlug: urlSlug }))} className="flex gap-2">
                <div className="relative w-full">
                    <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-6 w-6 animate-pulse" />
                    <Input 
                        {...register('documentNumber', { required: true })}
                        type="number" 
                        placeholder="Digitar Cédula..." 
                        autoComplete="off"
                        className="h-20 pl-14 text-3xl font-black text-center tracking-[0.15em] bg-slate-900 text-[#FFC400] border-slate-700 focus:border-[#FFC400] focus:ring-[#FFC400]/20 rounded-xl"
                    />
                </div>
                <Button type="submit" size="icon" disabled={loading} className="h-20 w-20 bg-[#FFC400] hover:bg-yellow-500 text-[#1B2541] rounded-xl shrink-0 shadow-lg">
                    {loading ? <Loader2 className="animate-spin h-8 w-8" /> : <Search className="h-8 w-8" />}
                </Button>
            </form>

            {/* BOTÓN ACTIVAR CÁMARA */}
            <div className="mt-4 flex justify-center">
                <Dialog open={scanOpen} onOpenChange={setScanOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full h-12 border-slate-700 bg-slate-800 text-white hover:bg-slate-700 hover:text-[#FFC400] uppercase tracking-widest font-bold">
                            <Camera className="mr-2 h-5 w-5" /> Abrir Escáner QR
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-black border-slate-800 text-white sm:max-w-md p-0 overflow-hidden">
                        <DialogHeader className="p-4 bg-slate-900 absolute top-0 w-full z-10 bg-opacity-80">
                            <DialogTitle className="text-center text-sm uppercase tracking-widest flex items-center justify-center gap-2">
                                <ScanLine className="h-4 w-4 text-[#FFC400] animate-pulse"/> Apunta al código QR
                            </DialogTitle>
                        </DialogHeader>
                        
                        <div className="relative h-[400px] bg-black flex items-center justify-center">
                            {/* COMPONENTE SCANNER */}
                            {scanOpen && (
                                <Scanner 
                                    onScan={handleScan}
                                    components={{ finder: false }} // Sin 'audio'
                                    styles={{ container: { height: 400 } }}
                                />
                            )}
                            
                            {/* Overlay Visual */}
                            <div className="absolute inset-0 border-[50px] border-black/50 flex items-center justify-center z-20 pointer-events-none">
                                <div className="w-64 h-64 border-4 border-[#FFC400] rounded-xl relative">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-[#FFC400] shadow-[0_0_20px_#FFC400] animate-[scan_2s_infinite]"></div>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </Card>

        {/* TARJETA DE RESULTADO */}
        {result && (
            <div className={`w-full max-w-lg p-8 rounded-3xl text-center animate-in zoom-in duration-300 shadow-[0_0_80px_rgba(0,0,0,0.5)] border-4 relative overflow-hidden ${
                result.status === 'SUCCESS' ? 'bg-green-600 border-green-400' : 
                result.status === 'WARNING' ? 'bg-orange-600 border-orange-400' : 'bg-red-600 border-red-400'
            }`}>
                <div className="absolute inset-0 bg-[url('/pattern.png')] opacity-10 mix-blend-overlay"></div>

                {result.status === 'SUCCESS' ? (
                    <div className="relative z-10 text-white">
                        <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                            <CheckCircle2 className="h-16 w-16" />
                        </div>
                        <h2 className="text-4xl font-black leading-none uppercase drop-shadow-md">
                            {result.person.firstName}
                        </h2>
                        <h3 className="text-2xl font-bold uppercase mb-4 opacity-90">
                            {result.person.lastName}
                        </h3>
                        
                        <div className="inline-block bg-black/30 rounded-xl px-6 py-3 border border-white/10">
                            <p className="text-xs uppercase font-bold tracking-widest opacity-70 mb-1">Líder Referente</p>
                            <p className="text-xl font-bold text-[#FFC400]">{result.person.leaderName}</p>
                        </div>
                        
                        <div className="mt-6 animate-bounce">
                            <span className="bg-white text-green-700 font-black px-4 py-1 rounded-full text-sm uppercase tracking-widest shadow-lg">
                                ¡ADELANTE!
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="relative z-10 text-white">
                        <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                            <XCircle className="h-16 w-16" />
                        </div>
                        <h2 className="text-5xl font-black mb-2 drop-shadow-md">
                            {result.status === 'WARNING' ? '¡YA INGRESÓ!' : 'DENEGADO'}
                        </h2>
                        
                        {result.person && (
                             <div className="mb-4">
                                <p className="text-lg font-bold">{result.person.firstName} {result.person.lastName}</p>
                             </div>
                        )}

                        <p className="text-xl font-medium bg-black/20 inline-block px-4 py-2 rounded-lg">
                            {result.message}
                        </p>
                        <div className="mt-6">
                            <Button 
                                onClick={() => { setResult(null); setValue('documentNumber', ''); setFocus('documentNumber'); }}
                                variant="secondary" 
                                className="bg-white text-red-600 hover:bg-slate-100"
                            >
                                <RotateCcw className="mr-2 h-4 w-4" /> Siguiente
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* HISTORIAL DERECHA */}
      <div className="hidden md:block w-1/3 bg-slate-900 border-l border-white/5 p-6 h-screen overflow-y-auto pt-20">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Últimos Ingresos</h3>
          <div className="space-y-3">
              {history.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-white/5 animate-in slide-in-from-right fade-in">
                      <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 font-bold text-xs">
                          OK
                      </div>
                      <div>
                          <p className="text-white font-bold text-sm leading-none">{entry.person.firstName} {entry.person.lastName}</p>
                          <p className="text-slate-500 text-xs mt-1">{entry.timestamp}</p>
                      </div>
                  </div>
              ))}
          </div>
      </div>

    </div>
  );
}

// WRAPPER PRINCIPAL
export default function LogisticsCheckInPage() {
    return (
        <Suspense fallback={<div className="bg-slate-950 h-screen flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2"/> Cargando sistema...</div>}>
            <CheckInLogic />
        </Suspense>
    );
}