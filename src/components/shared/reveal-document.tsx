'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { canRevealDocuments } from '@/lib/identity-document';
import { revealDocument, type DocumentSubject } from '@/lib/api/identity-document';
import { apiErrorMessage } from '@/lib/api-error';

// Plan hacia la versión estable, Fase 2 (2026-11-10): la cédula se muestra
// enmascarada (`•••• 4567`). Quien puede verla completa tiene el botón del
// ojo; cada vez que la abre queda registrado en el servidor. Se vuelve a
// ocultar sola a los 30 segundos.

const HIDE_AFTER_MS = 30_000;

type Props = {
  subject: DocumentSubject;
  id: string;
  /** Lo que devolvió la API (`•••• 4567`) o nada. */
  masked: string | null | undefined;
  className?: string;
  empty?: React.ReactNode;
};

export function RevealDocument({ subject, id, masked, className, empty = '-' }: Props) {
  const user = useAuthStore((state) => state.user);
  const impersonating = useAuthStore((state) => !!state.impersonation);
  const [full, setFull] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!full) return;
    const timer = setTimeout(() => setFull(null), HIDE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [full]);

  if (!masked) return <>{empty}</>;
  const allowed = canRevealDocuments(user, impersonating);

  async function toggle(event: React.MouseEvent) {
    // Dentro de una fila clicable no debe abrir el detalle.
    event.stopPropagation();
    if (full) {
      setFull(null);
      return;
    }
    setLoading(true);
    try {
      const { documentNumber } = await revealDocument(subject, id);
      setFull(documentNumber);
    } catch (error) {
      toast.error('No se pudo mostrar la cédula completa', {
        description: apiErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ''}`}>
      <span className="font-mono">{full ?? masked}</span>
      {allowed && (
        <button
          type="button"
          onClick={toggle}
          disabled={loading}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          aria-label={full ? 'Ocultar cédula' : 'Ver cédula completa (queda registrado)'}
          title={full ? 'Ocultar cédula' : 'Ver cédula completa (queda registrado)'}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : full ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </span>
  );
}
