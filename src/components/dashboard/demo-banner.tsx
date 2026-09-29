'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RotateCcw, Presentation } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { extractErrorMessage } from '@/lib/api/platform';
import { getOwnDemoStatus, resetOwnDemo } from '@/lib/api/demos';

// Fase E (2026-09-29): aviso dentro de una organización DEMO. Recuerda que
// los envíos se simulan y le da al comercial (administrador de la demo) un
// botón para dejarla limpia antes de una reunión.
export function DemoBanner() {
  const role = useAuthStore((s) => s.user?.role?.code);
  const [status, setStatus] = useState<{ isDemo: boolean; demoResetAt?: string | null } | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (role === 'PLATFORM_OPERATOR') return;
    getOwnDemoStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [role]);

  if (!status?.isDemo) return null;

  const canReset = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const handleReset = async () => {
    if (!window.confirm('¿Dejar la demo como nueva? Se borran los cambios hechos y se vuelven a cargar los datos de ejemplo.')) return;
    setResetting(true);
    try {
      await resetOwnDemo();
      toast.success('Demo reiniciada. Recargando…');
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      toast.error('No se pudo reiniciar la demo', { description: extractErrorMessage(error) });
      setResetting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <Presentation className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong>Estás en una demostración.</strong> Los datos son de ejemplo y los correos y SMS se simulan (no le
          llegan a nadie). Se reinicia sola cada noche.
        </p>
      </div>
      {canReset && (
        <Button size="sm" variant="outline" className="shrink-0 border-sky-300 bg-white" disabled={resetting} onClick={handleReset}>
          {resetting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 h-3.5 w-3.5" />}
          Reiniciar demo
        </Button>
      )}
    </div>
  );
}
