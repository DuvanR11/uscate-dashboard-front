'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import { usePermission } from '@/hooks/use-permission';
import { Button } from '@/components/ui/button';

// Zyron Prensa (2026-11-08): protección de fuentes. El equipo de Zyron no
// entra con «Ver como» a una organización de prensa salvo que ella lo
// permita, por 24 horas (`PUT /organization/support-access`). En las demás
// organizaciones este recuadro no aparece.
interface Profile {
  usage?: string | null;
  supportAccessUntil?: string | null;
}

const formatUntil = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });

export function PressSupportAccess() {
  const canWrite = usePermission('CONFIGURACION', 'canWrite');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Profile>('/organization/profile');
      setProfile(data);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (profile?.usage !== 'PRESS') return null;

  const until = profile.supportAccessUntil;
  const active = !!until && new Date(until) > new Date();

  const update = async (enabled: boolean) => {
    setSaving(true);
    try {
      const { data } = await api.put<{ supportAccessUntil: string | null }>(
        '/organization/support-access',
        { enabled },
      );
      setProfile((p) => ({ ...p, supportAccessUntil: data.supportAccessUntil }));
      toast.success(enabled ? 'Permiso dado por 24 horas.' : 'Permiso retirado.');
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status !== 403) toast.error('No se pudo cambiar el permiso.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="press-support-title" className="mb-6 space-y-3 rounded-xl border p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck aria-hidden className="h-5 w-5 text-primary" />
        <h2 id="press-support-title" className="font-semibold">
          Acceso del equipo de soporte
        </h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Para proteger tus fuentes, el equipo de Zyron no puede entrar a tu cuenta. Si necesitas que vean
        lo mismo que tú para resolver un problema, dales permiso: dura 24 horas y lo puedes retirar antes.
      </p>
      <p className="text-sm">
        {active ? `Permiso dado hasta el ${formatUntil(until!)}.` : 'Sin permiso: nadie de Zyron puede entrar.'}
      </p>
      {canWrite && (
        <Button
          type="button"
          variant={active ? 'outline' : 'default'}
          disabled={saving}
          onClick={() => update(!active)}
        >
          {active ? 'Retirar el permiso' : 'Dar permiso por 24 horas'}
        </Button>
      )}
    </section>
  );
}
