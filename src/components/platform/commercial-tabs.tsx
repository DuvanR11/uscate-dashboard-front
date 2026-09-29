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
  updateCommercialPlanRate,
  updateLead,
  type CommercialPlanAdmin,
  type TerritorialScope,
  type SalesLead,
  type SalesLeadStatus,
  type SalesRep,
} from '@/lib/api/billing';
import { formatCop } from './organization-billing-dialog';
import { CATEGORY_LABEL } from '@/components/billing/territory-picker';

const fmtNum = (v: number | null) => (v === null ? 'Ilimitado' : new Intl.NumberFormat('es-CO').format(v));

const SCOPE_LABEL: Record<TerritorialScope, string> = {
  NONE: 'Tarifa única',
  MUNICIPAL: 'Categoría del municipio',
  DEPARTMENT: 'Categoría del departamento',
  CHAMBER: 'Categoría del departamento (Bogotá: distrital)',
  NATIONAL: 'Tarifa nacional',
};

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
        El catálogo está vacío: lo carga la migración del catálogo territorial.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Catálogo territorial (docs/comercial): precio mensual sin IVA según la categoría de la Contaduría del municipio o
        departamento; aspirante ×1,5; 6 meses −5 % y 12 meses −10 %. Los cupos base se multiplican por el factor de la
        categoría y el perfil, y quedan en la suscripción de cada cliente al registrar su pago. La página pública, la
        cotización y el cobro calculan desde aquí; un cambio rige de inmediato y queda auditado.
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Tarifa activo /mes</TableHead>
              <TableHead>Cupos base (usuarios · contactos · GB · correos · SMS)</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead>Público</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((p) => {
              const prices = p.rates.map((r) => r.monthlyPrice);
              const low = Math.min(...prices);
              const high = Math.max(...prices);
              return (
                <TableRow key={p.code}>
                  <TableCell>
                    <span className="font-medium">{p.name}</span>
                    <span className="block text-xs text-slate-400">módulos {p.basePlanCode} · {SCOPE_LABEL[p.scope]}</span>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {low === high ? formatCop(low) : `${formatCop(low)} – ${formatCop(high)}`}
                    <span className="block text-xs text-slate-400">{p.rates.length} categoría{p.rates.length === 1 ? '' : 's'}</span>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {fmtNum(p.usersLimit)} · {fmtNum(p.prospectsLimit)} · {fmtNum(p.storageGb)} · {fmtNum(p.emailLimit)} ·{' '}
                    {fmtNum(p.smsLimit)}
                  </TableCell>
                  <TableCell><Switch checked={p.isActive} onCheckedChange={(v) => toggle(p, 'isActive', v)} /></TableCell>
                  <TableCell><Switch checked={p.isPublic} onCheckedChange={(v) => toggle(p, 'isPublic', v)} /></TableCell>
                  <TableCell><EditPlanDialog plan={p} onSaved={load} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

type PlanForm = ReturnType<typeof toForm>;
type RateForm = { category: string; monthlyPrice: string; capacityFactor: string };

function EditPlanDialog({ plan, onSaved }: { plan: CommercialPlanAdmin; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PlanForm>(() => toForm(plan));
  const [rates, setRates] = useState<RateForm[]>(() => toRates(plan));

  useEffect(() => {
    if (open) {
      setForm(toForm(plan));
      setRates(toRates(plan));
    }
  }, [open, plan]);

  const numeric: [keyof PlanForm, string][] = [
    ['usersLimit', 'Usuarios del equipo'],
    ['prospectsLimit', 'Contactos'],
    ['storageGb', 'Almacenamiento (GB)'],
    ['emailLimit', 'Correos /mes'],
    ['smsLimit', 'SMS /mes'],
    ['aiBudgetCop', 'Presupuesto IA /mes (COP, interno)'],
    ['supportHours', 'Acompañamiento (horas /mes)'],
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const num = (v: string) => Number(v);
      await updateCommercialPlan(plan.code, {
        name: form.name.trim(),
        description: form.description.trim(),
        usersLimit: num(form.usersLimit),
        prospectsLimit: num(form.prospectsLimit),
        storageGb: num(form.storageGb),
        emailLimit: num(form.emailLimit),
        smsLimit: num(form.smsLimit),
        aiBudgetCop: num(form.aiBudgetCop),
        supportHours: num(form.supportHours),
      });
      // Solo las tarifas que cambiaron (cada una queda auditada).
      for (const rate of rates) {
        const original = plan.rates.find((r) => r.category === rate.category);
        if (!original) continue;
        const monthlyPrice = num(rate.monthlyPrice);
        const capacityFactor = num(rate.capacityFactor);
        if (monthlyPrice !== original.monthlyPrice || capacityFactor !== original.capacityFactor) {
          await updateCommercialPlanRate(plan.code, rate.category, { monthlyPrice, capacityFactor });
        }
      }
      toast.success('Plan actualizado');
      setOpen(false);
      onSaved();
    } catch (error) {
      toast.error('No se pudo guardar', { description: extractErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const setRate = (index: number, patch: Partial<RateForm>) =>
    setRates((current) => current.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Editar</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Plan {plan.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1"><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Descripción pública</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800">Tarifas por categoría ({SCOPE_LABEL[plan.scope]})</h4>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Activo /mes</TableHead>
                    <TableHead>Aspirante /mes</TableHead>
                    <TableHead>Factor de capacidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.map((rate, index) => (
                    <TableRow key={rate.category}>
                      <TableCell className="font-medium">{CATEGORY_LABEL(rate.category)}</TableCell>
                      <TableCell>
                        <Input className="h-8 w-32" type="number" min={1000} value={rate.monthlyPrice} onChange={(e) => setRate(index, { monthlyPrice: e.target.value })} aria-label={`Tarifa ${CATEGORY_LABEL(rate.category)}`} />
                      </TableCell>
                      <TableCell className="tabular-nums text-slate-500">{formatCop(Math.round(Number(rate.monthlyPrice) * 1.5))}</TableCell>
                      <TableCell>
                        <Input className="h-8 w-20" type="number" min={0.5} max={10} step={0.25} value={rate.capacityFactor} onChange={(e) => setRate(index, { capacityFactor: e.target.value })} aria-label={`Factor ${CATEGORY_LABEL(rate.category)}`} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800">Cupos base (factor 1, perfil activo)</h4>
            <div className="grid grid-cols-2 gap-3">
              {numeric.map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label>{label}</Label>
                  <Input type="number" min={0} step={key === 'supportHours' ? 0.25 : 1} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Cambiar una tarifa o un cupo afecta cotizaciones y cobros nuevos; los pagos y suscripciones ya registrados no
            cambian hasta su renovación. WhatsApp oficial queda en 0: la política de WhatsApp Business prohíbe su uso por
            políticos y campañas.
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
    usersLimit: String(p.usersLimit),
    prospectsLimit: String(p.prospectsLimit),
    storageGb: String(p.storageGb),
    emailLimit: String(p.emailLimit),
    smsLimit: String(p.smsLimit),
    aiBudgetCop: String(p.aiBudgetCop),
    supportHours: String(p.supportHours),
  };
}

function toRates(p: CommercialPlanAdmin): RateForm[] {
  return p.rates.map((r) => ({
    category: r.category,
    monthlyPrice: String(r.monthlyPrice),
    capacityFactor: String(r.capacityFactor),
  }));
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
