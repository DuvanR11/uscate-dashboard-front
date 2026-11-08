'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Landmark } from 'lucide-react';
import api from '@/lib/api';
import { usePermission } from '@/hooks/use-permission';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Zyron Prensa (2026-11-08, D4): una organización de prensa ve Cámara y Senado
// siempre y elige, dentro del tope de su plan, otras corporaciones (concejos,
// asambleas). Lo decide el servidor (`PUT /projects/radar-bodies`); aquí solo
// se marca y se envía la lista completa.
export interface RadarBodyOption {
  code: string;
  name: string;
}

export default function RadarBodiesChooser({
  limit,
  chosen,
  options,
}: {
  limit: number;
  chosen: string[];
  options: RadarBodyOption[];
}) {
  const router = useRouter();
  const canWrite = usePermission('CONFIGURACION', 'canWrite');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(chosen);
  const [saving, setSaving] = useState(false);

  if (!canWrite || !options.length) return null;

  const toggle = (code: string, on: boolean) =>
    setSelected((prev) => (on ? [...prev, code] : prev.filter((c) => c !== code)));
  const full = selected.length >= limit;

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/projects/radar-bodies', { codes: selected });
      toast.success('Corporaciones actualizadas.');
      setOpen(false);
      router.refresh();
    } catch (error) {
      const response = (error as { response?: { status?: number; data?: { message?: unknown } } })
        .response;
      const raw = response?.data?.message;
      const message = Array.isArray(raw) ? raw[0] : raw;
      if (response?.status !== 403) {
        toast.error(typeof message === 'string' && message ? message : 'No se pudieron guardar las corporaciones.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setSelected(chosen);
          setOpen(true);
        }}
      >
        <Landmark className="mr-2 h-4 w-4" />
        Elegir corporaciones
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Corporaciones que sigues</DialogTitle>
            <DialogDescription>
              Cámara y Senado van siempre.{' '}
              {limit === 0
                ? 'Tu plan no incluye otras corporaciones.'
                : limit === 1
                  ? 'Tu plan incluye una corporación más.'
                  : `Tu plan incluye hasta ${limit} corporaciones más.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {options.map((option, index) => {
              const checked = selected.includes(option.code);
              const id = `radar-body-${index}`;
              return (
                <div key={option.code} className="flex items-center gap-3">
                  <Checkbox
                    id={id}
                    checked={checked}
                    disabled={saving || (!checked && full)}
                    onCheckedChange={(value) => toggle(option.code, value === true)}
                  />
                  <Label htmlFor={id} className="font-normal">
                    {option.name}
                  </Label>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
