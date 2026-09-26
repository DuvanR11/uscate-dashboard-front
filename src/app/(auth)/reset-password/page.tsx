'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resetPassword } from '@/lib/api/billing';
import { extractErrorMessage } from '@/lib/api/platform';

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Misma regla que el backend (assertStrongPassword) — solo para dar el
  // error antes del viaje; la validación real es la del servidor.
  const problem =
    password.length > 0 && (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
      ? 'Mínimo 8 caracteres, con al menos una letra y un número.'
      : password && confirm && password !== confirm
        ? 'Las contraseñas no coinciden.'
        : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (problem || !password || password !== confirm) return;
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (error) {
      toast.error('No se pudo cambiar la contraseña', {
        description: extractErrorMessage(error) ?? 'El enlace no es válido o ya venció.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 space-y-3">
        <p className="font-semibold text-slate-800">Enlace incompleto</p>
        <p className="text-sm text-slate-500">
          Abre el enlace completo que te llegó por correo, o{' '}
          <Link href="/forgot-password" className="font-medium text-[#1B2541] underline">
            solicita uno nuevo
          </Link>
          .
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 space-y-3">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <p className="font-semibold text-slate-800">Contraseña actualizada</p>
        <p className="text-sm text-slate-500">Te llevamos al inicio de sesión…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <Input
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña nueva"
          className="border-slate-300 bg-white py-6 pl-10"
        />
      </div>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <Input
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repite la contraseña"
          className="border-slate-300 bg-white py-6 pl-10"
        />
      </div>
      {problem && <p className="text-xs font-medium text-red-600">{problem}</p>}
      <p className="text-xs text-slate-400">Al cambiarla, se cerrarán las sesiones abiertas en todos tus dispositivos.</p>
      <Button
        type="submit"
        disabled={loading || Boolean(problem) || !password || password !== confirm}
        className="w-full bg-[#1B2541] py-6 font-bold text-white hover:bg-[#1B2541]/90"
      >
        {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Guardando...</> : 'Guardar contraseña'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Image src="/imgs/jurytech-login.png" alt="JuryTech Solutions S.A.S." width={80} height={80} priority className="mx-auto mb-4 h-20 w-20 object-contain" />
          <h1 className="text-2xl font-bold tracking-tight text-[#1B2541]">Crea tu contraseña nueva</h1>
        </div>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
        <p className="text-center text-sm">
          <Link href="/login" className="font-medium text-[#1B2541] hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
