'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { extractErrorMessage } from '@/lib/api/platform';
import {
  COMMISSION_ORIGIN_LABEL,
  COUPON_RULE_LABEL,
  LEGAL_TYPE_LABEL,
  createCoupon,
  createLegalDraft,
  createSalesRep,
  deleteLegalDraft,
  listCommissions,
  listCoupons,
  listLegalDocuments,
  listSalesReps,
  payCommissionInstallment,
  provisionCommercialAccess,
  publishLegalDocument,
  searchTerritories,
  setCommercialAccessEnabled,
  updateCoupon,
  updateSalesRep,
  type CommissionInstallmentRow,
  type Coupon,
  type CouponRule,
  type LegalDocumentAdmin,
  type LegalDocumentType,
  type SalesRep,
} from '@/lib/api/billing';
import { formatCop } from './organization-billing-dialog';
import { TerritoryPicker, titleCase, type TerritoryChoice } from '@/components/billing/territory-picker';
import { PASSWORD_HINT, isStrongPassword } from '@/lib/password-policy';
import { CommercialPlansTab, LeadsTab } from './commercial-tabs';
import { DemosTab } from './demos-tab';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { promptDialog } from '@/components/ui/prompt-dialog';

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const INSTALLMENT_LABEL: Record<string, string> = {
  PENDING: 'Pendiente (90 días)',
  PAYABLE: 'Por pagar',
  PAID: 'Pagada',
  CANCELLED: 'Cancelada',
};

/**
 * Administración transversal de cobros (Fase 1 "Poder cobrar"): cupones,
 * comerciales, liquidación de comisiones y documentos legales. Los cobros de
 * cada organización viven en el diálogo "Cobros" de su fila.
 */
export function BillingAdminPanel() {
  return (
    <Card className="border-0 shadow-md ring-1 ring-slate-100">
      <CardContent className="p-4">
        <Tabs defaultValue="leads">
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="leads">Interesados</TabsTrigger>
            <TabsTrigger value="catalog">Planes comerciales</TabsTrigger>
            <TabsTrigger value="commissions">Comisiones</TabsTrigger>
            <TabsTrigger value="coupons">Cupones</TabsTrigger>
            <TabsTrigger value="reps">Comerciales</TabsTrigger>
            <TabsTrigger value="demos">Demos</TabsTrigger>
            <TabsTrigger value="legal">Documentos legales</TabsTrigger>
          </TabsList>
          <TabsContent value="leads"><LeadsTab /></TabsContent>
          <TabsContent value="catalog"><CommercialPlansTab /></TabsContent>
          <TabsContent value="commissions"><CommissionsTab /></TabsContent>
          <TabsContent value="coupons"><CouponsTab /></TabsContent>
          <TabsContent value="reps"><SalesRepsTab /></TabsContent>
          <TabsContent value="demos"><DemosTab /></TabsContent>
          <TabsContent value="legal"><LegalTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ---- Comisiones ------------------------------------------------------------

function CommissionsTab() {
  const [rows, setRows] = useState<CommissionInstallmentRow[] | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(() => {
    listCommissions()
      .then(setRows)
      .catch(() => toast.error('No se pudieron cargar las comisiones'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const handlePay = async (row: CommissionInstallmentRow) => {
    const reference = await promptDialog({
      title: 'Marcar la cuota como pagada',
      description: `Pago de ${formatCop(row.amount)} a ${row.salesRep.name}.`,
      label: 'Comprobante del pago',
      placeholder: 'Número de transferencia o referencia',
      minLength: 2,
      maxLength: 120,
      confirmLabel: 'Marcar como pagada',
    });
    if (reference === null) return;
    setPaying(row.installmentId);
    try {
      await payCommissionInstallment(row.installmentId, reference);
      toast.success('Cuota marcada como pagada');
      load();
    } catch (error) {
      toast.error('No se pudo registrar el pago', { description: extractErrorMessage(error) });
    } finally {
      setPaying(null);
    }
  };

  if (!rows) return <Loading />;
  if (rows.length === 0) return <Empty text="Aún no hay comisiones. Se generan al registrar un pago con comercial." />;

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Cada venta genera 2 cuotas (50/50). La 2ª pasa a &quot;Por pagar&quot; a los 90 días solo si el cliente sigue activo.
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comercial</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Cuota</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.installmentId}>
                <TableCell className="font-medium">{r.salesRep.name}</TableCell>
                <TableCell>{r.organizationName}<span className="block text-xs text-slate-400">{COMMISSION_ORIGIN_LABEL[r.origin].replace(/ \(.*\)$/, '')} · {r.ratePercent}%</span></TableCell>
                <TableCell>{r.sequence} de 2</TableCell>
                <TableCell>{formatCop(r.amount)}</TableCell>
                <TableCell>{formatDate(r.dueDate)}</TableCell>
                {/* El botón va bajo el estado: en una columna propia la tabla
                    se pasaba del recuadro a 1366 px y lo dejaba medio oculto. */}
                <TableCell>
                  <div className="flex flex-col items-start gap-1.5">
                    <Badge variant={r.status === 'PAYABLE' ? 'default' : 'outline'}>{INSTALLMENT_LABEL[r.status] ?? r.status}</Badge>
                    {r.paidReference && <span className="text-xs text-slate-400">{r.paidReference}</span>}
                    {r.status === 'PAYABLE' && (
                      <Button size="sm" disabled={paying === r.installmentId} onClick={() => handlePay(r)}>
                        Marcar pagada
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---- Cupones ---------------------------------------------------------------

function CouponsTab() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyForm = { code: '', description: '', discountPercent: '5', rule: 'ANY' as CouponRule, maxRedemptions: '', validUntil: '' };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(() => {
    listCoupons().then(setCoupons).catch(() => toast.error('No se pudieron cargar los cupones'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createCoupon({
        code: form.code.trim(),
        description: form.description.trim() || undefined,
        discountPercent: Number(form.discountPercent),
        rule: form.rule,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
        validUntil: form.validUntil || undefined,
      });
      toast.success('Cupón creado');
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (error) {
      toast.error('No se pudo crear el cupón', { description: extractErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (coupon: Coupon, isActive: boolean) => {
    try {
      await updateCoupon(coupon.id, { isActive });
      load();
    } catch (error) {
      toast.error('No se pudo actualizar', { description: extractErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Máximo 10% de descuento y solo en contratos de 3 meses (6 y 12 meses ya traen su descuento). Un cupón por pago.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo cupón</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo cupón</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Código</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="LANZAMIENTO10" /></div>
              <div className="space-y-1"><Label>Descripción</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Descuento (%)</Label><Input type="number" min={1} max={10} value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} /></div>
                <div className="space-y-1"><Label>Usos máximos</Label><Input type="number" min={1} value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} placeholder="Sin límite" /></div>
              </div>
              <div className="space-y-1">
                <Label>Condición</Label>
                <Select value={form.rule} onValueChange={(v) => setForm({ ...form, rule: v as CouponRule })}>
                  <SelectTrigger aria-label="Condición del cupón"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(COUPON_RULE_LABEL) as CouponRule[]).map((r) => (
                      <SelectItem key={r} value={r}>{COUPON_RULE_LABEL[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Vigente hasta</Label><Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button disabled={saving || form.code.trim().length < 3} onClick={handleCreate}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {!coupons ? <Loading /> : coupons.length === 0 ? <Empty text="Sin cupones todavía." /> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead><TableHead>Descuento</TableHead><TableHead>Condición</TableHead><TableHead>Usos</TableHead><TableHead>Vigencia</TableHead><TableHead>Activo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><span className="font-mono font-semibold">{c.code}</span>{c.description && <span className="block text-xs text-slate-400">{c.description}</span>}</TableCell>
                  <TableCell>{c.discountPercent}%</TableCell>
                  <TableCell className="text-xs">{COUPON_RULE_LABEL[c.rule]}</TableCell>
                  <TableCell>{c.redemptionCount}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''}</TableCell>
                  <TableCell>{c.validUntil ? `hasta ${formatDate(c.validUntil)}` : 'Sin fecha límite'}</TableCell>
                  <TableCell><Switch checked={c.isActive} onCheckedChange={(v) => toggle(c, v)} aria-label={`Cupón ${c.code} activo`} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ---- Comerciales -----------------------------------------------------------

// Fase 4 del análisis de punta a punta (2026-10-28, PLT-18): el servidor ya
// tenía `POST` y `PATCH /platform/billing/sales-reps/:id/access`
// (`commercial-portal.controller.ts`) y no había cómo usarlos desde el panel.
// Dar acceso crea la cuenta del comercial con la contraseña que escribe el
// operador: el servidor no le manda correo.
function GrantCommercialAccessDialog({ rep, onDone }: { rep: SalesRep; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(rep.name);
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState<TerritoryChoice | null>(null);
  const email = rep.email ?? '';
  const passwordOk = isStrongPassword(password);
  const ready = fullName.trim().length >= 2 && passwordOk && Boolean(department);

  const submit = async () => {
    if (!department) return;
    setSaving(true);
    try {
      const result = await provisionCommercialAccess(rep.id, {
        email,
        fullName: fullName.trim(),
        password,
        departmentCode: department.code,
      });
      toast.success(result.replayed ? 'El comercial ya tenía este acceso' : 'Acceso al portal comercial creado', {
        description: result.replayed
          ? 'No se creó otra cuenta ni se cambió su contraseña.'
          : `Comparte con ${rep.name} su correo (${email}) y la contraseña por un canal seguro: Zyron no le envía correo.`,
      });
      setOpen(false);
      setPassword('');
      onDone();
    } catch (error) {
      toast.error('No se pudo dar el acceso', { description: extractErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Dar acceso</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Dar acceso al portal comercial</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {rep.name} podrá entrar al portal comercial con su correo para registrar interesados de su
            departamento y consultar sus comisiones. No ve datos de las campañas de los clientes.
          </p>
          <div className="space-y-1">
            <Label htmlFor={`rep-access-email-${rep.id}`}>Correo de acceso</Label>
            <Input id={`rep-access-email-${rep.id}`} value={email} readOnly disabled />
            <p className="text-xs text-slate-400">Es el correo registrado del comercial; no se puede cambiar aquí.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`rep-access-name-${rep.id}`}>Nombre en la cuenta</Label>
            <Input id={`rep-access-name-${rep.id}`} value={fullName} maxLength={120} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`rep-access-password-${rep.id}`}>Contraseña inicial</Label>
            <Input
              id={`rep-access-password-${rep.id}`}
              type="password"
              autoComplete="new-password"
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className={`text-xs ${password && !passwordOk ? 'text-destructive' : 'text-slate-400'}`}>{PASSWORD_HINT}</p>
          </div>
          <div className="space-y-1">
            <Label>Departamento que atiende</Label>
            <TerritoryPicker scope="DEPARTMENT" value={department} onChange={setDepartment} search={searchTerritories} />
          </div>
          <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
            Zyron no le envía correo al comercial: compártele la contraseña por un canal seguro.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button disabled={saving || !ready} onClick={submit}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear acceso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommercialAccessCell({ rep, onChanged }: { rep: SalesRep; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const access = rep.commercialAccess ?? null;
  const department = access?.department?.name ? titleCase(access.department.name) : access?.departmentCode;

  const setEnabled = async (enabled: boolean) => {
    const confirmed = await confirmDialog(
      enabled
        ? {
            title: `¿Dar de nuevo el acceso de ${rep.name} al portal comercial?`,
            description: 'Podrá volver a entrar con su correo y la contraseña que ya tenía.',
            confirmLabel: 'Dar acceso',
          }
        : {
            title: `¿Quitar el acceso de ${rep.name} al portal comercial?`,
            description: 'Se cierran sus sesiones abiertas y no podrá entrar hasta que le vuelvas a dar acceso. Sus interesados y comisiones se conservan.',
            confirmLabel: 'Quitar acceso',
            destructive: true,
          },
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      await setCommercialAccessEnabled(rep.id, enabled);
      toast.success(enabled ? 'Acceso al portal comercial devuelto' : 'Acceso al portal comercial quitado');
      onChanged();
    } catch (error) {
      toast.error('No se pudo cambiar el acceso', { description: extractErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  if (!access) {
    if (!rep.isActive) return <span className="text-xs text-slate-400">Activa al comercial para darle acceso</span>;
    if (!rep.email) return <span className="text-xs text-slate-400">Necesita un correo registrado</span>;
    return <GrantCommercialAccessDialog rep={rep} onDone={onChanged} />;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={access.enabled ? 'default' : 'outline'}>{access.enabled ? 'Con acceso' : 'Acceso quitado'}</Badge>
      {department && <span className="text-xs text-slate-500">{department}</span>}
      <Button size="sm" variant="outline" disabled={busy} onClick={() => setEnabled(!access.enabled)}>
        {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
        {access.enabled ? 'Quitar acceso' : 'Dar acceso'}
      </Button>
    </div>
  );
}

function SalesRepsTab() {
  const [reps, setReps] = useState<SalesRep[] | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', document: '' });

  const load = useCallback(() => {
    listSalesReps().then(setReps).catch(() => toast.error('No se pudieron cargar los comerciales'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createSalesRep({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        document: form.document.trim() || undefined,
      });
      toast.success('Comercial creado');
      setOpen(false);
      setForm({ name: '', email: '', phone: '', document: '' });
      load();
    } catch (error) {
      toast.error('No se pudo crear', { description: extractErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (rep: SalesRep, isActive: boolean) => {
    try {
      await updateSalesRep(rep.id, { isActive });
      load();
    } catch (error) {
      toast.error('No se pudo actualizar', { description: extractErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Terceros a quienes se les liquida comisión según el origen de la venta: 15 % si el comercial la consiguió y la cerró, 12 % si la oportunidad la trajo la empresa y 10 % en renovaciones, en dos cuotas. Solo entran a Zyron si les das acceso al portal comercial, donde registran interesados y consultan sus comisiones.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo comercial</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo comercial</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Correo</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-1"><Label>Documento</Label><Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button disabled={saving || form.name.trim().length < 2} onClick={handleCreate}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {!reps ? <Loading /> : reps.length === 0 ? <Empty text="Sin comerciales todavía." /> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Nombre</TableHead><TableHead>Contacto</TableHead><TableHead>Documento</TableHead><TableHead>Activo</TableHead><TableHead>Portal comercial</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {reps.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.email ?? '—'}<span className="block text-xs text-slate-400">{r.phone ?? ''}</span></TableCell>
                  <TableCell>{r.document ?? '—'}</TableCell>
                  <TableCell><Switch checked={r.isActive} onCheckedChange={(v) => toggle(r, v)} aria-label={`Comercial ${r.name} activo`} /></TableCell>
                  <TableCell><CommercialAccessCell rep={r} onChanged={load} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ---- Documentos legales ----------------------------------------------------

function LegalTab() {
  const [docs, setDocs] = useState<LegalDocumentAdmin[] | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<{ type: LegalDocumentType; version: string; title: string; content: string }>({
    type: 'TERMS', version: '', title: '', content: '',
  });

  const load = useCallback(() => {
    listLegalDocuments().then(setDocs).catch(() => toast.error('No se pudieron cargar los documentos'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createLegalDraft({ ...form, version: form.version.trim(), title: form.title.trim() });
      toast.success('Borrador creado');
      setOpen(false);
      load();
    } catch (error) {
      toast.error('No se pudo crear', { description: extractErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (doc: LegalDocumentAdmin) => {
    if (!await confirmDialog(`Publicar "${doc.title}" v${doc.version}? Será la versión vigente y todos los administradores deberán aceptarla. Un documento publicado ya no se puede editar.`)) return;
    setBusy(doc.id);
    try {
      await publishLegalDocument(doc.id);
      toast.success('Documento publicado');
      load();
    } catch (error) {
      toast.error('No se pudo publicar', { description: extractErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (doc: LegalDocumentAdmin) => {
    if (!await confirmDialog(`¿Eliminar el borrador "${doc.title}" v${doc.version}?`)) return;
    setBusy(doc.id);
    try {
      await deleteLegalDraft(doc.id);
      load();
    } catch (error) {
      toast.error('No se pudo eliminar', { description: extractErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Cada versión es inmutable una vez publicada. Los borradores iniciales llevan la marca &quot;BORRADOR — REVISAR CON ABOGADO&quot;:
          no los publiques sin revisión jurídica.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo borrador</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] sm:max-w-2xl overflow-y-auto">
            <DialogHeader><DialogTitle>Nuevo documento legal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as LegalDocumentType })}>
                    <SelectTrigger aria-label="Tipo de documento legal"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LEGAL_TYPE_LABEL).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Versión</Label><Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="1.0" /></div>
              </div>
              <div className="space-y-1"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="space-y-1"><Label>Texto</Label><Textarea rows={12} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button disabled={saving || !form.version.trim() || form.title.trim().length < 3 || form.content.length < 20} onClick={handleCreate}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar borrador
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {!docs ? <Loading /> : docs.length === 0 ? (
        <Empty text="Sin documentos. Carga los borradores iniciales con scripts/seed-legal-drafts.ts o crea uno nuevo." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Documento</TableHead><TableHead>Versión</TableHead><TableHead>Estado</TableHead><TableHead>Aceptaciones</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.title}<span className="block text-xs text-slate-400">{LEGAL_TYPE_LABEL[d.type]}</span></TableCell>
                  <TableCell>{d.version}</TableCell>
                  <TableCell>
                    {d.isCurrent ? <Badge className="bg-emerald-100 text-emerald-800">Vigente</Badge>
                      : d.publishedAt ? <Badge variant="outline">Anterior</Badge>
                      : <Badge variant="secondary">Borrador</Badge>}
                  </TableCell>
                  <TableCell>{d.acceptanceCount}</TableCell>
                  <TableCell>
                    {!d.publishedAt && (
                      <div className="flex gap-2">
                        <Button size="sm" disabled={busy === d.id} onClick={() => handlePublish(d)}>Publicar</Button>
                        <Button size="sm" variant="ghost" disabled={busy === d.id} onClick={() => handleDelete(d)}>Eliminar</Button>
                      </div>
                    )}
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

function Loading() {
  return <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-slate-400">{text}</p>;
}
