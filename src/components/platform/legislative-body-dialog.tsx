'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Landmark, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  bodiesForOffice,
  extractErrorMessage,
  OFFICE_TYPE_LABEL,
  updateLegislativeBody,
  type LegislativeBody,
  type OrganizationOfficeType,
  type PlatformOrganization,
} from '@/lib/api/platform';

const NONE = '__none__';

// Fase C (2026-09-28): cargo y corporación que una organización EXISTENTE
// sigue en el Radar Legislativo (antes solo se podía al crearla). Solo se
// ofrecen corporaciones del nivel del cargo; el backend valida y audita.
export function LegislativeBodyDialog({
  organization,
  legislativeBodies,
  onChanged,
}: {
  organization: PlatformOrganization;
  legislativeBodies: LegislativeBody[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [officeType, setOfficeType] = useState<string>(organization.officeType ?? NONE);
  const [bodyId, setBodyId] = useState<string>(organization.legislativeBodyId ?? NONE);
  const [saving, setSaving] = useState(false);

  const options = officeType === NONE ? [] : bodiesForOffice(legislativeBodies, officeType as OrganizationOfficeType);
  const current = legislativeBodies.find((b) => b.code === organization.legislativeBodyId);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setOfficeType(organization.officeType ?? NONE);
      setBodyId(organization.legislativeBodyId ?? NONE);
    }
    setOpen(next);
  };

  const handleOfficeChange = (value: string) => {
    setOfficeType(value);
    // Una corporación de otro nivel queda obsoleta con el cargo nuevo.
    if (!bodiesForOffice(legislativeBodies, value as OrganizationOfficeType).some((b) => b.code === bodyId)) {
      setBodyId(NONE);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLegislativeBody(organization.id, {
        ...(officeType !== NONE ? { officeType: officeType as OrganizationOfficeType } : {}),
        legislativeBodyId: bodyId === NONE ? null : bodyId,
      });
      toast.success('Radar Legislativo actualizado');
      setOpen(false);
      onChanged();
    } catch (error) {
      toast.error('No se pudo actualizar', { description: extractErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-800"
          title="Corporación que la organización sigue en el Radar Legislativo"
        >
          <Landmark className={`h-3.5 w-3.5 ${current ? 'text-emerald-600' : 'text-slate-400'}`} />
          {current ? `Radar: ${current.name}` : 'Asignar corporación del Radar'}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Radar Legislativo — {organization.name}</DialogTitle>
          <DialogDescription>
            Cada cargo sigue a una corporación de su nivel: concejales y alcaldes a su concejo, diputados y
            gobernadores a su asamblea, congresistas a su cámara.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="space-y-1.5">
            <Label>Tipo de cargo</Label>
            <Select value={officeType} onValueChange={handleOfficeChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE} disabled>
                  Sin definir
                </SelectItem>
                {(Object.keys(OFFICE_TYPE_LABEL) as OrganizationOfficeType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {OFFICE_TYPE_LABEL[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Corporación</Label>
            <Select value={bodyId} onValueChange={setBodyId} disabled={officeType === NONE}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Ninguna</SelectItem>
                {options.map((body) => (
                  <SelectItem key={body.code} value={body.code}>
                    {body.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {officeType !== NONE && options.length === 0 && (
              <p className="text-xs text-amber-700">Todavía no hay corporaciones de este nivel en el Radar.</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || officeType === NONE}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
