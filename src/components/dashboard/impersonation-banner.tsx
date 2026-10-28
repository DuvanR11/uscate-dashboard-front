'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useBrandingStore } from '@/store/branding-store';
import { Button } from '@/components/ui/button';

/**
 * Banner persistente mientras un PLATFORM_OPERATOR está "viendo como" otra
 * organización (soporte, ver informe "Gating por Plan"). Se monta en
 * `(dashboard)/layout.tsx` — visible en TODAS las rutas del dashboard
 * mientras la impersonación esté activa, para que nunca sea ambiguo de
 * quién es la sesión actual.
 */
export function ImpersonationBanner() {
  const router = useRouter();
  const impersonation = useAuthStore((s) => s.impersonation);
  const stopImpersonation = useAuthStore((s) => s.stopImpersonation);
  const reloadBranding = useBrandingStore((s) => s.reload);
  const [leaving, setLeaving] = useState(false);

  if (!impersonation) return null;

  // Fase 4 del análisis de punta a punta (2026-10-28, TRV-13): antes se
  // navegaba sin esperar y `/platform` se pintaba con el usuario de la
  // organización todavía guardado («No tienes permiso» un instante). Si la API
  // no devolvió la sesión del operador, `stopImpersonation` ya lleva a /login.
  const handleExit = async () => {
    setLeaving(true);
    try {
      await stopImpersonation();
    } finally {
      setLeaving(false);
    }
    if (!useAuthStore.getState().user) return;
    void reloadBranding();
    router.push('/platform');
  };

  return (
    <div className="sticky top-0 z-[110] bg-yellow-400 text-yellow-950 px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shadow-md">
      <Eye className="h-4 w-4 shrink-0" />
      <span>
        Estás viendo <strong>{impersonation.targetOrganizationName}</strong> como operador ({impersonation.operatorEmail})
      </span>
      <Button
        size="sm"
        variant="outline"
        className="h-6 px-2 border-yellow-950/30 text-yellow-950 hover:bg-yellow-950/10"
        onClick={handleExit}
        disabled={leaving}
      >
        <LogOut className="mr-1 h-3 w-3" /> {leaving ? 'Saliendo…' : 'Salir'}
      </Button>
    </div>
  );
}
