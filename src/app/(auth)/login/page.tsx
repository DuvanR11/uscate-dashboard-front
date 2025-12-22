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
      const { access_token, user } = response.data; 
      
      // 1. OBTENER CÓDIGO DE ROL
      // Manejo robusto: Si el backend devuelve objeto {id, code...} o solo string "ADMIN"
      const roleCode = typeof user.role === 'object' ? user.role.code : user.role;

      // 2. BLOQUEO DE CIUDADANOS (CITIZEN)
      if (roleCode === 'CITIZEN') {
        toast.error("Acceso restringido", {
            description: "Los ciudadanos solo pueden ingresar desde la App Móvil.",
        });
        setLoading(false);
        return; // Detenemos el proceso aquí
      }

      // 3. GUARDAR COOKIES (Para el Middleware)
      Cookies.set('auth-token', access_token, { expires: 1 }); // Expira en 1 día
      Cookies.set('user-role', roleCode, { expires: 1 });

      // 4. GUARDAR EN STORE (Estado Global)
      setAuth(access_token, user);

      toast.success("¡Bienvenido!", {
        description: `Sesión iniciada como ${user.fullName}`,
      });

      // 5. REDIRECCIÓN SEGÚN ROL
      if (['SECRETARY', 'LEGISLATIVE'].includes(roleCode)) {
        router.push('/requests');
      } else if (['LEADER', 'AGENT'].includes(roleCode)) {
        router.push('/prospects');
      } else {
        router.push('/dashboard'); // Admin, SuperAdmin
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
      
      {/* --- COLUMNA IZQUIERDA: IMAGEN DE FONDO Y MENSAJE --- */}
      <div className="hidden relative lg:flex flex-col justify-between p-10 h-full text-white bg-cover bg-center"
           style={{ 
             backgroundImage: `url('/imgs/login.png')` 
           }}>
        
        {/* Overlay degradado */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1B2541] via-[#1B2541]/70 to-[#1B2541]/30 z-0"></div>
        
        {/* Logo superior sobre la imagen */}
        <div className="relative z-10 flex items-center gap-2 font-bold text-lg">
            <ShieldCheck className="w-6 h-6 text-[#FFC400]" />
            <span>Plataforma de Campaña</span>
        </div>

        {/* Texto principal sobre la imagen */}
        <div className="relative z-10 mt-auto mb-10 max-w-md">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
            Equipo de la Seguridad <span className="text-[#FFC400]">#102</span>
          </h1>
          <p className="text-lg text-slate-200">
            Gestiona la estrategia, conecta con la comunidad y organiza el camino a la victoria.
          </p>
        </div>
      </div>


      {/* --- COLUMNA DERECHA: FORMULARIO --- */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="w-full max-w-md space-y-8">
            
            {/* Encabezado del formulario */}
            <div className="text-center lg:text-left mb-8">
                 {/* Logo visible solo en móvil */}
                <div className="lg:hidden flex justify-center mb-4">
                    <div className="p-2 bg-[#1B2541] rounded-lg inline-flex">
                        <ShieldCheck className="w-8 h-8 text-[#FFC400]" />
                    </div>
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
                © 2025 CRM Político. Acceso restringido y monitoreado.
            </p>
        </div>
      </div>
    </div>
  );
}