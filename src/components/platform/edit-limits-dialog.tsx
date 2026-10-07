'use client';
import { useState } from 'react';
import { usePlatformAccess } from './access-context';
import { toast } from 'sonner';
import { Settings2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { updateOrganizationLimits, extractErrorMessage, type PlatformOrganization, type UpdateOrganizationLimitsInput } from '@/lib/api/platform';

export function EditLimitsDialog({
  organization,
  onUpdated,
}: {
  organization: PlatformOrganization;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const access = usePlatformAccess();
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState('');
  const [review, setReview] = useState<{ input: UpdateOrganizationLimitsInput; summary: string[] } | null>(null);
  const [form, setForm] = useState({
    smsLimit: String(organization.consumption?.sms.limit ?? 0),
    emailLimit: String(organization.consumption?.email.limit ?? 0),
    whatsappLimit: String(organization.consumption?.whatsapp.limit ?? 0),
    deepSearchWeeklyLimit: String(organization.deepSearchWeeklyLimit ?? 0),
    usersLimit: String(organization.limits?.users ?? ''),
    prospectsLimit: String(organization.limits?.prospects ?? ''),
  });
  // Catálogo territorial: con plan comercial, tope propio de usuarios y
  // contactos de esta organización (acuerdo puntual, sin cambiarle el plan).
  const hasPlanLimits = Boolean(organization.commercialPlan && organization.limits);
  // Cupo por rol — un input por cada rol REAL del catálogo (incluidos los
  // que están en cero, para poder habilitarlos desde acá). Separado de
  // `form` porque son claves dinámicas (código de rol), no campos fijos.
  const [roleLimitsForm, setRoleLimitsForm] = useState<Record<string, string>>(
    Object.fromEntries((organization.seatsByRole ?? []).map((r) => [r.code, String(r.limit)])),
  );

  const handleOpenChange = (next: boolean) => {
    if (saving) return;
    setOpen(next);
    if (next) {
      setReason('');
      setReview(null);
      // Siempre arranca desde los valores reales actuales — evita editar
      // sobre un formulario con datos de una apertura anterior.
      setForm({
        smsLimit: String(organization.consumption?.sms.limit ?? 0),
        emailLimit: String(organization.consumption?.email.limit ?? 0),
        whatsappLimit: String(organization.consumption?.whatsapp.limit ?? 0),
        deepSearchWeeklyLimit: String(organization.deepSearchWeeklyLimit ?? 0),
        usersLimit: String(organization.limits?.users ?? ''),
        prospectsLimit: String(organization.limits?.prospects ?? ''),
      });
      setRoleLimitsForm(
        Object.fromEntries((organization.seatsByRole ?? []).map((r) => [r.code, String(r.limit)])),
      );
    }
  };

  const handleSubmit = async () => {
    const input: UpdateOrganizationLimitsInput = {
      smsLimit: Number(form.smsLimit),
      emailLimit: Number(form.emailLimit),
      whatsappLimit: Number(form.whatsappLimit),
      deepSearchWeeklyLimit: Number(form.deepSearchWeeklyLimit),
    };

    if ([input.smsLimit, input.emailLimit, input.whatsappLimit, input.deepSearchWeeklyLimit].some((v) => v === undefined || !Number.isInteger(v) || v < 0)) {
      toast.error('Los cupos deben ser números enteros, cero o más.');
      return;
    }

    if (hasPlanLimits) {
      for (const [key, current] of [
        ['usersLimit', organization.limits?.users ?? null],
        ['prospectsLimit', organization.limits?.prospects ?? null],
      ] as const) {
        const value = Number(form[key]);
        if (!Number.isInteger(value) || value < 1) {
          toast.error('Usuarios y contactos deben ser números enteros, uno o más.');
          return;
        }
        if (value !== current) input[key] = value;
      }
    }

    // PATCH parcial real: solo se envían los roles cuyo cupo el operador
    // realmente cambió respecto al valor con el que abrió el diálogo —
    // mismo criterio que ya aplica el backend al mergear `roleLimits`.
    const roleLimits: Record<string, number> = {};
    for (const role of organization.seatsByRole ?? []) {
      const raw = roleLimitsForm[role.code] ?? String(role.limit);
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 0) {
        toast.error(`El cupo de "${role.name}" debe ser un número entero, cero o más.`);
        return;
      }
      if (value !== role.limit) roleLimits[role.code] = value;
    }
    if (Object.keys(roleLimits).length > 0) input.roleLimits = roleLimits;

    const summary: string[] = [];
    const fields = [
      ['smsLimit', 'SMS', organization.consumption?.sms.limit ?? 0],
      ['emailLimit', 'Correo', organization.consumption?.email.limit ?? 0],
      ['whatsappLimit', 'WhatsApp', organization.consumption?.whatsapp.limit ?? 0],
      ['deepSearchWeeklyLimit', 'Deep Search semanal', organization.deepSearchWeeklyLimit ?? 0],
      ['usersLimit', 'Usuarios', organization.limits?.users],
      ['prospectsLimit', 'Contactos', organization.limits?.prospects],
    ] as const;
    for (const [key, label, before] of fields) {
      const after = input[key];
      if (after === before) delete input[key];
      else if (after !== undefined) summary.push(`${label}: ${before ?? 'sin límite'} → ${after}`);
    }
    for (const role of organization.seatsByRole ?? []) {
      if (roleLimits[role.code] !== undefined) summary.push(`${role.name}: ${role.limit} → ${roleLimits[role.code]}`);
    }
    if (!summary.length) { toast.info('No hay cambios para guardar.'); return; }
    if (reason.trim().length < 3) { toast.error('Indica el motivo del cambio.'); return; }
    input.reason = reason.trim();
    setReview({ input, summary });
  };

  const handleSave = async () => {
    if (!review || saving) return;
    setSaving(true);
    try {
      await updateOrganizationLimits(organization.id, review.input);
      toast.success(`Cupos de "${organization.name}" actualizados`);
      setOpen(false);
      onUpdated();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudieron actualizar los cupos');
    } finally {
      setSaving(false);
    }
  };

  if (access?.enabled) return null;
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Cupos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cupos de &quot;{organization.name}&quot;</DialogTitle>
        </DialogHeader>
        {review && <section className="space-y-3"><p>Revisa los cambios antes de confirmar.</p><ul className="space-y-2">{review.summary.map((change) => <li key={change}>{change}</li>)}</ul><p className="text-sm">Motivo: {review.input.reason}</p></section>}
        <div hidden={Boolean(review)} className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="limit-sms">SMS por período</Label>
            <Input
              id="limit-sms"
              type="number"
              min={0}
              value={form.smsLimit}
              onChange={(e) => setForm((f) => ({ ...f, smsLimit: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="limit-email">Email por período</Label>
            <Input
              id="limit-email"
              type="number"
              min={0}
              value={form.emailLimit}
              onChange={(e) => setForm((f) => ({ ...f, emailLimit: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="limit-whatsapp">WhatsApp por período</Label>
            <Input
              id="limit-whatsapp"
              type="number"
              min={0}
              value={form.whatsappLimit}
              onChange={(e) => setForm((f) => ({ ...f, whatsappLimit: e.target.value }))}
            />
          </div>
          {hasPlanLimits && (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="limit-users">Usuarios del equipo</Label>
                <Input
                  id="limit-users"
                  type="number"
                  min={1}
                  value={form.usersLimit}
                  onChange={(e) => setForm((f) => ({ ...f, usersLimit: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="limit-prospects">Contactos</Label>
                <Input
                  id="limit-prospects"
                  type="number"
                  min={1}
                  value={form.prospectsLimit}
                  onChange={(e) => setForm((f) => ({ ...f, prospectsLimit: e.target.value }))}
                />
              </div>
              <p className="col-span-2 text-xs text-slate-500">
                Tope propio de esta organización (plan {organization.commercialPlan?.name}): se puede subir por un acuerdo
                puntual o vender como complemento en &quot;Cobros&quot;, sin cambiar a otros clientes del mismo plan.
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="limit-deep-search">Deep Search por semana</Label>
            <Input
              id="limit-deep-search"
              type="number"
              min={0}
              value={form.deepSearchWeeklyLimit}
              onChange={(e) => setForm((f) => ({ ...f, deepSearchWeeklyLimit: e.target.value }))}
            />
          </div>

          {(organization.seatsByRole?.length ?? 0) > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Label>Usuarios por rol</Label>
              <p className="text-xs text-slate-400">
                Cuántos usuarios activos con cada rol puede tener esta organización — el mismo
                cupo que bloquea el alta de un usuario nuevo desde &quot;Usuarios&quot; cuando se
                agota.
              </p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {(organization.seatsByRole ?? []).map((role) => (
                  <div key={role.code} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">{role.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{role.code} · {role.used} en uso</p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      value={roleLimitsForm[role.code] ?? String(role.limit)}
                      onChange={(e) =>
                        setRoleLimitsForm((f) => ({ ...f, [role.code]: e.target.value }))
                      }
                      className="w-20 shrink-0"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div hidden={Boolean(review)} className="space-y-1.5"><Label htmlFor="limits-reason">Motivo del cambio</Label><Input id="limits-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} /></div>
        <DialogFooter>
          <Button variant="outline" onClick={() => review ? setReview(null) : setOpen(false)} disabled={saving}>{review ? 'Volver a editar' : 'Cancelar'}</Button>
          <Button onClick={review ? handleSave : handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : review ? 'Confirmar cupos' : 'Guardar cupos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
