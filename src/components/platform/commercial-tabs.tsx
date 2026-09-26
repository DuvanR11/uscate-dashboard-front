'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Mail, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { extractErrorMessage } from '@/lib/api/platform';
import {
  LEAD_STATUS_LABEL,
  listCommercialPlans,
  listLeads,
  listSalesReps,
  updateCommercialPlan,
  updateLead,
  type CommercialPlanAdmin,
  type SalesLead,
  type SalesLeadStatus,
  type SalesRep,
} from '@/lib/api/billing';
import { formatCop } from './organization-billing-dialog';

const fmtNum = (v: number | null) => (v === null ? 'Ilimitado' : new Intl.NumberFormat('es-CO').format(v));

// ---- Catálogo comercial -----------------------------------------------------

export function CommercialPlansTab() {
  const [plans, setPlans] = useState<CommercialPlanAdmin[] | null>(null);

  const load = useCallback(() => {
    listCommercialPlans()
      .then(setPlans)
      .catch(() => toast.error('No se pudo cargar el catálogo comercial'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (plan: CommercialPlanAdmin, field: 'isActive' | 'isPublic', value: boolean) => {
    try {
      await updateCommercialPlan(plan.code, { [field]: value });
      load();
    } catch (error) {
      toast.error('No se pudo actualizar', { description: extractErrorMessage(error) });
    }
  };

  if (!plans) return <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  if (plans.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-400">
        El catálogo está vacío. Cárgalo con <code>scripts/backfill-commercial-plans.ts</code>.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Precios mensuales sin IVA. La página pública, la cotización y el cobro calculan desde aquí; un cambio rige de
        inmediato y queda auditado. Los cupos de envío se aplican a la organización al registrar su pago; los de usuarios
        y prospectos son informativos (los asientos por rol se ajustan en &quot;Cupos&quot;).
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Lista /mes</TableHead>
              <TableHead>Fundador /mes</TableHead>
              <TableHead>Cupos Fundador</TableHead>
              <TableHead>WhatsApp · SMS · Email</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead>Público</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((p) => (
              <TableRow key={p.code}>
                <TableCell>
                  <span className="font-medium">{p.name}</span>
                  <span className="block text-xs text-slate-400">módulos {p.basePlanCode} · aspirante {p.aspirantPricePercent}%</span>
                </TableCell>
                <TableCell className="tabular-nums">{formatCop(p.listMonthlyPrice)}</TableCell>
                <TableCell className="tabular-nums">{formatCop(p.founderMonthlyPrice)}</TableCell>
                <TableCell className="tabular-nums">
                  <Badge variant={p.founderSlotsUsed >= p.founderSlots ? 'destructive' : 'outline'}>
                    {p.founderSlotsUsed}/{p.founderSlots}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs tabular-nums">
                  {fmtNum(p.whatsappLimit)} · {fmtNum(p.smsLimit)} · {fmtNum(p.emailLimit)}
                </TableCell>
                <TableCell><Switch checked={p.isActive} onCheckedChange={(v) => toggle(p, 'isActive', v)} /></TableCell>
                <TableCell><Switch checked={p.isPublic} onCheckedChange={(v) => toggle(p, 'isPublic', v)} /></TableCell>
                <TableCell><EditPlanDialog plan={p} onSaved={load} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function EditPlanDialog({ plan, onSaved }: { plan: CommercialPlanAdmin; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => toForm(plan));

  useEffect(() => {
    if (open) setForm(toForm(plan));
  }, [open, plan]);

  const numeric: [keyof ReturnType<typeof toForm>, string][] = [
    ['listMonthlyPrice', 'Precio de lista /mes'],
    ['founderMonthlyPrice', 'Precio Fundador /mes'],
    ['founderSlots', 'Cupos Fundador'],
    ['aspirantPricePercent', 'Aspirante (% del precio)'],
    ['whatsappLimit', 'WhatsApp /mes'],
    ['smsLimit', 'SMS /mes'],
    ['emailLimit', 'Correos /mes'],
    ['usersLimit', 'Usuarios (vacío = ilimitado)'],
    ['prospectsLimit', 'Prospectos (vacío = ilimitado)'],
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const num = (v: string) => Number(v);
      await updateCommercialPlan(plan.code, {
        name: form.name.trim(),
        description: form.description.trim(),
        listMonthlyPrice: num(form.listMonthlyPrice),
        founderMonthlyPrice: num(form.founderMonthlyPrice),
        founderSlots: num(form.founderSlots),
        aspirantPricePercent: num(form.aspirantPricePercent),
        whatsappLimit: num(form.whatsappLimit),
        smsLimit: num(form.smsLimit),
        emailLimit: num(form.emailLimit),
        ...(form.usersLimit ? { usersLimit: num(form.usersLimit) } : {}),
        ...(form.prospectsLimit ? { prospectsLimit: num(form.prospectsLimit) } : {}),
      });
      toast.success('Plan actualizado');
      setOpen(false);
      onSaved();
    } catch (error) {
      toast.error('No se pudo guardar', { description: extractErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Editar</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader><DialogTitle>Plan {plan.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Descripción pública</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            {numeric.map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input type="number" min={0} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Cambiar un precio afecta cotizaciones y cobros nuevos; los pagos ya registrados no cambian. Quitar el límite de
            usuarios o prospectos una vez fijado se hace desde la base (no desde este formulario).
          </p>
        </div>
        <DialogFooter>
          <Button disabled={saving} onClick={handleSave}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toForm(p: CommercialPlanAdmin) {
  return {
    name: p.name,
    description: p.description ?? '',
    listMonthlyPrice: String(p.listMonthlyPrice),
    founderMonthlyPrice: String(p.founderMonthlyPrice),
    founderSlots: String(p.founderSlots),
    aspirantPricePercent: String(p.aspirantPricePercent),
    whatsappLimit: String(p.whatsappLimit),
    smsLimit: String(p.smsLimit),
    emailLimit: String(p.emailLimit),
    usersLimit: p.usersLimit === null ? '' : String(p.usersLimit),
    prospectsLimit: p.prospectsLimit === null ? '' : String(p.prospectsLimit),
  };
}

// ---- Interesados ------------------------------------------------------------

const STATUS_BADGE: Record<SalesLeadStatus, string> = {
  NEW: 'bg-sky-100 text-sky-800',
  CONTACTED: 'bg-amber-100 text-amber-800',
  QUALIFIED: 'bg-violet-100 text-violet-800',
  WON: 'bg-emerald-100 text-emerald-800',
  LOST: 'bg-slate-200 text-slate-600',
};

export function LeadsTab() {
  const [leads, setLeads] = useState<SalesLead[] | null>(null);
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [filter, setFilter] = useState<SalesLeadStatus | 'ALL'>('ALL');

  const load = useCallback(() => {
    Promise.all([listLeads(filter === 'ALL' ? undefined : filter), listSalesReps()])
      .then(([l, r]) => {
        setLeads(l);
        setReps(r.filter((x) => x.isActive));
      })
      .catch(() => toast.error('No se pudieron cargar los interesados'));
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const change = async (lead: SalesLead, input: { status?: SalesLeadStatus; salesRepId?: string | null }) => {
    try {
      await updateLead(lead.id, input);
      load();
    } catch (error) {
      toast.error('No se pudo actualizar', { description: extractErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">Solicitudes de demostración de la página pública <code>/planes</code>.</p>
        <Select value={filter} onValueChange={(v) => setFilter(v as SalesLeadStatus | 'ALL')}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            {(Object.keys(LEAD_STATUS_LABEL) as SalesLeadStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{LEAD_STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!leads ? (
        <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : leads.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Sin interesados todavía.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Interesado</TableHead>
                <TableHead>Cargo · plan</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Comercial</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="text-xs text-slate-500">{new Date(lead.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                  <TableCell>
                    <span className="font-medium">{lead.fullName}</span>
                    <span className="flex flex-wrap gap-x-3 text-xs text-slate-500">
                      <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 hover:underline"><Mail className="h-3 w-3" />{lead.email}</a>
                      {lead.phone && <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 hover:underline"><Phone className="h-3 w-3" />{lead.phone}</a>}
                    </span>
                    {lead.message && <span className="mt-1 block max-w-md whitespace-normal text-xs text-slate-500">“{lead.message}”</span>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {lead.officeType ?? '—'}{lead.candidacy === 'ASPIRANTE' ? ' (aspirante)' : ''}
                    <span className="block text-slate-500">{lead.commercialPlan?.name ?? 'Sin plan'}{lead.territory ? ` · ${lead.territory}` : ''}</span>
                  </TableCell>
                  <TableCell>
                    <Select value={lead.status} onValueChange={(v) => change(lead, { status: v as SalesLeadStatus })}>
                      <SelectTrigger className="h-8 w-[130px]">
                        <Badge className={STATUS_BADGE[lead.status]}>{LEAD_STATUS_LABEL[lead.status]}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(LEAD_STATUS_LABEL) as SalesLeadStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>{LEAD_STATUS_LABEL[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={lead.salesRep?.id ?? '__none__'} onValueChange={(v) => change(lead, { salesRepId: v === '__none__' ? null : v })}>
                      <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin asignar</SelectItem>
                        {reps.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
