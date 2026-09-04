'use client';

import { useRouter } from 'next/navigation';
import { Eye, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
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

  if (!impersonation) return null;

  const handleExit = () => {
    stopImpersonation();
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
      >
        <LogOut className="mr-1 h-3 w-3" /> Salir
      </Button>
    </div>
  );
}
