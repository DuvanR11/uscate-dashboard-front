'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import Cookies from 'js-cookie'; // IMPORTANTE: Para guardar cookies manualmente

// Esquema de validación
const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', data);
      // Asumimos que el backend ahora devuelve user.permissions (array)
      const { access_token, user } = response.data; 

      const permissions = user.permissions || [];

      // 1. BLOQUEO DE "CIUDADANOS" 
      // Un ciudadano es alguien que NO tiene permisos asignados en la web
      if (permissions.length === 0) {
        toast.error("Acceso restringido", {
            description: "No tienes permisos asignados para acceder a la plataforma web.",
        });
        setLoading(false);
        return; 
      }

      // 2. GUARDAR COOKIES
      Cookies.set('auth-token', access_token, { expires: 1 });
      // OJO: NO guardar el array completo de permisos acá — los navegadores
      // rechazan cookies de más de ~4KB, y con el catálogo de módulos ya en
      // 30+ para un SUPER_ADMIN, `JSON.stringify(permissions)` codificado
      // supera ese límite (bug real detectado 2026-08-13: el login parecía
      // funcionar pero nunca navegaba). El middleware (Edge, sin acceso a
      // localStorage) solo necesita saber SI hay al menos un permiso —no
      // cuáles— para bloquear cuentas "solo app" (ciudadanos); el array real
      // completo ya vive en el store de Zustand (`setAuth` abajo), persistido
      // en localStorage, sin este límite de tamaño.
      Cookies.set('user-permissions', permissions.length > 0 ? '1' : '0', { expires: 1 });

      // 3. GUARDAR EN STORE (Estado Global)
      setAuth(access_token, user);

      toast.success("¡Bienvenido!", {
        description: `Sesión iniciada como ${user.fullName}`,
      });

      // 4. REDIRECCIÓN INTELIGENTE SEGÚN PERMISOS
      // EXCEPCIÓN F3: este chequeo corre dentro de `onSubmit` (un callback
      // async, no el cuerpo de render del componente) e inmediatamente
      // después de recibir `user.permissions` de la respuesta del login —
      // no del store (que `setAuth` recién está poblando). usePermission es
      // un hook y no puede invocarse fuera de render, así que se mantiene la
      // lectura directa del array `permissions` local.
      const hasPermission = (mod: string) => permissions.some((p: any) => p.module === mod && p.canRead);

      if (hasPermission('DASHBOARD')) {
        router.push('/dashboard');
      } else if (hasPermission('PETICIONES')) {
        router.push('/requests');
      } else if (hasPermission('PROSPECTOS')) {
        router.push('/prospects');
      } else {
        // Redirección de seguridad
        router.push('/profile'); 
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Credenciales incorrectas o usuario inactivo.";
      toast.error("Error de acceso", {
        description: Array.isArray(msg) ? msg[0] : msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    // Usamos un grid de 2 columnas en pantallas grandes (lg), una sola en móviles
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      
      {/* --- COLUMNA IZQUIERDA: MARCA JURYTECH --- */}
      {/* Fondo azul marino sólido (mismo tono que trae el logo real de
          JuryTech Solutions S.A.S.) en vez de estirar el logo como si fuera
          una foto de portada — es un isotipo cuadrado, no una escena. */}
      <div className="hidden relative lg:flex flex-col items-center justify-center p-10 h-full text-white bg-[#0a1a3a]">

        {/* Resplandor radial sutil, mismo efecto que ya trae la imagen del logo */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(59,110,199,0.35),transparent_60%)]"></div>

        <div className="relative z-10 flex flex-col items-center max-w-md text-center">
          <img
            src="/imgs/jurytech-login.png"
            alt="JuryTech Solutions S.A.S."
            className="w-64 h-64 object-contain drop-shadow-2xl mb-8"
          />
          <p className="text-lg text-slate-200">
            La plataforma que conecta gestión política, legislativa e inteligencia OSINT en un solo lugar.
          </p>
        </div>

        <div className="absolute bottom-10 left-10 right-10 z-10 flex items-center gap-2 text-sm text-slate-400">
          <ShieldCheck className="w-4 h-4 text-[#C99B4A]" />
          <span>Acceso exclusivo para equipos autorizados de JuryTech Solutions S.A.S.</span>
        </div>
      </div>


      {/* --- COLUMNA DERECHA: FORMULARIO --- */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="w-full max-w-md space-y-8">
            
            {/* Encabezado del formulario */}
            <div className="text-center lg:text-left mb-8">
                 {/* Logo visible solo en móvil */}
                <div className="lg:hidden flex justify-center mb-4">
                    <img
                        src="/imgs/jurytech-login.png"
                        alt="JuryTech Solutions S.A.S."
                        className="w-20 h-20 object-contain"
                    />
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#1B2541]">
                    Iniciar Sesión
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                    Ingresa tus credenciales para acceder al panel.
                </p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
                <div className="space-y-5">
                     {/* Campo Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1 pl-1">
                            Correo Electrónico
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-400" aria-hidden="true" />
                            </div>
                            <Input 
                                id="email"
                                {...register('email')} 
                                placeholder="ejemplo@crm.com" 
                                className="pl-10 border-slate-300 focus:border-[#1B2541] focus:ring-[#1B2541]/20 bg-white py-6"
                            />
                        </div>
                        {errors.email && (
                            <p className="text-xs text-red-600 font-medium mt-1 pl-1">{errors.email.message}</p>
                        )}
                    </div>

                     {/* Campo Password */}
                    <div>
                        <div className="flex items-center justify-between mb-1 pl-1">
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                                Contraseña
                            </label>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
                            </div>
                            <Input 
                                id="password"
                                type="password" 
                                {...register('password')} 
                                placeholder="••••••" 
                                className="pl-10 border-slate-300 focus:border-[#1B2541] focus:ring-[#1B2541]/20 bg-white py-6"
                            />
                        </div>
                         {errors.password && (
                            <p className="text-xs text-red-600 font-medium mt-1 pl-1">{errors.password.message}</p>
                        )}
                    </div>
                </div>

                 {/* Botón Principal */}
                <Button 
                    type="submit" 
                    className="w-full bg-[#1B2541] hover:bg-[#1B2541]/90 text-white font-bold py-6 text-md shadow-md transition-all hover:shadow-lg" 
                    disabled={loading}
                >
                    {loading ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Autenticando...</>
                    ) : (
                        'Acceder al Panel'
                    )}
                </Button>
            </form>
            
            <p className="mt-10 text-center text-xs text-slate-400">
                © 2026 JuryTech Solutions S.A.S. Acceso restringido y monitoreado.
            </p>
        </div>
      </div>
    </div>
  );
}