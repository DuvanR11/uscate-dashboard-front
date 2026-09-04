'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';

const VOTE_OPTIONS = [
  { value: 'FAVOR', label: 'A favor' },
  { value: 'CONTRA', label: 'En contra' },
  { value: 'ABSTENCION', label: 'Abstención' },
  { value: 'MODIFICAR', label: 'Con modificaciones' },
  { value: 'REVISAR', label: 'Queda por revisar' },
];

function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    return Array.isArray(message) ? message[0] : message;
  }
  return undefined;
}

/**
 * Plan "Radar Legislativo", Fase 2 (cerrada 2026-09-03, decisión de
 * producto confirmada: completar el ciclo real de ML) — hasta ahora,
 * `MlService.train()` existía en el backend pero NADA lo llamaba nunca
 * (el modelo siempre predecía 50/50). Este es el único punto real de la
 * app donde un congresista/asesor registra cómo decidió REALMENTE, distinto
 * de lo que la IA sugirió — sin esto, la recomendación nunca aprende nada.
 */
export default function RegisterActualVoteCard({
  projectInternalId,
  actualVote,
}: {
  projectInternalId: string;
  actualVote?: string | null;
}) {
  const [vote, setVote] = useState(actualVote || '');
  const [saving, setSaving] = useState(false);
  const [registered, setRegistered] = useState<string | null>(actualVote || null);

  const handleSubmit = async () => {
    if (!vote) {
      toast.error('Elegí cómo se decidió realmente este proyecto.');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/projects/${projectInternalId}/actual-vote`, { vote });
      setRegistered(vote);
      toast.success('Voto real registrado — el modelo de este usuario acaba de aprender de esta decisión.');
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo registrar el voto real.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
        Voto real
      </p>
      <h2 className="mb-4 text-lg font-bold text-primary">
        ¿Cómo se decidió realmente este proyecto?
      </h2>
      <p className="mb-4 text-sm leading-6 text-slate-500">
        Esto es distinto de la recomendación de la IA de arriba — registrarlo entrena tu propio
        modelo de aprendizaje para que futuras recomendaciones se parezcan más a cómo decidís vos.
      </p>

      {registered && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          Voto real ya registrado: <strong>{VOTE_OPTIONS.find((o) => o.value === registered)?.label || registered}</strong>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Select value={vote} onValueChange={setVote}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Elegir decisión real..." />
          </SelectTrigger>
          <SelectContent>
            {VOTE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleSubmit} disabled={saving} className="bg-primary text-white">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : registered ? 'Actualizar voto real' : 'Registrar voto real'}
        </Button>
      </div>
    </div>
  );
}
