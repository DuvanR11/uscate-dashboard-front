'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  User, Mail, Phone, ArrowRight, Loader2, MapPin, CreditCard,
  Facebook, Instagram, Twitter, Video, Check, Lock, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
// import { api } from '@/services/api';

// Fase 3 (2026-10-06): las zonas son las de la organización de quien invita
// (`GET /public/leaders/:id/zones`). Antes aquí estaban escritas las 20
// localidades de Bogotá para cualquier campaña del país.
interface Zone {
  id: number;
  name: string;
}

// Misma regla que aplica el servidor (`assertStrongPassword`); aquí solo evita
// un viaje de ida y vuelta para avisar.
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;
const isStrongPassword = (value: string) =>
  value.length >= PASSWORD_MIN &&
  value.length <= PASSWORD_MAX &&
  /[A-Za-z]/.test(value) &&
  /\d/.test(value);

function JoinForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const referrerId = searchParams.get('ref');

  const [loading, setLoading] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);

  useEffect(() => {
    if (!referrerId) return;
    let cancelled = false;
    api
      .get<Zone[]>(`/public/leaders/${referrerId}/zones`)
      .then(({ data }) => {
        if (!cancelled) setZones(Array.isArray(data) ? data : []);
      })
      // Sin zonas el formulario sigue funcionando: el campo es opcional.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [referrerId]);

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
  // La contraseña la elige cada voluntario (antes era una fija, igual para
  // todos y a la vista en esta página). La confirmación no viaja al servidor.
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Trampa anti-bots: campo oculto que una persona nunca llena.
  const [website, setWebsite] = useState('');
  // Autorización de tratamiento de datos (Ley 1581): sin ella no se crea la
  // cuenta; el servidor guarda la fecha y la versión del aviso aceptado.
  const [dataTreatmentAccepted, setDataTreatmentAccepted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Validar Referido
    if (!referrerId) return toast.error("Enlace de invitación inválido.");

    // 2. Validar Redes Sociales (Al menos una)
    const hasSocial = form.facebookUser || form.instagramUser || form.tiktokUser || form.xUser || form.youtubeUser;
    if (!hasSocial) {
      return toast.error("Debes registrar al menos una red social.");
    }

    // 3. Validar contraseña
    if (!isStrongPassword(password)) {
      return toast.error(`La contraseña debe tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres e incluir al menos una letra y un número.`);
    }
    if (password !== passwordConfirm) {
      return toast.error("Las contraseñas no coinciden.");
    }

    // 4. Autorización de datos
    if (!dataTreatmentAccepted) {
      return toast.error("Debes aceptar el tratamiento de datos para completar el registro.");
    }

    setLoading(true);
    try {
      // PREPARAR DATOS
      // La zona es opcional; el select devuelve texto.
      const payload = {
        ...form,
        password,
        referrerId,
        dataTreatment: true,
        localityId: form.localityId ? Number(form.localityId) : undefined,
        ...(website ? { website } : {}),
      };

      // Ruta pública: quien se inscribe todavía no tiene cuenta.
      await api.post('/public/volunteers', payload);

      toast.success("¡Registro Exitoso!", {
        description: "Ya puedes iniciar sesión con tu correo y la contraseña que elegiste."
      });

      // Redirigir al login
      router.push('/login?registered=true'); 
      
    } catch (error: unknown) {
      console.error(error);
      // Capturamos el mensaje de error específico del backend (ej: "El correo ya existe")
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || "Ocurrió un error al registrarse.");
    } finally {
      setLoading(false);
    }
  };

  if (!referrerId) {
    return (
      <div className="text-center p-10 text-white bg-ink rounded-2xl border border-white/10">
        <h2 className="text-xl font-bold mb-2">Enlace incompleto</h2>
        <p className="text-sm opacity-70">Necesitas una invitación válida para acceder aquí.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl relative overflow-hidden flex flex-col md:flex-row">
      
      {/* COLUMNA IZQUIERDA: BENEFICIOS (Diseño visual) */}
      <div className="bg-ink p-8 md:w-5/12 flex flex-col justify-between text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="mb-6">
             <span className="bg-secondary text-foreground text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">Invitación VIP</span>
          </div>
          <h2 className="text-3xl font-black mb-3 leading-tight">Únete a los <br/><span className="text-secondary">Búhos Digitales</span></h2>
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
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary rounded-full blur-[80px] opacity-10 translate-x-1/2 -translate-y-1/2"></div>
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

                {zones.length > 0 && (
                <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-slate-400 h-5 w-5" />
                    <select 
                        aria-label="Zona donde vives"
                        className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-secondary outline-none text-sm text-slate-700 appearance-none transition-all"
                        value={form.localityId}
                        onChange={e => setForm({...form, localityId: e.target.value})}
                    >
                        <option value="">Zona donde vives (opcional)</option>
                        {zones.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                    </select>
                </div>
                )}
            </div>
          </div>

          {/* SECCIÓN 2: REDES SOCIALES */}
          <div>
            <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                2. Redes Sociales
              </h3>
              <span className="text-[10px] text-secondary bg-ink px-2 py-0.5 rounded font-bold">
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

          {/* SECCIÓN 3: CONTRASEÑA */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                3. Crea tu contraseña
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PasswordInput
                label="Contraseña"
                value={password}
                onChange={setPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
              />
              <PasswordInput
                label="Repite la contraseña"
                value={passwordConfirm}
                onChange={setPasswordConfirm}
                visible={showPassword}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Mínimo {PASSWORD_MIN} caracteres, con al menos una letra y un número. Solo tú la conoces: con ella y tu correo entras a tu cuenta.
            </p>
          </div>

          {/* AUTORIZACIÓN DE DATOS */}
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <input
              id="dataTreatment"
              type="checkbox"
              checked={dataTreatmentAccepted}
              onChange={(e) => setDataTreatmentAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
            />
            <label htmlFor="dataTreatment" className="block cursor-pointer text-xs leading-snug text-slate-600">
              Autorizo el{' '}
              <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="font-medium underline">
                tratamiento de mis datos personales
              </a>
              {' '}conforme a la Ley 1581 de 2012.
            </label>
          </div>

          {/* Trampa anti-bots: fuera de la vista y del orden de tabulación. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Sitio web
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
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
            <div className="bg-secondary/20 rounded-full p-1">
                <Check size={12} className="text-secondary" />
            </div>
            <span className="text-sm font-medium text-slate-100">{text}</span>
        </div>
    );
}

function InputGroup({ icon, value, onChange, placeholder, required = false, type = "text" }: {
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="relative group">
      <div className="absolute left-3 top-3.5 text-slate-400 [&>svg]:w-5 [&>svg]:h-5 group-focus-within:text-secondary transition-colors">{icon}</div>
      <input 
        required={required}
        type={type} 
        className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-secondary outline-none transition-all text-sm placeholder:text-slate-400"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
function PasswordInput({ label, value, onChange, visible, onToggle }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="relative group">
      <div className="absolute left-3 top-3.5 text-slate-400 [&>svg]:w-5 [&>svg]:h-5 group-focus-within:text-secondary transition-colors"><Lock/></div>
      <input
        required
        type={visible ? 'text' : 'password'}
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
        maxLength={PASSWORD_MAX}
        aria-label={label}
        className="w-full pl-10 pr-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-secondary outline-none transition-all text-sm placeholder:text-slate-400"
        placeholder={label}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 [&>svg]:w-5 [&>svg]:h-5"
        >
          {visible ? <EyeOff/> : <Eye/>}
        </button>
      )}
    </div>
  );
}

function SocialInput({ icon, value, onChange, placeholder }: {
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
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
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center p-4 bg-[url('/bg-pattern.svg')] bg-cover bg-center">
       <Suspense fallback={<div className="text-white animate-pulse font-bold">Cargando invitación...</div>}>
          <JoinForm />
       </Suspense>
    </div>
  );
}