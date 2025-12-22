'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { toast } from 'sonner';
import { 
  User, Phone, MapPin, Loader2, ArrowRight, 
  Sparkles, Ticket, ShieldCheck, BadgeCheck, Share2 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox";

function RegistrationForm() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref'); 

  const [step, setStep] = useState<'LOADING_LEADER' | 'FORM' | 'SUCCESS'>('LOADING_LEADER');
  const [leaderName, setLeaderName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  // 1. Validar el Referido
  useEffect(() => {
    const checkLeader = async () => {
      if (!refCode) {
        setStep('FORM'); 
        return;
      }
      try {
        const res = await api.get(`/public/leaders/${refCode}/info`);
        // Ajuste: priorizamos fullName
        setLeaderName(res.data.fullName || `${res.data.firstName} ${res.data.lastName}`);
      } catch (error) {
        console.warn("Líder no encontrado");
      } finally {
        setStep('FORM');
      }
    };
    checkLeader();
  }, [refCode]);

  // 2. Enviar Registro
  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      await api.post('/public/prospects/register', {
        ...data,
        leaderId: refCode || null, // Se envía tal cual (String/UUID)
        dataTreatment: true,
        source: 'REFERRAL_LINK'
      });
      setStep('SUCCESS');
      toast.success("¡Bienvenido al equipo!");
    } catch (error: any) {
      const msg = error.response?.data?.message || "Error al procesar la solicitud.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- VISTA DE ÉXITO: LA "CREDENCIAL DIGITAL" ---
  if (step === 'SUCCESS') {
    return (
      <div className="w-full max-w-md animate-in zoom-in duration-500 transform hover:scale-[1.01] transition-transform">
        <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
          
          {/* Header de la Credencial */}
          <div className="bg-[#1B2541] p-8 text-center relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
             {/* Brillo decorativo */}
             <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFC400] rounded-full blur-[50px] opacity-20"></div>

             <div className="inline-flex items-center gap-1.5 bg-[#FFC400]/10 text-[#FFC400] border border-[#FFC400]/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 backdrop-blur-sm">
                <BadgeCheck className="h-3 w-3" /> Miembro Oficial
             </div>
             <h2 className="text-2xl font-black text-white tracking-tight leading-none">REGISTRO <br/> CONFIRMADO</h2>
             <p className="text-slate-400 text-xs mt-2 font-medium">Tu posición ha sido asegurada.</p>
          </div>

          {/* Cuerpo de la Credencial */}
          <div className="p-8 text-center bg-white relative z-10">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-[#FFC400] to-orange-500 rounded-full p-[3px] shadow-xl mb-5 mt-[-50px]">
               <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
                  <User className="h-12 w-12 text-slate-300" />
               </div>
            </div>
            
            <h3 className="text-xl font-bold text-slate-800">¡Bienvenido al Equipo!</h3>
            <p className="text-slate-500 text-sm mt-2 mb-6 leading-relaxed px-4">
              Hemos notificado a <strong>{leaderName || "la campaña"}</strong> sobre tu ingreso. Ahora eres parte fundamental del cambio.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Estado</p>
                    <p className="text-green-600 font-bold text-xs flex justify-center items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> ACTIVO
                    </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Rol</p>
                    <p className="text-[#1B2541] font-black text-xs mt-1">SIMPATIZANTE</p>
                </div>
            </div>

            <Button 
              className="w-full bg-[#1B2541] hover:bg-[#2a385f] text-white h-12 rounded-xl font-bold shadow-lg transition-all active:scale-95"
              onClick={() => window.location.reload()}
            >
              <Share2 className="mr-2 h-4 w-4" /> Registrar a familiar
            </Button>
          </div>

          {/* Decoración de Ticket (Muescas laterales) */}
          <div className="absolute top-[140px] -left-3 w-6 h-6 bg-[#F0F4F8] rounded-full z-20"></div>
          <div className="absolute top-[140px] -right-3 w-6 h-6 bg-[#F0F4F8] rounded-full z-20"></div>
          <div className="absolute top-[152px] left-5 right-5 border-t-2 border-dashed border-slate-200 z-0"></div>
        </div>
      </div>
    );
  }

  // --- VISTA DE FORMULARIO: PASE VIP ---
  return (
    <Card className="w-full max-w-lg shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border-0 rounded-[2rem] overflow-hidden bg-white relative">
      
      {/* HEADER DE ALTO IMPACTO */}
      <div className="relative bg-[#1B2541] p-8 pb-14 overflow-hidden">
         <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
         {/* Glow effect */}
         <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500 rounded-full mix-blend-screen filter blur-[80px] opacity-20"></div>
         
         <div className="relative z-10 flex flex-col items-center text-center animate-in slide-in-from-top-4 duration-700">
             <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#FFC400] to-[#F59E0B] text-[#1B2541] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20">
                <Sparkles className="h-3 w-3" /> Invitación Exclusiva
             </div>
             <h1 className="text-3xl md:text-4xl font-black text-white leading-none tracking-tight mb-3 drop-shadow-xl">
                TU LUGAR EN <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFC400] to-[#F59E0B]">LA HISTORIA</span>
             </h1>
             <p className="text-slate-300 text-xs font-medium max-w-[260px] leading-relaxed">
                Únete hoy al círculo oficial de defensores del proyecto y asegura tu participación.
             </p>
         </div>
      </div>

      <CardContent className="px-6 md:px-8 relative -mt-10">
         
         {/* TARJETA DE REFERIDO (Estilo Ticket Dorado) */}
         <div className="bg-white rounded-2xl p-1 shadow-xl shadow-slate-900/5 mb-6 transform transition-all hover:-translate-y-1">
            <div className={`rounded-xl p-4 border-2 ${leaderName ? 'border-[#FFC400]/40 bg-gradient-to-r from-orange-50/50 to-yellow-50/50' : 'border-slate-100 bg-slate-50/50'} flex items-center gap-4`}>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 shadow-sm ${leaderName ? 'bg-gradient-to-br from-[#FFC400] to-[#F59E0B] text-[#1B2541]' : 'bg-slate-200 text-slate-400'}`}>
                   {leaderName ? <Ticket className="h-6 w-6" /> : <User className="h-6 w-6"/>}
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-0.5 truncate">
                      {leaderName ? 'Invitado Oficialmente por:' : 'Registro General'}
                   </p>
                   <p className="text-base font-bold text-[#1B2541] leading-tight truncate">
                      {leaderName || 'Sin código de referido'}
                   </p>
                </div>
                {leaderName && (
                  <div className="ml-auto">
                     <ShieldCheck className="h-6 w-6 text-green-600 drop-shadow-sm" />
                  </div>
                )}
            </div>
         </div>

         <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-6">
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 group">
                   <label className="text-[11px] font-bold text-slate-600 ml-1 uppercase tracking-wide group-focus-within:text-[#1B2541] transition-colors">Nombres</label>
                   <Input {...register('firstName', { required: true })} className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#1B2541] focus:ring-0 rounded-xl transition-all" placeholder="Ej: María" />
                   {errors.firstName && <span className="text-red-500 text-[10px] ml-1 font-medium">Requerido</span>}
                </div>
                <div className="space-y-1.5 group">
                   <label className="text-[11px] font-bold text-slate-600 ml-1 uppercase tracking-wide group-focus-within:text-[#1B2541] transition-colors">Apellidos</label>
                   <Input {...register('lastName', { required: true })} className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#1B2541] focus:ring-0 rounded-xl transition-all" placeholder="Ej: Pérez" />
                   {errors.lastName && <span className="text-red-500 text-[10px] ml-1 font-medium">Requerido</span>}
                </div>
            </div>

            <div className="space-y-1.5 group">
               <label className="text-[11px] font-bold text-slate-600 ml-1 uppercase tracking-wide group-focus-within:text-[#1B2541] transition-colors">Cédula / ID</label>
               <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-[#1B2541] transition-colors" />
                  <Input {...register('documentNumber', { required: true })} type="number" className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#1B2541] focus:ring-0 rounded-xl transition-all font-semibold tracking-wide" placeholder="00000000" />
               </div>
               {errors.documentNumber && <span className="text-red-500 text-[10px] ml-1 font-medium">Requerido</span>}
            </div>

            <div className="space-y-1.5 group">
               <label className="text-[11px] font-bold text-slate-600 ml-1 uppercase tracking-wide group-focus-within:text-[#1B2541] transition-colors">Celular (WhatsApp)</label>
               <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-[#1B2541] transition-colors" />
                  <Input {...register('phone', { required: true })} type="number" className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#1B2541] focus:ring-0 rounded-xl transition-all" placeholder="300 000 0000" />
               </div>
               {errors.phone && <span className="text-red-500 text-[10px] ml-1 font-medium">Requerido para contactarte</span>}
            </div>

            <div className="space-y-1.5 group">
               <label className="text-[11px] font-bold text-slate-600 ml-1 uppercase tracking-wide group-focus-within:text-[#1B2541] transition-colors">Barrio o Vereda <span className="text-slate-400 font-medium normal-case">(Opcional)</span></label>
               <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-[#1B2541] transition-colors" />
                  <Input {...register('location')} className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#1B2541] focus:ring-0 rounded-xl transition-all" placeholder="Ej: Centro" />
               </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-3 mt-2">
                <Checkbox id="terms" required className="mt-0.5 data-[state=checked]:bg-[#1B2541] border-slate-300" />
                <label htmlFor="terms" className="text-[11px] text-slate-500 leading-snug cursor-pointer">
                    Confirmo mi intención libre y voluntaria de apoyar este proyecto y acepto el tratamiento de datos.
                </label>
            </div>

            <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-[#1B2541] to-[#2a385f] hover:from-[#0f1525] hover:to-[#1B2541] text-white text-lg font-black shadow-xl shadow-blue-900/20 rounded-xl relative overflow-hidden group transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
                {/* Efecto de brillo */}
                <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                
                {loading ? <Loader2 className="animate-spin" /> : <span className="flex items-center gap-2 tracking-wide">CONFIRMAR MI APOYO <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform"/></span>}
            </Button>
            
            <div className="text-center opacity-60">
               <p className="text-[9px] text-slate-400 uppercase tracking-[0.2em] font-bold">Plataforma Oficial Segura</p>
            </div>

         </form>
      </CardContent>
    </Card>
  );
}

export default function PublicReferralPage() {
  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center p-4 relative font-sans selection:bg-[#FFC400] selection:text-[#1B2541]">
      {/* Background Premium */}
      <div className="absolute inset-0 bg-slate-50 pointer-events-none">
        <div className="absolute h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-[#FFC400] opacity-20 blur-[100px]"></div>
      </div>
      
      <Suspense fallback={<div className="z-10"><Loader2 className="h-10 w-10 text-[#1B2541] animate-spin" /></div>}>
        <div className="z-10 w-full flex justify-center animate-in fade-in duration-700">
            <RegistrationForm />
        </div>
      </Suspense>
    </div>
  );
}