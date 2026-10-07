'use client';

// Fase 4 "Líderes y celular" (2026-10-06): dirección de arranque de la
// aplicación instalada (`start_url` del manifiesto). Lleva a cada persona a
// su pantalla: el líder a su panel, el resto a su inicio de siempre. Sin
// sesión, el middleware ya redirige al inicio de sesión antes de llegar aquí.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { landingPathFor } from '@/lib/landing';
import { useAuthStore } from '@/store/auth-store';

export default function StartPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    router.replace(landingPathFor(user));
  }, [router, user]);

  return (
    <div className="flex justify-center p-16">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="Abriendo" />
    </div>
  );
}
