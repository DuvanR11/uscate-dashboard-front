'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import Cookies from 'js-cookie'; // IMPORTANTE: Para guardar cookies manualmente
import { landingPathFor } from '@/lib/landing';

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

      // 4. A dónde llega cada persona (Fase 4: el líder va a su panel; el
      // resto, a su inicio de siempre). Se calcula con el `user` que acaba de
      // responder el servidor, no con el store, que `setAuth` recién está
      // poblando.
      router.push(landingPathFor({ ...user, permissions }));
    } catch (error: unknown) {
      console.error(error);
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : undefined;
      const msg = responseMessage || "Credenciales incorrectas o usuario inactivo.";
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
      
      {/* --- COLUMNA IZQUIERDA: MARCA ZYRON --- */}
      {/* Fondo tinta de la marca, con una retícula hexagonal muy tenue (el
          mismo motivo del isotipo) en vez de una foto de portada. */}
      <div className="hidden relative lg:flex flex-col justify-between p-12 h-full text-white bg-[#0B1728] overflow-hidden">
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full opacity-[0.07]">
          <defs>
            <pattern id="zyron-hex" width="56" height="97" patternUnits="userSpaceOnUse" patternTransform="scale(1.4)">
              <path d="M28 2 54 17v30L28 62 2 47V17Z M28 62v33 M2 47-24 62 M54 47 80 62" fill="none" stroke="#FFFFFF" strokeWidth="1.2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#zyron-hex)" />
        </svg>
        <div className="absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-[#1E4FD8]/30 blur-3xl" aria-hidden="true" />

        <Image
          src="/brand/zyron-logo-on-dark.svg"
          alt="Zyron"
          width={216}
          height={48}
          priority
          unoptimized
          className="relative z-10 h-12 w-auto self-start"
        />

        <div className="relative z-10 max-w-md space-y-4">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Tu campaña y tu despacho, en un solo lugar.
          </h1>
          <p className="text-lg text-slate-300">
            Contactos, territorio, difusiones e inteligencia, con los datos de tu organización aislados y protegidos.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-sm text-slate-400">
          <ShieldCheck className="w-4 h-4 text-[#22B8CF]" />
          <span>Acceso exclusivo para equipos autorizados.</span>
        </div>
      </div>


      {/* --- COLUMNA DERECHA: FORMULARIO --- */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="w-full max-w-md space-y-8">
            
            {/* Encabezado del formulario */}
            <div className="text-center lg:text-left mb-8">
                 {/* Logo visible solo en móvil */}
                <div className="lg:hidden flex justify-center mb-4">
                    <Image
                        src="/brand/zyron-logo-on-light.svg"
                        alt="Zyron"
                        width={180}
                        height={40}
                        unoptimized
                        className="h-10 w-auto"
                    />
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
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
                                className="pl-10 border-slate-300 focus:border-primary focus:ring-primary/20 bg-white py-6"
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
                            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                                ¿Olvidaste tu contraseña?
                            </Link>
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
                                className="pl-10 border-slate-300 focus:border-primary focus:ring-primary/20 bg-white py-6"
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
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6 text-md shadow-md transition-all hover:shadow-lg" 
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
                © 2026 Zyron · JuryTech Solutions S.A.S. Acceso restringido y monitoreado.
            </p>
            <p className="mt-2 text-center text-xs text-slate-500">
                ¿Aún no eres cliente?{' '}
                <Link href="/planes" className="font-medium text-primary hover:underline">
                    Conoce los planes
                </Link>
            </p>
        </div>
      </div>
    </div>
  );
}