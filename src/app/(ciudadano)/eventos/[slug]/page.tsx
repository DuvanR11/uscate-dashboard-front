'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation'; 
import { useForm } from 'react-hook-form';
import api from '@/lib/api'; 
import { toast } from 'sonner';
import { format, differenceInSeconds } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from "react-qr-code"; 

import { 
  Loader2, Calendar, CheckCircle2, AlertTriangle, User, 
  Phone, Mail, Clock, MapPin, Facebook, Instagram, Twitter, 
  ArrowRight, ShieldCheck, Ticket
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox"; 

const SocialLinks = ({ className = "" }: { className?: string }) => (
  <div className={`flex gap-3 ${className}`}>
      <a href="#" className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10"><Facebook className="h-5 w-5" /></a>
      <a href="#" className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10"><Instagram className="h-5 w-5" /></a>
      <a href="#" className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10"><Twitter className="h-5 w-5" /></a>
  </div>
);

function EventCountdown({ targetDate, variant = 'mobile' }: { targetDate: string, variant?: 'mobile' | 'desktop' }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const target = useMemo(() => new Date(targetDate), [targetDate]);

  useEffect(() => {
    const calculate = () => {
        const now = new Date();
        const diff = differenceInSeconds(target, now);
        setTimeLeft(diff > 0 ? diff : 0);
    };
    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (timeLeft <= 0) return null;

  const days = Math.floor(timeLeft / (3600 * 24));
  const hours = Math.floor((timeLeft % (3600 * 24)) / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const TimeBox = ({ val, label }: { val: number, label: string }) => (
    <div className={`flex flex-col items-center ${variant === 'desktop' ? 'mx-4' : 'mx-2'}`}>
      <span className={`${variant === 'desktop' ? 'text-4xl' : 'text-lg'} font-black text-[#FFC400] leading-none`}>
          {String(val).padStart(2, '0')}
      </span>
      <span className={`${variant === 'desktop' ? 'text-xs mt-2' : 'text-[8px]'} text-slate-300 uppercase tracking-wider`}>
          {label}
      </span>
    </div>
  );

  return (
    <div className={`${variant === 'desktop' ? 'bg-white/5 border border-white/10 rounded-2xl p-6 mt-8' : 'bg-[#1B2541] border-y border-white/10 py-2'} flex items-center justify-center`}>
      {variant === 'mobile' && <Clock className="h-4 w-4 text-[#FFC400] mr-3" />}
      <div className="flex items-center">
        <TimeBox val={days} label="Días" /> <span className="text-white/20 pb-4">:</span>
        <TimeBox val={hours} label="Hrs" /> <span className="text-white/20 pb-4">:</span>
        <TimeBox val={minutes} label="Min" /> <span className="text-white/20 pb-4">:</span>
        <TimeBox val={seconds} label="Seg" />
      </div>
    </div>
  );
}

export default function PublicEventPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [step, setStep] = useState<'LOADING' | 'CHECK' | 'REGISTER_NEW' | 'SUCCESS' | 'ERROR'>('LOADING');
  const [event, setEvent] = useState<any>(null);
  const [prospectName, setProspectName] = useState("");
  const [confirmedDoc, setConfirmedDoc] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    if (!slug) return;
    const loadData = async () => {
        try {
            const eventRes = await api.get(`/public/events/${slug}`);
            setEvent(eventRes.data);
            setStep('CHECK');
            try { const tagsRes = await api.get('/catalogs/tags'); setAvailableTags(tagsRes.data || []); } catch (err) { }
        } catch (err) {
            setStep('ERROR'); setErrorMsg("Enlace no válido o evento finalizado.");
        }
    };
    loadData();
  }, [slug]);

  const toggleTag = (tagId: number) => setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);

  const onCheckDocument = async (data: any) => {
    if (!data.documentNumber) return toast.error("Ingresa tu documento");
    setLoading(true);
    try {
      const res = await api.post(`/public/events/${slug}/check`, { documentNumber: data.documentNumber });
      setConfirmedDoc(data.documentNumber);

      if (res.data.exists) {
        setProspectName(`${res.data.prospect.firstName} ${res.data.prospect.lastName}`);
        await confirmRegistration({ documentNumber: data.documentNumber }); 
      } else {
        setStep('REGISTER_NEW'); 
        toast.info("Completa tus datos para finalizar.");
      }
    } catch (e) { toast.error("Error verificando documento."); } finally { setLoading(false); }
  };

  const confirmRegistration = async (data: any) => {
    setLoading(true);
    try {
      const docToSend = data.documentNumber || confirmedDoc;
      if(!confirmedDoc) setConfirmedDoc(docToSend);

      await api.post(`/public/events/${slug}/register`, { 
          ...data, 
          documentNumber: docToSend,
          tags: selectedTags, 
          dataTreatment: true 
      });
      setStep('SUCCESS'); 
      toast.success("¡Registro exitoso!");
    } catch (error: any) {
      const msg = error.response?.data?.message; 
      toast.error(Array.isArray(msg) ? msg[0] : (msg || "Error al registrar."));
    } finally { setLoading(false); }
  };

  // --- LÓGICA DE GENERACIÓN DE CÓDIGO QR INTELIGENTE ---
  const getQrValue = () => {
      // Creamos un objeto JSON con el documento (id) y el evento (s)
      // Esto permite que el lector sepa a qué evento pertenece el usuario.
      const data = {
          id: confirmedDoc || "0",
          s: slug || ""
      };
      return JSON.stringify(data);
  };

  if (step === 'LOADING') return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-[#1B2541] h-8 w-8" /></div>;
  if (step === 'ERROR') return (
    <div className="h-screen flex flex-col items-center justify-center p-4 text-center bg-slate-50">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">No disponible</h2>
        <p className="text-slate-600 mt-2">{errorMsg}</p>
    </div>
  );

  return (
    <div className="min-h-screen font-sans bg-slate-100 lg:bg-white lg:grid lg:grid-cols-2">
      
      {/* COLUMNA IZQUIERDA (DESKTOP) */}
      <div className="hidden lg:flex relative flex-col justify-between bg-[#1B2541] text-white p-12 overflow-hidden h-screen sticky top-0">
         <div className="absolute inset-0 z-0">
             {event?.imageUrl ? (
                 <img src={event.imageUrl} className="w-full h-full object-cover opacity-40 scale-105" alt="Background" />
             ) : (
                 <div className="w-full h-full bg-[url('/pattern.png')] opacity-10"></div>
             )}
             <div className="absolute inset-0 bg-gradient-to-r from-[#1B2541] via-[#1B2541]/80 to-transparent"></div>
         </div>

         <div className="relative z-10 flex flex-col h-full justify-center max-w-xl">
             <div className="mb-6 inline-flex items-center gap-2 bg-[#FFC400] text-[#1B2541] px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider w-fit shadow-lg">
                 <Calendar className="h-4 w-4" />
                 {event?.endDate && format(new Date(event.endDate), "EEEE d 'de' MMMM", { locale: es })}
             </div>
             <h1 className="text-5xl font-black leading-tight mb-6 drop-shadow-xl">{event?.name}</h1>
             {event?.description && <p className="text-lg text-slate-200 leading-relaxed mb-8 border-l-4 border-[#FFC400] pl-6">{event.description}</p>}
             
             {event?.endDate && new Date(event.endDate) > new Date() && (
                 <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FFC400] mb-2">Tiempo restante</p>
                    <EventCountdown targetDate={event.endDate} variant="desktop" />
                 </div>
             )}
         </div>

         <div className="relative z-10 flex justify-between items-end border-t border-white/10 pt-8">
             <div><p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-3">Síguenos</p><SocialLinks /></div>
             <p className="text-xs text-slate-500">Campaña Inteligente 2025 ©</p>
         </div>
      </div>

      {/* COLUMNA DERECHA */}
      <div className="flex flex-col items-center justify-center p-4 lg:p-12 bg-slate-100 lg:bg-white h-full min-h-screen overflow-y-auto">
         
         <Card className="w-full max-w-md shadow-xl lg:shadow-none lg:border-2 lg:border-slate-100 border-0 overflow-hidden rounded-2xl bg-white relative z-10">
            {/* Header Móvil */}
            <div className="relative h-48 bg-[#1B2541] lg:hidden">
                {event?.imageUrl ? <img src={event.imageUrl} className="w-full h-full object-cover opacity-60" alt="Evento" /> : <div className="w-full h-full flex items-center justify-center opacity-20"><Calendar className="h-20 w-20 text-white" /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1B2541] to-transparent flex items-end p-6">
                    <h1 className="text-white text-2xl font-black leading-tight">{event?.name}</h1>
                </div>
            </div>
            <div className="lg:hidden">
                {event?.endDate && new Date(event.endDate) > new Date() && <EventCountdown targetDate={event.endDate} variant="mobile" />}
            </div>

            <CardContent className="p-6 lg:p-8">
               
               {/* FORMULARIOS (Igual que antes) */}
               {step === 'CHECK' && (
                 <form onSubmit={handleSubmit(onCheckDocument)} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="text-center lg:text-left"><h2 className="text-xl lg:text-3xl font-black text-[#1B2541]">Registro</h2><p className="text-sm text-slate-500 mt-1">Ingresa tu documento para asegurar tu cupo.</p></div>
                    <div className="relative group">
                        <Input {...register('documentNumber', { required: true })} placeholder="Ej: 12345678" type="number" className="text-lg h-14 pl-12 font-bold border-2 focus:border-[#FFC400] rounded-xl bg-slate-50 lg:bg-white" autoFocus />
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-300 group-focus-within:text-[#FFC400] transition-colors" />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-14 bg-[#1B2541] hover:bg-[#1B2541]/90 text-white text-lg font-bold shadow-lg rounded-xl flex items-center justify-center gap-2 group">{loading ? <Loader2 className="animate-spin" /> : <>CONTINUAR <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></>}</Button>
                 </form>
               )}

               {step === 'REGISTER_NEW' && (
                 <form onSubmit={handleSubmit(confirmRegistration)} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4"><p className="text-sm font-bold text-[#1B2541] flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-blue-600"/> Completa tu perfil</p></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold text-slate-700 ml-1">Nombres *</label><Input {...register('firstName', { required: true })} className="bg-slate-50 border-slate-200" /></div>
                        <div><label className="text-xs font-bold text-slate-700 ml-1">Apellidos *</label><Input {...register('lastName', { required: true })} className="bg-slate-50 border-slate-200" /></div>
                    </div>
                    <div className="relative"><Input {...register('email', { pattern: /^\S+@\S+$/i })} placeholder="Email (Opcional)" className="pl-10 bg-slate-50 border-slate-200" /><Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" /></div>
                    <div className="relative"><Input {...register('phone')} type="number" placeholder="Celular (Opcional)" className="pl-10 bg-slate-50 border-slate-200" /><Phone className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" /></div>
                    {availableTags.length > 0 && (<div className="pt-2"><label className="text-xs font-bold text-slate-700 block mb-2">Intereses</label><div className="flex flex-wrap gap-2">{availableTags.map(tag => (<button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${selectedTags.includes(tag.id) ? 'bg-[#1B2541] text-white border-[#1B2541]' : 'bg-white text-slate-500 border-slate-200 hover:border-[#1B2541]'}`}>{tag.name}</button>))}</div></div>)}
                    <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100"><Checkbox id="terms" required className="mt-0.5" /><label htmlFor="terms" className="text-xs text-slate-500 leading-snug cursor-pointer">Acepto política de privacidad y contacto.</label></div>
                    <Button type="submit" disabled={loading} className="w-full h-14 bg-[#FFC400] hover:bg-[#FFC400]/90 text-[#1B2541] text-lg font-black shadow-md rounded-xl">{loading ? <Loader2 className="animate-spin" /> : "FINALIZAR"}</Button>
                    <Button variant="ghost" type="button" onClick={() => setStep('CHECK')} className="w-full text-xs text-slate-400">Volver</Button>
                 </form>
               )}

               {/* TICKET DE ÉXITO CON QR INTELIGENTE */}
               {step === 'SUCCESS' && (
                 <div className="flex flex-col items-center animate-in zoom-in duration-500">
                    <div className="w-full bg-[#1B2541] text-white p-6 rounded-t-3xl text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                        <h2 className="text-2xl font-black tracking-widest text-[#FFC400] relative z-10">TU ENTRADA</h2>
                        <p className="text-xs text-slate-300 relative z-10 mt-1 uppercase tracking-wide">Acceso Oficial</p>
                    </div>
                    <div className="w-full bg-white border-x border-b border-slate-200 rounded-b-3xl p-6 relative shadow-2xl">
                        <div className="absolute top-[-10px] left-[-10px] w-5 h-5 bg-white lg:bg-white rounded-full z-20"></div>
                        <div className="absolute top-[-10px] right-[-10px] w-5 h-5 bg-white lg:bg-white rounded-full z-20"></div>

                        {/* CÓDIGO QR GENERADO CON JSON */}
                        <div className="flex justify-center my-4">
                            <div className="p-3 bg-white border-2 border-slate-100 rounded-xl shadow-inner">
                                <QRCode 
                                    value={getQrValue()} 
                                    size={160}
                                    fgColor="#1B2541"
                                />
                            </div>
                        </div>

                        <div className="text-center space-y-1 mb-6">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Asistente</p>
                            <p className="text-xl font-black text-[#1B2541] leading-none uppercase">{prospectName || "INVITADO"}</p>
                            <p className="text-sm font-mono text-slate-500 bg-slate-100 py-1 px-3 rounded-full inline-block mt-2">ID: {confirmedDoc}</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                            <p className="text-[10px] text-blue-600 font-bold uppercase flex items-center justify-center gap-2"><Ticket className="h-4 w-4" /> Presenta este código al ingresar</p>
                        </div>
                        <div className="mt-6 pt-6 border-t border-dashed border-slate-300">
                            <Button onClick={() => { setValue('documentNumber', ''); setStep('CHECK'); setProspectName(''); setSelectedTags([]); setConfirmedDoc(""); }} variant="outline" className="w-full h-12 border-dashed border-2 hover:border-[#1B2541] hover:text-[#1B2541] rounded-xl font-bold">Registrar nuevo asistente</Button>
                        </div>
                    </div>
                 </div>
               )}
            </CardContent>
         </Card>
         <div className="mt-8 text-center lg:hidden"><div className="flex justify-center gap-4 mb-4"><SocialLinks className="flex lg:hidden" /></div><p className="text-[10px] text-slate-400/70 font-medium">Powered by Campaña Inteligente 2025</p></div>
      </div>
    </div>
  );
}