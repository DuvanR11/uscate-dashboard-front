'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Mail, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { forgotPassword } from '@/lib/api/billing';
import { extractErrorMessage } from '@/lib/api/platform';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (error) {
      toast.error('No se pudo procesar la solicitud', {
        description: extractErrorMessage(error) ?? 'Revisa el correo e inténtalo de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Image src="/brand/zyron-mark-on-light.svg" alt="Zyron" width={64} height={64} priority unoptimized className="mx-auto mb-4 h-20 w-20 object-contain" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Recuperar contraseña</h1>
          <p className="mt-2 text-sm text-slate-500">
            Escribe el correo de tu cuenta y te enviamos un enlace para crear una contraseña nueva.
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 space-y-3">
            <MailCheck className="mx-auto h-10 w-10 text-emerald-600" />
            <p className="font-semibold text-slate-800">Revisa tu correo</p>
            <p className="text-sm text-slate-500">
              Si el correo está registrado, te enviamos un enlace que vale 1 hora. Si no llega, revisa la carpeta de
              spam o pídele a tu asesor un enlace de recuperación.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="border-slate-300 bg-white py-6 pl-10"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary py-6 font-bold text-white hover:bg-primary/90">
              {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Enviando...</> : 'Enviar enlace'}
            </Button>
          </form>
        )}

        <p className="text-center text-sm">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
