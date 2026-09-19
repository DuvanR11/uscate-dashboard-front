'use client';

import { useEffect } from 'react';
import { ShieldAlert, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Hallazgo real de QA (2026-09-19): "Fichas digitales da error" — la ruta
// nunca tuvo un `error.tsx` propio, así que cualquier falla de sus 4
// llamadas server-side (`apiGet` en page.tsx), incluido un 403 legítimo
// por falta del permiso PROYECTOS_LEY, caía en la pantalla de error
// genérica de Next.js. Este boundary distingue "no tienes permiso" (403,
// esperado para roles fuera de ADMIN/LEGISLATIVE) de una falla real.
export default function ProjectsError({
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

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <ShieldAlert className="h-10 w-10 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-lg font-medium">
          {isForbidden
            ? 'No tienes permiso para ver Fichas Digitales'
            : 'No se pudo cargar Fichas Digitales'}
        </p>
        <p className="text-sm text-muted-foreground max-w-md">
          {isForbidden
            ? 'Este módulo requiere el permiso de Proyectos de Ley. Contacta a un administrador si crees que deberías tener acceso.'
            : 'Hubo un problema consultando el Radar Legislativo. Intenta de nuevo en un momento.'}
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
