'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  User, Mail, Phone, ArrowRight, Loader2, MapPin, CreditCard, 
  Facebook, Instagram, Twitter, Video, Check 
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
// import { api } from '@/services/api';

// Lista de Localidades de Bogotá (Puedes mover esto a un config o traerlo de API)
const LOCALIDADES = [
  { id: 1, name: 'Usaquén' },
  { id: 2, name: 'Chapinero' },
  { id: 3, name: 'Santa Fe' },
  { id: 4, name: 'San Cristóbal' },
  { id: 5, name: 'Usme' },
  { id: 6, name: 'Tunjuelito' },
  { id: 7, name: 'Bosa' },
  { id: 8, name: 'Kennedy' },
  { id: 9, name: 'Fontibón' },
  { id: 10, name: 'Engativá' },
  { id: 11, name: 'Suba' },
  { id: 12, name: 'Barrios Unidos' },
  { id: 13, name: 'Teusaquillo' },
  { id: 14, name: 'Los Mártires' },
  { id: 15, name: 'Antonio Nariño' },
  { id: 16, name: 'Puente Aranda' },
  { id: 17, name: 'La Candelaria' },
  { id: 18, name: 'Rafael Uribe Uribe' },
  { id: 19, name: 'Ciudad Bolívar' },
  { id: 20, name: 'Sumapaz' },
];

function JoinForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const referrerId = searchParams.get('ref');

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    documentNumber: '', // Cédula
    localityId: '',
    facebookUser: '',
    instagramUser: '',
    tiktokUser: '',
    xUser: '',
    youtubeUser: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Validar Referido
    if (!referrerId) return toast.error("Enlace de invitación inválido.");

    // 2. Validar Redes Sociales (Al menos una)
    const hasSocial = form.facebookUser || form.instagramUser || form.tiktokUser || form.xUser || form.youtubeUser;
    if (!hasSocial) {
      return toast.error("Debes registrar al menos una red social.");
    }

    setLoading(true);
    try {
      // PREPARAR DATOS
      // Convertimos localityId a número porque el select devuelve string
      const payload = {
        ...form,
        referrerId,
        localityId: Number(form.localityId), 
      };

      // --- LLAMADA AL BACKEND REAL ---
      // Asegúrate que la ruta coincida con tu controller ('/auth/join-team' o '/public/join-team')
      await api.post('/users/referral', payload);
      
      toast.success("¡Registro Exitoso!", {
        description: "Ya puedes iniciar sesión con tu usuario y contraseña temporal."
      });

      // Redirigir al login
      router.push('/login?registered=true'); 
      
    } catch (error: any) {
      console.error(error);
      // Capturamos el mensaje de error específico del backend (ej: "El correo ya existe")
      const message = error.response?.data?.message || "Ocurrió un error al registrarse.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!referrerId) {
    return (
      <div className="text-center p-10 text-white bg-[#1B2541] rounded-2xl border border-white/10">
        <h2 className="text-xl font-bold mb-2">Enlace incompleto</h2>
        <p className="text-sm opacity-70">Necesitas una invitación válida para acceder aquí.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl relative overflow-hidden flex flex-col md:flex-row">
      
      {/* COLUMNA IZQUIERDA: BENEFICIOS (Diseño visual) */}
      <div className="bg-[#1B2541] p-8 md:w-5/12 flex flex-col justify-between text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="mb-6">
             <span className="bg-[#FFC400] text-[#1B2541] text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">Invitación VIP</span>
          </div>
          <h2 className="text-3xl font-black mb-3 leading-tight">Únete a los <br/><span className="text-[#FFC400]">Búhos Digitales</span></h2>
          <p className="text-sm text-slate-300 mb-8 leading-relaxed">
            Completa tu registro para activar tu cuenta oficial y empezar a sumar puntos hoy mismo.
          </p>
          
          <div className="space-y-4">
            <BenefitItem text="Gana puntos por cada misión" />
            <BenefitItem text="Acceso a premios exclusivos" />
            <BenefitItem text="Comunidad privada de WhatsApp" />
          </div>
        </div>
        
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC400] rounded-full blur-[80px] opacity-10 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500 rounded-full blur-[60px] opacity-20 -translate-x-1/2 translate-y-1/2"></div>
        
        <div className="relative z-10 mt-12 pt-6 border-t border-white/10 text-xs text-white/40 text-center">
            Invitado por código seguro: <span className="font-mono text-white/60">{referrerId.slice(0,8)}...</span>
        </div>
      </div>

      {/* COLUMNA DERECHA: FORMULARIO */}
      <div className="p-8 md:p-10 md:w-7/12 bg-white h-full overflow-y-auto max-h-[90vh]">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECCIÓN 1: DATOS PERSONALES */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                1. Datos Personales
            </h3>
            
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputGroup 
                        icon={<User/>} 
                        placeholder="Nombre Completo" 
                        value={form.fullName} 
                        onChange={(v: string) => setForm({...form, fullName: v})} 
                        required 
                    />
                    <InputGroup 
                        icon={<CreditCard/>} 
                        placeholder="Cédula" 
                        value={form.documentNumber} 
                        onChange={(v: string) => setForm({...form, documentNumber: v})} 
                        required 
                        type="number" 
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputGroup 
                        icon={<Mail/>} 
                        placeholder="Correo Electrónico" 
                        value={form.email} 
                        onChange={(v: string) => setForm({...form, email: v})} 
                        required 
                        type="email" 
                    />
                    <InputGroup 
                        icon={<Phone/>} 
                        placeholder="Celular (WhatsApp)" 
                        value={form.phone} 
                        onChange={(v: string) => setForm({...form, phone: v})} 
                        required 
                        type="tel" 
                    />
                </div>

                <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-slate-400 h-5 w-5" />
                    <select 
                        required
                        className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FFC400] outline-none text-sm text-slate-700 appearance-none transition-all"
                        value={form.localityId}
                        onChange={e => setForm({...form, localityId: e.target.value})}
                    >
                        <option value="">Selecciona tu Localidad</option>
                        {LOCALIDADES.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                    </select>
                </div>
            </div>
          </div>

          {/* SECCIÓN 2: REDES SOCIALES */}
          <div>
            <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                2. Redes Sociales
              </h3>
              <span className="text-[10px] text-[#FFC400] bg-[#1B2541] px-2 py-0.5 rounded font-bold">
                Mínimo una requerida
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               <SocialInput 
                    icon={<Facebook className="text-blue-600"/>} 
                    placeholder="Usuario Facebook" 
                    value={form.facebookUser} 
                    onChange={(v: string) => setForm({...form, facebookUser: v})} 
               />
               <SocialInput 
                    icon={<Instagram className="text-pink-600"/>} 
                    placeholder="Usuario Instagram" 
                    value={form.instagramUser} 
                    onChange={(v: string) => setForm({...form, instagramUser: v})} 
               />
               <SocialInput 
                    icon={<Video className="text-black"/>} 
                    placeholder="Usuario TikTok" 
                    value={form.tiktokUser} 
                    onChange={(v: string) => setForm({...form, tiktokUser: v})} 
               />
               <SocialInput 
                    icon={<Twitter className="text-sky-500"/>} 
                    placeholder="Usuario X (Twitter)" 
                    value={form.xUser} 
                    onChange={(v: string) => setForm({...form, xUser: v})} 
               />
            </div>
          </div>

          {/* AVISO DE CONTRASEÑA */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Tu contraseña temporal se generará automáticamente:</p>
            <div className="inline-block bg-[#1B2541] text-white px-4 py-1.5 rounded-lg font-mono text-sm font-bold tracking-wider">
                @Uscategui102
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#1B2541] hover:bg-[#2a385f] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Finalizar Registro <ArrowRight size={20}/></>}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Helper Components ---

function BenefitItem({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="bg-[#FFC400]/20 rounded-full p-1">
                <Check size={12} className="text-[#FFC400]" />
            </div>
            <span className="text-sm font-medium text-slate-100">{text}</span>
        </div>
    );
}

function InputGroup({ icon, value, onChange, placeholder, required = false, type = "text" }: any) {
  return (
    <div className="relative group">
      <div className="absolute left-3 top-3.5 text-slate-400 [&>svg]:w-5 [&>svg]:h-5 group-focus-within:text-[#FFC400] transition-colors">{icon}</div>
      <input 
        required={required}
        type={type} 
        className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FFC400] outline-none transition-all text-sm placeholder:text-slate-400"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function SocialInput({ icon, value, onChange, placeholder }: any) {
  return (
    <div className="relative group">
      <div className="absolute left-3 top-3 [&>svg]:w-5 [&>svg]:h-5 transition-transform group-focus-within:scale-110 opacity-70 group-focus-within:opacity-100">{icon}</div>
      <input 
        type="text" 
        className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm placeholder:text-slate-300 shadow-sm"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

// Layout Wrapper
export default function JoinPage() {
  return (
    <div className="min-h-screen bg-[#1B2541] flex flex-col items-center justify-center p-4 bg-[url('/bg-pattern.svg')] bg-cover bg-center">
       <Suspense fallback={<div className="text-white animate-pulse font-bold">Cargando invitación...</div>}>
          <JoinForm />
       </Suspense>
    </div>
  );
}