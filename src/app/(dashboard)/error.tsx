'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Fase 2 "Confiabilidad" (2026-09-26): antes solo `/projects` tenía un
// `error.tsx`; cualquier otra pantalla del dashboard que fallara al
// renderizar caía en la pantalla de error genérica de Next.js — sin sidebar,
// sin forma de reintentar. Este boundary vive DENTRO del layout del
// dashboard (el menú sigue disponible) y distingue "no tienes permiso"
// (403, esperado) de una falla real.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { status?: number; digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isForbidden = error.status === 403;
  const Icon = isForbidden ? ShieldAlert : AlertTriangle;

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-lg font-medium">
          {isForbidden ? 'No tienes permiso para ver esta pantalla' : 'Algo salió mal al cargar esta pantalla'}
        </p>
        <p className="max-w-md text-sm text-muted-foreground">
          {isForbidden
            ? 'Contacta a un administrador si crees que deberías tener acceso.'
            : 'El resto de la plataforma sigue funcionando. Intenta de nuevo; si el problema continúa, avisa a soporte.'}
        </p>
      </div>
      {!isForbidden && (
        <Button onClick={() => reset()} variant="outline" className="gap-2">
          <RotateCw className="h-4 w-4" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
