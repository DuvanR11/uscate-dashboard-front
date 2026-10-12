'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { useNavAccess } from '@/hooks/use-nav-access';
import { landingPathFor } from '@/lib/landing';

/**
 * Bloqueo único de pantallas sin permiso (Fase 2 del análisis, 2026-10-12).
 *
 * El menú ya esconde lo que la persona no puede ver, pero quien escribía la
 * dirección a mano (o seguía un enlace viejo) llegaba a una pantalla "rota":
 * tablas vacías, "No se pudo cargar…" y peticiones rechazadas en cadena. Solo
 * 12 pantallas tenían su propio aviso. Aquí se decide una sola vez, con la
 * MISMA regla del menú (`lib/navigation.ts`): si la sección de la dirección
 * pide un módulo que la persona no tiene, se muestra el aviso y la pantalla
 * ni se monta (no dispara ninguna petición).
 *
 * Las direcciones que no pertenecen a ninguna sección del menú pasan sin
 * tocarse: se protegen ellas mismas (y, siempre, el servidor).
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const user = useAuthStore((state) => state.user);
  const { routeAccess } = useNavAccess();
  const access = routeAccess(pathname);

  if (access === 'pending') {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Cargando" />
      </div>
    );
  }

  if (access === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center" role="alert">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-lg font-medium">No tienes permiso para ver esta pantalla</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Contacta a un administrador de tu organización si crees que deberías tener acceso.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={landingPathFor(user)}>Ir a mi inicio</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
